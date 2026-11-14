# fusion – JOKERN: a2:s låtgräns + a6:s och a7:s klocka + a8:s vakt

## IDÉN
Låtgränsen sägs av pulsen i stället för klangen (a2). Klockan byter hållet tempo bara på bevis med kvalitet (a6), väljer första
tempot efter en omlåsning mellan släktingar och behåller sina korta minnen när gränsen sägs sent (a7), och glömmer inget när gränsen
sägs i ett break den redan håller (a8). Inget nytt uppfunnet; delarna rör olika beslut.

## DELARNA (skakprovet, medel av fem; slutvarianten 97,00)
| del | från | bär | utan den |
|---|---|---|---|
| Pulsens vittne, formen tiger när låten har en puls (filen orörd från a2) | a2 del 1–2 | latbyten, falska, lastid | 94,99 (3/4, 1 falsk, låstid 7,2) |
| Snabba bytet kräver att utmanarens mönster upprepar sig | a6 D1 | takt, utanfor | 94,07 (takt 91,7) |
| Bevissumman utan mönster kräver ett golvs ledning | a6 D2 | takt, utanfor | 95,62 (takt 93,3) |
| Första valet mellan släktingar | a7 A | takt, lastid | 96,49 (låstid 7,7) |
| Fintempots band 1,25 % | a7 B | takt, utanfor | 96,50 (utanför 96,1) |
| Mjuk gräns: korta minnen kvar när det låter | a7 C | lastid | 96,72 (låstid 7,5) |
| Gräns i hållet break: ingen omlåsning | a8 | takt efter falsk gräns | skakprovet identiskt; massprovet 45 → 37 och 37 → 27 s fel (79 + 77 konstgjorda gränser) |
| `!this.sure` på mjuka gränsen (en term, ny) | jokern | lotus | DMX bit-identiskt; en exakt Sonos-gräns ligger på skarven, då är de korta minnena förra låtens |

## BORTVALT
- **a2 del 3** (break-hållet håller tempot före breaket): 97,00 med och utan när a6 är med. Med a5 i stället bar den +0,82.
- **a5**: samma punkt som a6. a5 + a7 + a2-del 3 = 96,16; a6 + a7 = 97,00; a5 ovanpå a6 = 96,94. En spärr: a6.
- **a1, a3, a4**: a2 ger redan 0 falska (fem körningar, 71 startlägen). Som reserv: se nedan, nej.

## SKAKPROVET
| id | medel (min..max) | takt % | utanför | låstid | låtbyten | falska | 0 s | 0,1 | 0,2 | 0,3 | 0,4 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| fusion | 97,00 (95,77..97,69) | 94,7 (93,5..95,4) | 96,7 | 6,8 | 4,0/4 | 0,0 | 97,69 | 95,77 | 96,79 | 97,31 | 97,42 |
| a2 | 94,18 | 91,9 | 94,4 | 7,6 | 4,0/4 | 0,0 | 95,06 | 93,72 | 94,85 | 92,84 | 94,44 |
| a5 | 93,76 | 93,3 | 95,4 | 7,6 | 3,0/4 | 1,0 | 94,27 | 93,36 | 93,96 | 93,19 | 94,01 |
| bas | 92,03 | 91,6 | 94,2 | 7,4 | 3,0/4 | 1,0 | 93,06 | 90,31 | 92,43 | 92,17 | 92,16 |

Över a2 med +2,82 i medel och i fem av fem. Domarmätning m1 (1 av 4 använd): 97,69, x0,88 kostnad, drop som bas, DISK OK.
Kvar: 265–275 (inget bevis före 273), 409–415, starten av 171840.

## MARGINALER (±25 %)
Klockan ensam, fel s i de två filerna tillsammans vid −25 % / +25 % (valt 39):
| TG_Q_SIM 0,5 | TG_Q_LEAD 1 | första valets golv 0,5 | dess marginal 1,35 | senare halvans golv 0,5 | TG_FINE_MAX 0,0125 | BND_QUIET_BEATS 1 |
|---|---|---|---|---|---|---|
| 39 / 39 | 39 / 38 | 39 / 41 | 40 / 40 | 39 / 39 | 40 / 39 | 39 / 39 |

