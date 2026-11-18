# a7 HÄNDELSEN SOM ANKARE: basens återkomst efter luckan väljer 1 mot 3

## IDÉN
När basen/kicken kommer tillbaka efter minst två tomma slag sparar analysatorn tiden. Fyra slag senare, när rutnätet har satt sig efter
landningen, räknas det slaget som en röst för ettan, och rösten får bara välja mellan slag 1 och 3. Taktmodellens backbeat väljer fortfarande
{1,3} mot {2,4}. Då flyttar modellen ettan bara när den har starkare bevis än händelsen. Musikteorin bakom: en drop eller återkomst landar på
ettan och aldrig på trean. Offline på övningens ljud (30–150 Hz, Beat This-slag, a5:s trösklar) låg 52 av 54 återkomster på 1, 2 på 4 och 0 på 3.

## DELARNA (allt i analyserClock.ts)
| del | vad den gör | mått | varifrån |
|---|---|---|---|
| A luckan | slag vars kick+sub-max över hela slaget är < 0,35 × basnivån räknas som lucka (nivån lär 1/32 per slag och sjunker 0,995 i luckan). Efter ≥ 2 luckslag sparas tiden för första hoppet med kick+sub ≥ 0,6 × nivån | krävs för B | etta2 a5 (trösklarna), ej skattade här |
| B sen placering | 4 slag efter återkomsten placeras händelsen i det nya rutnätet (avrundat till närmaste slag, musikens numrering) och får T[slot] += 1 (tak 3, avklingar 0,997 per slag, nollas vid låtgräns) | m1 placerade direkt i slagfönstret: ±0, alla tick identiska med bas. Sonden visade varför: vid 171840:s drop 148,4 s låg rutnätet fel i fas och kicken föll i fel slag. m2 med B: **+6,09** | ny |
| C 1-mot-3-domen | modellens bästa bi avgörs som förut. Sedan väljs mellan bi och bi^2 med d = v[bi] − v[bi^2] + 1 × (T[bi] − T[bi^2]), med samma marginal 0,06. Utan händelser blir det exakt dagens beslut | bär hela vinsten: 171840 trean 21,8 → 3,2 | ny |

Jokern kan lyfta A+B+C som ett block. C utan B gör ingenting (m1).

## KOSTNADEN
Allt körs där klockan körs (workern i ladan), ingenting i huvudtråden. Per hopp blir det två jämförelser till, per slag ett tiotal flyttal.
Det nya minnet är två Float64Array(4), alltså under 1 kB och ingen allokering per hopp. split.ts ändras inte, eftersom specAbs.sub/kick redan finns i hopposten.

## SIFFRORNA (m2, etta3dom-m2.json)
| fil | ren bas → a7 | trean | etta alla | omval |
|---|---|---|---|---|
| 151659 | 92,8 → 92,8 | 6,0 → 6,0 | 93,9 → 93,9 | 0,12 → 0,12 |
| 171840 | 75,3 → 93,8 | 21,8 → 3,2 | 74,8 → 88,6 | 0,64 → 0,64 |
| 200719 | 91,8 → 91,8 | 4,9 → 4,9 | 67,0 → 68,2 | 1,47 → 1,53 |
| medel | 86,6 → 92,8 | 10,9 → 4,7 | 78,6 → 83,6 | 0,74 → 0,76 |

FEL 10,3, oktav 5,6, paslag 91,9 och lead är lika med bas (fasen rörs inte). Det enda som blev sämre är omvalen i 200719, +0,06 per minut.
Varning: hela vinsten ligger på en fil (171840 136–184 s, där ettan efter låtgränsen valdes på trean och droppen 148,4 nu rättar den).
Konstanterna kommer från etta2 a5 och musikteorin, inte från övningen. Bara EV_GAP_N 2 i stället för a5:s 4 är valt efter offline-räkningen, och båda gav 0 på trean.

