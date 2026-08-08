/**
 * Effect engine: consume Frames from the analyser, write a 512-byte DMX
 * universe.
 *
 * Each fixture in cfg.fixtures gets rendered based on its index. Fixture
 * channel-layout is honored (RGB / RGBW / dimmer).
 */

import type { EngineConfig, FixtureConfig, Mode } from "./config.js";
import { fixtureRoles } from "./config.js";
import { FixtureOutput, type SpecialtyValues } from "./output.js";
import { beatPhase, beatMs as beatPeriod, beatIndex, hasBeat as beatLocked } from "./beatClock.js";
import { PostProcess } from "./postprocess.js";
import type { Frame } from "./analyser.js";
import { EFFECT_MAP, TIER } from "./effects/registry.js";
import { fitScore } from "./effects/fit.js";
import { PALETTES, ALL_SECTORS, setPalette, currentPalette, mixedSector } from "./effects/palette.js";
import { hsvToRgb } from "./effects/color.js";
import type { EffectContext } from "./effects/types.js";
import { LiveRange } from "./liveRange.js";

/** Rökmaskinens tillstånd, för UI:t. */
export interface FogStatus {
  /** heating = uppvärmningsklockan går, ready = redo, spraying = puff pågår. */
  state: "heating" | "ready" | "spraying";
  warmLeftMs: number;   // kvar av uppvärmningen (0 när klar)
  heat: number;         // termisk budget som är förbrukad, 0..1
  sprayMs: number;      // ackumulerad röktid sedan service
  bursts: number;       // antal puffar sedan service
  /** Namnet på en armatur vars kanaler rök-adressen krockar med, annars null. */
  conflict: string | null;
}

// HJÄRTSLAGETS FORM, SKALAD MED TEMPOT.
// En fast utklingning ger olika känsla i olika tempon: 130 ms är ett tätt dunk vid
// 159 BPM men en gles blink vid 90. Skalas båda mot taktperioden upptar pulsen samma
// ANDEL av takten oavsett tempo (~45 %), och resten är vila — då känns det som att
// ljuset följer musiken i stället för att gå i sin egen takt.
// Attacken har ett golv och ett tak: under ~30 ms läses den som ett steg (blixt),
// över ~70 ms tappar den anslaget.
/** Under den här nivån räknas ingången som avstängd, inte som ett tyst parti. */
const INPUT_OFF_LEVEL = 0.02;
/** ...men först när den legat där så länge — ett break i låten ska inte släcka showen. */
const INPUT_OFF_MS = 2000;

const BEAT_ATTACK_FRAC = 0.12;
const BEAT_ATTACK_MIN_MS = 30;
const BEAT_ATTACK_MAX_MS = 70;
const BEAT_DECAY_FRAC = 0.32;
/** PRE-DIP: en kort nedgang strax FORE anslaget, sa slaget far nagot att sticka
 *  upp ur. Uttryckt i TID (andel av takten, klamd) och inte i ramar — den ska
 *  folja tempot, inte renderns takt. Djupet ar avsiktligt modest: dippen ska
 *  kannas som andning, inte som ett andra blink. */
const BEAT_PREDIP_FRAC = 0.12;
const BEAT_PREDIP_MIN_MS = 25;
const BEAT_PREDIP_MAX_MS = 60;
const BEAT_PREDIP_DEPTH = 0.35;
/** HELA SHOWENS FÖRSPRÅNG mot musiken — hjärtslag, grid-byten, takträknare.
 *  Analysatorns eget ankare (`cfg.beat.anchorMs`) är och förblir sanningen om var
 *  slaget ligger i LJUDET; den dömer kickar och drops mot det och får aldrig
 *  förskjutas. Men LJUSET är trögare än ljudet, så allt på showsidan läser klockan
 *  som om den låg `SHOW_LEAD_MS` fram. Då kommer inte bara pulsen tidigare utan
 *  också effektbyten och takträknaren — hela riggen känns tightare, inte bara dunken.
 *  0 = allt exakt på slaget. 50 = hela showen 50 ms före.
 *  Hjärtslaget lägger dessutom till sin egen attacktid, så dess TOPP landar rätt. */
const SHOW_LEAD_DEFAULT = 50;

export class EffectEngine {
  private universe = new Uint8Array(512);
  /** Utjamnad tilltro till takten (0..1) — styr beatPulse-djupet. */
  /** Showens försprång i ms — läses ur config varje frame så ratten biter live. */
  private get showLead(): number { return this.cfg.showLeadMs ?? SHOW_LEAD_DEFAULT; }
  private beatTrust = 0;
  beatMulNow = 1;                     // hjärtslagets multiplikator — appliceras SIST (publik: diagnostik)
  private prevCeil = 0;               // förra rutans ljustak → hur snabbt det vandrar
  private ceilRateAvg = 0;            // utjämnad takrörelse (enheter/s)
  /** EDGE-SÄKER KICK. frame.kick är en enframs-boolean på analysatorns 375 Hz
   *  medan render kör 100 Hz → en direkt läsning missar ~73 % av kickarna.
   *  Räknaren matas i registerKick (375 Hz) och konsumeras som en flank i
   *  render — samma monotona mönster som frame.dropCount. */
  private kickCount = 0;
  private lastKickSeen = 0;
  private showTime = 0;      // ackumulerad "show-tid" — accelererar under uppbyggnaden (riser)
  private lastShowMs = 0;
  private lastKickBoost = 0;
  private showVel = 0;       // extra show-tids-hastighet från bastransienter (akustisk tröghet)
  private pendingKick = 0;   // ackumulerade kick-impulser sedan förra rendern (fylls i 375 Hz)
  /** Chase mode: fixture-index of the currently lit head. Advanced on kick and slow-time. */
  private chasePos = 0;
  private chaseDir = 1;
  private lastChaseAdvance = 0;
  /** Beat clock: last whole-beat index seen (för beatTick-flanken). */
  private lastBeatIdx = -1;
  /** Takt-räknare som effekterna ser (beatIdx): stegar på grid-slaget när BPM är
   *  låst, annars på verkliga kicks → grid-effekter fryser aldrig utan BPM-lås. */
  private beatCounter = 0;
  /** Drops mode: per-lamp fire time + hue; advanced on each beat/kick. */
  private dropPos = 0;
  private dropSector = 0;
  private dropCount = 0;
  private lastDropAdvance = 0;
  private dropFired: number[] = [];
  private dropHue: number[] = [];
  /** Wave mode: integrated phase — speed may vary per frame without the
   *  wave jumping (t*speed would re-scale all elapsed time on every change). */
  private wavePhase = 0;
  /** "smart" mode: which effect the feel-chooser currently delegates to. */
  private smartMode: Mode = "wave";
  private tierEma = 0.5;   // ihallande intensitet for tier-val (se render)
  private smartDwellUntil = 0;
  private warmMs = 0;
  private ambient = 0;   // 0 = spelar, 1 = varm vila (efter ~2.5s tystnad)
  private bassBaseline = 0.35;   // bas-golv (tyst basnivå) för bas-punch
  private lastDropCount = 0;   // senast hanterade frame.dropCount → edge-säker drop-flank
  private dropBangUntil = 0;     // drop-fönster (max-håll upp till ~8s efter träff)
  private dropEnv = 0;           // drop-envelope: full attack → håll → mjuk fade
  // TERMISK BUDGET. En fast cooldown vet inte skillnad på en 0.5s-puff och en
  // 3s-puff — den räknar TIDEN MELLAN, inte ARBETET. Ibiza LSM1500PRO orkar
  // 40–50 s sammanhängande rök innan värmeblocket måste hämta igen, så vi för
  // ett värmekonto i millisekunder: det fylls medan den rökar och rinner av i
  // vila. Då kostar en lång puff mer än en kort, precis som i fysiken.
                                                   // → 1 s rök ≈ 6,7 s återhämtning
                                 // (själva starttiden bor i cfg.fog.warmStartMs → överlever omstart)
  // NOVELTY-UPPBYGGNADS-DETEKTOR: spektral novelty leder dropen (mätt validerat).
  private hotMs = 0;             // hur länge musiken pumpat → adaptiv tystnads-landning
  private wasBreaking = false;   // flankdetektor för nivå-svacka (drop-blackout)
  private blackoutUntil = 0;     // dramaturgisk tystnad: kolsvart till (wall-clock ms)
  private vu = 0;                // direkt VU-envelope (snabb attack / ~180ms release) för ljustaket
  private range = new LiveRange();   // rullande p5..p95 av nivån → normaliserad dynamik live
  // ── DRAMATURGI UR LÅTMINNET (sätts av index.ts, bara för IGENKÄNDA låtar) ──
  // En FÖRBERÄKNAD kurva kan inte fladdra som live-VU:n gjorde: ett värde per
  // sekund, mjukt interpolerat. Okänd låt → allt är null/0 och showen kör som förut.
  memCeiling: number | null = null;   // normaliserat ljustak 0..1 ur minnet
  memSectionAt = 0;                   // performance.now() för senaste sektionsgräns
  memPhraseAt = 0;                    // ...och senaste frasgräns
  memHasGrid = false;                 // låten har sektioner/frasgrid att vänta in
  /** VILKEN sorts sektion som spelas just nu ur den analyserade strukturen:
   *  "intro" | "verse" | "chorus" | "bridge" | "outro" … null = okänd låt eller
   *  ingen analys. Sätts av index.ts. ANVANDS INTE AN av effektvalet — den ska
   *  in dar medvetet och matbart, inte som en sidoeffekt av att faltet dok upp. */
  memPart: string | null = null;
  /** Vilken låt strukturen kommer från — look-minnet nollas när den byts. */
  memSongId = 0;
  /**
   * LOOK PER SEKTIONSTYP. Riktiga ljustekniker upprepar medvetet: refrängen ska
   * kännas som ett ÅTERSEENDE, inte som en ny slump varje gång. Utan det här
   * väljer dirigenten om från passform-tabellen vid varje sektionsgräns, och
   * refräng fem ser ut som ingenting av refräng ett.
   * Bara för den här låten — nollas vid låtbyte.
   */
  /** Sektionens UPPMATTA energi (0..1), -1 = okand. Ur minnets energikurva, som
   *  tvatten raknat pa hela laten — alltsa kant redan nar sektionen BORJAR. */
  memPartEnergy = -1;
  private partLook = new Map<string, Mode>();
  private partLookSong = 0;

