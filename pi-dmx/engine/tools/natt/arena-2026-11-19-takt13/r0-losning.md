# r0 JOKERN takt13: a3:s trötta lås + a7:s syskonveto (a6:s Viterbi struken)

**IDÉN.** Fasen i vikningen får bara hoppa ett stort steg (0,12 slag eller mer) när ett fasminne med tau 10 s håller med. Efter en låtgräns, ett nytt slag eller ett tempohopp över 4 % får alla hopp passera i 8 s (a3). Tempot får inte hoppa till ett släkttempo (3:2, 4:3) mitt i en låt så länge låtens eget mönster fortfarande upprepar sig (a7). De verkar på var sin del: a3 på fasen i `onsetStep`, a7 på tempovalet i `tgStep`. Därför krockar de inte, och paret håller.

## DELAR
| del | från vem | mått den bär | med/struken + skäl |
|---|---|---|---|
| trött lås (lm, fasminne tau 10 s, veto på hopp >= 0,12) | a3 (a5 i arenan takt) | FEL 10,27 -> 9,27 (200719 13 -> 10), 171840 par 97,1 -> 99,7, paslag +1,5 | MED. Bär hela takten. |
| färsk återlåsning 8 s (freshTo) | a3 (a5) | krävs för låset | MED |
| syskonveto + histogram (shH/shPull) | a7 | 171840 par 99,7 -> 99,8 ovanpå a3 (ensam 97,1 -> 99,5) | MED. Ofarlig, rör inget fönster, liten vinst. |
| mönsterkontroll pwReal (släpper vetot) | a7 | utan den DISK par (a7 m1) | MED, hör till vetot |
| online-Viterbi + fasgräns 1/8 slag + hysteres 5 % | a6 | ensam FEL 9,81, par 98,5 | STRUKEN. Krockar med båda: a3+a6+a7 = par 93,8 DISK (200719 90,0, 171840 93,0); a6+a7 = par 96,3, 171840 93,2. |
| bas-ring / omlåsning (a4), bara-par-byte (a1), metrisk grind (a5), paret ur kick/diskant (a2/a8) | - | sämre än basen på FEL eller par | STRUKNA (basens del behålls) |

## MÄTNINGARNA (4 av 4)
| mapp/mätning | innehåll | FEL | par | oktav | paslag | per fil FEL/par | poäng |
|---|---|---|---|---|---|---|---|
| bas | - | 10,27 | 97,53 | 5,57 | 91,90 | 10,4/98,8  7,4/97,1  13,0/96,7 | 0 |
| r0 m1 (`pardom-m1.json`, diff `diff-m1-a3a6a7.txt`) | a3+a6+a7 | 10,15 | 93,80 | 5,33 | 93,34 | 8,3/98,4  11,1/93,0  11,0/90,0 | DISK par |
| r0b m1 | a3+a7 | 9,27 | 98,20 | 5,33 | 93,39 | 10,4/98,2  7,4/99,8  10,0/96,6 | +1,33 |
| r0c m1 | a6+a7 | 9,81 | 96,33 | 5,33 | 93,59 | 8,3/99,5  11,1/93,2  10,0/96,3 | -0,14 |
| **r0 m2 = pardom.json** | a3+a7 (= r0b, bitlika) | 9,27 | 98,20 | 5,33 | 93,39 | 10,4/98,2  7,4/99,8  10,0/96,6 | **+1,33** |

Lead -60/-53/-67 = basen på alla. Ingen spärr. Sämre än basen: 200719 oktav 13 -> 16 och par 151659 98,8 -> 98,2 (båda från a3). Bänken är deterministisk: r0 m2 = r0b m1.
a3 och a6 krockar på fasvalet. a6 tvingar toppen till Viterbi-vägen, och a3 vetar sedan just de hopp som a6 begär. Klockan fastnar då mellan två fasval, och barmodellen landar på 2/4 (200719 par 90). a6 och a7 krockar på 171840: par 93,2, medan var och en ensam ger 99,5-99,8. Mekanismen är inte utredd. Inga sonder användes.

## KOSTNADEN
Allt körs i workern (BeatFeed). Huvudtråden rörs inte. a3: ungefär 60 multiplikationer och en exp per anslag. a7: 139 x 6 operationer per tempovarv. Nytt minne under 3 kB. Ingen allokering per hopp och ingen ny FFT.