## RISKEN
- Upptakt: basen in på slag 3 (en fill som landar en halv takt för tidigt) ger en felröst som håller i ungefär 1,5 min. På 4:an hamnar den i fel par och ignoreras.
- Musik utan luckor (jämna set, ingen breakdown) ger inga händelser, och då blir varianten exakt lika med bas.
- Live-mic: basnivån följer rummet. En ihålig mic i breaken kan ge färre luckor, men inga falska.
- Låtbyte utan tystnad: T nollas vid relock. Ett falskt relock tappar rösterna.
- Lotus: delad fil, så ANALYSER_SHARED.md5 ska räknas om.

## DIFFEN (även i diff.txt)
```diff
diff --git a/.arena/etta3/bas/src/analyserClock.ts b/.arena/etta3/a7/src/analyserClock.ts
index 0832641..92eebb6 100644
--- a/.arena/etta3/bas/src/analyserClock.ts
+++ b/.arena/etta3/a7/src/analyserClock.ts
@@ -27,6 +27,7 @@ const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const EV_GAP_LO = 0.35, EV_GAP_N = 2, EV_RET_HI = 0.6, EV_LV_A = 1 / 32, EV_LV_DN = 0.995, EV_W = 1, EV_DECAY = 0.997, EV_MAX = 3, EV_LATE = 4;   // HÄNDELSEN SOM ANKARE (etta3 a7)
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -91,6 +92,7 @@ export class BeatFeed {
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barT = new Float64Array(4); private readonly barVs = new Float64Array(4); private bA = 0; private bLv = 0; private barGap = 0; private evT = 0; private evN = 0;   // händelsen som ankare
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -412,7 +414,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barT.fill(0); this.barGap = 0; this.evT = 0; this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -422,8 +424,10 @@ export class BeatFeed {
     const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
       if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per);
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0;
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0; this.bA = 0;
     }
+    if (k > this.bA) this.bA = k;
+    if (this.barGap >= EV_GAP_N && k >= EV_RET_HI * this.bLv) { this.evT = now; this.evN = 0; this.barGap = 0; }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
       if (k > this.bE) this.bE = k;
@@ -452,8 +456,13 @@ export class BeatFeed {
     if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; this.barT[i] *= EV_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL;
+    { const a = this.bA, lv = this.bLv;
+      if (lv > 0 && a < EV_GAP_LO * lv) { if (this.barGap < 1000) this.barGap++; this.bLv = lv * EV_LV_DN; }
+      else { if (a >= EV_RET_HI * lv) this.barGap = 0; this.bLv = lv > 0 ? lv + (a - lv) * EV_LV_A : a; }
+      if (this.evT > 0 && ++this.evN >= EV_LATE) {
+        const s = ((((Math.round((this.evT - tb) / per) + this.barIdx - jr) % 4) + 4) % 4), t = this.barT[s] + 1; this.barT[s] = t > EV_MAX ? EV_MAX : t; this.evT = 0; } }
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
       if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
       this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
@@ -462,13 +471,15 @@ export class BeatFeed {
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
     const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
     if (!(sK > 0)) return;
-    let bi = 0, best = -1e9, second = -1e9;
+    let bi = 0, best = -1e9, second = -1e9; const VS = this.barVs, T = this.barT;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
+      const v = VS[i] = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
         + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
+    const o = bi ^ 2, d = VS[bi] - VS[o] + EV_W * (T[bi] - T[o]);
+    if (d >= 0) { if (bi !== this.barM && best - second >= BAR_MARGIN && (this.barM !== o || d >= BAR_MARGIN)) { this.barM = bi; this.barShifts++; } }
+    else if (o !== this.barM && -d >= BAR_MARGIN && (((o ^ this.barM) & 1) === 0 || best - Math.max(VS[(bi + 1) & 3], VS[(bi + 3) & 3]) >= BAR_MARGIN)) { this.barM = o; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
```