Låtgränsen ensam (P_CLEAR, P_SAME, P_GONE, P_EST, P_HOLD, P_FOLLOW, P_LO): 4/4 och 0 falska i alla fjorton.
Hela skakprovet med gränsen 1 s tidigare / senare (P_HOLD 4 / 8): 96,94 / 96,91 – lotteriet kring omlåsningen (±0,9 i runda 1) är borta.

## ALLMÄNGILTIGHETEN (material ingen del trimmats mot)
Tolv konstgjorda låtbyten: stycken ur övningens fem låtar hopklippta i ljudet, hela analysatorn (`verktyg/skarvwav.py`).
| | takt: hårt klipp / övertoning 8 s | gränser + falska | låstid s |
|---|---|---|---|
| bas | 91,9 / 93,4 % | 11/12 + 1 / 9/12 + 2 | 9,6 / 5,7 |
| a2 | 93,2 % / – | 9/12 + 0 | 9,0 |
| fusion | 95,7 / 96,5 % | 9/12 + 0 / 8/12 + 0 | 8,3 / 6,3 |

Massprovet (79 konstgjorda gränser): bas 129 s fel, a7 68, fusion 37. Kallstarter: 132 → 98.
- **Låtbyte utan tempobyte:** pulsen tiger (under 1 %: 0 av 4; 1–4 %: 6 av 8; över 5 %: 11 av 12). Klockan behöver ingen gräns (takt 96,7–100 % över skarven) men manuset byts inte. Formen som reserv är mätt och bortvald: a2 + a1:s form (`lg/L1.ts`) och a2 + a4:s toning (`L2`) ger på 32 skarvar (låtgränsen ensam, `verktyg/skarv.mjs`) 4 respektive 5 träffar till mot 3 sena eller falska gränser; dagens form ograderad (`L3`) ger tillbaka den falska vid 200 s. Formpoängen vid riktiga byten är 1,31–1,52 mot tröskeln 1,3: ingen marginal att bygga en reserv på.
- **Tempobyte mitt i en låt:** blir en låtgräns; klockan låser om mjukt, manuset byts en gång för mycket.
- **Tyst eller baslöst intro:** tystnad 3 s ger gränsen som förr, annars när nya pulsen stått 3 s (alla band räknas). Klockan håller förra tempot tills bevis finns (265–275).
- **2:1** syns inte (pulsen viks till en oktav; klockans tempo är då också detsamma). **3:2** (135 → 90): sagd i fem av fem och från 23 startlägen.

## RISKEN
- En sektion som lämnar rutnätet över 3 s (triolbreak, halvtempo): falsk gräns. a7 C och a8 gör den billig för klockan, manuset byts ändå.
- Övertonade byten låser 0,6 s senare än bas (6,3 mot 5,7 s); hårda klipp 1,3 s tidigare.
- Lotus delar klockfilen och är inte bänkad. Kontrollen är inte körd.

Verktyg i `verktyg/` (`variant.py` bygger klockan ur namngivna delar), alla skakrader i `prov/`.

## DIFFEN (`git diff --no-index src .arena/lat1/fusion/src`; rå i `losning.diff`)
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/lat1/fusion/src/ANALYSER_SHARED.md5
index dbe0948..7ed7780 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/lat1/fusion/src/ANALYSER_SHARED.md5
@@ -10,5 +10,5 @@ e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 dbb860c7483c4e7e938d610712337b96 analyserCharacter.ts
 a8846ca6595ddef8409a6ab432acf375 split.ts
 c7a59a6760df39770f3aca2332dac5c2 slowWorker.ts
-d0a49e4f782e81bdfdf8293eb0b45bf4 analyserClock.ts
+898e03ea9f95e127db09e1f58913d0c4 analyserClock.ts
 d94c850c565827c9075e63127132213f recorder.ts
diff --git a/src/analyserClock.ts b/.arena/lat1/fusion/src/analyserClock.ts
index cea56ed..384c61c 100644
--- a/src/analyserClock.ts
+++ b/.arena/lat1/fusion/src/analyserClock.ts
@@ -35,9 +35,12 @@ const TG_WIN_MS = 5000, TG_FULL_N = 900, TG_FWIN_MS = 3500, TG_FFULL_N = 630, TG
 const TG_NOISE = 0.6, TG_NB = 2, TG_SW_P = 1, TG_SW_G = 2, TG_HL_A = 0.5, TG_LOCK_N = 8, TG_LA = 0.04, TG_KNOWN = 0.5, SCAN_HOLD = 1.06;   // HÅLLEN TOLKNING EFTER SÄKER LÅSNING
 const TG_SONG_A = 1 / 160;   // LÅTENS MINNE
 const TG_BRK_DB = 24, TG_BRK_MAX_MS = 30000;   // BREAK OCH DROP ÄR SAMMA LÅT
