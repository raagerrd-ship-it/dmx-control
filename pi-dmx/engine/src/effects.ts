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

export class EffectEngine {
  private universe = new Uint8Array(512);
  private t0 = performance.now();
  private showTime = 0;      // ackumulerad "show-tid" — accelererar under uppbyggnaden (riser)
  private lastShowMs = 0;
  private lastKickBoost = 0;
  /** Chase mode: fixture-index of the currently lit head. Advanced on kick and slow-time. */
  private chasePos = 0;
  private chaseDir = 1;
  private lastChaseAdvance = 0;
  /** Beat clock: last whole-beat index seen (SmartSync tempo sync). */
  private lastBeatIdx = -1;
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
  private lastSectionAt = 0;
  private intensityEma = 0.5;
  private intensityPeak = 0.5;
  private intensityFloor = 0.5;
  private warmMs = 0;
  private ambient = 0;   // 0 = spelar, 1 = varm vila (efter ~2.5s tystnad)
  private bassBaseline = 0.35;   // bas-golv (tyst basnivå) för bas-punch
  private levelCeil = 0.5;       // långsamt nivå-tak (låtens loud-topp) för drop-detektor
  private breakAtMs = 0;         // senaste break/lugna stund (nivå-svacka)
  private wasInZone = false;
  private inZoneState = false;   // hysteres-tillstånd för topp-zonen
  private dropBangUntil = 0;     // drop-fönster (max-håll upp till ~8s efter träff)
  private dropEnv = 0;           // drop-envelope: full attack → håll → mjuk fade
  private fogUntil = 0;          // rökmaskin: pågående blast till (wall-clock ms)
  private lastFogMs = -1e9;      // senaste blast (för cooldown)
  private centSlow = 0.3;        // långsam centroid-baslinje för riser-prediktor
  private lvlSlowR = 0.3;        // långsam nivå-baslinje för riser-prediktor
  private buildUp = 0;           // 0..1 uppbyggnad (riser) — bygger tension mot dropen
  private hotMs = 0;             // hur länge musiken pumpat → adaptiv tystnads-landning
  /** Silence gate: fade the whole rig to black when no music plays. */
  private lastActiveMs = performance.now();
  private silenceGate = 1;
  /** Output ballistics: per-channel peak-hold with exponential decay — the
   *  eye sees instant attack and a soft ~0.4 s fall, whatever the modes do. */
  private outSmooth = new Float32Array(512);
  private strobeMask = new Uint8Array(512);   // 1 = hoppa ballistik (strobe-kanal)
  private strobeMaskFor: unknown = null;      // fixtures-referens masken byggdes för
  private maxCh = 0;                           // högsta använda kanal + 1
  private smartCount = 0;
  private lastSmartIntensity = 0;
  private lastSmartTier = "";
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

