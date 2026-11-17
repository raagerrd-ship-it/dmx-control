# g5 SÅNG OCH MELODI: mellanbandets form

## Idén
Analysatorn mäter, i snabba vägen ur 512-FFT:n, formen i 8 logaritmiska band 250-6000 Hz (dB minus bandens medel, alltså nivån borttagen) för den senaste takten mot de 8 takterna före, och ger det som z mot låtens egna senaste 32 takter (`frame.midNovZ`). Dirigenten tar z >= 3 (tre standardavvikelser i låtens egen fördelning, ingen tröskel från facit) på ettan som "ny del" och kör den genom landningens väg, så den inte blir en egen kopia av beslutet: look ur manus/samma pool, minst 6 s hållen look, aldrig i build eller i luckan.

## Ärligt fynd (det viktigaste)
Mellanbandets form är ett SVAGT vittne för de 28 missade gränserna. Jag analyserade WAV-filerna offline (egen analys, aldrig i motorn) och fick AUC 0,55-0,65 mot andra ettor, både per slag och per takt. Det slår sämre än totalnivån (0,72-0,88). De starka utslagen (z 4-7) ligger på takten FÖRE gränsen (fill/upptakt), så bytet hamnar på gränsen, men de gränserna tar r0:s landning eller sektionsbyte redan i samma ruta. Sonden på 151659 visade alla z >= 3 i high samtidigt med ett befintligt byte. Utslag mellan 2 och 3 var mest lösa: med MID_Z 2 blev det 4 byten, ett av dem lade sig 5,6 s före en landning och tog bort den (grans 30 -> 27 %).

## Vilka av de 28 som tas
1 (vers, 193040 350,0 s -> byte 352,05, cirka +4 slag). Inga nya byten på gränsen (±1 slag). 1 nytt löst byte (171840 117,2 s).

## Delarna
| del | vad den gör | mått |
|---|---|---|
| A analyser.ts `midStep` + `frame.midNovZ` | kvartsslagets effekt i 8 mellanband, takten mot 8 takter, z mot 32 takter. 4,6 kB förallokerat, ingen allokering per hop | fyrar 2 gånger på övningen (z >= 3 i dirigentens fönster) |
| B effects.ts `midHit` i landningens gren | på ettan, z >= 3, ej build/lucka, tillit >= 0,5; sektion high/intro/low (low bara för formen); ingen tier-lyftning för formen | 193040 lag 7,6 -> 7,2, miss 22,6 -> 19,4 %; etta 41,7 -> 44,0 % |
| C uppslukning för formen = MIN_HOLD (8 s), inte 24 s | m1 med 24 s: 117,2 s-bytet svalde 171840:s sektions- och dropbyten (grans 9 -> 0 %, lag 8,9 -> 11,1, poäng negativ) | m2: 171840 tillbaka på bas |
| switchWhy 'form' | bara diagnostik | - |

## Siffrorna (m2, mot bas)
| fil | grans % | lag | etta % | lösa | byten | miss % |
|---|---|---|---|---|---|---|
| 151659 | 30,0 (30,0) | 8,9 (8,9) | 57,1 (57,1) | 1,3 (1,28) | 3,3 (3,25) | 43,3 (43,3) |
| 171840 | 9,1 (9,1) | 8,9 (8,9) | 25,0 (20,0) | 1,1 (0,84) | 3,4 (3,16) | 36,4 (36,4) |
| 193040 | 29,0 (29,0) | 7,2 (7,6) | 50,0 (47,8) | 0,8 (0,82) | 3,9 (3,77) | 19,4 (22,6) |

Poäng **+1,39**, ljus **-0,2**, ingen DISK. Sämre: 171840 lösa +0,26/min (ett löst byte). m1 (MID_Z 3, 24 s uppslukning, bara high/intro): 171840 grans 9 -> 0 %, alltså sämre än bas.