  /** Misstänkt låtbyte → låt auto-rangen kalibrera om snabbt mot nya nivåer. */
  softenRange(): void { this.range.soften(); }



  private gravLevel = 0;         // gravitations-VU: nivå som faller med gravitation
  private gravVel = 0;           // dess hastighet
  private gravPeak = 0;          // peak-håll (sjunker långsamt)
  /** Silence gate: fade the whole rig to black when no music plays. */
  private lastActiveMs = performance.now();
  private inputLowSince = 0;     // väggklocka: sedan när nivån legat under gränsen
  private inputOff = false;      // ingången bedöms avstängd → riggen mörk
  private silenceGate = 1;
  private lowLogAt = 0;
  /** LEVER MEN HÖR INGENTING. Utan den här signalen ser "aux-kabeln sitter inte
   *  i" exakt likadant ut som "strömmen är av" och "säkringen gick": svart. Den
   *  som slår på lådan 22:00 står ensam bakom disken utan laptop — riggen är den
   *  enda skärm som finns, och den måste kunna säga tre olika saker.
   *  Ej opt-in: ett grundbeteende, inte en inställning man kan råka slå av. */
  /** Strobe-tak i Hz. SAFE = gränsen för allmänt säkert innehåll (WCAG 2.3.1
   *  och rundradions riktlinjer: högst 3 blixtar/s). MAX = ägarens medvetna
   *  scenläge. Notera att `Math.floor(t*hz) % 2` ger hz/2 hela blixtcykler per
   *  sekund — talen är alltså tagna med marginal, inte i underkant. */
  private static readonly STROBE_SAFE_HZ = 3;
  private static readonly STROBE_MAX_HZ = 18;
  private static readonly DEAF_AFTER_MS = 90000;   // låtglapp = sekunder, DJ-paus =
                                                   // någon minut. 90 s utan EN enda
                                                   // transient betyder att vi inte
                                                   // hör källan, inte att det är tyst.
  private deafFade = 0;          // 0..1 inblandning av väntande-andningen
  /** Output ballistics: per-channel soft ~25ms attack + exponential decay — the
   *  eye sees a fast rise and a soft fall (~0.1–0.4 s), whatever the modes do. */
  /** Output-tjänsten äger ALL kunskap om hur lampor tar emot ljus. */
  private out = new FixtureOutput();
  /** Efterbehandlingen äger slutkedjan: ballistik → tak → hjärtslag → kalibrering. */
  private post = new PostProcess();
  private maxCh = 0;                           // högsta använda kanal + 1
  private smartCount = 0;
  private lastSmartTier = "";
  private lastSmartSwitchMs = 0;   // tidsstämpel för senaste effektbyte → minsta-intervall
  private activeMode: Mode = "smart";
  // Regi-lager: fras-räknare + aktiv palett (byts var N:e takt).
  private phraseBeat = 0;
  private phraseBeats = 32;   // taktslag per musikalisk fras → palettbyte
  private paletteIdx = 2;     // start: Primär
  private paletteRot = 0;

  /** Välj ny palett vid frasbyte, biasad av klangen (centroid). */
  private pickPalette(centroid: number) {
    const wantWarm = centroid < 0.42, wantCool = centroid > 0.60;
    let cands = PALETTES.map((_, i) => i).filter((i) => {
      const t = PALETTES[i].temp;
      if (wantWarm) return t === "warm" || t === "neutral";
      if (wantCool) return t === "cool" || t === "neutral";
      return true;
    });
    if (cands.length === 0) cands = PALETTES.map((_, i) => i);
    this.paletteRot++;
    let next = cands[Math.floor(((this.paletteRot * 0.61803398875) % 1) * cands.length)];
    if (next === this.paletteIdx && cands.length > 1) next = cands[(cands.indexOf(next) + 1) % cands.length];
    this.paletteIdx = next;
  }

  /** Den effekt som faktiskt renderas just nu (smart-läget roterar this.smartMode). */
  getActiveMode(): Mode { return this.activeMode; }

  /** Rökmaskinens tillstånd för UI:t. null = inte ansluten. */
  getFogStatus(): FogStatus | null {
    const fog = this.cfg.fog;
    if (!fog?.enabled) return null;
    const now = Date.now();
    const warmLeftMs = fog.warmStartMs ? Math.max(0, (fog.warmupMs ?? 600000) - (now - fog.warmStartMs)) : 0;
    // ADRESSKROCK. Rök-kanalen skrivs SIST i universumet (efter ballistiken, för
    // att få instant på/av) → den VINNER över en armatur som delar adressen, och
    // lampan slocknar utan förklaring. Vi flyttar den INTE automatiskt: ett tyst
    // adressbyte är värre än problemet, för då stämmer inte DIP-switcharna längre.
    // Vi säger till och låter ägaren välja.
    let conflict: string | null = null;
    for (const fx of this.cfg.fixtures) {
      const top = fx.address + fixtureRoles(fx).length - 1;
      if (fog.address >= fx.address && fog.address <= top) { conflict = fx.name; break; }
    }
    return {
      conflict,
      state: this.out.fogState(now).spraying ? "spraying" : warmLeftMs > 0 ? "heating" : "ready",
      warmLeftMs,
      heat: this.out.fogState(now).heat,
      sprayMs: fog.sprayMs ?? 0,
      bursts: fog.bursts ?? 0,
    };
  }

  /** Nollställ drifträknarna efter underhåll (påfylld tank / rengöring). */
  resetFogService() {
    const fog = this.cfg.fog;
    if (!fog) return;
    fog.sprayMs = 0;
    fog.bursts = 0;
    fog.serviceAtMs = Date.now();
  }
  private lastRenderMs = performance.now();

  constructor(private cfg: EngineConfig) {}

  /** AKUSTISK TRÖGHET: varje bastransient (kick) knuffar show-tiden framåt.
   *  Anropas i 375 Hz-chunkhanteraren så inga slag missas (render kör 100 Hz).
   *  strength ~0.4..1.0 (skalas av basens styrka). Friktionen i render() bromsar. */
  registerKick(strength: number): void {
    this.pendingKick += Math.min(1.5, Math.max(0, strength));
    this.kickCount++;
  }