+const TG_Q_SIM = 0.5, TG_Q_LEAD = 1;   // BEVISETS KVALITET: utmanarens mönster finns (= PW_MIN), annars ska bevissumman leda med ett helt golv (= TG_SW_P)
+const BND_QUIET_BEATS = 1;   // MINNET VID GRÄNSEN: så många slag tyst = låten tog slut
 const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5, HV_AGE = 30, TG_OCT_LO = 79.6, TG_OCT_LO_N = 8;   // a3 TOPPRÖSTEN
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
-const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
+const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
+const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -70,7 +73,7 @@ export class BeatFeed {
   private readonly tgAccF = new Float64Array(TG_K).fill(-1); private tgSw = 0; tgSwitches = 0;   // TVÅ MINNEN
   private readonly tgF = new Float64Array(TG_K); private readonly tgW = new Float64Array(TG_K); private readonly tgQ = new Float64Array(TG_K);   // HÅLLEN TOLKNING
   private brkAt = -1e12; private brkArm = false; private brkFrom = 0;   // BREAK-HÅLLET
-  private sure = false;   // LÅTENS MINNE
+  private sure = false; private first = true;   // LÅTENS MINNE
   private readonly tgD = new Float64Array(TG_K); private tgR = -1; private tgHl = 0; private tgLk = 0; private tgLkK = -1;
   private readonly tgAccL = new Float64Array(TG_K).fill(-1); private tgLN = 0;   // k4b (lånat av k2b)
   tempoBpm = 0;   // EN TEMPOSÖKNING
@@ -85,7 +88,8 @@ export class BeatFeed {
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
-  private boundSeen = 0;
+  private boundSeen = 0;
+  private quietAt = -1e12; private pend = false;   // MINNET VID GRÄNSEN
   /** Det cfg analysatorn ska byggas med. */
   barKnown(): boolean { return this.barN >= BAR_MIN; }
   static analyserCfg<T extends object>(cfg: T): T { return { ...cfg, beat: null }; }
@@ -103,7 +107,7 @@ export class BeatFeed {
       this.onNext = now + ONSET_EVERY_MS;
       this.scanRef = beat.anchorMs; this.scanNow = now;
       const cb = this.scanFar > 0 ? this.scanFar : beat.bpm; this.scanFar = 0;
-      if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_SNAP) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }
+      if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }
       else if (this.tempoBpm > 0) { this.scanC0 = cb; this.scanStep = 0.005; this.scanEnd = 5; }
       else { this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanEnd = 5; }
 
@@ -132,7 +136,7 @@ export class BeatFeed {
     }
     if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
     if (this.tempoBpm > 0) this.bestBpm = Math.min(159.9, Math.max(80, this.bestBpm));
-    if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_SNAP) { this.scanFar = this.bestBpm; return; }
+    if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanFar = this.bestBpm; return; }
     const oldMs = 60000 / beat.bpm, idx = Math.floor((now - beat.anchorMs) / oldMs), fr = (now - beat.anchorMs) / oldMs - idx;
     const nb = 60000 / this.bestBpm;
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
@@ -195,7 +199,7 @@ export class BeatFeed {
         Q.sort(); nc = Q[TG_K >> 1] + TG_NOISE;
       }
       const song = this.sure && this.tgLN * TG_LA >= 1;