## Risken
- Live-mic: formen är nivåfri, men prat i ett tyst parti ändrar mellanbandet mycket. z >= 3 och 6 s hållen look begränsar det, men det kan ge lösa byten. low är tillåtet för formen, så en mörk/lugn look kan komma i ett lugnt intro (ljuset -0,2 här, men det är obeprövat med fyra frön).
- Låtbyten: nya låtar ger stora z (226 och 385 s i 151659, z 2,7-4). Det är rätt riktning, men byte blir det bara om hålltid och lucka tillåter.
- Klockan: fönstret är 16 kvartsslag på analysatorns tempo, inte låst till ettan. Där tempot är fel blir takten fel.
- Workern: räknas på den snabba sidan ur 512-FFT:n och gäller alla roller. Inget nytt fält i split.ts. Lotus får ~60 bin-kvadrater per hop.
- Jokerns värde: del A är ett nivåfritt vittne som kan kombineras med en nivåsignal. Ensam bär den nästan inget.

## Diffen
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/grans/g5/src/ANALYSER_SHARED.md5
index f6ba712..54c9de1 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/grans/g5/src/ANALYSER_SHARED.md5
@@ -1,5 +1,5 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-1e5942108e88af6bfe857ef56a7429b8 analyser.ts
+ee76fa8fcf87b6abc84194fd8d1a14eb analyser.ts
 b5485714f88c45ec0f55f21b9d5ab20e analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
diff --git a/src/analyser.ts b/.arena/grans/g5/src/analyser.ts
index 5dcd901..1efb1ab 100644
--- a/src/analyser.ts
+++ b/.arena/grans/g5/src/analyser.ts
@@ -131,6 +131,7 @@ export interface Frame {
   sectionTier: number;   // 0 lag / 1 mellan / 2 hog
   repeatSim: number; repeatAgoMs: number; repeatSection: string;   // UPPREPNING
   expectHighInMs: number; prevSection: string; levelVsHighDb: number; sectionBars: number;   // SEKTIONSMINNE + FORUTSAGELSE
+  midNovZ: number;   // MELLANBANDETS FORM (g5)
   spec: Spectrum;   // Rikt spektrum + per-band onset
   specAbs: Spectrum;   // Absolut per-band magnitud före AGC, för Lotus ljusväg och bandandelar
   bodyDb: number;   // BASKROPPEN I RA dB
@@ -709,6 +710,7 @@ export class Analyser {
       }
       this.bands.fbAlvl = 1 - Math.exp(-dtMs / 90);
     }
+    for (let b = 0; b < 8; b++) { const bh = cfg.audio.rate / cfg.fft.size, h = cfg.fft.size / 2; this.mdLo[b] = Math.min(h - 1, Math.max(1, Math.round(Analyser.MID_HZ[b] / bh))); this.mdHi[b] = Math.min(h, Math.max(this.mdLo[b] + 1, Math.round(Analyser.MID_HZ[b + 1] / bh))); }
     this.bands.magBigMax = Math.min(BIG / 2, this.bands.bandHi[7] + 1);
     this.bands.magBigView = this.bands.magBig.subarray(0, this.bands.magBigMax);
     this.bands.prevMagBigView = this.bands.prevMagBig.subarray(0, this.bands.magBigMax);
@@ -735,7 +737,7 @@ export class Analyser {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
       dropCount: 0, miniDropCount: 0, buildStartCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, inZone: false, breaking: false, buildUp: 0, buildProg: 0, inRiser: false, profile: this.character.outProfile, beatAnchorMs: 0,
-      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
+      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0, midNovZ: 0,
       spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
     };
     for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
@@ -809,6 +811,7 @@ export class Analyser {
       powSum += p; powW += i * p;
     }
     this.onsetPeakReady = true;
+    this.midStep(spectrum);
     if (enhancedOnset) {
       for (let i = 0; i < bassBins; i++) this.prevMag[i] = this.onsetPrev[i];
     }