  render(frame: Frame): Uint8Array {
    // Fri-rullande "show-tid": normalt 1× realtid, men accelererar under en
    // uppbyggnad (buildUp från förra framen) så mönstren snabbar upp mot dropen.
    // Ackumulerad → kontinuerlig, inga hopp.
    // Konsumera kick-flanken EN gång per render (se kickCount ovan).
    const kickHit = this.kickCount !== this.lastKickSeen;
    this.lastKickSeen = this.kickCount;
    const _np = performance.now();
    if (this.lastShowMs === 0) this.lastShowMs = _np;
    const _dtT = Math.min(0.1, (_np - this.lastShowMs) / 1000);
    this.lastShowMs = _np;
    // AKUSTISK TRÖGHET (fluid friction): mönstren flyter i en trög vätska. Varje
    // bastransient ger show-tiden en IMPULS framåt; "vätskefriktionen" bromsar
    // sedan mjukt tillbaka till normaltempo → vågor/eld/aurora RYCKER till och
    // accelererar explosivt med bastrumman, för att sedan glida vidare. Skalas av
    // energin så tysta partier knappt rycker; strukturen (beat-låsta färgbyten)
    // rörs inte — bara rörelsen får fysikalisk tyngd.
    const friction = Math.exp(-_dtT / 0.16);            // tröghet τ≈160 ms
    this.showVel = Math.min(5, this.showVel * friction + this.pendingKick * 2.0);
    this.pendingKick = 0;
    // upp till 2.5× snabbare vid full uppbyggnad + kick-ryck ovanpå
    this.showTime += _dtT * (1 + frame.buildUp * 1.5 + this.showVel);
    const t = this.showTime;
    if (kickHit) this.lastKickBoost = performance.now();

    // BPM-taktklocka → förutsagt slag: pulsa i låtens exakta tempo, fas-låst av
    // beat-PLL:en (index.ts riktar ankaret mot faktiska kicks). Bättre än ren
    // kick-detektion på en komprimerad signal som fyrar glest.
    let beatEnv = 0;
    let beatTick = false;
    const beat = this.cfg.beat;
    if (beatLocked(beat)) {
      const beatMs = beatPeriod(beat);
      const now2 = Date.now();
      // HJÄRTSLAG: ATTACK → FADEOUT → VILA.
      // Förr: Math.pow(1 - phase, 2) — ljuset hoppade till fullt på NOLL ms vid varje
      // slag och sjönk sedan hela takten igenom. Ett steg utan attack läses som blixt,
      // och utan vila mellan slagen blir riggen aldrig stilla: MÄTT 2026-08-07 upplevdes
      // det som stroboskop i låtens lugna partier. Nu en kort men verklig attack, en
      // exponentiell utklingning och tystnad tills nästa slag — samma puls, annan form.
      const atk = Math.max(BEAT_ATTACK_MIN_MS, Math.min(BEAT_ATTACK_MAX_MS, beatMs * BEAT_ATTACK_FRAC));
      // ATTACKEN BÖRJAR FÖRE SLAGET SÅ TOPPEN LANDAR PÅ DET.
      // MÄTT 2026-08-08 på DMX-utgången: ljuset kulminerade vid fas 0,10 av takten,
      // alltså ~48 ms EFTER slaget — attacken startade på slaget och behövde sin
      // uppgångstid. Genom att flytta fram fasen med exakt attackens längd börjar
      // uppgången `atk` ms före slaget och toppen sammanfaller med det. Samma tanke
      // som REPLAY_LEAD_MS för minnet: ljus är trögare än ljud.
      // Försprånget = attackens längd: klockan ger fasen som om vi låg `atk` ms fram.
      const tSince = beatPhase(beat, now2, atk + this.showLead) * beatMs;
      const dec = beatMs * BEAT_DECAY_FRAC;
      beatEnv = tSince < atk ? tSince / atk : Math.exp(-(tSince - atk) / dec);
      // PRE-DIP: en inandning strax FÖRE anslaget.
      // Ögat läser kontrast, inte absolut nivå. Att sänka ljuset en aning precis
      // innan slaget gör att samma topp känns hårdare — utan att toppen höjs, och
      // därmed utan att riggen blir ljusare eller tröttare att titta på.
      // Idén är hämtad från Song Studio-poleringen i det andra projektet
      // (PREDIP_FRAMES/PREDIP_DEPTH); här uttryckt i tid i stället för ramar, så
      // den följer tempot i stället för renderns takt.
      // Dippen ligger i slutet av takten — alltså precis före nästa attack, som ju
      // startar `atk` ms innan slaget. Envelopen får gå NEGATIV: den är ett
      // 0..1-mått som skalas mot pulsdjupet, så negativa värden betyder mörkare
      // än pulsens eget golv. Slutmultiplikatorn klamras separat.
      const dipMs = Math.max(BEAT_PREDIP_MIN_MS, Math.min(BEAT_PREDIP_MAX_MS, beatMs * BEAT_PREDIP_FRAC));
      const dipStart = beatMs - dipMs;
      if (tSince > dipStart) {
        const w = (tSince - dipStart) / dipMs;         // 0 → 1 fram mot anslaget
        beatEnv -= BEAT_PREDIP_DEPTH * w * w;          // kvadratisk: mjuk in, tydlig ut
      }
      const beatIdx = beatIndex(beat, now2 + this.showLead);   // takträknaren stegar lika tidigt
      // BARA FRAMÅT. Villkoret var `!==`, som fyrade på VARJE förändring — även
      // bakåt. PLL:en justerar anchorMs och bpm kontinuerligt i båda riktningar,
      // så nära en taktgräns dittrade index 132 → 131 → 132 och gav TRE slag där
      // ett fanns. MÄTT: 150 beatTick/min vid BPM 132 (+14 %). Eftersom beatTick
      // driver beatHit, som driver varje grid-effekt, gick hela riggen ur takt.
      // Backar ankaret följer vi med i tysthet men utan att räkna ett slag.
      if (beatIdx > this.lastBeatIdx) { this.lastBeatIdx = beatIdx; beatTick = true; }
      else if (beatIdx < this.lastBeatIdx) this.lastBeatIdx = beatIdx;
    }
    // INGEN TICK-VÄG FÖR HJÄRTSLAGET — med flit. Utan pålitlig takt tiger det hellre
    // än pulsar på lösa kicks: en puls som sitter fel är värre än ingen puls. (Grid-
    // EFFEKTERNA faller däremot tillbaka på verkliga kicks, se beatHit längre ner —
    // de byter bild, de slår inte takt.)
    const kickEnv = Math.max(
      Math.max(0, 1 - (performance.now() - this.lastKickBoost) / 250),
      beatEnv * 0.8,
    );

    this.universe.fill(0);

    if (this.cfg.mode === "blackout") return this.universe;

    // Identify override: light only the target fixture(s) at full white so the
    // user can visually locate each fixture in the room. Bypasses audio/mode.
    const id = this.cfg.identify;
    if (id && id.index >= 0 && id.index < this.cfg.fixtures.length) {
      this.out.writeFixture(this.universe, this.cfg.fixtures[id.index], [1, 1, 1], 1);
      return this.universe;
    }

    // Kalibrerings-test: tvinga MÅL-lampan till ett RÅTT DMX-värde på ljuskanalerna
    // (bypassar show, VU och cal-remap) så exakt tänd/släck-punkt kan hittas för
    // hand. Övriga lampor släckta. Transient — sätts från /setup-slidern.
    const ct = this.cfg.calTest;
    if (ct && ct.index >= 0 && ct.index < this.cfg.fixtures.length) {
      const cf = this.cfg.fixtures[ct.index];
      const roles = fixtureRoles(cf);
      const cbase = cf.address - 1;
      const val = Math.max(0, Math.min(255, Math.round(ct.value)));
      const chSel = ct.channel ?? "all";   // vilken färg testet driver (kalibrera per färg)
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        if (role !== "r" && role !== "g" && role !== "b" && role !== "w" && role !== "dim") continue;
        const ch = cbase + i;
        if (ch < 0 || ch >= 512) continue;
        // Driv bara vald färg (all = alla lika). dim = enfärgs-dimmer → alltid.
        this.universe[ch] = (chSel === "all" || role === chSel || role === "dim") ? val : 0;
      }
      return this.universe;
    }

    // Walk-test: tänd EN rå DMX-kanal på mål-fixturen till 255 (allt annat 0)
    // så användaren kan avgöra vad kanalen gör och gissa 3/4/7-kanals-preset.
    const wt = this.cfg.walkTest;
    if (wt && wt.index >= 0 && wt.index < this.cfg.fixtures.length && wt.channel >= 0) {
      const wf = this.cfg.fixtures[wt.index];
      const ch = (wf.address - 1) + wt.channel;
      if (ch >= 0 && ch < 512) this.universe[ch] = 255;
      return this.universe;
    }

    const nowWall = Date.now();

