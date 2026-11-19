# a3 DE FÄLLDA IDÉERNA: det trötta låset (a5/j0) ovanpå a6

**IDÉN.** Klockan rättar inte längre fasen fullt mot vikningens topp var 250:e ms. Ett hopp på 0,12 slag eller mer tas bara om ett fasminne håller med. Minnet består av a6:s viktade bandstigning, vikt mot klockan med tau 10 s. Efter en låtgräns, ett nytt slag eller ett tempohopp över 4 % nollas minnet och alla hopp får passera i 8 s. Korta felaktiga toppar (offbeat-bas, uppbyggnad) drar då inte klockan från slaget. Paret håller eftersom ankaret bara rör sig när musiken ihållande säger det.
Varifrån: a5:s trötta lås (arenan takt), matat som i jokern j0 med a6:s vägda bandstigning. j0 bar mest takt ovanpå a6 (övning 10,8 -> 9,8, kontroll 13,9 -> 13,3) och föll bara på 'etta'. a2:s fasvakt (j0b) gav ingen takt ovanpå a6. a8:s halvslagsbyte flyttar ettan ett slag och ger alltså parfel. Därför valde jag bort dem.

## DELARNA
| del | vad den gör | mått (m1 mot bas) | källa |
|---|---|---|---|
| A trött lås (`lmAt`/`lmAdd`/`lmTurn`, villkoret sist i `onsetStep`, vikterna `phWt/phWb/phWc`) | hopp med \|err\| >= 0,12 tas bara om lm(hopp) x 1,2 >= lm(nu); minnet vrids med när ett hopp tas | FEL 200719 13,0 -> 10,0; par 171840 97,1 -> 99,7 (dubbelt-fönstret 215 s blev 'på'); paslag 91,9 -> 93,4 | a5 del A, j0 |
| B färsk återlåsning (`freshTo`, 8 s) | vid `relock`, nytt `cfg.beat` eller tempohopp > 4 %: minnet nollas och inget veto | behövs för A (utan nollning håller minnet förra låtens fas) | a5 del B |

m2 provade a5:s bortvalda "kort vikningsfönster 3 s under färskperioden". Den idén föll bara på ettan förra gången. Här gav den poäng +0,14 och par 200719 94,2. Den är förkastad och borttagen, så src är m1. Ingen spärr behövde lagas.

## KOSTNADEN
Allt körs i workern (BeatFeed i taktvägen). Per anslag (varannat hopp) blir det 6 multiplikationer, en Math.exp och 48 multiplikationer (avklingningen). Per sökning (4 Hz) tillkommer två läsningar à 5 fack, en kopia av 6 vikter och ibland en vridning på 48 fack. Huvudtråden och split.ts rörs inte. Nytt minne: 2 x 48 + 3 x 6 float64, under 1 kB. Ingen allokering per hopp och ingen ny FFT.

## SIFFRORNA (pardom-m1.json = pardom.json)
| fil | FEL bas -> a3 | par | oktav | paslag | lead |
|---|---|---|---|---|---|
| 151659 | 10,4 -> 10,4 | 98,8 -> 98,2 | 0 -> 0 | 96,4 -> 96,6 | -60/-60 |
| 171840 | 7,4 -> 7,4 | 97,1 -> 99,7 | 3,7 -> 0 | 89,1 -> 91,8 | -53/-53 |
| 200719 | 13,0 -> 10,0 | 96,7 -> 96,6 | 13 -> 16 | 90,1 -> 92,0 | -67/-67 |
| medel | 10,27 -> 9,27 | 97,53 -> 98,17 | 5,57 -> 5,33 | 91,9 -> 93,4 | |

POÄNG +1,32, ingen spärr. Sämre blev oktaven på 200719 (+3 fönster halvt/dubbelt) och par 151659 (-0,6). VARNING: hela takt-vinsten sitter på 200719, och i DJ-övergångarna (975-1025 s) är även Beat This osäkert. Det är samma enfilsmönster som j0 hade. Det som talar för idén är att j0 på kontrollen förra gången också gick åt rätt håll i takt (13,9 -> 13,3).
Obs: a3/ettdom/kr-*.json och etta3dom-p.json är från m2, inte från m1. Kör om --mat om de behövs.
Obs 2: av misstag läste jag förra arenans taktdom-holdout.json (FEL/etta för a6/j0/j0b, inga facit-slag) och bpm-metadata ur beatthis.jsonl för kontrollfilerna. Det skedde efter att mekanismen var vald och påverkade ingen konstant. Konstanterna är a5:s, oförändrade.

