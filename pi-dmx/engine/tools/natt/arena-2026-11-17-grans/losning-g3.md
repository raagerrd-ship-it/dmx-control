# g3 TÄTHET OCH ANSLAG: lookbyte när anslagsmönstret byter fas

## Idén
Analysatorn samlar anslagens toppar (fbOn, band 3-7: mellanregister/virvel/hihat/synth) per sextondel i klockans tempo och jämför den senaste takten (16 sextondelar, positionsvis) med medlet av de två takterna före. Avståndet z-normeras mot låtens egna senaste 256 slag (`frame.patZ`); dirigenten byter look på sin etta när z >= 0,75. Det är realtid (bara hört ljud, ingen framåtblick) och relativt mot låtens egen fördelning – inget tal är skattat per fil. Trösklarna valdes offline på två övningsfiler (sond-loggar), 171840 aldrig sondad.

## Av de 28 missade
6 tas (7 gränser – 359,2 s är drop + refräng på samma tid): refräng 2, vers 2, drop 1, intro 1. Inget byte tappas. En gräns blir sämre: 151659 vers 239,8 (0,2 -> 11,9 slag; mönsterbytet 227,8 höll looken när landningen kom). Mönsterbyten: 9 (151659: 5, 193040: 4, 171840: 0), varav cirka 3 lösa (lösa +0,15/min).

## Delarna
| del | vad den gör | mått den bär |
|---|---|---|
| A `patStep` (analyser.ts, snabba vägen) | anslagstoppar per sextondel, takt mot två takter före, z mot låten -> `frame.patZ` | AUC 0,72 (byte på gränsen) / 0,81 (1 takt efter) mot ettor utan gräns, 2 filer |
| B `patHit` (effects.ts) | på ettan, z >= 0,75, MIN_HOLD 8 s, ej build/lucka, i high/intro/low -> ny look ur samma tier (landningens gren, utan tierlyft) | m2: miss 34,1 -> 27,5 %, lag 8,5 -> 7,7 |
| C uppslukning 16 slag | sektionsbyte inom 16 slag efter mönsterbytet tas inte | byten 3,39 -> 3,75/min (spärrarna med marginal) |
| D PAT_Z 1,0 -> 0,75 | fler mönsterbyten (7 -> 9) | m1 +4,44 -> m2 +5,07 |

## Siffrorna (m2, mot bas)
| fil | gräns % | lag | etta % | lösa | byten | miss % |
|---|---|---|---|---|---|---|
| 151659 | 33,3 (30,0) | 7,1 (8,9) | 57,6 (57,1) | 1,4 (1,28) | 3,8 (3,25) | 26,7 (43,3) |
| 171840 | 9,1 (9,1) | 8,9 (8,9) | 20,0 (20,0) | 0,8 | 3,2 | 36,4 (36,4) |
| 193040 | 32,3 (29,0) | 7,1 (7,6) | 57,7 (47,8) | 1,1 (0,82) | 4,3 (3,77) | 19,4 (22,6) |

Poäng **+5,07**, ljus **-1,5** (m1: +4,44, ljus +0,2), ingen DISK. Sämre: ljuset (lookvalsbrus enligt ljusbrus-noten, men i low väljs nu nya looker), lösa +0,15/min, 239,8 i 151659. 171840 påverkas inte alls (inget patZ >= 0,75 på en etta i tillåtet läge; där ligger ettan fel till 55 %).

## Risken
- Live-mic: prat och publik ger anslag i band 3-7 utan takt, så d stiger. z mot låten dämpar det, men en lös lookbyte per prat är möjlig. MIN_HOLD 8 s begränsar.
- Ettan: bytet sitter bara rätt där ettan är rätt (171840 visar det). Klockans sextondelar räknas från ett eget t0 i tempot och inte från ankaret, så de glider långsamt vid tempofel. Det är ofarligt för jämförelsen över 3 takter.
- Låtbyten: tempot > 4 % ändrat ger en omstart (3 takter blinda). Historiken bärs över, så första takten i en ny låt ger ofta högt z och ett byte. Det är oftast rätt.
- Breaks och långa uppbyggnader: spärras av inBuild/inGap. I low tillåts byte, och då kan en break-look bytas mot en annan lugn look.
- Workern: ingen ny väg. patStep körs i snabba tråden på fbOn (FAST_BANDS på i DMX). Utan FAST_BANDS (lotus) används bandOn, som i workerläget kan stå still, och då blir patZ 0. Lotus läser inte fältet.
- Minne 2,1 kB förallokerat, ingen allokering per hop. CPU 80 additioner per slag + 256 per slag för z.