        // Normalize against the AGC target so "at target loudness" = full drive —
        // the AGC otherwise parks the level around ~0.5 and v never reaches 1.
        const audio = Math.min(1, (frame.level / Math.max(0.15, this.cfg.detection.autoGainTarget)) * (0.35 + this.cfg.sensitivity * 0.5));
        // beatPulse: mjuk, kontinuerlig puls på BPM-rutnätet (PLL:en riktar fasen
        // mot faktiska slag). Kontinuerlig — funkar även när kick-detektorn är
        // gles (komprimerad signal fyrar sällan), till skillnad från ren kick-puls.
        //
        // PULSA BARA NÄR TAKTEN FAKTISKT HÖRS. cfg.beat finns alltid så fort en
        // takt någonsin låstes, så den dög inte som villkor — vid oklar musik
        // pulsade riggen vidare på ett gissat rutnät och blinket hamnade bredvid
        // musiken. Nu styr bpmConfidence pulsens DJUP: full puls över 0.60, helt
        // slät under 0.35, mjuk ramp emellan. Djupet smoothas (~0.6s) så att en
        // vacklande konfidens inte hackar pulsen av och på.
        // GRINDEN VAR FÖR HÖG. Djupet nollades under bpmConfidence 0.35, och MÄTT
        // 2026-08-07 låg en låts konfidens med MEDIAN exakt 0.35 — hjärtslaget var
        // alltså avstängt halva tiden och nästan avstängt resten. Låten hade en fullt
        // hörbar takt; konfidensen är låg för att tempot är svårMÄTT, inte för att
        // takten saknas. Ny ramp: noll under 0.18, full över 0.55.
        const trustRaw = Math.max(0, Math.min(1, (frame.bpmConfidence - 0.18) / 0.37));
        this.beatTrust += (trustRaw - this.beatTrust) * 0.03;
        // PULSEN SKA FÖLJA MUSIKENS ENERGI, INTE BARA TAKTENS TYDLIGHET.
        // MÄTT 2026-08-07: i ett LUGNT parti pulsade riggen 70→100 % på varje taktslag
        // (två gånger i sekunden vid 117 BPM), vilket lästes som stroboskop. Djupet
        // styrdes enbart av bpmConfidence — takten är ju lika tydlig i ett stilla parti
        // som i ett kraftigt. Nu skalas det med energin: mild puls när låten andas,
        // full puls när den går för fullt. frame.intensity kommer ur minnets kurva när
        // en inspelning är synkad, annars ur realtidsanalysen.
        const energy = Math.max(0, Math.min(1, frame.intensity));
        // TAKET OCH PULSEN FÅR INTE VANDRA SAMTIDIGT.
        // MÄTT 2026-08-07: i låtens första 30 s rör sig minnets ljustak 42→57→47→60 % i
        // sekundtakt medan taktpulsen går 2,65 ggr/s ovanpå. Var för sig är båda lugna —
        // tillsammans blir pulsen oregelbunden, och oregelbunden puls läses som strobe.
        // Efter 30 s ligger taket still och samma puls upplevs som en jämn rytm, vilket
        // är precis vad användaren rapporterade. Lösningen dämpar INTE taket (dynamiken
        // är poängen) utan tonar ner pulsen medan taket rör sig.
        // BARA när ett minnestak finns. I realtid föll den förr tillbaka på energin, som
        // fladdrar 10 Hz — då bottnade calm på 0,25 och hjärtslaget försvann helt ur
        // realtidsläget. Dämpningen ska skydda mot att TAKET vandrar, inte mot att
        // musiken lever.
        let calm = 1;
        if (this.memCeiling !== null) {
          const ceilRate = Math.abs(this.memCeiling - this.prevCeil) * 100;   // enheter/s (render 100 Hz)
          this.prevCeil = this.memCeiling;
          this.ceilRateAvg += (ceilRate - this.ceilRateAvg) * 0.02;           // ~0,5 s
          calm = Math.max(0.5, 1 - this.ceilRateAvg * 4);
        } else { this.ceilRateAvg = 0; }
        // 0.55 → 0.70: ett kraftigare hjärtslag DOMINERAR över småfladder i nivån i
        // stället för att konkurrera med det — användarens förslag, och det ger dessutom
        // mer av den känsla pulsen finns till för.
        // 0.80 → 0.92, och energigolvet 0.35 → 0.50: djupare slag överallt, och märkbart
        // mer även i lugna partier. Pulsen ligger sist i kedjan och passerar inget
        // filter, så hela djupet når fram — det som mäts är det som syns.
        const depth = 0.92 * this.beatTrust * (0.50 + 0.50 * energy) * calm;
        // KLAMRAS NEDAT: pre-dippen far envelopen ga negativ med flit, men
        // multiplikatorn far aldrig slacka riggen helt — da lases dippen som ett
        // blink i stallet for som andning. 0.06 lamnar lamporna tanda.
        const bm = this.cfg.beatPulse ? (1 - depth) + depth * beatEnv : 1;
        this.beatMulNow = bm < 0.06 ? 0.06 : bm > 1 ? 1 : bm;
    // BAS-PUNCH: en hård/utdragen basstöt (drop) saknar transient, och på en
    // komprimerad signal svänger bas-energin lite. Så spåra ett bas-GOLV = den
    // TYSTA basnivån (sjunker mot tystnad på ~0.4s, stiger mkt långsamt ~5s). En
    // drop ligger då tydligt ÖVER golvet → punch som HÅLLER tills golvet hinner ikapp.
    // LÅTSTART: bas-golvet har spårat TYSTNADEN (~0). Utan detta skulle bassPunch
    // pinnas på max i ~5s när låten drar igång (golvet kryper ikapp på 0.004) →
    // md-boost plattar hela introt till ett ljust svep. Under warmup
    // (~första 3s aktiv musik) låter vi golvet snabb-komma-ikapp så punchen bara
    // fyrar på VERKLIGA basstötar över den etablerade nivån, inte på hela introt.
    const bassRise = this.warmMs < 3000 ? 0.05 : 0.004;
    if (frame.energy < this.bassBaseline) this.bassBaseline += (frame.energy - this.bassBaseline) * 0.05;
    else this.bassBaseline += (frame.energy - this.bassBaseline) * bassRise;
    // "Goa slaget": den utjämnade bas-svallen (över baslinjen) OCH — för LÅG LATENS —
    // det SNABBA kick-anslaget från 512-detektionen (fyrar direkt vid lastKickBoost,
    // ~15ms tidigare än det utjämnade bandet + onset.kick från dubbel-FFT:n som extra
    // säkring). Max av dem → punchen sitter på slaget.
    const kickHitFast = Math.max(0, 1 - (performance.now() - this.lastKickBoost) / 180);
    // DUNK-RATIO (Gemini): anslag/energi i låg-enden — hög = knivskarp kick, låg =
    // smetig ihållande basnot. Grinda den UTJÄMNADE bas-svallen mjukt av den så bara
    // riktiga transienter driver punch (de snabba kick-delarna fyrar ändå).
    const dunkRatio = (frame.onset.kick + frame.onset.sub) / (frame.spec.kick + frame.spec.sub + 0.01);
    const sustained = Math.max(0, (frame.energy - this.bassBaseline - 0.05) * 4) * Math.min(1, dunkRatio / 0.4);
    const bassPunch = Math.max(0, Math.min(1, Math.max(sustained, kickHitFast * 0.9, frame.onset.kick * 0.85)));
    // Uniform bas-punch borttagen ur master — effekterna äger sitt slag via ctx.punch.
    // Effekt-drive (silence-gate + beat-puls). Ljus-taket (cfg.master) läggs SIST
    // i cal-remappen istället — som ett äkta output-tak [onCh..tak], inte en
    // innehålls-skalning som gamma/kalibrering annars komprimerar bort.
    // HJÄRTSLAGET LIGGER NUMERA SIST, efter ballistiken — se nedan. Låg det här
    // smetades det ut av utgångens decay (0,42 s), som är mycket långsammare än
    // pulsens egen (121 ms): ljuset hölls kvar mellan slagen och slaget kändes knappt.
    const drive = this.silenceGate;
    // Synlig punch: en hård basstöt (eller drop-flash) BLOOMAR färgen till full
    // styrka — inte bara ljusare master (som är osynligt när effekten redan lyser).
    // DROP: analysatorn AVGÖR om det är en drop (frame.dropCount är MONOTON). Vi
    // jämför mot vårt senast hanterade värde → flanken kan ALDRIG missas trots att
    // rendern går långsammare än analysen (en enframs-boolean hade aliaserats bort).
    // Här ligger bara show-REAKTIONEN: accent-fönster, blackout, rök, envelope.
    const dtNow = Math.min(0.1, (performance.now() - this.lastRenderMs) / 1000);
    const dropHit = frame.dropCount !== this.lastDropCount;
    this.lastDropCount = frame.dropCount;
    // DROPEN AR EN SMALL, INTE EN PLATA. Hallet var 2s och uttoningen 1s, alltsa
    // ~3s full blast per drop — och eftersom dropEnv KRINGGAR VU-taket (se
    // ceilMul nedan) ar det de enda ogonblick riggen gar till max.
    //   MATT: VU-taket sjalvt nadde aldrig over 0.85 (0% av tiden), men
    //   dropEnv lag over 0.5 i 14% av tiden i ett aktivt parti. Var sjunde
    //   sekund i max, vilket lasare som "for mycket drops".
    // 800ms hall + 1s utton ger fortfarande en tydlig gest men halverar tiden i
    // max. Sjalva anslaget (30ms attack) ar orort, sa smallen kanns lika hard.
    // 2000ms kandes som for mycket max-ljus, 800ms som for kort - 1300ms ar
    // mitten. Har ar anvandarens oga ratt matinstrument: hur lange en drop ska
    // halla ar en upplevelseparameter, inte en troskel att mata fram.
    if (dropHit) this.dropBangUntil = nowWall + 1300;
    // DROP-BLACKOUT (dramaturgisk tystnad): en riser som BRYTS ner i en svacka
    // strax före dropen → tvinga kolsvart i max 250ms. Svärtan STARTAR på
    // svackans flank (bara om vi faktiskt byggt upp: buildUp>0.35) och SLÄPPS i
    // samma stund dropen fyrar → explosionen landar exakt i takt, aldrig
    // fördröjd. Rinner risern ut utan drop kommer ljuset bara tillbaka.
    const nowBreaking = frame.breaking;
    if (this.cfg.dropBlackout && nowBreaking && !this.wasBreaking && frame.buildUp > 0.35) {
      this.blackoutUntil = nowWall + 250;
    }
    this.wasBreaking = nowBreaking;
    if (dropHit) this.blackoutUntil = 0;                                                        // dropen fyrade → släpp svärtan, explodera
    const blackout = nowWall < this.blackoutUntil;
    const fog = this.cfg.fog;   // rök beslutas EFTER effekterna (de får önska) — se nedan
    const dropActive = frame.inZone && nowWall < this.dropBangUntil;                                  // en riktig drop pågår
    // DROP-ENVELOPE: FULL ATTACK (~30ms) på träffen, HÅLL allt på max under
    // dropen, mjuk FADE ner (~1s) när den släpper. Egen effekt — INGEN
    // hårdvaru-strobe (det gav strobe-känslan), bara ljus + färg på max.
    const dTarget = dropActive ? 1 : 0;
    const dRate = dTarget > this.dropEnv ? dtNow / 0.03 : dtNow / 1.0;
    this.dropEnv += Math.max(-dRate, Math.min(dRate, dTarget - this.dropEnv));

    // UPPBYGGNAD: analysatorn räknar riser/novelty och ger oss frame.buildUp (0..1).
    // Reaktionerna (riser-strobe, md-swell, phaseSpread, show-tid) ligger kvar här.

    const count = this.cfg.fixtures.length;

    // Chase state machine — kick advances one step, plus a slow auto-advance
    // so it never stalls in silence. Runs regardless of mode so the head
    // stays coherent when the user switches into it.
    const now = performance.now();
    // TAKTLÅST NÄR TAKTEN HÖRS. Villkoret var cfg.beat, som är sant så fort en
    // takt NÅGONSIN låsts — inte att den stämmer nu. Och auto-framryckningen låg
    // på 320 ms OAVSETT: vid 134 BPM ligger slaget på 448 ms, så auto-steget hann
    // alltid först. Hela vårt BPM-intervall (80–160 = 750–375 ms/slag) ligger över
    // 320 ms → chase free-rullade på ~187 BPM och stegade ~2× per takt, aldrig i
    // takt. Nu: när takten är trovärdig stegar vi PÅ slaget och auto-steget är
    // bara ett skyddsnät långsammare än det långsammaste slaget (750 ms @80 BPM).
    const beatOk = this.beatTrust > 0.5;
    const autoAdvanceMs = beatOk ? 1200 : 320;
    const advance = beatOk ? beatTick : kickHit;
    if (count > 0 && (advance || now - this.lastChaseAdvance > autoAdvanceMs)) {
      this.lastChaseAdvance = now;
      if (this.cfg.chaseStyle === "pingpong" && count > 1) {
        this.chasePos += this.chaseDir;
        if (this.chasePos >= count - 1) { this.chasePos = count - 1; this.chaseDir = -1; }
        else if (this.chasePos <= 0)    { this.chasePos = 0;         this.chaseDir =  1; }
      } else {
        this.chasePos = (this.chasePos + 1) % Math.max(1, count);
      }
    }

