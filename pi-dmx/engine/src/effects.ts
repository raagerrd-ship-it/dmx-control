/**
 * Effect engine: consume Frames from the analyser, write a 512-byte DMX
 * universe.
 *
 * Each fixture in cfg.fixtures gets rendered based on its index. Fixture
 * channel-layout is honored (RGB / RGBW / dimmer).
 */

import type { EngineConfig, FixtureConfig, Mode } from "./config.js";
import { fixtureRoles } from "./config.js";
import type { Frame } from "./analyser.js";
import { EFFECT_MAP, TIER } from "./effects/registry.js";
import { fitScore } from "./effects/fit.js";
import { PALETTES, ALL_SECTORS, setPalette, currentPalette, mixedSector } from "./effects/palette.js";
import { hsvToRgb } from "./effects/color.js";
import type { EffectContext } from "./effects/types.js";

export class EffectEngine {
  private universe = new Uint8Array(512);
  /** Utjamnad tilltro till takten (0..1) — styr beatPulse-djupet. */
  private beatTrust = 0;
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
  private smartDwellUntil = 0;
  private warmMs = 0;
  private ambient = 0;   // 0 = spelar, 1 = varm vila (efter ~2.5s tystnad)
  private bassBaseline = 0.35;   // bas-golv (tyst basnivå) för bas-punch
  private lastDropCount = 0;   // senast hanterade frame.dropCount → edge-säker drop-flank
  private dropBangUntil = 0;     // drop-fönster (max-håll upp till ~8s efter träff)
  private dropEnv = 0;           // drop-envelope: full attack → håll → mjuk fade
  private fogUntil = 0;          // rökmaskin: pågående blast till (wall-clock ms)
  private lastFogMs = -1e9;      // senaste blast (för cooldown)
  // NOVELTY-UPPBYGGNADS-DETEKTOR: spektral novelty leder dropen (mätt validerat).
  private hotMs = 0;             // hur länge musiken pumpat → adaptiv tystnads-landning
  private wasBreaking = false;   // flankdetektor för nivå-svacka (drop-blackout)
  private blackoutUntil = 0;     // dramaturgisk tystnad: kolsvart till (wall-clock ms)
  private vu = 0;                // direkt VU-envelope (snabb attack / ~180ms release) för ljustaket
  private gravLevel = 0;         // gravitations-VU: nivå som faller med gravitation
  private gravVel = 0;           // dess hastighet
  private gravPeak = 0;          // peak-håll (sjunker långsamt)
  /** Silence gate: fade the whole rig to black when no music plays. */
  private lastActiveMs = performance.now();
  private silenceGate = 1;
  /** Output ballistics: per-channel soft ~25ms attack + exponential decay — the
   *  eye sees a fast rise and a soft fall (~0.1–0.4 s), whatever the modes do. */
  private outSmooth = new Float32Array(512);
  private calHoldVal = new Float32Array(512);   // släpp-håll: senaste TÄNDA kalibrerade värdet
  private calHoldUntil = new Float32Array(512);  // släpp-håll: deadline (performance.now ms) att hålla till
  private strobeMask = new Uint8Array(512);   // 1 = hoppa ballistik (strobe-kanal)
  private capMask = new Uint8Array(512);      // 1 = VU-taket skalar denna kanal (ljusbärande: färg, annars dim)
  private strobeMaskFor: unknown = null;      // fixtures-referens masken byggdes för
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
  private lastRenderMs = performance.now();

  constructor(private cfg: EngineConfig) {}

  /** AKUSTISK TRÖGHET: varje bastransient (kick) knuffar show-tiden framåt.
   *  Anropas i 375 Hz-chunkhanteraren så inga slag missas (render kör 100 Hz).
   *  strength ~0.4..1.0 (skalas av basens styrka). Friktionen i render() bromsar. */
  registerKick(strength: number): void {
    this.pendingKick += Math.min(1.5, Math.max(0, strength));
  }