-      if (song) { this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; this.tgSw = 0; }
+      if (song) { this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; this.tgSw = 0; this.first = false; }
       if (this.tgR >= 0 && any) {
         const r0 = this.tgR, e = Math.max(0, W[r0] - nc); let nk = r0, mx = 0;
         this.tgHl += TG_HL_A * (e - this.tgHl); D[r0] += e; mx = D[r0];
@@ -203,10 +207,10 @@ export class BeatFeed {
         for (let i = 0; i < TG_K; i++) { if (i === r0) continue; const d = Math.max(D[i], fl) + W[i] - nc; D[i] = d; if (d > mx) { mx = d; nk = i; } }
         for (let i = 0; i < TG_K; i++) D[i] -= mx;
         const d0 = Math.abs(nk - r0);
-        if (Math.min(d0, TG_K - d0) > 2) {
+        if (Math.min(d0, TG_K - d0) > 2 && (-D[r0] >= TG_Q_LEAD || this.pwReal(nk, now))) {
           for (let i = 0; i < TG_K; i++) if (F[i] > 0) { acc[i] = F[i]; accF[i] = F[i]; }
           this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; this.tgSw = 0; this.tgSwitches++;
-        } else this.tgR = nk;
+        } else if (Math.min(d0, TG_K - d0) <= 2) this.tgR = nk;
       }
       if (this.tgR >= 0) {
         const r = this.tgR, L = this.tgAccL; let fk = -1, fv = 0; for (let i = 0; i < TG_K; i++) if (accF[i] > fv) { fv = accF[i]; fk = i; }
@@ -215,7 +219,7 @@ export class BeatFeed {
         if (fk >= 0 && dd > TG_SW_STEPS && fv >= fc * TG_HOLD) {
           if (++this.tgSw >= TG_SW_N) {
             let lf = 0, lr = 0; for (let d = -2; d <= 2; d++) { const a = L[(fk + d + TG_K) % TG_K], b = L[(r + d + TG_K) % TG_K]; if (a > lf) lf = a; if (b > lr) lr = b; }
-            if (lf < TG_KNOWN * lr) { acc.set(accF); this.tgSwitches++; this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; }
+            if (lf < TG_KNOWN * lr && this.pwReal(fk, now)) { acc.set(accF); this.tgSwitches++; this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; }
             this.tgSw = 0;
           }
         } else this.tgSw = 0;
@@ -247,7 +251,7 @@ export class BeatFeed {
         const dl = Math.abs(bk - this.tgLkK), same = this.tgLkK >= 0 && Math.min(dl, TG_K - dl) <= 2;
         const e = any ? W[bk] - nc : 0;
         this.tgLk = same && e > 0 && this.tgN >= TG_FULL_N ? this.tgLk + 1 : 0; this.tgLkK = bk;
-        if (this.tgLk >= TG_LOCK_N) { this.tgR = bk; this.tgLk = 0; D.fill(0); this.tgHl = e; }
+        if (this.tgLk >= TG_LOCK_N) { this.tgR = bk; this.tgLk = 0; D.fill(0); this.tgHl = e; this.first = false; }
       }
       const a = A[(bk + TG_K - 1) % TG_K], c = A[(bk + 1) % TG_K], den = a - 2 * bv + c;
       const off = a >= 0 && c >= 0 && den < 0 ? Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / den)) : 0;
@@ -258,7 +262,8 @@ export class BeatFeed {
         this.octR = this.octN++ === 0 ? this.tgHalfR : this.octR + TG_OCT_A * (this.tgHalfR - this.octR);
         if (this.octN === 1) this.octHi = this.octR >= TG_OCT_UP; else if (this.octHi ? this.octR < TG_OCT_DN : this.octR >= TG_OCT_UP) this.octHi = !this.octHi;
         t = this.octHi || this.octLoN >= TG_OCT_LO_N ? 2 * lo : lo; }
-      { const r0 = this.tempoBpm, pc = Math.min(159.9, Math.max(80, this.peakVote(t, now))), pj = this.pwJudge(pc, now); this.tempoBpm = pj;
+      { const r0 = this.tempoBpm, pc = Math.min(159.9, Math.max(80, this.peakVote(t, now))), pj = this.pwJudge(pc, now); this.tempoBpm = pj;
+        if (pj !== pc && this.first) this.tgLk = 0;
         if (pj !== pc && pj !== r0 && this.tgR >= 0) { this.tgR = ((Math.round(Math.log(pj / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K; this.tgD.fill(0); } }
       return;
     }
@@ -328,15 +333,21 @@ export class BeatFeed {
   }
   /** TAKTENS SJÄLVLIKHET. */
   private pwJudge(cand: number, now: number): number {
-    const reg = this.tempoBpm;
-    if (!(reg > 0)) { this.pwQuietAt = now + PW_WIN_MS; this.pwRun = 0; return cand; }
-    const moved = Math.abs(cand / reg - 1) > TG_SNAP, sib = moved && this.pwSib(cand, reg);
-    if (moved && !sib) { this.pwQuietAt = now + PW_WIN_MS; this.pwRun = 0; return cand; }
-    if (now < this.pwQuietAt) return cand;
+    const reg = this.tempoBpm, fc = this.first;
+    if (!(reg > 0)) { this.pwQuietAt = now + PW_WIN_MS; this.pwRun = 0; if (!fc) return cand; }
+    const moved = reg > 0 && Math.abs(cand / reg - 1) > TG_SNAP, sib = moved && this.pwSib(cand, reg);
+    if (moved && !sib) { this.pwQuietAt = now + PW_WIN_MS; this.pwRun = 0; if (!fc) return cand; }
+    if (!fc && now < this.pwQuietAt) return cand;
     const M = PW_RING - 1; let lo = 0, hi = this.pwN;
     while (lo < hi) { const m = (lo + hi) >> 1; if (now - this.pwT[(this.pwPos - 1 - m + 2 * PW_RING) & M] > PW_WIN_MS) hi = m; else lo = m + 1; }
     if (lo < 1000) return cand;
     this.pwWn = lo; this.pwDt = (this.pwT[(this.pwPos - 1 + PW_RING) & M] - this.pwT[(this.pwPos - lo + 2 * PW_RING) & M]) / (lo - 1); if (!(this.pwDt > 0)) return cand;
+    if (fc) {
+      const sC = this.pwSim(cand); let bs = 0, bb = 0;
+      for (let i = 0; i < PW_Q.length; i++) { let c = cand * PW_Q[i]; while (c >= 160) c /= 2; while (c < 80) c *= 2; const v = this.pwSim(c); if (v > bs) { bs = v; bb = c; } }
+      if (!(bs >= PW_MIN && bs > (sC > 0 ? sC * TG_HOLD : 0))) return cand;
+      this.pwWn = lo >> 1; return this.pwSim(bb) >= PW_MIN ? bb : cand;
+    }
     const sR = this.pwSim(reg);
     if (sib) {
       const sC = this.pwSim(cand);
@@ -354,7 +365,15 @@ export class BeatFeed {
     } else this.pwRun = 0;
     return cand;
   }
-  private tgReset(): void { this.pwN = 0; this.pwRun = 0; this.tgAcc.fill(-1); this.tgAccF.fill(-1); this.tgSw = 0; this.tgR = -1; this.brkArm = false; this.brkFrom = 0; this.tgLk = 0; this.tgLkK = -1; this.tgHl = 0; this.tgAccL.fill(-1); this.tgLN = 0; this.tgK = 0; this.tempoBpm = 0; this.octN = 0; this.hvRun = 0; this.hvAge = 0; this.hvVoted = false; this.hvKeep = 0; this.hvEver = false; }
+  /** BEVISETS KVALITET: upprepar sig mönstret på hypotesen k i vittnets senare halva? */
+  private pwReal(k: number, now: number): boolean {
+    const M = PW_RING - 1; let lo = 0, hi = this.pwN;
+    while (lo < hi) { const m = (lo + hi) >> 1; if (now - this.pwT[(this.pwPos - 1 - m + 2 * PW_RING) & M] > PW_WIN_MS) hi = m; else lo = m + 1; }
+    if (lo < 1000) return true;
+    this.pwDt = (this.pwT[(this.pwPos - 1 + PW_RING) & M] - this.pwT[(this.pwPos - lo + 2 * PW_RING) & M]) / (lo - 1); if (!(this.pwDt > 0)) return true;
+    this.pwWn = lo >> 1; return this.pwSim(80 * Math.pow(TG_STEP, k)) >= TG_Q_SIM;
+  }
+  private tgReset(soft = false): void { if (!soft) { this.pwN = 0; this.tgAcc.fill(-1); this.tgAccF.fill(-1); } this.pwRun = 0; this.tgSw = 0; this.tgR = -1; this.brkArm = false; this.brkFrom = 0; this.tgLk = 0; this.tgLkK = -1; this.tgHl = 0; this.tgAccL.fill(-1); this.tgLN = 0; this.tgK = 0; this.tempoBpm = 0; this.octN = 0; this.hvRun = 0; this.hvAge = 0; this.hvVoted = false; this.hvKeep = 0; this.hvEver = false; this.first = true; }
 
   /** Kom en tidigare kick. */
   private kickRepeats(t: number, lag: number, tol: number): boolean {
@@ -404,16 +423,27 @@ export class BeatFeed {
   }
 
   /** LÅTGRÄNSEN. */
-  private relock(): void {
+  private relock(soft: boolean): void {
     if (this.innerValid && this.innerBpm > 0) this.innerAnchor += this.barOff * (60000 / this.innerBpm);
-    this.tgReset(); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
+  /** MINNET VID GRÄNSEN. */
+  private sameSong(now: number): boolean {
+    if (this.sure || this.brkAt !== now || !this.brkArm || !(this.tempoBpm > 0) || this.quietAt >= (this.brkFrom || now)) return false;   // inte i ett hållet break, eller låten tystnade
+    const F = this.tgAccF, kc = ((Math.round(Math.log(this.tempoBpm / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K; let fk = kc, fv = 0;
+    for (let i = 0; i < TG_K; i++) if (F[i] > fv) { fv = F[i]; fk = i; }
+    const d0 = Math.abs(fk - kc);
+    return Math.min(d0, TG_K - d0) <= TG_SW_STEPS || fv < Math.max(F[kc], F[(kc + 1) % TG_K], F[(kc + TG_K - 1) % TG_K]) * TG_HOLD;   // breakets rytm säger inte emot det hållna tempot
+  }
+
   /** EN KÄLLA. */
   update(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void; setClockGrid?(g: EngineConfig["beat"]): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number; setClock?(bpm: number, conf: number): void }, now = Date.now()): void {
     this.sure = !!an.boundSure; if ((an.bodyUnderDb ?? 0) >= TG_BRK_DB) this.brkAt = now;
     const nb = an.trackBoundaries ?? 0;
-    if (nb !== this.boundSeen) { this.boundSeen = nb; this.relock(); }
+    const q = (an.quietMs ?? 0) >= BND_QUIET_BEATS * 60000 / (this.innerBpm > 80 ? this.innerBpm : 80); if (q) this.quietAt = now;
+    if (nb !== this.boundSeen) { this.boundSeen = nb; this.pend = this.sameSong(now); if (!this.pend) this.relock(!this.sure && !((an.quietMs ?? 0) > 0)); }
+    else if (this.pend && (q || now - this.brkAt >= TG_WIN_MS)) { this.pend = false; if (q) this.relock(false); }   // tystnar låten i breaket var gränsen sann
     if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm = this.innerBpm; }
     this.updateInner(frame, cfg, now, an.quietMs ?? 0);
     const b = cfg.beat;
diff --git a/src/boundaryDetector.ts b/.arena/lat1/fusion/src/boundaryDetector.ts
index 04cdb7c..1be6cb5 100644
--- a/src/boundaryDetector.ts
+++ b/.arena/lat1/fusion/src/boundaryDetector.ts
@@ -27,6 +27,14 @@ const F_WC = 6, F_WB = 1;   // vikter kroma, tempo
 const F_THR = 1.3;   // MATT (med F_TMIN)
 const F_TMIN = 0.3;   // en falsk grans nollar tempolaset och byter manus, en missad kostar bara...
 const F_RING = 256;
+const P_N = 768, P_ML = 384, P_RING = 2048;   // RYTMEN SOM VITTNE: anslagsfonster och langsta avstand i spektrum (6 s, 3 s)
+const P_LO = 80, P_HI = 2 * P_LO;   // pulsens omfang: en oktav (bpm)
+const P_CLEAR = 0.12;   // sa stark sjalvlikhet = en puls hors
+const P_SAME = 0.03;   // inom sa mycket ar det samma period
+const P_GONE = 0.5;   // gamla pulsen ar borta nar den ar svagare an sa mot den nya
+const P_EST = 6, P_HOLD = 6;   // block: sa lange for att etablera en puls, sa lange maste bytet sta
+const P_FINE = 2 / 3;   // punkterad puls: hors aven den 1,5 ganger snabbare ar DET pulsen
+const P_FOLLOW = 0.1;   // referensen foljer latens egen drift
 
 /** Median. */
 function median(a: Float64Array): number {
@@ -80,6 +88,59 @@ export class BoundaryDetector {
     this.pushForm(mag, binHz);
   }
 
+  private pX = new Float32Array(P_RING); private pR = new Float64Array(P_ML + 1); private pA = new Float64Array(P_ML + 2);   // RYTMEN SOM VITTNE
+  private pB = new Float64Array(F_NB); private pL = new Float64Array(F_NB); private pS = 0; private pCnt = 0; private pPos = 0; private pT0 = 0;
+  private pRef = 0; private pCand = 0; private pRun = 0; private pNew = 0; private pNewRun = 0; private pRefS = 0; private pBestS = 0; private pMs = 8;   // perioder i spektrum
+  private pPend = 0;
+
+  /** Anslagsstyrkan i ett spektrum och dess lopande sjalvlikhet. */
+  private pushPulse(now: number): void {
+    const B = this.pB, L = this.pL; let o = 0;
+    for (let b = 0; b < F_NB; b++) { const l = Math.log(B[b] + 1e-6), d = l - L[b]; if (d > 0) o += d; L[b] = l; }
+    if (this.pCnt === 0) { this.pT0 = now; o = 0; }
+    const M = P_RING - 1, p = this.pPos, X = this.pX, R = this.pR;
+    X[p] = o; const x = X[p];
+    if (this.pCnt >= P_N) {
+      const q = (p - P_N) & M, y = X[q]; this.pS += x - y;
+      for (let l = 0; l <= P_ML; l++) R[l] += x * X[(p - l) & M] - y * X[(q - l) & M];
+    } else { this.pS += x; for (let l = 0; l <= P_ML; l++) R[l] += x * X[(p - l) & M]; }
+    this.pPos = (p + 1) & M; this.pCnt++;
+  }
+
+  /** Sjalvlikheten pa perioden lag (spektrum) och dess 2, 3 och 4 slag. */
+  private pComb(lag: number): number {
+    const A = this.pA; let s = 0, n = 0;
+    for (let m = 1; m <= 4; m++) { const x = lag * m; if (x >= P_ML) break; const k = x | 0; s += A[k] + (A[k + 1] - A[k]) * (x - k); n++; }
+    return n ? s / n : 0;
+  }
+
+  /** Pulsens period i de senaste sekunderna mot latens etablerade; ett ihallande byte = ny lat. */
+  private pulseDecide(now: number): void {
+    this.pBestS = 0; this.pRefS = 0;
+    if (this.pCnt < P_N + P_ML) return;
+    const dt = (now - this.pT0) / (this.pCnt - 1), R = this.pR, A = this.pA, m2 = this.pS * this.pS / P_N, v0 = R[0] - m2;
+    if (!(v0 > 0) || !(dt > 0)) { this.pRun = 0; this.pNewRun = 0; return; }
+    for (let l = 0; l <= P_ML; l++) A[l] = (R[l] - m2) / v0;
+    const l0 = 60000 / P_HI / dt, l1 = 60000 / P_LO / dt; let bs = 0, bl = 0;
+    for (let lag = l0; lag < l1; lag += 0.25) { const s = this.pComb(lag); if (s > bs) { bs = s; bl = lag; } }
+    if (bl * P_FINE >= l0) {
+      let fs = 0, fl = 0; for (let lag = bl * P_FINE * (1 - P_SAME), e = bl * P_FINE * (1 + P_SAME); lag <= e; lag += 0.25) { const s = this.pComb(lag); if (s > fs) { fs = s; fl = lag; } }
+      if (fs >= P_GONE * bs) bl = fl;
+    }
+    const clear = bs >= P_CLEAR; this.pBestS = bs; this.pMs = dt;
+    if (!this.pRef) {
+      if (clear && this.pCand > 0 && Math.abs(bl / this.pCand - 1) <= P_SAME) { if (++this.pRun >= P_EST) { this.pRef = bl; this.pRun = 0; } }
+      else { this.pCand = clear ? bl : 0; this.pRun = clear ? 1 : 0; }
+      return;
+    }
+    const rs = this.pComb(this.pRef); this.pRefS = rs;
+    if (clear && Math.abs(bl / this.pRef - 1) <= P_SAME) { this.pRef += P_FOLLOW * (bl - this.pRef); this.pNewRun = 0; return; }
+    if (clear && rs <= P_GONE * bs) {
+      if (this.pNewRun > 0 && Math.abs(bl / this.pNew - 1) <= P_SAME) this.pNewRun++; else { this.pNew = bl; this.pNewRun = 1; }
+      if (this.pNewRun >= P_HOLD) { this.pPend = bl; this.pNewRun = 0; }
+    } else this.pNewRun = 0;
+  }
+
   private fBand: Int8Array | null = null; private fPc: Int8Array | null = null; private fHz = 0;   // LATENS FORM
   private fAcc = new Float64Array(F_NB); private fCh = new Float64Array(12); private fN = 0; private fStart = 0;
   private fLb = new Float32Array(F_RING * F_NB); private fC = new Float32Array(F_RING * 12);
@@ -99,9 +160,12 @@ export class BoundaryDetector {
       }
     }
     const band = this.fBand, pc = this.fPc!, acc = this.fAcc, ch = this.fCh;
-    for (let i = 1; i < mag.length; i++) { const m = mag[i], b = band[i], p = pc[i]; if (b >= 0) acc[b] += m; if (p >= 0) ch[p] += m * m; }
+    const pb = this.pB; pb.fill(0);
+    for (let i = 1; i < mag.length; i++) { const m = mag[i], b = band[i], p = pc[i]; if (b >= 0) pb[b] += m; if (p >= 0) ch[p] += m * m; }
+    for (let b = 0; b < F_NB; b++) acc[b] += pb[b];
     this.fN++;
     const now = this.clock();
+    this.pushPulse(now);
     if (!this.fStart) this.fStart = now;
     if (now - this.fStart < F_BLK_MS) return;
     this.fStart = now;
@@ -113,6 +177,7 @@ export class BoundaryDetector {
     for (let p = 0; p < 12; p++) this.fC[oc + p] = (ch[p] / n) / (cs + 1e-12);
     this.fT[k] = now; this.fBpm[k] = this.fLastBpm; this.fCount++;
     acc.fill(0); ch.fill(0); this.fN = 0;
+    this.pulseDecide(now);
     this.formDecide();
   }
 
@@ -140,7 +205,7 @@ export class BoundaryDetector {
     const dC = 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
     const dB = foldBpm(median(this.fMedA), median(this.fMedB));
     const sc = dT + F_WC * dC + F_WB * dB;
-    if (sc >= F_THR && dT >= F_TMIN) { this.fPendAt = sAt; this.fPendScore = sc; }
+    if (sc >= F_THR && dT >= F_TMIN && !this.pRef) { this.fPendAt = sAt; this.fPendScore = sc; }
   }
 
   /** Matas varje hop med ramens niva/tempo. */
@@ -152,7 +217,7 @@ export class BoundaryDetector {
     if (!this.playStart) {
       if (loud) {
         if (!this.loudSince) this.loudSince = now;
-        else if (now - this.loudSince >= START_HOLD_MS) { this.playStart = now; this.lastLoud = now; this.loudSince = 0; }
+        else if (now - this.loudSince >= START_HOLD_MS) { this.playStart = now; this.lastLoud = now; this.loudSince = 0; this.pulseReset(); }
       } else this.loudSince = 0;
       return;
     }
@@ -253,7 +318,9 @@ export class BoundaryDetector {
 
     let why = "";
     let back = 0;
-    if (this.fPendAt) { why = `latform ${this.fPendScore.toFixed(2)}`; back = Math.max(0, now - this.fPendAt); this.fPendAt = 0; }
+    const np = this.pPend;
+    if (np) { why = `ny puls ${(60000 / this.pRef / this.pMs).toFixed(0)}->${(60000 / np / this.pMs).toFixed(0)}`; this.pPend = 0; }
+    else if (this.fPendAt) { why = `latform ${this.fPendScore.toFixed(2)}`; back = Math.max(0, now - this.fPendAt); this.fPendAt = 0; }
     else if (tLive > MAX_SEG_MS) why = "maxlängd";
     if (!why) return false;
 
@@ -264,6 +331,7 @@ export class BoundaryDetector {
     this.commit();
     this.playStart = bAt;
     this.lastLoud = now;
+    this.pRef = np;
     return true;
   }
 
@@ -272,5 +340,9 @@ export class BoundaryDetector {
     this.boundaryCount++;
     this.playStart = 0;
     this.resetNovelty(); this.fPendAt = 0; this.loudSince = 0;
+    this.pRef = 0; this.pCand = 0; this.pRun = 0; this.pNewRun = 0; this.pPend = 0; this.pRefS = 0;
   }
+
+  /** Nytt segment efter tystnad: anslagsringen borjar om. */
+  private pulseReset(): void { this.pX.fill(0); this.pR.fill(0); this.pS = 0; this.pCnt = 0; this.pPos = 0; }
 }
```