    // "smart": välj effekt ur låtens känsla — relativ sektionsenergi (mot en
    // långsam baslinje) väljer tier. Byter bara på tier-byte, drop eller dwell —
    // alltid med minsta hålltid så en effekt hinner läsas (se orkestreringen nedan).
    let effMode: Mode = this.cfg.mode;
    if (this.cfg.mode === "smart") {
      // Energi styr läget → lokal intensitet väljer pool; annars fast medel.
      // Energi RELATIVT låtens eget snitt: en komprimerad signal ligger jämnt
      // högt, så absolut nivå säger inget. Jämför istället mot en långsam
      // baslinje (~30s) → mitten (snittet) = Fart, tydligt över snittet (drop/
      // topp) = Full Fart, tydligt under (breakdown) = Lugn. ±0.15 ger full sving.
      // Sektionsenergin KOMMER FRÅN ANALYSATORN (frame.intensity). Orkestratorn
      // analyserar inte själv — den regisserar bara: väljer tier och effekt.
      // IHALLANDE energi, inte ogonblicksvarde. Tiern lases av i BYTESOGONBLICKET
      // och effekten spelar sedan hela sin dwell (15s+), sa en enda sekunds topp
      // rackte for att lasa in en fullfart-effekt i ett helt mellanparti.
      //   MATT: FULL-effekter spelade 39% av tiden trots att intensiteten lag
      //   over FULL-troskeln (0.78) bara ~7%.
      // En 5s-EMA aker inte med pa spikar men foljer en verklig sektionsandring
      // inom nagra sekunder. Uppat gar den LANGSAMT (maste fortjanas) och nedat
      // snabbt (musiken slapper -> showen ska folja med direkt) - samma
      // dramaturgi som breakdown-regeln.
      // SEKTIONENS EGEN ENERGI SLAR REALTIDENS MEDELVARDE.
      // `tierEma` ar en 5 s-EMA over intensiteten — den kan per definition bara
      // beratta vad som REDAN hant, och en sektion ar oftast igang i flera
      // sekunder innan medelvardet hunnit ikapp. Minnet vet i stallet vad hela
      // sektionen vager redan nar den BORJAR, for tvatten har matt den fardigt
      // pa hela laten. Det ar precis den skillnaden som gor att showen kan MOTA
      // en refrang i stallet for att komma efter den.
      // Realtidsvagen ar orord for okanda latar och som fallback.
      const iNow = this.cfg.energyDrivesMode
        ? (this.memPartEnergy >= 0 ? this.memPartEnergy : frame.intensity)
        : 0.5;
      const iTau = iNow > this.tierEma ? 5.0 : 2.0;
      this.tierEma += (iNow - this.tierEma) * Math.min(1, _dtT / iTau);
      // EN DROP AR BEVISET pa att energin kommit — vanta inte pa medelvardet.
      // `intensity` mater den fras som just TAGIT SLUT, alltsa breakdownen. Utan
      // det har snappet tror dirigenten att musiken ar LUGN i exakt det ogonblick
      // kvallens storsta ogonblick slar till, och valjer en lugn effekt.
      // UPPMATT pa agarens material: vid drops lag tierEma pa 0.09-0.47 i sju av
      // sjutton fall (dvs "lugn"), och tiern hann ikapp forst efter 3.5 s median
      // — plus MIN_HOLD 8 s innan effekten fick bytas. Showen kom alltsa ikapp
      // ett tiotal sekunder EFTER dropen.
      if (dropHit && this.tierEma < 0.75) this.tierEma = 0.75;
      const intensity = this.cfg.energyDrivesMode ? this.tierEma : 0.5;
        // Three tiers by intensity + tempo; user checkboxes (cfg.rotation) pick
        // which modes are in play. Full Fart kräver BÅDE hög energi och högt BPM.
        const LUGN = TIER.lugn;
        const FART = TIER.fart;
        const FULLFART = TIER.full;
        const bpm = this.cfg.beat?.bpm ?? 0;
        const enabled = (list: Mode[]) => list.filter((m) => this.cfg.rotation?.[m] !== false);
        // Fasta trösklar på (relativ) energi. Ingen bpm-sänkning längre — den
        // pushade mellanenergi till Full Fart och byggde på ett opålitligt
        // bpm-oktavvärde. Full Fart kräver en TYDLIG topp långt över snittet
        // (0.78) → reserverad för riktiga drops, inte varje energiskt parti.
        const loThr = 0.34, hiThr = 0.78;
        // TIER-HYSTERES: utan den flaxar tiern så fort intensiteten pendlar kring en
        // gräns → tierChanged blir sann om och om → effektbyte varje minsta-hålltid
        // (mätt: byte var 8.0s spikrakt). Kräv att man går TYDLIGT förbi gränsen för
        // att LÄMNA nuvarande tier (in vid gränsen, ut först HYST därbortom).
        const HYST = 0.08;
        let lo = loThr, hi = hiThr;
        if (this.lastSmartTier === "lugn") lo = loThr + HYST;                       // svårare att lämna lugn
        else if (this.lastSmartTier === "fart") { lo = loThr - HYST; hi = hiThr + HYST; }  // brett fart-band
        else if (this.lastSmartTier === "full") hi = hiThr - HYST;                  // svårare att lämna full
        let tier: Mode[] = intensity < lo ? LUGN : intensity < hi ? FART : FULLFART;
        // Låg-BPM-spärr: en tryckare/ballad ska ALDRIG gå Full Fart, även om dess
        // relativa energi toppar. (bpm 0 = ej låst → ingen spärr.)
        if (bpm > 0 && bpm < 95 && tier === FULLFART) tier = FART;
        const tierName = tier === LUGN ? "lugn" : tier === FART ? "fart" : "full";
        // EFFEKT-ORKESTRERING. En effekt ska hinna LÄSAS av publiken innan nästa
        // kommer — därför byter vi bara på MENINGSFULLA händelser, och alltid med
        // en minsta hålltid:
        //   (a) TIER-BYTE — musiken byter karaktär (breakdown ↔ fart ↔ full fart)
        //   (b) DROP — det dramatiska ögonblicket (rate-limitat, se nedan)
        //   (c) DWELL-timern — showens grundpuls (per stämning)
        // Borttaget: det gamla "bigJump" (|Δintensitet|>0.1). Det var en SJÄLV-
        // ÅTERLADDANDE spärrhake — deltat mättes mot intensiteten VID SENASTE BYTET,
        // som nollställdes vid varje byte, så under en energi-ramp klättrade det
        // förbi tröskeln igen direkt efter varje byte → byte var 2.5:e sekund genom
        // hela uppbyggnaden. Tier-byte + drop täcker de verkligt musikaliska
        // ögonblicken; energi-variation INOM en tier ska effekten själv svara på.
        const tierChanged = this.cfg.energyDrivesMode && tierName !== this.lastSmartTier;
        const held = now - this.lastSmartSwitchMs;
        const MIN_HOLD = 8000;    // en effekt lever ALLTID minst 8s
        const DROP_HOLD = 8000;   // drop byter inte oftare än nagot annat (detektorn fyrar tatt pa pulsande musik)
        // Drop-byte bara när energin får driva → en LUGN stämning (chill,
        // energyDrivesMode av) byter ENBART på dwell-timern, aldrig på drops.
        const dropSwitch = dropHit && this.cfg.energyDrivesMode && held > DROP_HOLD;
        // MINNETS STRUKTUR: en tvättad låt vet var karaktären skiftar och var
        // fraserna börjar. Ett byte DÄR känns komponerat; samma byte 1,5 takt fel
        // känns slumpmässigt. Sektionsgräns = byt gärna nu; frasgräns = ok att byta.
        // Har låten grid väntar dwell-timern in nästa gräns (men max 20 s extra, så
        // showen aldrig fastnar om gridet skulle vara fel).
        const memSection = now - this.memSectionAt < 300;
        const memPhrase = now - this.memPhraseAt < 250;
        const gridOk = !this.memHasGrid || memSection || memPhrase || now > this.smartDwellUntil + 20000;
        // MED STRUKTUR AR SEKTIONEN ENHETEN. Dwell-timern och tier-bytet ar till
        // for OKANDA latar, dar showen inte har nagot battre att ga pa. Har vi en
        // analyserad struktur ska looken sitta HELA sektionen ut — annars byter
        // den mitt i refrangen, vilket ar precis vad man vill undvika.
        //   MATT 2026-08-08 i en och samma refrang: "ny look chase (tier fart)"
        //   foljt 11 s senare av "ny look ripple (tier full)" — tre looker i en
        //   refrang, driven av att tiern flaxade mellan fart och full.
        const wantSwitch = this.memPart
          ? memSection
          : (tierChanged || memSection || now > this.smartDwellUntil);

        // STRUKTUR: analysatorn vet VAR i låten vi är — dirigenten ska lyssna på
        // det, inte bara på energinivån. Två regler, båda dramaturgiska:
        //
        // 1) Byt ALDRIG mitt i en uppbyggnad. Publiken laddar mot dropen, och ett
        //    effektbyte där släpper spänningen precis när den ska byggas. Håll
        //    kvar genom hela risern — då landar bytet i stället PÅ dropen, vilket
        //    är det enda ögonblick där ett byte förstärker musiken.
        const inBuild = frame.inRiser || frame.buildUp > 0.35;
        // 2) I ett breakdown: gå till den lugna poolen oavsett vad energitiern
        //    säger. Tiern hinner inte ner direkt (den är medvetet trög mot flapp),
        //    så utan detta fortsätter riggen köra fullfart genom en svacka.
        const wantCalm = frame.breaking && this.cfg.energyDrivesMode;
        // 3) ETIKETTEN STYR INTE NIVÅN — SEKTIONENS UPPMÄTTA ENERGI GÖR DET.
        //    Här stod tidigare musikaliska schabloner: refräng aldrig lugn, vers
        //    aldrig full fart, intro/outro alltid lugnt. De byggde på att energin
        //    kom från en trög EMA som inte gick att lita på.
        //      MÄTT 2026-08-08, sektionsenergi ur ägarens egna låtar:
        //        #1  intro 0.26 · chorus 0.31 · verse 0.76 · chorus 0.83
        //            · inst 0.91 · chorus 0.45 · inst 0.93 · chorus 0.63 · end 0.07
        //        #3  chorus 0.51 · inst 0.81 · verse 0.96 · chorus 0.66 · end 0.28
        //      Refrängerna varierar mellan 0.31 och 0.83 i SAMMA låt, och i #3 är
        //      VERSEN låtens starkaste parti (0.96). Schablonerna hade tvingat upp
        //      en stillsam refräng och hållit tillbaka en väldig vers — fel åt båda
        //      hållen. Etiketten far darfor styra IDENTITET (samma look aterkommer)
        //      och NAR bytet sker (sektionsgransen), men inte hur starkt det lyser.
        const part = this.memPart;
        const tierS = tier;
        // Ny låt → glöm förra låtens looker.
        if (this.memSongId !== this.partLookSong) { this.partLook.clear(); this.partLookSong = this.memSongId; }
        if (!inBuild && (dropSwitch || (wantSwitch && held > MIN_HOLD && gridOk))) {
        this.lastSmartSwitchMs = now;
        this.lastSmartTier = tierName;
        this.smartDwellUntil = now + (this.cfg.smartDwellMs || 9000);
        let pool = enabled(wantCalm ? LUGN : tierS);
        if (pool.length === 0) pool = enabled([...FART, ...LUGN, ...FULLFART]);      // valfri aktiv
        if (pool.length === 0) pool = ["breathe"];                                   // sista fallback
        this.smartCount++;
        // DIRIGENTEN VÄLJER: poängsätt poolen mot musikens KARAKTÄR (frame.profile)
        // istället för att slumpa. Tydliga basslag → drumkit/gravity/duel; luftig
        // brygga → airglow/wave; tight fyra-på-golvet → snap/rave/gallop.
        // Vi tar inte alltid #1 utan varierar bland de tre bäst passande (gyllene
        // snittet) → matchar musiken men blir aldrig förutsägbar. Nuvarande effekt
        // utesluts så det alltid blir ett verkligt byte.
        // ÅTERSEENDE FÖRE NYHET. Har den här sektionstypen redan haft en look i
        // den här låten, ta tillbaka den — det är hela poängen med att veta att
        // det ÄR en refräng och inte bara "en ny sektion". Passar den inte längre
        // i poolen (energin har flyttat sig) väljs en ny, och den blir sektionens
        // nya look. `wantCalm` går före: ett breakdown ska vara lugnt även om
        // etiketten säger refräng.
        // ATERSEENDET VAGER TYNGRE AN TIERN. Forr kravdes att den ihagkomna
        // looken lag i NUVARANDE tier-pool — men tiern ror sig med energin, sa
        // samma refrang hamnade i "fart" ena gangen och "full" nasta, och looken
        // kastades bort. MATT: "chorus: aterser stege" tva ganger, sedan tre nya
        // looker i rad sa fort tiern gick till full. Kravet ar nu bara att
        // effekten alls ar pasagen av agaren.
        const remembered = !wantCalm && part ? this.partLook.get(part) : undefined;
        if (remembered && this.cfg.rotation?.[remembered] !== false) {
          this.smartMode = remembered;
          console.log(`[dirigent] ${part}: återser "${remembered}"`);
        } else {
          const ranked = pool
            .map((m) => ({ m, s: fitScore(m, frame.profile) }))
            .sort((a, b) => b.s - a.s);
          const cands = ranked.filter((x) => x.m !== this.smartMode);
          const top = (cands.length ? cands : ranked).slice(0, 3);
          this.smartMode = top[Math.floor(((this.smartCount * 0.61803398875) % 1) * top.length)].m;
          if (part && !wantCalm) {
            this.partLook.set(part, this.smartMode);
            console.log(`[dirigent] ${part}: ny look "${this.smartMode}" (tier ${tierS === LUGN ? "lugn" : tierS === FART ? "fart" : "full"})`);
          }
        }
      }
      effMode = this.smartMode;
    }
    this.activeMode = effMode;