@@ -959,6 +962,7 @@ export class Analyser {
     f.repeatSim = this.repeatSim; f.repeatAgoMs = this.repeatAgoMs; f.repeatSection = this.repeatSection;
     f.expectHighInMs = this.section === 'high' ? 0 : this.expectHighMs > 0 ? Math.max(0, this.expectHighMs - nowS) : -1;
     f.prevSection = this.prevSection; f.levelVsHighDb = this.levelVsHighDb;
+    f.midNovZ = this.midNovZ;
     f.sectionBars = this.localBpm > 0 && this.sectionStartMs > 0 ? (nowS - this.sectionStartMs) / (240000 / this.localBpm) : 0;
     if (this.clock || this.hopSelf) {
       if (this.clock) this.clock.update(f, this.clockOut, this, Date.now());
@@ -967,6 +971,42 @@ export class Analyser {
     }
     return f;
   }
+  midNovZ = 0;   // MELLANBANDETS FORM (arenan grans g5)
+  private static readonly MID_HZ = [250, 372, 553, 822, 1224, 1820, 2707, 4027, 6000];
+  private mdLo = new Int32Array(8); private mdHi = new Int32Array(8); private mdAcc = new Float64Array(8); private mdN = 0; private mdT = 0;
+  private mdQ = new Float32Array(144 * 8); private mdK = 0; private mdBar = new Float32Array(9 * 8); private mdH = new Float32Array(128); private mdHN = 0; private mdHP = 0;
+  /** Formen (dB minus medel) i 8 mellanband för senaste takten mot de 8 takterna före; z mot låtens senaste 32 takter. */
+  private midStep(S: ArrayLike<number>): void {
+    const bpm = this.localBpm;
+    if (!(bpm > 40) || this.lvlSmooth <= this.silenceLevel) { this.midNovZ = 0; return; }
+    const A = this.mdAcc;
+    for (let b = 0; b < 8; b++) { let p = 0; for (let i = this.mdLo[b]; i < this.mdHi[b]; i++) { const re = S[2 * i], im = S[2 * i + 1]; p += re * re + im * im; } A[b] += p; }
+    this.mdN++; this.mdT += this.hopMs;
+    const q = 15000 / bpm;
+    if (this.mdT < q) return;
+    this.mdT = this.mdT - q < q ? this.mdT - q : 0;
+    const Q = this.mdQ, o = (this.mdK % 144) * 8;
+    for (let b = 0; b < 8; b++) { Q[o + b] = A[b] / this.mdN; A[b] = 0; }
+    this.mdN = 0; const k = ++this.mdK;
+    if (k < 144) return;
+    const M = this.mdBar;
+    for (let r = 0; r < 9; r++) {
+      let s = 0;
+      for (let b = 0; b < 8; b++) { let p = 0; for (let j = 0; j < 16; j++) p += Q[((k - 1 - 16 * r - j) % 144) * 8 + b]; const d = 10 * Math.log10(p / 16 + 1e-12); M[r * 8 + b] = d; s += d; }
+      s /= 8; for (let b = 0; b < 8; b++) M[r * 8 + b] -= s;
+    }
+    let nov = 0;
+    for (let b = 0; b < 8; b++) {
+      let m = 0; for (let r = 1; r < 9; r++) m += M[r * 8 + b]; m /= 8;
+      let v = 0; for (let r = 1; r < 9; r++) { const x = M[r * 8 + b] - m; v += x * x; }
+      const x = (M[b] - m) / (Math.sqrt(v / 8) + 0.5); nov += x * x;
+    }
+    nov = Math.sqrt(nov / 8);
+    const H = this.mdH, n = this.mdHN;
+    if (n >= 48) { let m = 0; for (let i = 0; i < n; i++) m += H[i]; m /= n; let v = 0; for (let i = 0; i < n; i++) { const x = H[i] - m; v += x * x; } this.midNovZ = (nov - m) / (Math.sqrt(v / n) + 1e-6); }
+    else this.midNovZ = 0;
+    if (k % 4 === 0) { H[this.mdHP] = nov; this.mdHP = (this.mdHP + 1) & 127; if (this.mdHN < 128) this.mdHN++; }
+  }
   clock: BeatFeed | null = null;   // ANALYSATORNS KLOCKA utan taktväg
   readonly clockOut: ClockCfg = { beat: undefined, beatErr: undefined };
   /** Klockans utfall till motorn. */
diff --git a/src/effects.ts b/.arena/grans/g5/src/effects.ts
index 8957bb7..b30fa81 100644
--- a/src/effects.ts
+++ b/.arena/grans/g5/src/effects.ts
@@ -307,7 +307,7 @@ const PULSE_IDX_INIT = -2e9;
  *      detektorn da satt fast pa high; rotorsaken (ingen nollning vid latbyte) ar rattad 09-23. Sedan 10-12: LÅTMANUS. */
 /** SECTION_UNIT (ladan 16:45): forvarningens 'high' 600 ms fore en forutsedd refrang och drop-fonstrets 'high' raknas INTE som sektionsgrans
  *  (de gav high<->low-hopp pa 1-2 s nar refrangen uteblev). Bara den raa sektionen, och den maste vara minst DMX_SECTION_UNIT_MIN_MS gammal. */
-const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 24000;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
+const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 24000, MID_Z = 3.0;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
 const GAP_HOLD_MS = 4000;   // I LUCKAN: spärren efter uppbyggnadssignalen släpper senast efter 4 s (signal -> landning median 1,8 s)
 /** LÅTMANUS (10-12 kväll, ägaren: "olika effekter hoppar hela tiden ... mer som att den är förprogrammerad" + "allt mer känns anpassat
  *  efter låten och som att de hänger ihop"). ERSÄTTER frasväxlingen (A/B-look var 8:e takt), basgångs-, karaktärs- och tempobytet,
@@ -566,7 +566,7 @@ export class EffectEngine {
   private lastDemoted = 0; private lastSpaced = 0; private lastStopCount = 0;   // analysatorns monotona räknare (a3: dropDemoted/dropSpaced/stopCount)
    private tickNow = false; private rNowP = 0; private rNowWall = 0; private rDt = 0; private rDtT = 0; private rBeatMs = 0; private rBeatEnv = 0; private rDTarget = 0; private rMd = 0; private rT = 0; private rAnchorHue = 0; private rDrive = 0; private rInputGate = 0;   // RUTANS TAL (se EN KLOCKA PER RUTA): fält i stället för argument - ett decimaltal som skickas till en metod packas in (GC-jakten 10-16)
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
-  private landForce = false; private landAbsorbUntil = -1;   // LANDNINGEN (a7)
+  private landForce = false; private landAbsorbUntil = -1; private landMid = false;   // LANDNINGEN (a7)
   private lastBuildStart = 0; private lastMiniSeen = 0; private gapUntil = -1;   // I LUCKAN (11-16): inget lookbyte från uppbyggnadssignalen tills basen är tillbaka
   private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
   private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
@@ -818,7 +818,7 @@ export class EffectEngine {
         else {
         this.lastSmartSwitchMs = now; this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true;
         // DIAGNOSTIK (se switchWhy): starkaste orsaken forst. 'dwell' sist = klockan var det enda skalet.
-        this.switchWhy = dropSwitch ? 'drop' : this.landForce ? 'landning'
+        this.switchWhy = dropSwitch ? 'drop' : this.landForce ? (this.landMid ? 'form' : 'landning')
           : (memSection || secEntry) ? 'sektion'
           : (buildEntry || allaBuild) ? 'build' : buildExit ? 'build-slut' : tierChanged ? 'tier' : 'dwell';
         this.switchCount++;
@@ -1102,6 +1102,7 @@ export class EffectEngine {
         this.lastMiniSeen = frame.miniDropCount;
         const inGap = nowWall < this.gapUntil;
         const inBuild = frame.inRiser || frame.buildUp > 0.35 || (frame.section === 'build');   // bara build-poolens inträde (allaBuild)
+        const midHit = this.tickNow && this.lastBeatIdx % 4 === 0 && (frame.midNovZ ?? 0) >= MID_Z && !inBuild && !inGap && hasBeat && this.beatTrust >= 0.5;   // MELLANBANDETS FORM (g5): ny del på ettan, samma väg som landningen
         // ALLA_LOOKER (a): en uppbyggnad som hallit ALLA_BUILD_S = intrade -> ETT byte till build-poolen
         let allaBuild = false;
         if (!inBuild) { this.buildSince = -1; this.buildEntered = false; }
@@ -1146,10 +1147,10 @@ export class EffectEngine {
         }
         if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && slagOk))) {
         this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
-      } else if (landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) {
-        this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
-        this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
-        this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS;
+      } else if (held > LAND_HOLD_MS && ((landHit && (liveSec === 'high' || liveSec === 'intro')) || (midHit && !dropHit && (liveSec === 'high' || liveSec === 'intro' || liveSec === 'low')))) {
+        this.landForce = true; this.landMid = !landHit; const lift = landHit && tier === LUGN;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
+        this.switchLook(frame, bpm, lift ? FART : tier, lift ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
+        this.landForce = false; this.landAbsorbUntil = nowWall + (landHit ? LAND_ABSORB_MS : MIN_HOLD);
       }
       return this.smartMode;
   }
```