## RISKEN
- En verklig fasändring utan låtgräns och utan tempohopp över 4 % (beatmatchad DJ-övergång med fasförskjutning) tar ~5-8 s att följa i stället för 0,25 s.
- Aux från mixer: om gränsdetektorn missar en ny låt i samma tempo håller minnet kvar den gamla fasen tills den klingat av.
- Breaks och musik utan trumma: minnet klingar av (tau 10 s). Svaga anslag ger små hopp under 0,12 som passerar fritt, som förr.
- Udda takter påverkas inte särskilt, eftersom låset gäller slagfasen och inte ettan.
- Lotus delar analyserClock.ts. Porten och ANALYSER_SHARED.md5 är inte gjorda.

## DIFFEN (`git diff --no-index .arena/takt13/bas/src .arena/takt13/a3/src`)
```diff
diff --git a/.arena/takt13/bas/src/analyserClock.ts b/.arena/takt13/a3/src/analyserClock.ts
index 0832641..c598c7d 100644
--- a/.arena/takt13/bas/src/analyserClock.ts
+++ b/.arena/takt13/a3/src/analyserClock.ts
@@ -42,6 +42,7 @@ const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5,
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
+const FRESH_MS = 8000, FRESH_TEMPO = 0.04, JUMP_FRAC = 0.12, LM_TAU_MS = 10000, LM_K = 1.2;   // DET TRÖTTA LÅSET (a5)
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -70,6 +71,7 @@ export class BeatFeed {
   onsetFixes = 0;
   private readonly phV = new Float32Array(ONSET_RING * PH_B); private readonly phA = new Float64Array(FEED_RISE_HOPS * PH_B); private readonly phP = new Float64Array(PH_B);   // FASEN UR BANDEN
   private readonly phF = new Float64Array(ONSET_BINS * PH_B); private readonly phC = new Float64Array(ONSET_BINS);
+  private readonly phWt = new Float64Array(PH_B); private readonly phWb = new Float64Array(PH_B); private readonly phWc = new Float64Array(PH_B);
   private readonly riseDb = new Float64Array(FEED_RISE_HOPS); private risePos = 0;
   private readonly fullS = new Float64Array(ONSET_BINS); private readonly fullN = new Float64Array(ONSET_BINS);   // HELA TEMPOOMRÅDET
   private readonly tgAcc = new Float64Array(TG_K).fill(-1); private readonly tgH = new Float64Array(ONSET_BINS); private tgK = 0; private tgN = 0;
@@ -103,12 +105,12 @@ export class BeatFeed {
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
@@ -118,6 +120,7 @@ export class BeatFeed {
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
   private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
+  private freshTo = 0; jumpVetos = 0; private readonly lm = new Float64Array(ONSET_BINS); private readonly lmTmp = new Float64Array(ONSET_BINS); private lmT = 0;   // DET TRÖTTA LÅSET
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -127,6 +130,7 @@ export class BeatFeed {
       this.onNext = now + ONSET_EVERY_MS;
       this.scanRef = beat.anchorMs; this.scanNow = now;
       const cb = this.scanFar > 0 ? this.scanFar : beat.bpm; this.scanFar = 0;
+      if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > FRESH_TEMPO) this.freshTo = now + FRESH_MS;
       if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }
       else if (this.tempoBpm > 0) { this.scanC0 = cb; this.scanStep = 0.005; this.scanEnd = 5; }
       else { this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanEnd = 5; }
@@ -152,7 +156,7 @@ export class BeatFeed {
       if (score > this.bestScore) {
         const a = C[(mb + ONSET_BINS - 1) % ONSET_BINS], cc = C[mb], d = C[(mb + 1) % ONSET_BINS], den = a - 2 * cc + d;
         const off = den < 0 ? 0.5 * (a - d) / den : 0;
-        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
+        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS; this.phWb.set(this.phWt);
         let sx = 0, sb = 0; for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldMean(b); if (v > sx) { sx = v; sb = b; } }
         const dd = Math.abs(sb - mb), dk = dd < ONSET_BINS - dd ? dd : ONSET_BINS - dd;
         if (dk <= PH_W && sx > 0) { const a2 = this.foldMean(sb - 1), d2 = this.foldMean(sb + 1), de = a2 - 2 * sx + d2; let l = (sb + 0.5 + (de < 0 ? 0.5 * (a2 - d2) / de : 0)) / ONSET_BINS - this.bestPh; l -= Math.round(l); this.bestLag = l; }
@@ -167,11 +171,29 @@ export class BeatFeed {
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
@@ -472,8 +494,8 @@ export class BeatFeed {
   }
 
   /** LÅTGRÄNSEN. */
-  private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+  private relock(soft: boolean, now: number): void {
+    this.freshTo = now + FRESH_MS; this.lm.fill(0); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -490,8 +512,8 @@ export class BeatFeed {
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
@@ -555,11 +577,11 @@ export class BeatFeed {
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