    // REGI-LAGER: räkna takter → byt färgpalett var N:e takt (musikalisk fras) i
    // smart-läget, så showen känns designad och utvecklas över tid istället för
    // att slumpa färg. Paletten väljs efter klangen (centroid): mörk/bastung →
    // varmt, ljus/diskantig → svalt. Övergången sker mjukt via färg-ballistiken.
    if (this.cfg.mode === "smart") {
      if (frame.bpm === 0) this.phraseBeat = 0;            // tyst/ej låst → nollställ frasen
      // Räkna bara takter när BPM är PÅLITLIGT (confidence) → palettbytena
      // hamnar på riktiga fraser, inte på ett hoppigt/osäkert tempo.
      else if (beatTick && frame.bpmConfidence > 0.35 && ++this.phraseBeat >= this.phraseBeats) {
        this.phraseBeat = 0;
        this.pickPalette(frame.centroid);
      }
      setPalette(PALETTES[this.paletteIdx].sectors);
    } else {
      setPalette(ALL_SECTORS);                             // manuella lägen: obegränsad färg
    }

    // Advance the wave phase by dt so speed changes glide instead of jumping.
    const dtSec = Math.min(0.1, (now - this.lastRenderMs) / 1000);
    this.lastRenderMs = now;
    // Silence gate: below threshold for 250 ms → fade the effect out over ~0.25 s
    // (aggressive so the light sits tight to the audio); music back → fade in fast.
    // The warm ambient glow (below) takes over so a gap lands on amber, not black.
    // Gain-aware threshold: at high AGC gain the amplified noise floor sits well
    // above 0.05 and reads as flicker — real (even weak) music still lands near
    // the AGC target and passes.
    // INGÅNGEN AVSTÄNGD: ligger nivån stabilt under INPUT_OFF_LEVEL är det inte ett
    // tyst parti i musiken utan att källan är av (eller kabeln ur). Då ska riggen vara
    // MÖRK — inte vila på den varma glöden. Kravet på uthållighet gör att ett verkligt
    // break i låten (som dippar men kommer tillbaka) aldrig råkar släcka showen.
    if (frame.level >= INPUT_OFF_LEVEL) this.inputLowSince = 0;
    else if (!this.inputLowSince) this.inputLowSince = now;
    this.inputOff = !!this.inputLowSince && now - this.inputLowSince > INPUT_OFF_MS;

    const silenceThreshold = 0.05 * Math.max(1, frame.gain / 3);
    if (frame.level > silenceThreshold || kickHit) this.lastActiveMs = now;
    const gateTarget = now - this.lastActiveMs > 250 ? 0 : 1;
    const gateRate = gateTarget > this.silenceGate ? dtSec / 0.1 : dtSec / 0.25;
    this.silenceGate += Math.max(-gateRate, Math.min(gateRate, gateTarget - this.silenceGate));
    // Warmup-räknare för baslinjen: ackumulera medan aktiv, nollställ vid tystnad.
    if (this.silenceGate > 0.5) this.warmMs += dtSec * 1000; else this.warmMs = 0;
    if (effMode === "wave") this.wavePhase += dtSec * (1.6 + audio * 4);

    // Drops: each beat/kick fires the next lamp in a fresh pure color.
    // Samma sak för drops: läste frame.kick i render (100 Hz) → aliasat, OCH
    // fyrade på både kick och grid-slag → upp till 2 tändningar per takt.
    // En tändning per slag när takten hörs, annars på den edge-säkra kicken.
    const dropAdvance = this.beatTrust > 0.5 ? beatTick : kickHit;
    if (effMode === "drops" && count > 0 && dropAdvance && now - this.lastDropAdvance > 140) {
      this.lastDropAdvance = now;
      this.dropCount++;
      // Golden-ratio walk over the lamps too — mixed order, never the same
      // lamp twice in a row, all lamps hit evenly.
      this.dropPos = Math.floor(((this.dropCount * 0.61803398875) % 1) * count);
      this.dropSector = mixedSector(this.dropCount);
      this.dropFired[this.dropPos] = now;
      this.dropHue[this.dropPos] = this.dropSector / 6;
    }

    // Varm ambient-vila: efter ~2.5 s HELT tyst tonar lamporna mot en dämpad
    // varm glöd (bärnsten) istället för svart → mysig lounge-känsla när musiken
    // tystnar/byts. Tonar in långsamt (1.5 s), ut snabbt (0.1 s) när musik åter.
    // ADAPTIV TYSTNADS-LANDNING: spåra hur länge musiken pumpat (hotMs). Kort
    // spelning → snabb dip till bärnsten (~1.2s); efter en lång stund (flera min)
    // → mjuk, värdig landning (~6s). Ger dansgolvet en snygg avslutning.
    if (this.silenceGate > 0.6) this.hotMs = Math.min(600000, this.hotMs + dtSec * 1000);
    if (this.ambient > 0.8) this.hotMs = Math.max(0, this.hotMs - dtSec * 2000);   // klingar av i djup vila
    // Börja tona in glöden så fort gaten släckt effekten (~0.6s) i stället för att
    // vänta 2.5s → inget svart fönster mellan "effekt ute" och "glöd inne" vid låtglapp.
    const ambTarget = now - this.lastActiveMs > 600 ? 1 : 0;
    const landTau = 1.2 + Math.min(1, this.hotMs / 180000) * 5;   // 1.2s .. 6.2s efter lång spelning
    const ambRate = ambTarget > this.ambient ? dtSec / landTau : dtSec / 0.1;   // in: adaptivt, ut: snabbt
    this.ambient += Math.max(-ambRate, Math.min(ambRate, ambTarget - this.ambient));
    const ambLvl = this.cfg.ambientGlow ? this.ambient * 0.22 : 0;   // vilo-glöd (opt-in); ljus-tak läggs i cal-remappen
    // VÄNTELÄGE: efter 90 s utan ljud tonar en långsam, tydligt AVSIKTLIG andning
    // in (5 s period). Den är medvetet trög och svag — den ska läsas som "den
    // lever och väntar", inte som en show. In långsamt (3 s) så den inte poppar
    // upp mitt i en paus; ut snabbt (0.4 s) så första takten tar över direkt.
    const deafTarget = now - this.lastActiveMs > EffectEngine.DEAF_AFTER_MS ? 1 : 0;
    this.deafFade += Math.max(-dtSec / 0.4, Math.min(dtSec / 3, deafTarget - this.deafFade));
    const breathe = 0.5 - 0.5 * Math.cos((now / 5000) * Math.PI * 2);
    const deafLvl = this.deafFade * (0.06 + 0.14 * breathe);
    // Samma bärnstens-kanal som vilo-glöden; den starkare av de två vinner så
    // lägena inte adderas till något ljusare än någon av dem var tänkt att vara.
    const restLvl = Math.max(ambLvl, deafLvl);
    // DIREKT VU-FILTER: den INGÅENDE ljudnivån styr den UTGÅENDE ljusstyrkan
    // direkt, som ett SISTA filter efter allt annat (effekter, beatPulse, ...).
    // Effekterna formar fortfarande sitt eget ljus; VU:n justerar slutresultatet
    // mot den råa nivån. BARA en drop får skippa filtret (går fram på full).
    let ceilMul = 1;
    if (this.memCeiling !== null) {
      // MINNESTAK: låten är igenkänd och tvättad → vi VET kurvan i förväg. Den är
      // normaliserad (p5..p95) och sekundmjuk, så full dynamik utan en enda
      // fladder-risk. Live-VU:n (som fladdrade vid höga nivåer) står åt sidan.
      const MEM_FLOOR = 0.20;
      ceilMul = Math.max(MEM_FLOOR + (1 - MEM_FLOOR) * this.memCeiling, this.dropEnv);
    } else if (this.cfg.energyCeiling) {

      // LÖPANDE NORMALISERING: samma kurva som minnestaket, räknad kausalt. Rå VU
      // är en ABSOLUT skala → platt i tysta låtar, mättad i höga. Auto-rangen
      // mappar nivån mot låtens EGNA p5..p95 så dynamiken blir full oavsett hur
      // hårt mastrad låten är, utan att veta vilken låt det är.
      // frame.levelVU = ~200ms smoothat PÅ HOP-TAKT (375Hz) i analysatorn → ser alla
      // hops, mycket lägre jitter än att smootha rå-nivån efter render-decimering (som
      // aliasade per-hop-rippel till synligt flimmer). En lätt ~90ms-glidning här
      // utjämnar sista resten utan lång svans. (Drop bypassar via dropEnv nedan.)
      const lvl = Math.max(0, Math.min(1, frame.levelVU));
      this.range.push(lvl, dtSec);
      const vuRaw = this.range.norm(lvl);
      // ASYMMETRISK VU: snabb UPP (transienter/drops syns), langsam NER (inget
      // fladder). MATT: med symmetriska 90 ms fladdrade riggen synligt vid MAX
      // ljusstyrka — dar VU:n ror sig 0.8-1.0 och taket appliceras EFTER
      // ballistiken, alltsa helt outjamnat. Av/pa-test av energyCeiling
      // isolerade det: flimret forsvann helt med taket av, och en lampa pa
      // ratt DMX 255 stod samtidigt HELT stabil (= hardvaran ar frisk).
      // MJUKARE TAK ("soothing"): 0.12/0.60 → 0.25/0.85. Den snabba attacken lät taket
      // hoppa upp på varje transient; med en längre uppgång andas det med låten i
      // stället för att rycka. Hjärtslaget står för det snabba — taket för nivån.
      // Ytterligare mjukat: 0.25/0.85 → 0.45/1.20. Taket ska följa låtens NIVÅ, inte
      // dess anslag — allt snabbt kommer från hjärtslaget. Priset är att en verklig
      // nivåändring (vers → refräng) tar en halv sekund extra att slå igenom.
      const vuTau = vuRaw > this.vu ? 0.45 : 1.20;
      this.vu += (vuRaw - this.vu) * (1 - Math.exp(-dtSec / vuTau));
      // KLUBB-LÄGE: kvadrera → hård kontrast (mörkt mellan, explosion på topp).
      // Kvadreringen biter nu på den NORMALISERADE kurvan → meningsfull i alla låtar.
      const vuBase = this.cfg.clubMode ? this.vu * this.vu : this.vu;
      // VU-GOLV: mappa om VU-spannet så det ALDRIG drar ner under VU_FLOOR. 0% VU →
      // VU_FLOOR, 100% VU → 100%, linjärt. Håller riggen närvarande i tysta partier
      // (i st.f. att krossas mot tändpunkten där bruset strobar) utan att döda
      // dynamiken. OBS: golvet gäller MULTIPLIKATORN → en effekt som skickar 0
      // (avsiktlig blackout) blir fortfarande 0; äkta TYSTNAD tonas bort av
      // silenceGate i master (effekt→0), inte här. Klubb-läget floras också.
      const VU_FLOOR = 0.20;
      const vuFilter = VU_FLOOR + (1 - VU_FLOOR) * vuBase;
      // BARA DROP skippar VU-golvet: dropEnv (0..1) lyfter taket till full under
      // det korta drop-fönstret, annars styr den golvade VU:n direkt.
      ceilMul = Math.max(vuFilter, this.dropEnv);
    }
    // Ljus-boost: swell UNDER uppbyggnaden (riser) → EXPLOSION på dropen.
    // OBS: ceilMul appliceras INTE här — det läggs sist (efter ballistiken) så
    // VU-taket följer nivån direkt utan effekt-ballistikens nedåt-släp.
    const md = drive * (1 + frame.buildUp * 0.35 + this.dropEnv * 0.8);