## RISKEN
- Hela taktvinsten ligger på EN fil (200719) och dess DJ-övergångar, där även Beat This är osäkert. Det är samma mönster som j0 hade (kontrollen gick då 13,9 -> 13,3). a7:s tillskott är 0,1 par.
- En fasförskjuten övergång utan låtgräns och utan tempohopp tar 5-8 s att följa. En missad låtgräns i samma tempo håller den gamla fasen tills minnet klingat av.
- Ett riktigt halvtids- eller 3:2-byte mitt i en låt hålls kvar på huvudtempot så länge mönstret upprepar sig.
- Lotus delar analyserClock.ts. Porten och ANALYSER_SHARED.md5 är inte gjorda.

## DIFFEN (`git diff --no-index .arena/takt13/bas/src .arena/takt13/r0/src`, också i `r0/diff.txt`)
```diff
diff --git a/bas/src/analyserClock.ts b/r0/src/analyserClock.ts
index 0832641..3c52f1f 100644
--- a/bas/src/analyserClock.ts
+++ b/r0/src/analyserClock.ts
@@ -42,6 +42,8 @@ const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5,
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
+const FRESH_MS = 8000, FRESH_TEMPO = 0.04, JUMP_FRAC = 0.12, LM_TAU_MS = 10000, LM_K = 1.2;   // DET TRÖTTA LÅSET (a5)
+const SH_TAU_MS = 30000, SH_MIN_MS = 10000, SH_SHARE = 0.5, SH_DT_MAX = 1000, SH_SIB = 4;   // LÅTENS TEMPO (a7 takt13)
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -70,6 +72,7 @@ export class BeatFeed {
   onsetFixes = 0;
   private readonly phV = new Float32Array(ONSET_RING * PH_B); private readonly phA = new Float64Array(FEED_RISE_HOPS * PH_B); private readonly phP = new Float64Array(PH_B);   // FASEN UR BANDEN
   private readonly phF = new Float64Array(ONSET_BINS * PH_B); private readonly phC = new Float64Array(ONSET_BINS);
+  private readonly phWt = new Float64Array(PH_B); private readonly phWb = new Float64Array(PH_B); private readonly phWc = new Float64Array(PH_B);
   private readonly riseDb = new Float64Array(FEED_RISE_HOPS); private risePos = 0;
   private readonly fullS = new Float64Array(ONSET_BINS); private readonly fullN = new Float64Array(ONSET_BINS);   // HELA TEMPOOMRÅDET
   private readonly tgAcc = new Float64Array(TG_K).fill(-1); private readonly tgH = new Float64Array(ONSET_BINS); private tgK = 0; private tgN = 0;
@@ -95,6 +98,7 @@ export class BeatFeed {
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
   private boundSeen = 0;
+  private readonly shH = new Float64Array(TG_K); private shM = 0; private shAt = 0; shPulls = 0;   // LÅTENS TEMPO
   private quietAt = -1e12; private pend = false;   // MINNET VID GRÄNSEN
   /** Det cfg analysatorn ska byggas med. */
   barKnown(): boolean { return this.barN >= BAR_MIN; }
@@ -103,12 +107,12 @@ export class BeatFeed {
   private foldMean(k: number): number { const q = (k + ONSET_BINS) % ONSET_BINS; return this.foldN[q] ? this.foldS[q] / this.foldN[q] : 0; }
   /** FASEN UR BANDEN. */
   private phFold(): number {
-    const F = this.phF, N = this.foldN, C = this.phC; C.fill(0); let any = false;
+    const F = this.phF, N = this.foldN, C = this.phC; C.fill(0); this.phWt.fill(0); let any = false;
     for (let k = 0; k < PH_B; k++) {
       let mu = 0, mx = 0;
       for (let b = 0; b < ONSET_BINS; b++) { const v = N[b] ? F[b * PH_B + k] / N[b] : 0; mu += v; if (v > mx) mx = v; }
       mu /= ONSET_BINS; if (!(mu > 0)) continue;
-      const w = (mx / mu - 1) / mu; any = true;
+      const w = (mx / mu - 1) / mu; any = true; this.phWt[k] = w;
       for (let b = 0; b < ONSET_BINS; b++) if (N[b]) C[b] += w * F[b * PH_B + k] / N[b];
     }
     if (!any) return 0;
@@ -118,6 +122,7 @@ export class BeatFeed {
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
   private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
+  private freshTo = 0; jumpVetos = 0; private readonly lm = new Float64Array(ONSET_BINS); private readonly lmTmp = new Float64Array(ONSET_BINS); private lmT = 0;   // DET TRÖTTA LÅSET
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -127,6 +132,7 @@ export class BeatFeed {
       this.onNext = now + ONSET_EVERY_MS;
       this.scanRef = beat.anchorMs; this.scanNow = now;
       const cb = this.scanFar > 0 ? this.scanFar : beat.bpm; this.scanFar = 0;
+      if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > FRESH_TEMPO) this.freshTo = now + FRESH_MS;
       if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }
       else if (this.tempoBpm > 0) { this.scanC0 = cb; this.scanStep = 0.005; this.scanEnd = 5; }
       else { this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanEnd = 5; }
@@ -152,7 +158,7 @@ export class BeatFeed {
       if (score > this.bestScore) {
         const a = C[(mb + ONSET_BINS - 1) % ONSET_BINS], cc = C[mb], d = C[(mb + 1) % ONSET_BINS], den = a - 2 * cc + d;
         const off = den < 0 ? 0.5 * (a - d) / den : 0;
-        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
+        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS; this.phWb.set(this.phWt);
         let sx = 0, sb = 0; for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldMean(b); if (v > sx) { sx = v; sb = b; } }
         const dd = Math.abs(sb - mb), dk = dd < ONSET_BINS - dd ? dd : ONSET_BINS - dd;
         if (dk <= PH_W && sx > 0) { const a2 = this.foldMean(sb - 1), d2 = this.foldMean(sb + 1), de = a2 - 2 * sx + d2; let l = (sb + 0.5 + (de < 0 ? 0.5 * (a2 - d2) / de : 0)) / ONSET_BINS - this.bestPh; l -= Math.round(l); this.bestLag = l; }
@@ -167,11 +173,29 @@ export class BeatFeed {
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
     if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
-    let err = this.bestPh + this.phLag / nb - shift; err -= Math.round(err);
-    beat.anchorMs += err * nb;
+    const lag = this.phLag / nb; let err = this.bestPh + lag - shift; err -= Math.round(err);
+    const big = err >= JUMP_FRAC || err <= -JUMP_FRAC; this.phWc.set(this.phWb);
+    if (!big || now < this.freshTo || this.lmAt(err - lag) * LM_K >= this.lmAt(-lag)) { beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
     this.onsetFixes++;
   }
 
+  /** DET TRÖTTA LÅSET. */
+  private lmAt(ph: number): number {
+    const c = Math.round(ph * ONSET_BINS); let v = 0;
+    for (let d = -2; d <= 2; d++) { const x = this.lm[(((c + d) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS]; if (x > v) v = x; }
+    return v;
+  }
+  private lmTurn(err: number): void {
+    const r = Math.round(err * ONSET_BINS), L = this.lm, T = this.lmTmp; T.set(L);
+    for (let b = 0; b < ONSET_BINS; b++) L[b] = T[(((b + r) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS];
+  }
+  private lmAdd(now: number, b: { anchorMs: number; bpm: number }, v: number): void {
+    const per = 60000 / b.bpm; let p = (now - b.anchorMs) / per; p -= Math.floor(p);
+    const dec = this.lmT > 0 && now > this.lmT ? Math.exp(-(now - this.lmT) / LM_TAU_MS) : 1; this.lmT = now;
+    const L = this.lm; for (let i = 0; i < ONSET_BINS; i++) L[i] *= dec;
+    L[Math.floor(p * ONSET_BINS) % ONSET_BINS] += v;
+  }
+
   /** EN TEMPOSÖKNING. */
   private tgScore(bpm: number, now: number, win = TG_WIN_MS): number {
     const S = this.fullS, N = this.fullN, Hs = this.tgH, oT = this.onT, oV = this.onV, oH = this.hiV; S.fill(0); N.fill(0); Hs.fill(0);
@@ -271,7 +295,7 @@ export class BeatFeed {
       if (!held && !song && this.tempoBpm > 0) {
         const kc = ((Math.round(Math.log(this.tempoBpm / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K, cv = Math.max(acc[kc], acc[(kc + 1) % TG_K], acc[(kc + TG_K - 1) % TG_K]);
         const d = ((bk - kc) % TG_K + TG_K) % TG_K, sib = TG_SIB.some((q) => Math.abs(d - q) <= 2 || Math.abs(d - (TG_K - q)) <= 2);
-        if (sib && cv > 0 && bv < cv * TG_HOLD) { this.tgLk = 0; this.tempoBpm = this.pwJudge(this.tempoBpm, now); return; }
+        if (sib && cv > 0 && bv < cv * TG_HOLD) { this.tgLk = 0; const r0 = this.tempoBpm; this.tempoBpm = this.shPull(r0, this.pwJudge(r0, now), now); return; }
       }
       if (!held && !song) {
         const dl = Math.abs(bk - this.tgLkK), same = this.tgLkK >= 0 && Math.min(dl, TG_K - dl) <= 2;
@@ -288,12 +312,26 @@ export class BeatFeed {
         this.octR = this.octN++ === 0 ? this.tgHalfR : this.octR + TG_OCT_A * (this.tgHalfR - this.octR);
         if (this.octN === 1) this.octHi = this.octR >= TG_OCT_UP; else if (this.octHi ? this.octR < TG_OCT_DN : this.octR >= TG_OCT_UP) this.octHi = !this.octHi;
         t = this.octHi || this.octLoN >= TG_OCT_LO_N ? 2 * lo : lo; }
-      { const r0 = this.tempoBpm, pc = Math.min(159.9, Math.max(80, this.peakVote(t, now))), pj = this.pwJudge(pc, now); this.tempoBpm = pj;
+      { const r0 = this.tempoBpm, pc = Math.min(159.9, Math.max(80, this.peakVote(t, now))), pj = this.pwJudge(pc, now); this.tempoBpm = this.shPull(r0, pj, now);
         if (pj !== pc && this.first) this.tgLk = 0;
         if (pj !== pc && pj !== r0 && this.tgR >= 0) { this.tgR = ((Math.round(Math.log(pj / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K; this.tgD.fill(0); } }
       return;
     }
   }
+  /** LÅTENS TEMPO. */
+  private shPull(r0: number, want: number, now: number): number {
+    const H = this.shH, dt = this.shAt > 0 ? Math.min(now - this.shAt, SH_DT_MAX) : 0; this.shAt = now;
+    if (!(want > 0)) return want;
+    const dec = Math.exp(-dt / SH_TAU_MS); for (let i = 0; i < TG_K; i++) H[i] *= dec;
+    const kw = ((Math.round(Math.log(want / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K; H[kw] += dt; this.shM = this.shM * dec + dt;
+    let pk = -1, pv = 0;
+    for (let i = 0; i < TG_K; i++) { const v = H[(i + TG_K - 2) % TG_K] + H[(i + TG_K - 1) % TG_K] + H[i] + H[(i + 1) % TG_K] + H[(i + 2) % TG_K]; if (v > pv) { pv = v; pk = i; } }
+    if (pk < 0 || this.shM < SH_MIN_MS || pv < SH_SHARE * this.shM) return want;
+    const dw = ((kw - pk) % TG_K + TG_K) % TG_K; if (!TG_SIB.some((q) => Math.abs(dw - q) <= SH_SIB || Math.abs(dw - (TG_K - q)) <= SH_SIB) || !this.pwReal(pk, now)) return want;
+    this.shPulls++;
+    const kr = r0 > 0 ? ((Math.round(Math.log(r0 / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K : -1, dr = Math.abs(kr - pk);
+    return kr >= 0 && Math.min(dr, TG_K - dr) <= TG_SW_STEPS ? r0 : 80 * Math.pow(TG_STEP, pk);
+  }
   /** a3 TOPPRÖSTEN. */
   private peakVote(t0: number, now: number): number {
     const open = this.hvAge++ < HV_AGE;
@@ -399,7 +437,7 @@ export class BeatFeed {
     this.pwDt = (this.pwT[(this.pwPos - 1 + PW_RING) & M] - this.pwT[(this.pwPos - lo + 2 * PW_RING) & M]) / (lo - 1); if (!(this.pwDt > 0)) return true;
     this.pwWn = lo >> 1; return this.pwSim(80 * Math.pow(TG_STEP, k)) >= TG_Q_SIM;
   }
-  private tgReset(soft = false): void { if (!soft) { this.pwN = 0; this.tgAcc.fill(-1); this.tgAccF.fill(-1); } this.pwRun = 0; this.tgSw = 0; this.tgR = -1; this.brkArm = false; this.brkFrom = 0; this.tgLk = 0; this.tgLkK = -1; this.tgHl = 0; this.tgAccL.fill(-1); this.tgLN = 0; this.tgK = 0; this.tempoBpm = 0; this.octN = 0; this.hvRun = 0; this.hvAge = 0; this.hvVoted = false; this.hvKeep = 0; this.hvEver = false; this.first = true; }
+  private tgReset(soft = false): void { if (!soft) { this.pwN = 0; this.tgAcc.fill(-1); this.tgAccF.fill(-1); } this.shH.fill(0); this.shM = 0; this.shAt = 0; this.pwRun = 0; this.tgSw = 0; this.tgR = -1; this.brkArm = false; this.brkFrom = 0; this.tgLk = 0; this.tgLkK = -1; this.tgHl = 0; this.tgAccL.fill(-1); this.tgLN = 0; this.tgK = 0; this.tempoBpm = 0; this.octN = 0; this.hvRun = 0; this.hvAge = 0; this.hvVoted = false; this.hvKeep = 0; this.hvEver = false; this.first = true; }
 
   /** Kom en tidigare kick. */
   private kickRepeats(t: number, lag: number, tol: number): boolean {
@@ -472,8 +510,8 @@ export class BeatFeed {
   }
 
   /** LÅTGRÄNSEN. */
-  private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+  private relock(soft: boolean, now: number): void {
+    this.freshTo = now + FRESH_MS; this.lm.fill(0); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -490,8 +528,8 @@ export class BeatFeed {
     this.sure = !!an.boundSure; if ((an.bodyUnderDb ?? 0) >= TG_BRK_DB) this.brkAt = now;
     const nb = an.trackBoundaries ?? 0;
     const q = (an.quietMs ?? 0) >= BND_QUIET_BEATS * 60000 / (this.innerBpm > 80 ? this.innerBpm : 80); if (q) this.quietAt = now;
-    if (nb !== this.boundSeen) { this.boundSeen = nb; this.pend = this.sameSong(now); if (!this.pend) this.relock(!this.sure && !((an.quietMs ?? 0) > 0)); }
-    else if (this.pend && (q || now - this.brkAt >= TG_WIN_MS)) { this.pend = false; if (q) this.relock(false); }   // tystnar låten i breaket var gränsen sann
+    if (nb !== this.boundSeen) { this.boundSeen = nb; this.pend = this.sameSong(now); if (!this.pend) this.relock(!this.sure && !((an.quietMs ?? 0) > 0), now); }
+    else if (this.pend && (q || now - this.brkAt >= TG_WIN_MS)) { this.pend = false; if (q) this.relock(false, now); }   // tystnar låten i breaket var gränsen sann
     if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm = this.innerBpm; }
     this.updateInner(frame, cfg, now, an.quietMs ?? 0);
     const b = cfg.beat;
@@ -555,11 +593,11 @@ export class BeatFeed {
       const old = this.riseDb[this.risePos]; this.riseDb[this.risePos] = db; this.risePos = (this.risePos + 1) % FEED_RISE_HOPS;
       const ok = old !== 0 && db > old ? db - old : 0;
       const hi = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0);
-      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
+      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; if (cfg.beat && cfg.beat.bpm > 0) { let v = 0; for (let k = 0; k < PH_B; k++) v += this.phWc[k] * this.phV[this.onPos * PH_B + k]; this.lmAdd(now, cfg.beat, v); } this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
-      if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
+      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.freshTo = now + FRESH_MS; this.lm.fill(0); }
       this.onsetStep(cfg, now);
     }
     if (cfg.beat) this.barStep(frame, cfg.beat, now);
```