  render(frame: Frame): Uint8Array {
    // Fri-rullande "show-tid": normalt 1× realtid, men accelererar under en
    // uppbyggnad (buildUp från förra framen) så mönstren snabbar upp mot dropen.
    // Ackumulerad → kontinuerlig, inga hopp.
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
    if (frame.kick) this.lastKickBoost = performance.now();

    // BPM-taktklocka → förutsagt slag: pulsa i låtens exakta tempo, fas-låst av
    // beat-PLL:en (index.ts riktar ankaret mot faktiska kicks). Bättre än ren
    // kick-detektion på en komprimerad signal som fyrar glest.
    let beatEnv = 0;
    let beatTick = false;
    const beat = this.cfg.beat;
    if (beat && beat.bpm > 40) {
      const beatMs = 60000 / beat.bpm;
      const since = Date.now() - beat.anchorMs;
      const phase = ((since % beatMs) + beatMs) % beatMs / beatMs;
      beatEnv = Math.pow(1 - phase, 2);
      const beatIdx = Math.floor(since / beatMs);
      if (beatIdx !== this.lastBeatIdx) { this.lastBeatIdx = beatIdx; beatTick = true; }
    }
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
      writeFixture(this.universe, this.cfg.fixtures[id.index], [1, 1, 1], 1);
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
        const trustRaw = Math.max(0, Math.min(1, (frame.bpmConfidence - 0.35) / 0.25));
        this.beatTrust += (trustRaw - this.beatTrust) * 0.03;
        const depth = 0.55 * this.beatTrust;
        const beatMul = this.cfg.beatPulse ? (1 - depth) + depth * beatEnv : 1;
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
    const drive = this.silenceGate * beatMul;
    // Synlig punch: en hård basstöt (eller drop-flash) BLOOMAR färgen till full
    // styrka — inte bara ljusare master (som är osynligt när effekten redan lyser).
    // DROP: analysatorn AVGÖR om det är en drop (frame.dropCount är MONOTON). Vi
    // jämför mot vårt senast hanterade värde → flanken kan ALDRIG missas trots att
    // rendern går långsammare än analysen (en enframs-boolean hade aliaserats bort).
    // Här ligger bara show-REAKTIONEN: accent-fönster, blackout, rök, envelope.
    const dtNow = Math.min(0.1, (performance.now() - this.lastRenderMs) / 1000);
    const dropHit = frame.dropCount !== this.lastDropCount;
    this.lastDropCount = frame.dropCount;
    if (dropHit) this.dropBangUntil = nowWall + 2000;                                          // drop-accent (kort — max 2s)
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
    // RÖKMASKIN: blast på drop (duty-cycle-skyddad) + manuell puff.
    const fog = this.cfg.fog;
    if (fog?.enabled) {
      const wantBurst = (dropHit && fog.onDrop) || this.cfg.fogTrigger;
      if (this.cfg.fogTrigger) this.cfg.fogTrigger = false;                                      // engångs-flagga
      if (wantBurst && nowWall - this.lastFogMs > fog.cooldownMs) {
        this.fogUntil = nowWall + fog.burstMs;
        this.lastFogMs = nowWall;
      }
    }
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
    const autoAdvanceMs = 320;   // ~185 bpm floor
    // Beat-locked when synced: step ON the beat instead of after the kick.
    const advance = this.cfg.beat ? beatTick : frame.kick;
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
      const intensity = this.cfg.energyDrivesMode ? frame.intensity : 0.5;
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
        const wantSwitch = tierChanged || now > this.smartDwellUntil;
        if (dropSwitch || (wantSwitch && held > MIN_HOLD)) {
        this.lastSmartSwitchMs = now;
        this.lastSmartTier = tierName;
        this.smartDwellUntil = now + (this.cfg.smartDwellMs || 9000);
        let pool = enabled(tier);
        if (pool.length === 0) pool = enabled([...FART, ...LUGN, ...FULLFART]);      // valfri aktiv
        if (pool.length === 0) pool = ["breathe"];                                   // sista fallback
        this.smartCount++;
        // DIRIGENTEN VÄLJER: poängsätt poolen mot musikens KARAKTÄR (frame.profile)
        // istället för att slumpa. Tydliga basslag → drumkit/gravity/duel; luftig
        // brygga → airglow/wave; tight fyra-på-golvet → snap/rave/gallop.
        // Vi tar inte alltid #1 utan varierar bland de tre bäst passande (gyllene
        // snittet) → matchar musiken men blir aldrig förutsägbar. Nuvarande effekt
        // utesluts så det alltid blir ett verkligt byte.
        const ranked = pool
          .map((m) => ({ m, s: fitScore(m, frame.profile) }))
          .sort((a, b) => b.s - a.s);
        const cands = ranked.filter((x) => x.m !== this.smartMode);
        const top = (cands.length ? cands : ranked).slice(0, 3);
        this.smartMode = top[Math.floor(((this.smartCount * 0.61803398875) % 1) * top.length)].m;
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
    const silenceThreshold = 0.05 * Math.max(1, frame.gain / 3);
    if (frame.level > silenceThreshold || frame.kick) this.lastActiveMs = now;
    const gateTarget = now - this.lastActiveMs > 250 ? 0 : 1;
    const gateRate = gateTarget > this.silenceGate ? dtSec / 0.1 : dtSec / 0.25;
    this.silenceGate += Math.max(-gateRate, Math.min(gateRate, gateTarget - this.silenceGate));
    // Warmup-räknare för baslinjen: ackumulera medan aktiv, nollställ vid tystnad.
    if (this.silenceGate > 0.5) this.warmMs += dtSec * 1000; else this.warmMs = 0;
    if (effMode === "wave") this.wavePhase += dtSec * (1.6 + audio * 4);

    // Drops: each beat/kick fires the next lamp in a fresh pure color.
    if (effMode === "drops" && count > 0 && (frame.kick || beatTick) && now - this.lastDropAdvance > 140) {
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
    // DIREKT VU-FILTER: den INGÅENDE ljudnivån styr den UTGÅENDE ljusstyrkan
    // direkt, som ett SISTA filter efter allt annat (effekter, beatPulse, ...).
    // Effekterna formar fortfarande sitt eget ljus; VU:n justerar slutresultatet
    // mot den råa nivån. BARA en drop får skippa filtret (går fram på full).
    let ceilMul = 1;
    if (this.cfg.energyCeiling) {
      // RÅ nivå som slutgain: insignal X% → utsignal ~X% (nu golvad, se nedan).
      // frame.levelVU = ~200ms smoothat PÅ HOP-TAKT (375Hz) i analysatorn → ser alla
      // hops, mycket lägre jitter än att smootha rå-nivån efter render-decimering (som
      // aliasade per-hop-rippel till synligt flimmer). En lätt ~90ms-glidning här
      // utjämnar sista resten utan lång svans. (Drop bypassar via dropEnv nedan.)
      const vuRaw = Math.max(0, Math.min(1, frame.levelVU));
      this.vu += (vuRaw - this.vu) * (1 - Math.exp(-dtSec / 0.09));
      // KLUBB-LÄGE: kvadrera → hård kontrast (mörkt mellan, explosion på topp).
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
    const hasBeat = !!(this.cfg.beat && this.cfg.beat.bpm > 40);
    let beatFrac = 0;
    if (hasBeat) {
      const bMs = 60000 / this.cfg.beat!.bpm;
      const sinceB = Date.now() - this.cfg.beat!.anchorMs;
      beatFrac = ((sinceB % bMs) + bMs) % bMs / bMs;
    }
    // TAKT-RÄKNARE med graceful degradation: stegar på GRID-slaget (beatTick) när
    // BPM är låst, annars på VERKLIGA kicks (frame.kick). Så grid-effekterna
    // (snap/rave/party/ripple/…) fortsätter dansa på trummorna även när BPM-låset
    // tappas, i st.f. att frysa på beatIdx=0. Alla effekter använder beatIdx
    // MODULÄRT (färg/grupp/position) → ren drop-in.
    const beatHit = beatTick || (!hasBeat && frame.kick);   // DISKRET flank: takten gick just fram (grid-slag, annars verklig kick)
    if (beatHit) this.beatCounter++;
    const beatIdx = this.beatCounter;
    // beatPulse: grid-puls när låst, annars den VERKLIGA kick-envelopen → pulsar
    // ALLTID på musiken. (Utan detta gav beatFrac=0 → beatPulse=1 konstant = ingen
    // puls när BPM ej låst → party/pulse/bounce lyste bara jämnt högt.)
    const beatPulse = hasBeat ? Math.pow(1 - beatFrac, 2) : kickEnv;
    const beatMs2 = this.cfg.beat && this.cfg.beat.bpm > 40 ? 60000 / this.cfg.beat.bpm : 500;
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
    const effect = EFFECT_MAP.get(effMode);
    const ctx: EffectContext = {
      cfg: this.cfg, frame, fx: undefined, t, idx: 0, count,
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
    const rs = this.cfg.riserStrobe && frame.buildUp > 0.25;
    const rsWhite = rs ? frame.buildUp * 0.7 : 0;
    const rsGate = rs ? (Math.floor(t * (3 + frame.buildUp * 15)) % 2 === 0 ? 1 : 0.12) : 1;

    for (let i = 0; i < count; i++) {
      const fx = this.cfg.fixtures[i];
      const isAnchor = useAnchor && i > 0 && i < count - 1;   // mittlamporna = ankare
      let rgb: [number, number, number];
      if (isAnchor) {
        rgb = hsvToRgb(anchorHue, 1, 0.4 + 0.06 * Math.sin(t * 0.5 + i));   // fast pelare, knappt levande andning
      } else {
        ctx.idx = i;
        ctx.fx = fx;
        ctx.band = fx?.bands?.length ? Math.max(...fx.bands.map((b) => bands[BAND_IDX[b]])) : bands[i % bands.length];
        rgb = effect ? effect.render(ctx) : [0, 0, 0];
      }
      if (rs) {   // riser-strobe: vit-kollaps + accelererande gate
        rgb[0] = (rgb[0] + (1 - rgb[0]) * rsWhite) * rsGate;
        rgb[1] = (rgb[1] + (1 - rgb[1]) * rsWhite) * rsGate;
        rgb[2] = (rgb[2] + (1 - rgb[2]) * rsWhite) * rsGate;
      }
      if (this.dropEnv > 0.005) {
        // DROP: blenda effektens färg mot FULL ljusstyrka i takt med envelopet
        // (full attack → håll → mjuk fade). Behåller färgtonen, ingen strobe.
        const mxc = Math.max(rgb[0], rgb[1], rgb[2]);
        if (mxc > 0.02) {
          const k = this.dropEnv;
          rgb[0] += (rgb[0] / mxc - rgb[0]) * k;
          rgb[1] += (rgb[1] / mxc - rgb[1]) * k;
          rgb[2] += (rgb[2] / mxc - rgb[2]) * k;
        }
      }
      const strobeVal = effMode === "strobe" ? 210 : 0;
      // Effekt (master inkl. silenceGate → tonar ut på tystnad) + varm ambient-glöd in.
      rgb[0] = rgb[0] * md + 1.00 * ambLvl;
      rgb[1] = rgb[1] * md + 0.30 * ambLvl;
      rgb[2] = rgb[2] * md + 0.00 * ambLvl;
      writeFixture(this.universe, fx, rgb, 1, strobeVal);
    }

    // Output ballistics on color/dim channels (never strobe/mode channels —
    // a decaying strobe value would sweep through real strobe speeds).
    // Snappare fade-out i energiska lägen så pumpen syns; lugna behåller mjukheten.
    const fastMode = effMode === "party" || effMode === "snap" || effMode === "bounce" || effMode === "drops" || effMode === "rave" || effMode === "drumkit" || effMode === "duel";
    const beatMsNow = this.cfg.beat && this.cfg.beat.bpm > 40 ? 60000 / this.cfg.beat.bpm : 500;
    const fastTau = Math.max(0.14, Math.min(0.3, beatMsNow * 0.5 / 1000));
    // TRANSIENT-SKÄRPA: hög energi/riser → kort decay (knivskarp piska på varje
    // transient); låg energi → lång decay (mjuk andande wash). Utnyttjar diodernas
    // snabba respons — skarpt utan hårdvaru-strobe.
    const sharpen = Math.min(0.65, audio * 0.45 + frame.buildUp * 0.5);   // 0 lugnt .. 0.65 energiskt
    const tau = Math.max(0.08, (fastMode ? fastTau : (this.cfg.calmDecay ?? 0.42)) * (1 - sharpen));
    const decay = Math.exp(-dtSec / tau);
    // Bygg strobe-masken bara när fixtures ändras (inte varje frame).
    if (this.strobeMaskFor !== this.cfg.fixtures) {
      this.strobeMaskFor = this.cfg.fixtures;
      this.strobeMask.fill(0);
      this.capMask.fill(0);
      let mx = 0;
      for (const fx of this.cfg.fixtures) {
        const roles = fixtureRoles(fx);
        // VU-taket skalar de LJUSBÄRANDE kanalerna: färg (r/g/b/w) om fixturen har
        // det, annars dim-kanalen. På en dim+färg-lampa hålls dim konstant på 255
        // (all dynamik ligger i färgen), så att skala BÅDA gav v²-dämpning.
        const hasColor = roles.includes("r") || roles.includes("g") || roles.includes("b") || roles.includes("w");
        for (let r = 0; r < roles.length; r++) {
          const ch = fx.address - 1 + r;
          if (ch < 0 || ch >= 512) continue;   // hög-adress custom-fixture får inte skriva utanför universet
          if (roles[r] === "strobe") this.strobeMask[ch] = 1;
          if (roles[r] === "r" || roles[r] === "g" || roles[r] === "b" || roles[r] === "w") this.capMask[ch] = 1;
          else if (roles[r] === "dim" && !hasColor) this.capMask[ch] = 1;
          if (ch + 1 > mx) mx = ch + 1;
        }
      }
      this.maxCh = Math.min(512, mx);
    }
    // MJUK ATTACK (~25ms) i st.f. instant: en 1-frames-spik i effekt/master når bara
    // ~halvvägs och klingar sen → dödar flimmer (>~20Hz) men behåller beat-pumpen
    // (<10Hz) och den snabba decayn. Nedgång = oförändrad decay (peak-hold).
    const aAtt = 1 - Math.exp(-dtSec / 0.025);
    for (let ch = 0; ch < this.maxCh; ch++) {
      if (this.strobeMask[ch]) { this.outSmooth[ch] = this.universe[ch]; continue; }
      const held = this.outSmooth[ch] * decay;
      const target = this.universe[ch];
      const v = target >= held ? held + (target - held) * aAtt : held;
      this.outSmooth[ch] = v;
      this.universe[ch] = Math.round(v);
    }

    // VU-TAK SIST: applicera taket EFTER ballistiken → ren slutgain som följer
    // nivån DIREKT (ingen effekt-ballistik som släpar på vägen ner). Kapar bara
    // färg/dim-kanaler; strobe orörda. (Drop/punch/riser/flash ligger redan i
    // ceilMul via bypass → de lyfter taket och kapar inget.) Gatas av silenceGate
    // så den varma ambient-glöden i TYSTNAD inte kapas till svart.
    if (this.cfg.energyCeiling && this.silenceGate > 0.5 && ceilMul < 0.999) {
      for (let ch = 0; ch < this.maxCh; ch++) {
        if (this.capMask[ch]) {   // bara ljusbärande kanaler → linjär v-dämpning (ej v² på dim+färg)
          this.universe[ch] = Math.round(this.universe[ch] * ceilMul);
          this.outSmooth[ch] *= ceilMul;   // kapa ÄVEN ballistik-bufferten → annars
                                            // håller den kvar en okapad topp som
                                            // blixtrar fram på full styrka när taket
                                            // släpper vid övergången till tystnad.
        }
      }
    }

    // DROP-BLACKOUT: kolsvart NU — förbi ballistikens mjuka fade (stenhård
    // klippning). Nolla även den utjämnade bufferten så explosionen efter
    // svärtan reser sig rent från svart, utan pop från en kvarhållen nivå.
    if (blackout) {
      for (let ch = 0; ch < this.maxCh; ch++) {
        if (!this.strobeMask[ch]) { this.universe[ch] = 0; this.outSmooth[ch] = 0; }
      }
    }

    // LJUS-TAK + PER-KANAL KALIBRERING — sista mappningen före output. Mappar
    //   0        → 0 (släckt)
    //   1..255   → onCh .. TAK, linjärt
    // där TAK = round(255·master) (ljus-taket) och onCh = lampans kalibrerade
    // tändpunkt (0 om okalibrerad). Så master är ett ÄKTA output-tak (55% → max
    // 140), inte en innehålls-skalning som gamma/kalibrering annars komprimerar
    // bort. Vid master=1 → TAK=255 → identiskt med ren kalibrering (+ okalibrerade
    // kanaler blir identitet). Ingen kanal i dödzonen; släpp-håll (~120ms) bryggar
    // mikro-0-dippar i botten så dioden inte strobar.
    const calNow = performance.now();
    const topBase = Math.round(255 * (this.cfg.master ?? 1));   // ljus-tak i byte
    for (const cf of this.cfg.fixtures) {
      const cal = cf.cal;
      const on = cal ? (cal.on || 0) : 0;
      const roles = fixtureRoles(cf);
      const cbase = cf.address - 1;
      for (let i = 0; i < roles.length; i++) {
        const ch = cbase + i;
        if (ch < 0 || ch >= 512 || !this.capMask[ch]) continue;
        const raw = this.universe[ch];
        let out;
        if (raw > 0) {
          const role = roles[i];
          // Per-FÄRG-tröskel: R/G/B tänder vid olika DMX → kanalens egen om satt.
          const onCh = cal ? ((role === "r" ? cal.onR : role === "g" ? cal.onG : role === "b" ? cal.onB : role === "w" ? cal.onW : undefined) ?? on) : 0;
          const top = Math.max(onCh + 1, topBase);   // taket aldrig under tändpunkten
          out = Math.min(255, Math.round(onCh + (top - onCh) * raw / 255));
          this.calHoldVal[ch] = out;               // minns senaste tända
          this.calHoldUntil[ch] = calNow + 120;    // håll ~120ms efter sista tända
        } else if (calNow < this.calHoldUntil[ch]) {
          // SLÄPP-HÅLL: raw dippade till 0 men vi är inom hålltiden → håll senaste
          // TÄNDA (≥onCh) → mikro-0-dippar i tysta partier bryggas till stadig dim-
          // glöd i st.f. att bruset strobar dioden 0↔onCh. Äkta tystnad (>120ms 0)
          // faller igenom → 0, rent släckt.
          out = this.calHoldVal[ch];
        } else {
          out = 0;
        }
        this.universe[ch] = out;
      }
    }

    // DROP-HEADROOM: kapa normal ljusstyrka till 90%, men släpp DROPS till 100%.
    // Ren TAK-klämning (bara det som ligger över kapet dras ner → dim-värden orörda,
    // ingen kanal skjuts under sin tröskel). dropEnv lyfter kapet till 100% under
    // dropen → den poppar tydligt mot en normalt lite lugnare rigg. Sist av allt.
    if (this.cfg.dropHeadroom) {
      const capByte = Math.round(255 * Math.min(1, 0.90 + 0.10 * this.dropEnv));
      for (let ch = 0; ch < this.maxCh; ch++) {
        if (this.capMask[ch] && this.universe[ch] > capByte) this.universe[ch] = capByte;
      }
    }

    // Rök-kanal skrivs SIST (efter ballistiken) → instant på/av, ingen fade.
    if (fog?.enabled) {
      const fa = fog.address - 1;
      if (fa >= 0 && fa < 512) this.universe[fa] = nowWall < this.fogUntil ? Math.max(0, Math.min(255, Math.round(fog.level))) : 0;
    }
    return this.universe;
  }
}

function writeFixture(
  u: Uint8Array,
  fx: FixtureConfig,
  rgb: [number, number, number],
  master: number,
  strobeVal = 0,
) {
  const roles = fixtureRoles(fx);
  const base = fx.address - 1;   // DMX is 1-indexed
  const m = clamp01(master);

  const [r, g, b] = rgb;
  // White = min(r,g,b) so RGBW fixtures keep saturation on the color chans
  const w = Math.min(r, g, b);
  const dim = Math.max(r, g, b);
  // Fixtures with BOTH a dimmer and color channels multiply them internally.
  // Sending brightness on both gives a quadratic curve (reads as blinking,
  // not fading) — master goes on the dim channel, dynamics stay in color.
  const hasColor = roles.includes("r") || roles.includes("g") || roles.includes("b");
  const hasDim = roles.includes("dim");
  const colorScale = hasDim ? 1 : m;

  for (let i = 0; i < roles.length; i++) {
    const ch = base + i;
    if (ch < 0 || ch >= 512) continue;
    switch (roles[i]) {
      case "r":      u[ch] = to255((r - (roles.includes("w") ? w : 0)) * colorScale); break;
      case "g":      u[ch] = to255((g - (roles.includes("w") ? w : 0)) * colorScale); break;
      case "b":      u[ch] = to255((b - (roles.includes("w") ? w : 0)) * colorScale); break;
      case "w":      u[ch] = to255(w * colorScale); break;
      case "dim":    u[ch] = to255(hasColor ? m : dim * m); break;
      case "strobe": u[ch] = Math.max(0, Math.min(255, strobeVal)); break;  // 8-255 = fixture strobe, faster when higher
      case "unused": break;
    }
  }
}

const clamp01 = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x;
// LED PARs are wildly non-linear: DMX 128 looks ~80% bright and the low end
// cuts off abruptly. Gamma 2.2 makes the fade perceptually linear — half
// looks half, and most DMX resolution lands in the visible low range.
const to255 = (x: number) => Math.round(Math.pow(clamp01(x), 2.2) * 255);
