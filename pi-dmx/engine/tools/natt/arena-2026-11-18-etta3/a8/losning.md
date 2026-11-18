# a8, etta3: taktmätare (stapelpekare) i en andra worker

**IDÉN.** En ny taktmätare (`analyserMeter.ts`) jämför varje takt med takten före i sju band. Förändringen (instrument som kommer in eller går ut, ny del, ackordbyte) brukar komma på ettan och nästan aldrig på trean, och en stapelpekare (HMM över de fyra möjliga ettorna, utsändning = förändringen vid taktstrecket) samlar det beviset. Den gamla modellen (K/R/L + backbeat) skiljer fortfarande {1,3} från {2,4}. Mätaren avgör bara 1 mot 3, och bara när den är säker (P > 0,9). Där trean och ettan ser lika ut i en stadig groove avgör alltså förändringen vid frasstarterna.

## DELARNA
| del | vad den gör | mått (övningen) | varifrån |
|---|---|---|---|
| D1 mätaren (`analyserMeter.ts` + anropen i `barStep`/`barCommit`) | medel-dB per slag i 7 band; nyhet = Σ\|medel(4 slag efter) − medel(4 slag före)\| / löpande medel − 1; framåtfilter över 4 ettor, ε = 0,005 per slag; ettan flyttas till cb+2 när P(cb+2)/(P(cb)+P(cb+2)) > 0,9 | m1: ren 86,6 -> 88,4 (171840 75 -> 81), omval 0,74 -> 0,98, poäng +0,59 | ny (släkt med etta2 a1 ackordbyte, men hela takter och alla band) |
| D2 hållet | mätarens senaste säkra val står kvar så länge basens val ligger i samma {1,3}-par | m2: 171840 81 -> 94, omval 0,98 -> 0,80, men 200719 92 -> 85 | ny |
| D3 andra workern (`analyser.ts`: parts `['lane','slow']` när motorn matar taktvägen, alltså DMX men inte lotus) | klockan och mätaren får en egen tråd | inget bänkmått (bänken kör inline); `dmxDump` inline mot sync med två riktiga workers, 60 s 171840: md5 identisk på alla lampor | takt a8 (egen worker), infrastrukturen är a3:s |

Konstanterna är valda ur musikteori, inte ur facit: fönstret är en takt, λ = 1, ε och 0,9 är valda för att mätaren ska vara trög. En offline-koll i Python på övningens Beat This-slag visade att "säker men fel" låg under 1 %.

## KOSTNADEN
Allt körs i worker (taktvägen). Huvudtråden är oförändrad. Per hop blir det 7 log10 och 7 additioner, per slag ~150 operationer. Ingen allokering per hop. Mätarens minne är under 1 KB. Den andra workern-tråden (V8-isolat) kostar troligen 5–10 MB RSS, vilket pibudget måste bekräfta. D1+D2 fungerar också utan D3.

## DIFFEN
Hela diffen står nedan (och i `diff.txt`).

## SIFFRORNA (m2 = etta3dom.json, poäng +3,52, ingen spärr)
| fil | ren bas -> a8 | trean bas -> a8 | omval bas -> a8 |
|---|---|---|---|
| 151659 | 92,8 -> 92,6 | 6,0 -> 6,2 | 0,12 -> 0,35 |
| 171840 | 75,3 -> 94,1 | 21,8 -> 3,0 | 0,64 -> 0,64 |
| 200719 | 91,8 -> 84,6 | 4,9 -> 12,1 | 1,47 -> 1,41 |

Medel: ren 86,6 -> 90,4, etta alla 78,6 -> 82,9, paslag 91,9 -> 91,9, FEL 10,3 -> 10,2, oktav 5,6 -> 5,6, lead oförändrad. Sämre blev 200719: hållet låser en säker men felaktig trea (m1 utan hållet hade 91,8 där). Ökningen av omvalen i 151659 kommer från D1.