  render(frame: Frame): Uint8Array {
    // Fri-rullande "show-tid": normalt 1× realtid, men accelererar under en
    // uppbyggnad (buildUp från förra framen) så mönstren snabbar upp mot dropen.
    // Ackumulerad → kontinuerlig, inga hopp.
    const _np = performance.now();
    if (this.lastShowMs === 0) this.lastShowMs = _np;
    const _dtT = Math.min(0.1, (_np - this.lastShowMs) / 1000);
    this.lastShowMs = _np;
    this.showTime += _dtT * (1 + this.buildUp * 1.5);   // upp till 2.5× snabbare vid full uppbyggnad
    const t = this.showTime;
    if (frame.kick) this.lastKickBoost = performance.now();

    // SmartSync beat clock → predicted kick: pulse in the song's exact tempo,
    // phase-calibrated by the Spotify downbeat markers. Beats real kick
    // detection whenever we're synced.
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

    // Drop-bloom: on a drop the current color surges to full brightness (keeps
    // the mode's look, no jarring primary-override). Optional hardware strobe.
    const nowWall = Date.now();
    const flashActive = !!(this.cfg.flashUntil && nowWall < this.cfg.flashUntil);

        // Normalize against the AGC target so "at target loudness" = full drive —
        // the AGC otherwise parks the level around ~0.5 and v never reaches 1.
        const audio = Math.min(1, (frame.level / Math.max(0.15, this.cfg.detection.autoGainTarget)) * (0.35 + this.cfg.sensitivity * 0.5));
        // beatPulse: mjuk, kontinuerlig puls på BPM-rutnätet (PLL:en riktar fasen
        // mot faktiska slag). Kontinuerlig — funkar även när kick-detektorn är
        // gles (komprimerad signal fyrar sällan), till skillnad från ren kick-puls.
        const beatMul = this.cfg.beatPulse ? (0.45 + 0.55 * beatEnv) : 1;
    // BAS-PUNCH: en hård/utdragen basstöt (drop) saknar transient, och på en
    // komprimerad signal svänger bas-energin lite. Så spåra ett bas-GOLV = den
    // TYSTA basnivån (sjunker mot tystnad på ~0.4s, stiger mkt långsamt ~5s). En
    // drop ligger då tydligt ÖVER golvet → punch som HÅLLER tills golvet hinner ikapp.
    if (frame.energy < this.bassBaseline) this.bassBaseline += (frame.energy - this.bassBaseline) * 0.05;
    else this.bassBaseline += (frame.energy - this.bassBaseline) * 0.004;
    const bassPunch = Math.max(0, Math.min(1, (frame.energy - this.bassBaseline - 0.05) * 4));
    const master = this.cfg.master * this.silenceGate * beatMul * (1 + bassPunch * 0.75);
    // Synlig punch: en hård basstöt (eller drop-flash) BLOOMAR färgen till full
    // styrka — inte bara ljusare master (som är osynligt när effekten redan lyser).
    // DROP-DETEKTOR: en "riktig" drop = nivån surgar upp mot låtens tak EFTER en
    // break (nivå-svacka). Det ger MAX-impact just där, inte på vanlig tung bas.
    const dtNow = Math.min(0.1, (performance.now() - this.lastRenderMs) / 1000);
    this.levelCeil = Math.max(frame.level, this.levelCeil - dtNow * 0.015 * this.levelCeil);   // tak, decay ~65s
    if (frame.level < this.levelCeil * 0.65) this.breakAtMs = nowWall;                          // break/svacka
    // Topp-zon med HYSTeres: in vid 85% av taket, ut först vid 70% → ingen
    // flimmer/dubbel-smäll när nivån oscillerar nära tröskeln.
    if (frame.level > this.levelCeil * 0.85 && frame.level > 0.65) this.inZoneState = true;
    else if (frame.level < this.levelCeil * 0.70) this.inZoneState = false;
    const inZone = this.inZoneState;
    const brokeRecently = nowWall - this.breakAtMs < 3500;
    const dropFired = inZone && !this.wasInZone && brokeRecently;
    if (dropFired) this.dropBangUntil = nowWall + 8000;                                          // drop-fönster (max 8s)
    this.wasInZone = inZone;
    // RÖKMASKIN: blast på drop (duty-cycle-skyddad) + manuell puff.
    const fog = this.cfg.fog;
    if (fog?.enabled) {
      const wantBurst = (dropFired && fog.onDrop) || this.cfg.fogTrigger;
      if (this.cfg.fogTrigger) this.cfg.fogTrigger = false;                                      // engångs-flagga
      if (wantBurst && nowWall - this.lastFogMs > fog.cooldownMs) {
        this.fogUntil = nowWall + fog.burstMs;
        this.lastFogMs = nowWall;
      }
    }
    const dropActive = inZone && nowWall < this.dropBangUntil;                                  // en riktig drop pågår
    // DROP-ENVELOPE: FULL ATTACK (~30ms) på träffen, HÅLL allt på max under
    // dropen, mjuk FADE ner (~1s) när den släpper. Egen effekt — INGEN
    // hårdvaru-strobe (det gav strobe-känslan), bara ljus + färg på max.
    const dTarget = dropActive ? 1 : 0;
    const dRate = dTarget > this.dropEnv ? dtNow / 0.03 : dtNow / 1.0;
    this.dropEnv += Math.max(-dRate, Math.min(dRate, dTarget - this.dropEnv));

    // RISER / DROP-PREDIKTOR: en uppbyggnad = klangen (centroid) OCH nivån stiger
    // ihållande mot en drop. Vi har redan en REAKTIV drop-detektor; detta
    // FÖRUTSPÅR den och bygger tension (ljus-swell) under risern, så dropen landar
    // med moment. Klingar av om risern rinner ut i sanden. (centroid är 0..1 här.)
    this.centSlow += (frame.centroid - this.centSlow) * (dtNow / 2.5);
    this.lvlSlowR += (frame.level - this.lvlSlowR) * (dtNow / 2.5);
    const inRiser = frame.centroid > this.centSlow + 0.06         // diskant kryper upp
                 && frame.level > this.lvlSlowR + 0.04            // nivån stiger
                 && frame.level > 0.4 && this.dropEnv < 0.2;      // ej redan i drop
    const bTarget = inRiser ? 1 : 0;
    const bRate = bTarget > this.buildUp ? dtNow / 3.5 : dtNow / 1.0;   // bygg ~3.5s, klinga ~1s
    this.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.buildUp));

    const bloom = flashActive || bassPunch > 0.45;
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

    // "smart": pick the effect from the song's feel — SmartSync section energy
    // when synced (switches on musical section boundaries), otherwise a slow
    // local energy average with a 12 s dwell so it never zaps around.
    let effMode: Mode = this.cfg.mode;
    if (this.cfg.mode === "smart") {
      // Energi styr läget → lokal intensitet väljer pool; annars fast medel.
      // Energi RELATIVT låtens eget snitt: en komprimerad signal ligger jämnt
      // högt, så absolut nivå säger inget. Jämför istället mot en långsam
      // baslinje (~30s) → mitten (snittet) = Fart, tydligt över snittet (drop/
      // topp) = Full Fart, tydligt under (breakdown) = Lugn. ±0.15 ger full sving.
      const baseline = this.intensityFloor;
      const intensity = this.cfg.energyDrivesMode ? Math.max(0, Math.min(1, 0.5 + (this.intensityEma - baseline) / 0.30)) : 0.5;
        // Three tiers by intensity + tempo; user checkboxes (cfg.rotation) pick
        // which modes are in play. Full Fart kräver BÅDE hög energi och högt BPM.
        const LUGN: Mode[] = ["cycle", "breathe", "tide", "mono", "aurora", "drift"];
        const FART: Mode[] = ["wave", "chase", "drops", "sweep", "pulse", "eq"];
        const FULLFART: Mode[] = ["party", "snap", "bounce", "strobe", "rave"];
        const bpm = this.cfg.beat?.bpm ?? 0;
        const enabled = (list: Mode[]) => list.filter((m) => this.cfg.rotation?.[m] !== false);
        // Fasta trösklar på (relativ) energi. Ingen bpm-sänkning längre — den
        // pushade mellanenergi till Full Fart och byggde på ett opålitligt
        // bpm-oktavvärde. Full Fart kräver en TYDLIG topp långt över snittet
        // (0.78) → reserverad för riktiga drops, inte varje energiskt parti.
        const loThr = 0.34, hiThr = 0.78;
        let tier: Mode[] = intensity < loThr ? LUGN : intensity < hiThr ? FART : FULLFART;
        // Låg-BPM-spärr: en tryckare/ballad ska ALDRIG gå Full Fart, även om dess
        // relativa energi toppar. (bpm 0 = ej låst → ingen spärr.)
        if (bpm > 0 && bpm < 95 && tier === FULLFART) tier = FART;
        const tierName = tier === LUGN ? "lugn" : tier === FART ? "fart" : "full";
        // Omval vid: (a) nivåbyte — så en ny effekt slår till DIREKT när vi går
        // in i Fart/Full Fart (inte den gamla kvar tills dwell löper ut),
        // (b) tydligt energihopp, känsligare uppåt (drops) än nedåt,
        // (c) dwell-timern.
        const delta = intensity - this.lastSmartIntensity;
        const bigJump = this.cfg.energyDrivesMode && (delta > 0.1 || delta < -0.18);
        const tierChanged = this.cfg.energyDrivesMode && tierName !== this.lastSmartTier;
        if (bigJump || tierChanged || now > this.smartDwellUntil) {
        this.lastSmartIntensity = intensity;
        this.lastSmartTier = tierName;
        this.smartDwellUntil = now + (this.cfg.smartDwellMs || 9000);
        let pool = enabled(tier);
        if (pool.length === 0) pool = enabled([...FART, ...LUGN, ...FULLFART]);      // valfri aktiv
        if (pool.length === 0) pool = ["cycle"];                                     // sista fallback
        this.smartCount++;
        let next = pool[Math.floor(((this.smartCount * 0.61803398875) % 1) * pool.length)];
        if (next === this.smartMode && pool.length > 1) next = pool[(pool.indexOf(next) + 1) % pool.length];
        this.smartMode = next;
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
      CURRENT_PALETTE = PALETTES[this.paletteIdx].sectors;
    } else {
      CURRENT_PALETTE = ALL_SECTORS;                       // manuella lägen: obegränsad färg
    }

    // Advance the wave phase by dt so speed changes glide instead of jumping.
    const dtSec = Math.min(0.1, (now - this.lastRenderMs) / 1000);
    this.lastRenderMs = now;
    // Sektionsenergi = utjämnad rå nivå (INTE den klippta 'audio', och inga
    // per-beat spikar). Attack lite snabbare än release så uppbyggnader syns.
    const aUp = 1 - Math.exp(-dtSec / 1.5);
    const aDown = 1 - Math.exp(-dtSec / 3.0);
    this.intensityEma += (frame.level - this.intensityEma) * (frame.level > this.intensityEma ? aUp : aDown);
    // Baslinje = låtens snitt-energi, referens för nivåvalet ovan. WARMUP: de
    // första ~8s av spelning konvergerar den snabbt (~3s) så den är klar direkt;
    // sen låser den till stabil ~25s. Nollställs vid tystnad → snabb omkalibrering
    // vid låtbyte/paus.
    const warm = this.warmMs < 8000;
    this.intensityFloor += (this.intensityEma - this.intensityFloor) * (warm ? dtSec / 3 : dtSec / 25);

    // Silence gate: below threshold for 4 s → fade out over 2 s; music back →
    // fade in fast. Mode floors otherwise keep the lamps glowing in silence.
    // Gain-aware threshold: at high AGC gain the amplified noise floor sits
    // well above 0.05 and read as flicker — real (even weak) music still
    // lands near the AGC target and passes.
    const silenceThreshold = 0.05 * Math.max(1, frame.gain / 3);
    if (frame.level > silenceThreshold || frame.kick) this.lastActiveMs = now;
    const gateTarget = now - this.lastActiveMs > 250 ? 0 : 1;
    const gateRate = gateTarget > this.silenceGate ? dtSec / 0.1 : dtSec / 0.25;
    this.silenceGate += Math.max(-gateRate, Math.min(gateRate, gateTarget - this.silenceGate));
    // Warmup-räknare för baslinjen: ackumulera medan aktiv, nollställ vid tystnad.
    if (this.silenceGate > 0.5) this.warmMs += dtSec * 1000; else this.warmMs = 0;
    if (effMode === "wave" || effMode === "sweep") this.wavePhase += dtSec * (1.6 + audio * 4);

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
    const ambTarget = now - this.lastActiveMs > 2500 ? 1 : 0;
    const landTau = 1.2 + Math.min(1, this.hotMs / 180000) * 5;   // 1.2s .. 6.2s efter lång spelning
    const ambRate = ambTarget > this.ambient ? dtSec / landTau : dtSec / 0.1;   // in: adaptivt, ut: snabbt
    this.ambient += Math.max(-ambRate, Math.min(ambRate, ambTarget - this.ambient));
    const ambLvl = this.ambient * 0.22 * this.cfg.master;   // varm nivå (respekterar master, ej beat/tystnad)
    // Ljus-boost: swell UNDER uppbyggnaden (riser) → EXPLOSION på dropen.
    const md = master * (1 + this.buildUp * 0.35 + this.dropEnv * 0.8);

    for (let i = 0; i < count; i++) {
      const fx = this.cfg.fixtures[i];
      const rgb = pickColor(this.cfg, t, i, count, audio, kickEnv, frame, this.chasePos, fx, this.dropFired, this.dropHue, this.wavePhase, this.buildUp, effMode);
      if (bloom) {
        // Bloom (bas-punch/flash): skala upp färgen till full ljusstyrka.
        const mxc = Math.max(rgb[0], rgb[1], rgb[2]);
        if (mxc > 0.02) { rgb[0] /= mxc; rgb[1] /= mxc; rgb[2] /= mxc; }
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
      const strobeVal = (effMode === "strobe" || (flashActive && this.cfg.punchOnDrop)) ? 210 : 0;
      // Effekt (master inkl. silenceGate → tonar ut på tystnad) + varm ambient-glöd in.
      rgb[0] = rgb[0] * md + 1.00 * ambLvl;
      rgb[1] = rgb[1] * md + 0.30 * ambLvl;
      rgb[2] = rgb[2] * md + 0.00 * ambLvl;
      writeFixture(this.universe, fx, rgb, 1, strobeVal);
    }

    // Output ballistics on color/dim channels (never strobe/mode channels —
    // a decaying strobe value would sweep through real strobe speeds).
    // Snappare fade-out i energiska lägen så pumpen syns; lugna behåller mjukheten.
    const fastMode = effMode === "party" || effMode === "snap" || effMode === "bounce" || effMode === "drops" || effMode === "rave";
    const beatMsNow = this.cfg.beat && this.cfg.beat.bpm > 40 ? 60000 / this.cfg.beat.bpm : 500;
    const fastTau = Math.max(0.14, Math.min(0.3, beatMsNow * 0.5 / 1000));
    // TRANSIENT-SKÄRPA: hög energi/riser → kort decay (knivskarp piska på varje
    // transient); låg energi → lång decay (mjuk andande wash). Utnyttjar diodernas
    // snabba respons — skarpt utan hårdvaru-strobe.
    const sharpen = Math.min(0.65, audio * 0.45 + this.buildUp * 0.5);   // 0 lugnt .. 0.65 energiskt
    const tau = Math.max(0.08, (fastMode ? fastTau : 0.42) * (1 - sharpen));
    const decay = Math.exp(-dtSec / tau);
    // Bygg strobe-masken bara när fixtures ändras (inte varje frame).
    if (this.strobeMaskFor !== this.cfg.fixtures) {
      this.strobeMaskFor = this.cfg.fixtures;
      this.strobeMask.fill(0);
      let mx = 0;
      for (const fx of this.cfg.fixtures) {
        const roles = fixtureRoles(fx);
        for (let r = 0; r < roles.length; r++) {
          const ch = fx.address - 1 + r;
          if (roles[r] === "strobe") this.strobeMask[ch] = 1;
          if (ch + 1 > mx) mx = ch + 1;
        }
      }
      this.maxCh = mx;
    }
    for (let ch = 0; ch < this.maxCh; ch++) {
      if (this.strobeMask[ch]) { this.outSmooth[ch] = this.universe[ch]; continue; }
      const held = this.outSmooth[ch] * decay;
      const v = this.universe[ch] >= held ? this.universe[ch] : held;
      this.outSmooth[ch] = v;
      this.universe[ch] = Math.round(v);
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

function pickColor(
  cfg: EngineConfig,
  t: number,
  idx: number,
  count: number,
  audio: number,
  kickEnv: number,
  frame: Frame,
  chasePos: number,
  fx?: FixtureConfig,
  dropFired: number[] = [],
  dropHue: number[] = [],
  wavePhase = 0,
  buildUp = 0,
  modeOverride?: Mode,
): [number, number, number] {
  const { monoHue, cometHue, splitHueA, splitHueB } = cfg;
  const mode = modeOverride ?? cfg.mode;
  // Taktindex/fas från den lokala BPM-klockan — för beat-låsta lägen.
  let beatIdx = 0, beatFrac = 0;
  if (cfg.beat && cfg.beat.bpm > 40) {
    const beatMs = 60000 / cfg.beat.bpm;
    const since = Date.now() - cfg.beat.anchorMs;
    beatIdx = Math.floor(since / beatMs);
    beatFrac = ((since % beatMs) + beatMs) % beatMs / beatMs;
  }
  const beatPulse = Math.pow(1 - beatFrac, 2);   // mjuk puls-envelope (0..1) per takt
  // Tempo-djup: långsamt tempo → djup punch (lågt golv); snabbt → grunt (mot flimmer).
  const beatMs2 = cfg.beat && cfg.beat.bpm > 40 ? 60000 / cfg.beat.bpm : 500;
  const tempoDeep = Math.max(0, Math.min(1, (beatMs2 - 340) / 260));   // 0 snabbt .. 1 långsamt
  const punchFloor = 0.5 - tempoDeep * 0.42;                            // 0.5 (snabbt) .. 0.08 (långsamt)
  // Dynamics: lower floors + gamma on the audio-driven part, so quiet passages
  // go dim and beats punch. dyn=0 reproduces the old flat curves.
  // Per-fixture band drive: each lamp breathes with its own slice of the
  // spectrum (bass / mids / treble / kick) so pure-colored lamps still feel
  // alive and independent — full 0..100% swing per color.
  const norm = 1 / Math.max(0.15, cfg.detection?.autoGainTarget ?? 0.5);
  const bands = [
    Math.min(1, frame.energy * norm * 0.9),
    Math.min(1, frame.mid * norm * 1.0),      // RIKTIGA mellanbandet (röst/synth/virvel) — var 'audio'
    Math.min(1, frame.treble * norm * 1.1),
    Math.min(1, frame.energy * norm * 0.45 + kickEnv),
    // "low": calm glow when the music is quiet, out of the way when loud.
    Math.max(0, (0.5 - audio) * 2) * 0.6,
  ];
  const BAND_IDX = { bass: 0, mid: 1, treble: 2, kick: 3, low: 4 } as const;
  const band = fx?.bands?.length
    ? Math.max(...fx.bands.map((b) => bands[BAND_IDX[b]]))
    : bands[idx % bands.length];
  const dyn = Math.max(0, Math.min(1, cfg.dynamics ?? 0.6));
  const shaped = (floor: number, x: number) => {
    const f = floor * (1 - dyn);
    return Math.min(1, f + (1 - f) * Math.pow(Math.max(0, Math.min(1, x)), 1 + dyn * 1.2));
  };
  // MUSIK-KLOCKA: stega färgbyten på TAKTSLAG när vi har en takt (så bytena
  // landar musikaliskt = "programmerat"), annars på tid (ambient i tystnad).
  const hasBeat = !!(cfg.beat && cfg.beat.bpm > 40);
  const mclk = (beatsPerStep: number, secPerStep: number) =>
    hasBeat ? Math.floor(beatIdx / beatsPerStep) : Math.floor(t / secPerStep);
  // FASFÖRSKJUTEN RISER: under en uppbyggnad dras lampornas fas gradvis isär →
  // koordinerad våg (buildUp 0) blir kaotiskt svep tvärs riggen (buildUp 1),
  // "slits isär av energin" precis innan dropen synkar allt.
  const phaseSpread = 1 + buildUp * 2.5;
  switch (mode) {
    case "party": {
      // Full fart: FÄRGKAOS-PUMP — varje lampa egen ren färg (blandas om varje
      // takt) och hela riggen THROBBAR hårt: mörk mellan slagen, full på beatet.
      // Fast lågt golv (12%) så pumpen verkligen syns — det är partyts signatur.
      const hue = mixedSector(beatIdx + idx * 2) / 6;
      const pump = Math.min(1, beatPulse * 1.0 + kickEnv * 0.7);
      const v = 0.12 + 0.88 * pump;
      return hsvToRgb(hue, 1, v);
    }
    case "drops": {
      // Every beat paints the next lamp in a fresh pure color that decays —
      // overlapping decays turn the rhythm into moving splashes of color.
      const since = (performance.now() - (dropFired[idx] ?? -1e9)) / 1000;
      const v = Math.exp(-since / 0.55) * (0.6 + 0.4 * Math.min(1, audio + kickEnv));
      return hsvToRgb(dropHue[idx] ?? 0, 1, Math.min(1, v));
    }
    case "wave": {
      // Flödande FÄRGVÅG: varje lampa har sin egen rena färg och hela regnbågen
      // glider över riggen. Full rigg tänd med en mjuk ljusvåg ovanpå — handlar
      // om FÄRG i rörelse, till skillnad från sweep (en färg) och chase (gles).
      const base = 0.55 + 0.45 * Math.sin(wavePhase - idx * 1.3 * phaseSpread);
      const hue = mixedSector(idx + Math.floor(wavePhase * 0.4)) / 6;
      // + diskant-glitter: hi-hats/cymbaler ger en snabb ljusflick ovanpå vågen.
      const v = shaped(0.12, base * (0.35 + audio * 0.7) + kickEnv * 0.2 + frame.treble * 0.35);
      return hsvToRgb(hue, 1, v);
    }
    case "cycle": {
      // Lugn: alla lampor andas TILLSAMMANS medan färgen vandrar runt hjulet —
      // ett mjukt skimmer. Varje lampa reagerar dessutom på SITT frekvensband
      // (bas/mellan/diskant) → ett dämpat spatialt spektrum. Golv 30%.
      const hue = mixedSector(mclk(8, 6)) / 6;                  // ny färg var 8:e takt (eller 6s)
      const shimmer = 0.5 + 0.5 * Math.sin(t * 0.9 + idx * 1.4 * phaseSpread);
      const m = Math.min(1, 0.35 + shimmer * 0.4 + band * 0.35);
      return hsvToRgb(hue, 1, 0.3 + 0.7 * m);
    }
    case "breathe": {
      // Lugnast: hela riggen andas UNISONT i EN långsamt vandrande färg — djup,
      // symmetrisk swell (lång mjuk in-/utandning). Golv 30% så den aldrig släcks.
      const hue = mixedSector(Math.floor(t / 11)) / 6;
      const breath = 0.5 + 0.5 * Math.sin(t * 0.7);
      const m = Math.min(1, breath * 0.85 + audio * 0.2);
      return hsvToRgb(hue, 1, 0.3 + 0.7 * m);
    }
    case "tide": {
      // Lugn: en långsam våg sköljer i PAR över riggen — en rumslig fade som
      // vandrar sida till sida. Golv 30%.
      const wash = 0.5 + 0.5 * Math.sin(t * 0.9 - idx * 1.0 * phaseSpread);
      const pair = Math.floor(idx / 2);
      const hue = mixedSector(pair + mclk(8, 9)) / 6;           // ny färg var 8:e takt (eller 9s)
      const m = Math.min(1, 0.3 + wash * 0.55 + band * 0.3);   // per-lampa frekvensband
      return hsvToRgb(hue, 1, 0.3 + 0.7 * m);
    }
    case "snap": {
      // Full fart: UNISONT FÄRGSLAG — alla lampor SAMMA färg, KONSTANT ljus (ingen
      // pump), hård kapning till en NY färg exakt på taktslaget. Läser som en
      // färg-slideshow i takt; snabb fade ger färgsläp i själva kapet. Motsats
      // till party (mörk throb) och rave (spatial växling).
      const hue = mixedSector(beatIdx) / 6;
      const v = Math.min(1, 0.9 + audio * 0.1);
      return hsvToRgb(hue, 1, v);
    }
    case "bounce": {
      // Full fart: en SKARP ljuspunkt studsar fram och tillbaka, ett steg per
      // takt, kort efterglöd, mörk rigg emellan. Gles och kinetisk; ny ren färg
      // vid varje studs-steg.
      const span = Math.max(1, count - 1);
      const cyc = beatIdx % (span * 2);
      const pos = cyc <= span ? cyc : span * 2 - cyc;   // triangel-våg
      const d = Math.abs(idx - pos);
      const hue = mixedSector(beatIdx) / 6;
      const v = Math.exp(-d * 1.7) * Math.min(1, 0.85 + beatPulse * 0.15 + kickEnv * 0.4);
      return hsvToRgb(hue, 1, v);
    }
    case "aurora": {
      // Lugn: varje lampa håller sin EGEN långsamt driftande färg med mjuka,
      // OBEROENDE korsfades — likt norrsken där färgerna glider var för sig.
      // Golv 30%.
      const hue = mixedSector(idx * 2 + mclk(8, 7)) / 6;        // ny färg var 8:e takt (eller 7s)
      const wash = 0.5 + 0.5 * Math.sin(t * 0.45 - idx * 1.3 * phaseSpread);
      const m = Math.min(1, 0.4 + wash * 0.45 + band * 0.25);   // per-lampa frekvensband
      return hsvToRgb(hue, 1, 0.3 + 0.7 * m);
    }
    case "drift": {
      // Ambient: hela riggen i EN mycket långsamt driftande färg, knappt någon
      // rörelse — nära stillastående glöd som sakta byter färg. Golv 30%.
      const hue = mixedSector(Math.floor(t / 16)) / 6;
      const m = Math.min(1, 0.62 + 0.18 * Math.sin(t * 0.35) + audio * 0.15);
      return hsvToRgb(hue, 1, 0.3 + 0.7 * m);
    }
    case "sweep": {
      // Enfärgad SPOTLIGHT: ETT smalt ljusband glider mjukt över en mörk rigg —
      // hög kontrast, en färg i taget. Motsats till wave (full rigg, många färger).
      const headPos = (wavePhase * 0.5) % count;
      let dd = Math.abs(idx - headPos);
      if (dd > count / 2) dd = count - dd;   // wrap
      const hue = mixedSector(mclk(4, 5)) / 6;                  // ny färg var 4:e takt (eller 5s)
      const v = shaped(0.05, Math.exp(-dd * 1.9) * (0.75 + audio * 0.4) + kickEnv * 0.15);
      return hsvToRgb(hue, 1, v);
    }
    case "pulse": {
      // Fart: hela riggen samma färg, pulsar på beatet; färg stegar var fjärde takt.
      const hue = mixedSector(Math.floor(beatIdx / 4)) / 6;
      const v = punchFloor + (1 - punchFloor) * Math.min(1, beatPulse * 0.85 + audio * 0.25);
      return hsvToRgb(hue, 1, v);
    }
    case "strobe": {
      // Full fart: hårdvarustrobe (CH5 sätts i render); färgen cyklar snabbt, fullt ljus.
      const hue = mixedSector(beatIdx) / 6;
      return hsvToRgb(hue, 1, 1);
    }
    case "rave": {
      // Full fart: TVÅFÄRGS-VÄXELSPEL — riggen delas varannan lampa i två grupper
      // med KONTRASTFÄRGER (motsatta sidor av hjulet) som PINGPONGAR plats varje
      // takt, HELT släckt grupp emellan. Färgparet är STABILT i 4 takter så ögat
      // ser tydligt "A / B / A / B" (på 3 lampor: 0,2 mot 1) — inte färgbyte varje
      // slag som gör den lik party/snap.
      const even = idx % 2 === 0;
      const flip = beatIdx % 2 === 0;
      const lit = even === flip;
      const pairBase = mixedSector(Math.floor(beatIdx / 4));
      const hue = ((even ? pairBase : pairBase + 3) % 6) / 6;
      return hsvToRgb(hue, 1, lit ? 1 : 0);
    }
    case "chase": {
      // Snabb LÖPARE: skarpt huvud som hoppar ETT steg per taktslag, kort svans,
      // och BYTER ren färg medan det springer → rytmiskt och gles, inte en jämn
      // glidning (sweep) eller full färgvåg (wave).
      const d = Math.abs(idx - chasePos);
      const tail = Math.exp(-d * 1.6);
      const hue = mixedSector(chasePos + Math.floor(t / 4)) / 6;
      const v = Math.min(1, tail * shaped(0.22, 0.55 + audio * 0.55 + kickEnv * 0.5));
      return hsvToRgb(hue, 1, v);
    }
    case "mono": {
      // Lugn men LEVANDE: en brasa/glöd. Varje lampa flimrar organiskt (lager av
      // sinusar i otakt, inte hård random), färgen glider rött→bärnsten→gult när
      // lågan flammar upp, och den andas som eld. Varm ton (ej snäppt). Golv 30%.
      const flick = Math.sin(t * 6.7 + idx * 2.3) * 0.5
                  + Math.sin(t * 10.9 + idx * 4.1) * 0.3
                  + Math.sin(t * 17.3 + idx * 1.7) * 0.2;   // -1..1 organiskt
      const ember = 0.5 + 0.5 * flick;                      // 0..1 glöd
      const hue = 0.015 + 0.11 * ember;                     // rött → gult
      const m = Math.min(1, 0.4 + ember * 0.45 + kickEnv * 0.3);
      return hsvToRgb(hue, 1, 0.3 + 0.7 * m);
    }
    case "eq": {
      // 3-band spektrum-EQ över riggen: varje lampa = ETT band i EN ren färg,
      // ljusstyrkan = bandets energi. Bas→Röd, Mellan→Grön, Diskant→Blå.
      // Använder bara EN R/G/B-kanal per lampa → perfekt för rena färger.
      const bandIdx = count > 1 ? idx % 3 : -1;
      const r = Math.min(1, frame.energy * 1.7);
      const g = Math.min(1, frame.mid * 1.9);
      const b = Math.min(1, frame.treble * 1.9);
      if (bandIdx === 0) return [Math.max(0.05, r), 0, 0];   // bas → röd
      if (bandIdx === 1) return [0, Math.max(0.05, g), 0];   // mellan → grön
      if (bandIdx === 2) return [0, 0, Math.max(0.05, b)];   // diskant → blå
      return [Math.max(0.05, r), Math.max(0.05, g), Math.max(0.05, b)];   // enda lampa: full mix
    }
    default:
      return [0, 0, 0];
  }
}

// Per-fixture hue-sector hold: raw hues near a 60° boundary would otherwise
// flip between two pure colors many times a second (reads as color flicker).
// Only leave the held sector once the raw hue is clearly past the boundary.
// Low-discrepancy color walk: golden-ratio jumps visit every pure color in a
// varied, non-sequential order (red→blue→yellow→…) instead of stepping around
// the circle neighbor by neighbor.
// Färg-sektorer: 0=röd 1=gul 2=grön 3=cyan 4=blå 5=magenta.
const ALL_SECTORS = [0, 1, 2, 3, 4, 5];
// Kurerade RGB-vänliga paletter för regi-lagret. temp styr centroid-valet
// (mörk klang → warm, ljus klang → cool).
const PALETTES: { name: string; sectors: number[]; temp: "warm" | "cool" | "neutral" }[] = [
  { name: "Eld",      sectors: [0, 1, 5], temp: "warm" },    // röd / gul / magenta
  { name: "Guldfest", sectors: [0, 1, 2], temp: "warm" },    // röd / gul / grön
  { name: "Primär",   sectors: [0, 2, 4], temp: "neutral" }, // röd / grön / blå
  { name: "Skogsdis", sectors: [1, 2, 3], temp: "cool" },    // gul / grön / cyan
  { name: "Djupblå",  sectors: [3, 4, 5], temp: "cool" },    // cyan / blå / magenta
];
// Regi-lagret sätter denna varje frame; mixedSector begränsar färgvalet till den.
let CURRENT_PALETTE: number[] = ALL_SECTORS;

function mixedSector(n: number): number {
  const g = Math.floor(((((n * 0.61803398875) % 1) + 1) % 1) * 6);   // golden-vandring 0–5
  return CURRENT_PALETTE[g % CURRENT_PALETTE.length];                 // mappa in i aktiv palett
}

const sectorHold: number[] = [];
function snapHue(idx: number, h: number): number {
  const raw = (((h * 6) % 6) + 6) % 6;
  let cur = sectorHold[idx];
  if (cur === undefined) cur = sectorHold[idx] = Math.round(raw) % 6;
  let d = raw - cur;
  if (d > 3) d -= 6; else if (d < -3) d += 6;
  if (Math.abs(d) > 0.65) sectorHold[idx] = cur = ((Math.round(raw) % 6) + 6) % 6;
  return cur / 6;
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  // Physical PARs with big discrete R/G/B LEDs can't blend hues — anything
  // between the six pure corner colors lights the LED groups unevenly and
  // looks muddy. Snap hue to 60° steps and saturation to pure color/white;
  // all smoothness lives in brightness (v) instead.
  // hue arrives sector-snapped via snapHue(); saturation stays pure/white
  s = s >= 0.5 ? 1 : 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

const clamp01 = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x;
// LED PARs are wildly non-linear: DMX 128 looks ~80% bright and the low end
// cuts off abruptly. Gamma 2.2 makes the fade perceptually linear — half
// looks half, and most DMX resolution lands in the visible low range.
const to255 = (x: number) => Math.round(Math.pow(clamp01(x), 2.2) * 255);