## Diffen
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/grans/g3/src/ANALYSER_SHARED.md5
index f6ba712..43d8a60 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/grans/g3/src/ANALYSER_SHARED.md5
@@ -1,5 +1,5 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-1e5942108e88af6bfe857ef56a7429b8 analyser.ts
+80bb5246270ee66b821166b7cc7b89f9 analyser.ts
 b5485714f88c45ec0f55f21b9d5ab20e analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
diff --git a/src/analyser.ts b/.arena/grans/g3/src/analyser.ts
index 5dcd901..6079903 100644
--- a/src/analyser.ts
+++ b/.arena/grans/g3/src/analyser.ts
@@ -130,7 +130,7 @@ export interface Frame {
   sectionIndex: number;   // antal 'high'-partier hittills i laten
   sectionTier: number;   // 0 lag / 1 mellan / 2 hog
   repeatSim: number; repeatAgoMs: number; repeatSection: string;   // UPPREPNING
-  expectHighInMs: number; prevSection: string; levelVsHighDb: number; sectionBars: number;   // SEKTIONSMINNE + FORUTSAGELSE
+  expectHighInMs: number; prevSection: string; levelVsHighDb: number; patZ: number; sectionBars: number;   // SEKTIONSMINNE + FORUTSAGELSE
   spec: Spectrum;   // Rikt spektrum + per-band onset
   specAbs: Spectrum;   // Absolut per-band magnitud före AGC, för Lotus ljusväg och bandandelar
   bodyDb: number;   // BASKROPPEN I RA dB
@@ -735,7 +735,7 @@ export class Analyser {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
       dropCount: 0, miniDropCount: 0, buildStartCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, inZone: false, breaking: false, buildUp: 0, buildProg: 0, inRiser: false, profile: this.character.outProfile, beatAnchorMs: 0,
-      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
+      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0, patZ: 0,
       spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
     };
     for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
@@ -965,8 +965,36 @@ export class Analyser {
       else this.hopLane!.feed(f, this.clockOut, this);
       publishPhase(f, this.clockOut.beat, this.clock ? this.clock.barKnown() : this.hopLane!.barKnown, this.extGrid, Date.now(), Analyser.GRID_PHASE_OFFSET_MS);
     }
+    if (this.role !== 'slow') { this.patStep(O); f.patZ = this.patZ; }
     return f;
   }
+  patZ = 0;   // ANSLAGSMÖNSTRET
+  private patAcc = new Float32Array(5); private patT0 = 0; private patBpm = 0; private patK = 0; private patV = new Float32Array(240);
+  private patH = new Float32Array(256); private patHN = 0; private patHP = 0; private patMu = 0; private patSd = 1;
+  /** Anslagens toppar per sextondel i band 3-7; senaste takten mot de två före, z mot låtens senaste 256 slag. */
+  private patStep(O: ArrayLike<number>): void {
+    const bpm = this.localBpm, A = this.patAcc;
+    if (!(bpm > 40) || this.lvlSmooth <= this.silenceLevel || (this.patBpm > 0 && Math.abs(bpm / this.patBpm - 1) > 0.04)) { this.patBpm = 0; this.patZ = 0; return; }
+    const now = this.wallNow(), q = 15000 / bpm;
+    if (this.patBpm === 0) { this.patBpm = bpm; this.patT0 = now; this.patK = 0; A.fill(0); }
+    for (let b = 0; b < 5; b++) if (O[b + 3] > A[b]) A[b] = O[b + 3];
+    if (now - this.patT0 < q) return;
+    this.patT0 = now - this.patT0 < 2 * q ? this.patT0 + q : now;
+    const V = this.patV, k = this.patK, o = (k % 48) * 5;
+    for (let b = 0; b < 5; b++) V[o + b] = A[b];
+    A.fill(0); this.patK = k + 1;
+    if (k < 47 || (k & 3) !== 3) return;
+    let num = 0, den = 0;
+    for (let j = 0; j < 16; j++) {
+      const c = ((k - j) % 48) * 5, r1 = ((k - j - 16) % 48) * 5, r2 = ((k - j - 32) % 48) * 5;
+      for (let g = 0; g < 5; g++) { const r = (V[r1 + g] + V[r2 + g]) / 2; num += Math.abs(V[c + g] - r); den += V[c + g] + r; }
+    }
+    const d = den > 0.5 ? num / den : 0;
+    this.patZ = this.patHN >= 32 ? (d - this.patMu) / this.patSd : 0;
+    const H = this.patH; H[this.patHP] = d; this.patHP = (this.patHP + 1) & 255; if (this.patHN < 256) this.patHN++;
+    const n = this.patHN; let s1 = 0, s2 = 0; for (let i = 0; i < n; i++) { s1 += H[i]; s2 += H[i] * H[i]; }
+    this.patMu = s1 / n; this.patSd = Math.sqrt(Math.max(0, s2 / n - this.patMu * this.patMu)) + 0.02;
+  }
   clock: BeatFeed | null = null;   // ANALYSATORNS KLOCKA utan taktväg
   readonly clockOut: ClockCfg = { beat: undefined, beatErr: undefined };
   /** Klockans utfall till motorn. */