## RISKEN
- Ett säkert felval hålls tills mätaren blir säker åt andra hållet (se 200719). Byggs en del in på trean (en fill som startar på 3, en upptakt), pekar mätaren dit.
- Udda takter och breaks: luckor i slagen nollställer jämförelsefönstret (`gap`), och låtgränsen nollställer allt. Efter en udda takt krävs ny säker evidens.
- Musik utan trumma fungerar (det är bandenergi, inte kick), men ett stillastående ackordflöde ger ingen evidens. Då gäller basen.
- Live-mic: förändringen räknas relativt (nyhet / medel), så nivån spelar ingen roll. Rumsbrus späder ut.
- D3: två workers på Pi:n behöver ett pibudget-prov (minne och kärnor). Lyft ut D3 om minnet inte räcker.

```diff
diff --git a/.arena/etta3/bas/src/analyser.ts b/.arena/etta3/a8/src/analyser.ts
index 5dcd901..76ebe1a 100644
--- a/.arena/etta3/bas/src/analyser.ts
+++ b/.arena/etta3/a8/src/analyser.ts
@@ -1014,7 +1014,7 @@ export function createAnalyser(cfg: AnalyserConfig, modeIn?: 'worker' | 'inline'
   const withWorker = ({ Worker }: typeof import('node:worker_threads')) => {
     let stopped = false;
     const attempts: number[] = [];
-    const parts: Array<'all' | 'lane' | 'slow'> = ['all'];
+    const parts: Array<'all' | 'lane' | 'slow'> = fast.hopLane && !fast.hopSelf ? ['lane', 'slow'] : ['all'];
     const workers: Array<{ postMessage: (m: unknown) => void }> = [];
     const start = (part: 'all' | 'lane' | 'slow', resumeSeq: number, why: string) => {
       const data: WorkerData = { cfg: { ...cfg }, buffers, resumeSeq, sync, part };
diff --git a/.arena/etta3/bas/src/analyserClock.ts b/.arena/etta3/a8/src/analyserClock.ts
index 0832641..b7b76ed 100644
--- a/.arena/etta3/bas/src/analyserClock.ts
+++ b/.arena/etta3/a8/src/analyserClock.ts
@@ -1,5 +1,5 @@
 /** TAKTMATNINGEN (utbruten ur index.ts 2026-10-10, ordagrant): fasprediktionstilliten, den löpande takten (10-19, ersatte kick-PLL:en och fasfoljaren), taktfasen (ettan) och coasten som haller cfg.beat (ankare + bpm + konfi Anteckningar (kommentarerna som stod i koden): docs/analysator/analyserClock.md */
-import type { Frame } from "./analyser.js";   // ANALYSATORNS KLOCKA
+import type { Frame } from "./analyser.js"; import { BarMeter } from "./analyserMeter.js";   // ANALYSATORNS KLOCKA
 export const MIN_BEAT_CONFIDENCE = 0.20;   // Klockans grind
 export const SYNC_ERR_FRAC = 0.2, TRUST_TAU_MS = 81;   // TILLITEN TILL TAKTEN
 export function trustStep(prev: number, conf: number, beatErr: number, dtMs: number): number {
@@ -90,7 +90,7 @@ export class BeatFeed {
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private barOff = 0; barShifts = 0;
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
-  private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0; private readonly meter = new BarMeter(); private barB = 0;   // backbeaten (a8r)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -412,7 +412,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barB = this.barOff & 3; this.meter.reset(); this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -421,7 +421,7 @@ export class BeatFeed {
     if (!(beat.bpm > 40)) return;
     const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
-      if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per);
+      if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per); else this.meter.gap();
       this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0;
     }
     if (pos - idx <= BAR_WIN1) {
@@ -429,6 +429,7 @@ export class BeatFeed {
       if (k > this.bE) this.bE = k;
       if (rl > this.bL) this.bL = rl;
     }
+    this.meter.hop(sa);
     { const ti = Math.floor(pos);
       if (ti !== this.barTi) { if (ti === this.barTi + 1) this.barBack(); this.barTi = ti; this.barV.fill(0); this.barVc.fill(0); }
       const q = Math.min(BAR_Q - 1, Math.floor((pos - ti) * BAR_Q)); this.barV[q] += sa?.treble ?? 0; this.barVc[q]++; }
@@ -452,6 +453,7 @@ export class BeatFeed {
     if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
+    this.meter.beat(slot);
     for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL;
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
@@ -468,7 +470,8 @@ export class BeatFeed {
         + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
+    if (bi !== this.barB && best - second >= BAR_MARGIN) this.barB = bi;
+    const m = this.meter.pick(this.barB); if (m !== this.barM) { this.barM = m; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
diff --git a/.arena/etta3/a8/src/analyserMeter.ts b/.arena/etta3/a8/src/analyserMeter.ts
new file mode 100644
index 0000000..8adf1d6
--- /dev/null
+++ b/.arena/etta3/a8/src/analyserMeter.ts
@@ -0,0 +1,46 @@
+/** TAKTMÄTAREN (etta3 a8): stapelpekare över fyra ettor, utsändning = förändring vid taktstrecket. Anteckningar: .arena/etta3/a8/losning.md */
+const MT_B = 7, MT_W = 4, MT_N = 2 * MT_W, MT_MU_A = 1 / 32, MT_LAM = 1, MT_EPS = 0.005, MT_SURE = 0.9;
+
+export class BarMeter {
+  private readonly acc = new Float64Array(MT_B); private n = 0;
+  private readonly F = new Float64Array(MT_N * MT_B); private readonly S = new Int32Array(MT_N); private k = 0;
+  private mu = 0; readonly P = new Float64Array(4).fill(0.25);
+  /** Ett hop i slaget. */
+  hop(sa: { sub: number; kick: number; bass: number; lowMid: number; mid: number; highMid: number; treble: number } | undefined): void {
+    if (!sa) return;
+    const A = this.acc;
+    A[0] += Math.log10(sa.sub + 1e-7); A[1] += Math.log10(sa.kick + 1e-7); A[2] += Math.log10(sa.bass + 1e-7); A[3] += Math.log10(sa.lowMid + 1e-7);
+    A[4] += Math.log10(sa.mid + 1e-7); A[5] += Math.log10(sa.highMid + 1e-7); A[6] += Math.log10(sa.treble + 1e-7); this.n++;
+  }
+  /** Slaget på platsen slot är färdigt. */
+  beat(slot: number): void {
+    const A = this.acc, F = this.F, n = this.n;
+    if (n === 0) { this.gap(); return; }
+    const o = (this.k % MT_N) * MT_B;
+    for (let b = 0; b < MT_B; b++) { F[o + b] = 20 * A[b] / n; A[b] = 0; }
+    this.n = 0; this.S[this.k % MT_N] = slot; this.k++;
+    if (this.k < MT_N) return;
+    let nov = 0;
+    for (let b = 0; b < MT_B; b++) {
+      let s = 0;
+      for (let i = 0; i < MT_W; i++) s += F[((this.k - MT_W + i) % MT_N) * MT_B + b] - F[((this.k - MT_N + i) % MT_N) * MT_B + b];
+      nov += s < 0 ? -s / MT_W : s / MT_W;
+    }
+    this.mu = this.mu > 0 ? this.mu + MT_MU_A * (nov - this.mu) : nov;
+    const x = this.mu > 0 ? nov / this.mu - 1 : 0, P = this.P, c = this.S[(this.k - MT_W) % MT_N] & 3;
+    let t = 0;
+    for (let h = 0; h < 4; h++) { P[h] = (1 - MT_EPS) * P[h] + MT_EPS * (1 - P[h]) / 3; if (h === c && x > 0) P[h] *= Math.exp(MT_LAM * x); t += P[h]; }
+    for (let h = 0; h < 4; h++) P[h] /= t;
+  }
+  /** Slag hoppades över: ingen sammanhängande takt att jämföra. */
+  gap(): void { this.acc.fill(0); this.n = 0; this.k = 0; }
+  private hold = -1;
+  /** Ettan mellan cb och cb+2: mätarens senaste säkra val så länge cb står i samma par, annars cb. */
+  pick(cb: number): number {
+    const a = this.P[cb & 3], b = this.P[(cb + 2) & 3];
+    if (a + b > 0 && b / (a + b) > MT_SURE) this.hold = (cb + 2) & 3; else if (a + b > 0 && a / (a + b) > MT_SURE) this.hold = cb & 3;
+    if (this.hold >= 0 && ((this.hold - cb) & 1) === 0) return this.hold;
+    this.hold = -1; return cb;
+  }
+  reset(): void { this.gap(); this.mu = 0; this.P.fill(0.25); this.hold = -1; }
+}
```