    // SCENISKT DJUP (scenic anchor): i "alla-flänger"-lägena hålls mittlamporna
    // som FASTA uplights i en djup, mättad palettfärg (~40%) medan ytterlamporna
    // kör full gas. Ger arkitektoniskt djup — rörelsen poppar mot en stabil bas.
    // Antar lampor i rad V→H (ägar-toggle). Grupp-effekterna (rave/flip/gallop/
    // twin) har redan rumslig struktur → undantagna.
    const ANCHOR_MODES = new Set<Mode>(["party", "snap", "bounce", "strobe", "chase", "wave"]);
    const useAnchor = this.cfg.scenicAnchor && count >= 3 && ANCHOR_MODES.has(effMode);
    const anchorPal = currentPalette();
    const anchorHue = (anchorPal[anchorPal.length - 1] ?? 0) / 6;   // palettens djupaste ton


    // ── EFFEKT-KONTEXT (framräknat en gång per frame; idx/fx/band muteras per
    // lampa så samma objekt återanvänds → ingen allokering i loopen) ──────────
    const hasBeat = beatLocked(this.cfg.beat);
    const beatFrac = beatPhase(this.cfg.beat, Date.now(), this.showLead);
    // TAKT-RÄKNARE med graceful degradation: stegar på GRID-slaget (beatTick) när
    // BPM är låst, annars på VERKLIGA kicks (frame.kick). Så grid-effekterna
    // (snap/rave/party/ripple/…) fortsätter dansa på trummorna även när BPM-låset
    // tappas, i st.f. att frysa på beatIdx=0. Alla effekter använder beatIdx
    // MODULÄRT (färg/grupp/position) → ren drop-in.
    const beatHit = beatTick || (!hasBeat && kickHit);   // DISKRET flank: takten gick just fram (grid-slag, annars verklig kick)
    if (beatHit) this.beatCounter++;
    const beatIdx = this.beatCounter;
    // beatPulse: grid-puls när låst, annars den VERKLIGA kick-envelopen → pulsar
    // ALLTID på musiken. (Utan detta gav beatFrac=0 → beatPulse=1 konstant = ingen
    // puls när BPM ej låst → party/pulse/bounce lyste bara jämnt högt.)
    const beatPulse = hasBeat ? Math.pow(1 - beatFrac, 2) : kickEnv;
    const beatMs2 = beatPeriod(this.cfg.beat);
    const tempoDeep = Math.max(0, Math.min(1, (beatMs2 - 340) / 260));   // 0 snabbt .. 1 långsamt
    const punchFloor = 0.5 - tempoDeep * 0.42;                            // 0.5 (snabbt) .. 0.08 (långsamt)
    // Per-lampa frekvensband (driver aurora/twin + fixture.bands).
    // NU ur dubbel-FFT:ns separerade, per-band-AGC-spektrum i stället för det grova
    // 512-trebandet → renare, mer musikaliskt per-lampa-svar som alltid nyttjar range.
    const s = frame.spec;
    const bands = [
      Math.max(s.kick, s.bass),                                       // "bass": låg-end (kick+bas)
      Math.max(s.lowMid, s.mid),                                      // "mid": röst/synth/virvel
      Math.max(s.treble, s.air),                                      // "treble": hi-hats/cymbaler/luft
      Math.min(1, Math.max(s.kick, frame.onset.kick) * 0.6 + kickEnv * 0.6),  // "kick": transient
      Math.max(0, (0.5 - audio) * 2) * 0.6,                           // "low": lugn glöd när tyst, ur vägen när högt
    ];
    const BAND_IDX = { bass: 0, mid: 1, treble: 2, kick: 3, low: 4 } as const;
    // DRUM-KIT onset-envelopes: nu FÄRDIGBERÄKNADE i analysern PÅ HOP-TAKT (375Hz)
    // → varje anslag fångas, aldrig missat mellan två render-frames. Effekten är en
    // ren konsument. (Flyttat hit; tau 60/110/150ms bevarade i analyser.ts.)
    const drum = frame.drum;
    const dyn = Math.max(0, Math.min(1, this.cfg.dynamics ?? 0.6));
    const shaped = (floor: number, x: number) => {
      const f = floor * (1 - dyn);
      return Math.min(1, f + (1 - f) * Math.pow(Math.max(0, Math.min(1, x)), 1 + dyn * 1.2));
    };
    const mclk = (beatsPerStep: number, secPerStep: number) =>
      hasBeat ? Math.floor(beatIdx / beatsPerStep) : Math.floor(t / secPerStep);
    // GRAVITATIONS-VU: ljudet knuffar nivån UPP; sen faller den med gravitation.
    // En separat peak-prick håller senaste toppen och sjunker långsamt.
    // Knuffas UPP av låg-enden (kick-anslag + bas), inte av bred-bandsnivån →
    // varje kick är en fysisk knuff uppåt, sen faller den. Litet audio-golv så
    // sustained höga partier håller den delvis uppe.
    const gPush = Math.max(frame.onset.kick, frame.spec.sub, frame.spec.bass * 0.9, audio * 0.4);
    if (gPush > this.gravLevel) { this.gravLevel = gPush; this.gravVel = 0; }   // knuff upp
    else { this.gravVel -= 2.8 * dtSec; this.gravLevel = Math.max(0, this.gravLevel + this.gravVel * dtSec); }
    if (this.gravLevel > this.gravPeak) this.gravPeak = this.gravLevel;
    else this.gravPeak = Math.max(0, this.gravPeak - 0.45 * dtSec);   // peak sjunker långsamt
    // Effekternas önskemål om specialenheter, samlade över lamporna.
    let wantStrobe = 0, wantBlinder = 0, wantUv = 0, wantLaser = 0, wantHazer = 0, wantCo2 = 0, wantFogFx = false;
    const effect = EFFECT_MAP.get(effMode);
    const ctx: EffectContext = {
      cfg: this.cfg, frame, fx: undefined, t, idx: 0, count, want: {},
      audio, kickEnv, punch: bassPunch, dropEnv: this.dropEnv, band: 0, gravLevel: this.gravLevel, gravPeak: this.gravPeak, drum,
      beatIdx, beatFrac, beatPulse, beatHit, hasBeat,
      wavePhase: this.wavePhase, buildUp: frame.buildUp, phaseSpread: 1 + frame.buildUp * 2.5,
      punchFloor, chasePos: this.chasePos,
      dropFired: this.dropFired, dropHue: this.dropHue, now: performance.now(),
      mixedSector, mclk, hsv: hsvToRgb, shaped,
    };