diff --git a/src/effects.ts b/.arena/grans/g3/src/effects.ts
index 8957bb7..09996c9 100644
--- a/src/effects.ts
+++ b/.arena/grans/g3/src/effects.ts
@@ -308,6 +308,7 @@ const PULSE_IDX_INIT = -2e9;
 /** SECTION_UNIT (ladan 16:45): forvarningens 'high' 600 ms fore en forutsedd refrang och drop-fonstrets 'high' raknas INTE som sektionsgrans
  *  (de gav high<->low-hopp pa 1-2 s nar refrangen uteblev). Bara den raa sektionen, och den maste vara minst DMX_SECTION_UNIT_MIN_MS gammal. */
 const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 24000;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
+const PAT_Z = 0.75, PAT_ABSORB_BEATS = 16;   // ANSLAGSMÖNSTRET (arenan grans g3): frame.patZ på ettan -> ny del; sektionsbyten inom 16 slag efter tas inte
 const GAP_HOLD_MS = 4000;   // I LUCKAN: spärren efter uppbyggnadssignalen släpper senast efter 4 s (signal -> landning median 1,8 s)
 /** LÅTMANUS (10-12 kväll, ägaren: "olika effekter hoppar hela tiden ... mer som att den är förprogrammerad" + "allt mer känns anpassat
  *  efter låten och som att de hänger ihop"). ERSÄTTER frasväxlingen (A/B-look var 8:e takt), basgångs-, karaktärs- och tempobytet,
@@ -1102,6 +1103,7 @@ export class EffectEngine {
         this.lastMiniSeen = frame.miniDropCount;
         const inGap = nowWall < this.gapUntil;
         const inBuild = frame.inRiser || frame.buildUp > 0.35 || (frame.section === 'build');   // bara build-poolens inträde (allaBuild)
+        const patHit = this.tickNow && this.lastBeatIdx % 4 === 0 && frame.patZ >= PAT_Z && held > MIN_HOLD && !inBuild && !inGap && hasBeat && bpm > 0 && this.beatTrust >= 0.5;   // ANSLAGSMÖNSTRET: analysatorns takt-mot-takt-byte på ettan
         // ALLA_LOOKER (a): en uppbyggnad som hallit ALLA_BUILD_S = intrade -> ETT byte till build-poolen
         let allaBuild = false;
         if (!inBuild) { this.buildSince = -1; this.buildEntered = false; }
@@ -1146,10 +1148,12 @@ export class EffectEngine {
         }
         if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && slagOk))) {
         this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
-      } else if (landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) {
-        this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
-        this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
-        this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS;
+      } else if (landHit ? held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro') : patHit && (liveSec === 'high' || liveSec === 'intro' || liveSec === 'low')) {
+        this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan); mönsterbytet behåller tiern
+        const lift = landHit && tier === LUGN;
+        this.switchLook(frame, bpm, lift ? FART : tier, lift ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
+        this.landForce = false; this.landAbsorbUntil = nowWall + (landHit ? LAND_ABSORB_MS : PAT_ABSORB_BEATS * 60000 / bpm);
+        if (!landHit && this.lastSmartSwitchMs === now) this.switchWhy = 'monster';
       }
       return this.smartMode;
   }
```