    // RISER-STROBE (helrigg): under en uppbyggnad accelererar en strobe (3→18 Hz)
    // och färgen kollapsar mot vitt → klassisk EDM-build. Blackouten på själva
    // dropen sköts redan separat. Beräknas en gång/frame.
    // FREKVENSEN ÄR TAKAD. Blinkande ljus kan utlösa epileptiska anfall; risken
    // är störst mellan ~15 och 25 Hz och värst när HELA synfältet blinkar
    // synkront i vitt — vilket är precis vad det här gör. Den gamla rampen gick
    // till 18 Hz, rakt in i det värsta bandet. Taket är nu 3 Hz (WCAG 2.3.1 och
    // rundradions gräns för allmänt säkert innehåll). Ägaren kan höja det, men
    // bara genom ett uttryckligt val — aldrig som en bieffekt av något annat.
    const rs = this.cfg.riserStrobe && frame.buildUp > 0.25;
    const maxHz = this.cfg.strobeUnlimited ? EffectEngine.STROBE_MAX_HZ : EffectEngine.STROBE_SAFE_HZ;
    const hz = Math.min(maxHz, 1.5 + frame.buildUp * (maxHz - 1.5));
    const rsWhite = rs ? frame.buildUp * 0.7 : 0;
    const rsGate = rs ? (Math.floor(t * hz) % 2 === 0 ? 1 : 0.12) : 1;

    // SPECIALKANALER (hazer/uv/blinder/strobe/laser/co2). Effektens `drives`-tagg
    // avgör om motorn tänder dem denna frame. Värdena hämtas från samma signaler
    // som färg-renderingen: audio-nivå, kick, drop, riser-strobe. Roller utan
    // matchande drive-tagg = 0 (svart) → knivskarp av/på, ingen läckage mellan
    // effekter. Kanalerna maskas ur ballistiken längre ner (samma spår som
    // strobe) så pulser inte tonas ut och sätter fixtures i mellanhastigheter.
    const drivesSet = effect?.drives ? new Set<string>(effect.drives) : null;
    const has = (r: string) => !!drivesSet && drivesSet.has(r);
    const clamp255 = (x: number) => x < 0 ? 0 : x > 255 ? 255 : Math.round(x);
    const specialty = {
      hazer:   has("hazer")   ? clamp255(Math.max(140 + audio * 60, wantHazer * 255)) : 0,
      uv:      has("uv")      ? clamp255(Math.max(180 * md, wantUv * 255)) : 0,
      blinder: has("blinder") ? clamp255(Math.max(kickEnv * 255, this.dropEnv > 0.6 ? 255 : 0, wantBlinder * 255)) : 0,
      strobe:  has("strobe")  ? clamp255(Math.max(effMode === "strobe" ? 210 : (rs ? 220 : 0), wantStrobe * 255)) : 0,
      laser:   has("laser")   ? clamp255(Math.max(180 + audio * 75, wantLaser * 255)) : 0,
      co2:     has("co2")     ? clamp255(Math.max(this.dropEnv > 0.85 ? 255 : 0, wantCo2 * 255)) : 0,
    };

    for (let i = 0; i < count; i++) {
      const fx = this.cfg.fixtures[i];
      const isAnchor = useAnchor && i > 0 && i < count - 1;   // mittlamporna = ankare
      let rgb: [number, number, number];
      if (isAnchor) {
        rgb = hsvToRgb(anchorHue, 1, 0.4 + 0.06 * Math.sin(t * 0.5 + i));   // fast pelare, knappt levande andning
      } else {
        ctx.idx = i;
        ctx.fx = fx;
        ctx.want.strobe = undefined; ctx.want.blinder = undefined;
        ctx.want.uv = undefined; ctx.want.laser = undefined; ctx.want.fog = undefined;
        ctx.want.hazer = undefined; ctx.want.co2 = undefined;
        ctx.band = fx?.bands?.length ? Math.max(...fx.bands.map((b) => bands[BAND_IDX[b]])) : bands[i % bands.length];
        rgb = effect ? effect.render(ctx) : [0, 0, 0];
        // EFFEKTENS ÖNSKEMÅL. Den vet sin egen dramaturgi bäst; motorn avgör om det
        // blir av (fixturen måste ha rollen, och rök går genom hårdvaruskyddet).
        // Högsta önskemål bland lamporna vinner — en effekt som vill stroba på EN
        // lampa menar rimligen hela riggens strobe.
        if (ctx.want.strobe !== undefined) wantStrobe = Math.max(wantStrobe, ctx.want.strobe);
        if (ctx.want.blinder !== undefined) wantBlinder = Math.max(wantBlinder, ctx.want.blinder);
        if (ctx.want.uv !== undefined) wantUv = Math.max(wantUv, ctx.want.uv);
        if (ctx.want.laser !== undefined) wantLaser = Math.max(wantLaser, ctx.want.laser);
        if (ctx.want.hazer !== undefined) wantHazer = Math.max(wantHazer, ctx.want.hazer);
        if (ctx.want.co2 !== undefined) wantCo2 = Math.max(wantCo2, ctx.want.co2);
        if (ctx.want.fog) wantFogFx = true;
      }
      if (rs) {   // riser-strobe: vit-kollaps + accelererande gate
        rgb[0] = (rgb[0] + (1 - rgb[0]) * rsWhite) * rsGate;
        rgb[1] = (rgb[1] + (1 - rgb[1]) * rsWhite) * rsGate;
        rgb[2] = (rgb[2] + (1 - rgb[2]) * rsWhite) * rsGate;
      }
      if (this.dropEnv > 0.005) {
        const dc = hsvToRgb(mixedSector(this.dropSector + i) / 6, 1, 1);
        const vitKarna = Math.max(0, (this.dropEnv - 0.6) / 0.4);   // bara vid toppen
        const k = this.dropEnv;
        for (let c = 0; c < 3; c++) {
          rgb[c] += ((dc[c] + (1 - dc[c]) * vitKarna) - rgb[c]) * k;
        }
      }
      const strobeVal = effMode === "strobe" ? 210 : 0;
      // Effekt (master inkl. silenceGate → tonar ut på tystnad) + varm ambient-glöd in.
      rgb[0] = rgb[0] * md + 1.00 * restLvl;
      rgb[1] = rgb[1] * md + 0.30 * restLvl;
      rgb[2] = rgb[2] * md + 0.00 * restLvl;
      this.out.writeFixture(this.universe, fx, rgb, 1, strobeVal, specialty);
    }

    // Output ballistics on color/dim channels (never strobe/mode channels —
    // a decaying strobe value would sweep through real strobe speeds).
    // Snappare fade-out i energiska lägen så pumpen syns; lugna behåller mjukheten.
    const fastMode = effMode === "party" || effMode === "snap" || effMode === "bounce" || effMode === "drops" || effMode === "rave" || effMode === "drumkit" || effMode === "duel";
    const beatMsNow = beatPeriod(this.cfg.beat);
    const fastTau = Math.max(0.14, Math.min(0.3, beatMsNow * 0.5 / 1000));
    // TRANSIENT-SKÄRPA: hög energi/riser → kort decay (knivskarp piska på varje
    // transient); låg energi → lång decay (mjuk andande wash). Utnyttjar diodernas
    // snabba respons — skarpt utan hårdvaru-strobe.
    const sharpen = Math.min(0.65, audio * 0.45 + frame.buildUp * 0.5);   // 0 lugnt .. 0.65 energiskt
    const tau = Math.max(0.08, (fastMode ? fastTau : (this.cfg.calmDecay ?? 0.42)) * (1 - sharpen));
    const decay = Math.exp(-dtSec / tau);
    // Bygg strobe-masken bara när fixtures ändras (inte varje frame).
    this.out.build(this.cfg.fixtures);
    this.maxCh = this.out.maxCh;
    // EFTERBEHANDLING: ballistik → ljustak → hjärtslag → blackout → kalibrering →
    // headroom. Ordningen och motiven bor i postprocess.ts; här räknas bara VAD som
    // ska gälla den här rutan. Drop-undantagen bakas in innan de skickas vidare.
    this.post.apply(this.universe, this.out, {
      dtSec,
      decay,
      ceilMul,
      pulseMul: Math.max(this.beatMulNow, this.dropEnv),
      ceilingActive: (this.cfg.energyCeiling || this.memCeiling !== null) && this.silenceGate > 0.5,
      // MATNING (grindar inget): nar nivan ar LAG, vad ar det som anda haller
      // ljuset uppe? Varje steg i kedjan loggas sa orsaken kan pekas ut i stallet
      // for gissas. Strypt till var 1,5 s.
      ...(frame.level < 0.35 && Date.now() - this.lowLogAt > 1500
        ? (this.lowLogAt = Date.now(), console.log(
            `[lagniva] niva ${frame.level.toFixed(3)} vu ${this.vu.toFixed(2)} tak ${ceilMul.toFixed(2)}` +
            ` puls ${this.beatMulNow.toFixed(2)} drive ${this.silenceGate.toFixed(2)} md ${md.toFixed(2)}` +
            ` intensitet ${frame.intensity.toFixed(2)} effekt ${this.smartMode}`), {})
        : {}),
      pulseActive: !!this.cfg.beatPulse && this.silenceGate > 0.5,
      blackout: blackout || this.inputOff,
      master: this.cfg.master ?? 1,
      fixtures: this.cfg.fixtures,
      headroomCap: this.cfg.dropHeadroom ? Math.round(255 * Math.min(1, 0.90 + 0.10 * this.dropEnv)) : -1,
      nowMs: performance.now(),
    });

    // Rök: motorn avgör OM den ska spruta, output-tjänsten var signalen hamnar.
    // RÖK: motorn samlar önskemålen — drop, manuell knapp, eller en effekt som bett om
    // det — och output-tjänsten avgör om maskinen KAN (värmebudget, cooldown, nödstopp).
    if (fog) {
      const wantBurst = (dropHit && fog.onDrop) || this.cfg.fogTrigger || wantFogFx;
      if (this.cfg.fogTrigger) this.cfg.fogTrigger = false;   // engångs-flagga
      const spraying = this.out.fogTick(nowWall, _dtT * 1000, wantBurst, fog);
      if (fog.enabled) this.out.writeFog(this.universe, fog.address, spraying ? fog.level : 0);
    }
    return this.universe;
  }
}


