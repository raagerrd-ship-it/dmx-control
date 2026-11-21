# f3 – fashopp som låtgräns (fas1)

## Idén
Klockan håller två bandminnen per anslag i sin egen fas (sex band, 48 fack): ett kort (tau 1 s) och ett långt (tau 10 s, som a3c:s).
Ett verkligt fashopp flyttar HELA mönstret i alla band lika mycket, så det korta minnet korrelerar bäst med det långa vid en förskjutning
på 8–20 fack (0,17–0,42 slag); två fixar i rad med samma förskjutning, tydlig vinst mot förskjutning 0 (summa korrelation >= 1,25) och
ett skarpt mönster (topp/medel >= 6,5) = mjuk relock: hoppet tas direkt och låsminnet (lm) sås om med det nya mönstret, så a3c-låset
försvarar den nya fasen i stället för den gamla. En kort falsk topp flyttar inte alla band (korrelationen är bäst vid 0), och halvslag
(offbeat-bas i uppbyggnader, a3c:s fälla) är uttryckligen undantagna (> 20 fack) – de går kvar genom a3c:s långsamma väg.

Avvikelse från kortet: freshTo + nollat minne provades först (m1) men den färska vägen väntar på vikningen (5 s fönster, ~2,5 s) och
vikningen drog tillbaka hoppet. Därför: hoppet tas av detektorn och minnet SÅS i stället för att nollas. Ingen ny FFT, inga
allokeringar per hopp (fasta Float64Array). Inga env-flaggor.

## Diffen
```diff
diff --git a/src/analyserClock.ts b/.arena/fas1/f3/src/analyserClock.ts
index 7ab0642..0ab4f5f 100644
--- a/src/analyserClock.ts
+++ b/.arena/fas1/f3/src/analyserClock.ts
@@ -43,6 +43,7 @@ const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 /
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
 const FRESH_MS = 8000, FRESH_TEMPO = 0.04, JUMP_FRAC = 0.12, LM_TAU_MS = 10000, LM_K = 1.2;   // DET TRÖTTA LÅSET (a5)
+const HOP_TAU_MS = 1000, HOP_D = 1.25, HOP_PK = 6.5, HOP_N = 2, HOP_MIN = 8, HOP_MAX = 20;   // FASHOPPET (fas1 f3): 8..20 fack, halvslag = offbeat-basens fälla
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -121,6 +122,8 @@ export class BeatFeed {
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
   private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
   private freshTo = 0; jumpVetos = 0; private readonly lm = new Float64Array(ONSET_BINS); private readonly lmTmp = new Float64Array(ONSET_BINS); private lmT = 0; private lmS = 1;   // DET TRÖTTA LÅSET
+  private readonly hL = new Float64Array(ONSET_BINS * PH_B); private readonly hS = new Float64Array(ONSET_BINS * PH_B); private readonly hX = new Float64Array(ONSET_BINS * PH_B); private readonly hY = new Float64Array(ONSET_BINS * PH_B); private readonly hTmp = new Float64Array(ONSET_BINS * PH_B);   // FASHOPPET
+  private readonly hN = new Float64Array(PH_B); private hT = 0; private hLs = 1; private hSs = 1; private hRun = 0; private hPrev = 0; hopRelocks = 0;
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -173,7 +176,9 @@ export class BeatFeed {
     if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
     const lag = this.phLag / nb; let err = this.bestPh + lag - shift; err -= Math.round(err);
     const big = err >= JUMP_FRAC || err <= -JUMP_FRAC; this.phWc.set(this.phWb);
-    if (!big || now < this.freshTo || this.lmAt(err - lag) * LM_K >= this.lmAt(-lag)) { beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
+    const h = now < this.freshTo ? (this.hRun = 0) : this.hopSeen();
+    if (h !== 0) { const hd = err * ONSET_BINS - h, dd = Math.abs(hd - Math.round(hd / ONSET_BINS) * ONSET_BINS), j = big && dd <= 3 ? err : h / ONSET_BINS; beat.anchorMs += j * nb; this.hopSeed(); this.lmTurn(j); this.hopRelocks++; }
+    else if (!big || now < this.freshTo || this.lmAt(err - lag) * LM_K >= this.lmAt(-lag)) { beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
     this.onsetFixes++;
   }
 
@@ -186,6 +191,46 @@ export class BeatFeed {
   private lmTurn(err: number): void {
     const r = Math.round(err * ONSET_BINS), L = this.lm, T = this.lmTmp; T.set(L);
     for (let b = 0; b < ONSET_BINS; b++) L[b] = T[(((b + r) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS];
+    this.hopTurn(this.hL, r); this.hopTurn(this.hS, r);
+  }
+  private hopTurn(M: Float64Array, r: number): void {
+    const U = this.hTmp; U.set(M);
+    for (let b = 0; b < ONSET_BINS; b++) { const o = ((((b + r) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS) * PH_B; for (let k = 0; k < PH_B; k++) M[b * PH_B + k] = U[o + k]; }
+  }
+
+  /** FASHOPPET: bandens korta minne (1 s) mot det långa (10 s); hela mönstret flyttat = verkligt hopp. */
+  private hopAdd(now: number, b: { anchorMs: number; bpm: number }, pos: number): void {
+    const per = 60000 / b.bpm; let p = (now - b.anchorMs) / per; p -= Math.floor(p); const o = (Math.floor(p * ONSET_BINS) % ONSET_BINS) * PH_B;
+    if (this.hT > 0 && now > this.hT) { this.hLs *= Math.exp(-(now - this.hT) / LM_TAU_MS); this.hSs *= Math.exp(-(now - this.hT) / HOP_TAU_MS); } this.hT = now;
+    if (this.hSs < 1e-60 || this.hLs < 1e-60) { for (let i = 0; i < ONSET_BINS * PH_B; i++) { this.hL[i] *= this.hLs; this.hS[i] *= this.hSs; } this.hLs = 1; this.hSs = 1; }
+    const V = this.phV, q = pos * PH_B; for (let k = 0; k < PH_B; k++) { this.hL[o + k] += V[q + k] / this.hLs; this.hS[o + k] += V[q + k] / this.hSs; }
+  }
+  private hopClear(): void { this.hL.fill(0); this.hS.fill(0); this.hRun = 0; }
+  private hopSeed(): void {   // minnena = det nya mönstret, så låset håller den nya fasen
+    const S = this.hS, k1 = this.hSs / this.lmS, k2 = this.hSs / this.hLs;
+    for (let b = 0; b < ONSET_BINS; b++) { let v = 0; for (let k = 0; k < PH_B; k++) { v += this.phWc[k] * S[b * PH_B + k]; this.hL[b * PH_B + k] = S[b * PH_B + k] * k2; } this.lm[b] = v * k1; }
+    this.hRun = 0;
+  }
+  private hopSeen(): number {
+    const B = ONSET_BINS, S = this.hS, L = this.hL, X = this.hX, Y = this.hY, Nn = this.hN; let pk = 0;
+    for (let k = 0; k < PH_B; k++) {
+      let mS = 0, mL = 0, mx = 0; for (let b = 0; b < B; b++) { const v = S[b * PH_B + k]; mS += v; mL += L[b * PH_B + k]; if (v > mx) mx = v; }
+      if (mS > 0 && mx * B / mS > pk) pk = mx * B / mS; mS /= B; mL /= B;
+      let nS = 0, nL = 0; for (let b = 0; b < B; b++) { const x = S[b * PH_B + k] - mS, y = L[b * PH_B + k] - mL; X[b * PH_B + k] = x; Y[b * PH_B + k] = y; nS += x * x; nL += y * y; }
+      Nn[k] = nS > 0 && nL > 0 ? 1 / Math.sqrt(nS * nL) : 0;
+    }
+    let c0 = 0, bc = -1e9, br = 0;
+    for (let r = 0; r < B; r++) {
+      let c = 0;
+      for (let k = 0; k < PH_B; k++) { if (!Nn[k]) continue; let d = 0; for (let b = 0; b < B; b++) d += X[b * PH_B + k] * Y[(((b - r) % B + B) % B) * PH_B + k]; c += d * Nn[k]; }
+      if (r === 0) c0 = c; if (c > bc) { bc = c; br = r; }
+    }
+    if (br > B / 2) br -= B;
+    const ab = br < 0 ? -br : br, ok = ab >= HOP_MIN && ab <= HOP_MAX && bc - c0 >= HOP_D && pk >= HOP_PK;
+    if (!ok) { this.hRun = 0; return 0; }
+    const dr = Math.abs(br - this.hPrev), dw = dr < B - dr ? dr : B - dr;
+    this.hRun = this.hRun > 0 && dw <= 2 ? this.hRun + 1 : 1; this.hPrev = br;
+    return this.hRun >= HOP_N ? br : 0;
   }
   private lmAdd(now: number, b: { anchorMs: number; bpm: number }, v: number): void {
     const per = 60000 / b.bpm; let p = (now - b.anchorMs) / per; p -= Math.floor(p);
@@ -496,7 +541,7 @@ export class BeatFeed {
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean, now: number): void {
-    this.freshTo = now + FRESH_MS; this.lm.fill(0); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+    this.freshTo = now + FRESH_MS; this.lm.fill(0); this.hopClear(); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -578,11 +623,11 @@ export class BeatFeed {
       const old = this.riseDb[this.risePos]; this.riseDb[this.risePos] = db; this.risePos = (this.risePos + 1) % FEED_RISE_HOPS;
       const ok = old !== 0 && db > old ? db - old : 0;
       const hi = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0);
-      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; if (cfg.beat && cfg.beat.bpm > 0) { let v = 0; for (let k = 0; k < PH_B; k++) v += this.phWc[k] * this.phV[this.onPos * PH_B + k]; this.lmAdd(now, cfg.beat, v); } this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
+      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; if (cfg.beat && cfg.beat.bpm > 0) { let v = 0; for (let k = 0; k < PH_B; k++) v += this.phWc[k] * this.phV[this.onPos * PH_B + k]; this.lmAdd(now, cfg.beat, v); this.hopAdd(now, cfg.beat, this.onPos); } this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
-      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.freshTo = now + FRESH_MS; this.lm.fill(0); }
+      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.freshTo = now + FRESH_MS; this.lm.fill(0); this.hopClear(); }
       this.onsetStep(cfg, now);
     }
     if (cfg.beat) this.barStep(frame, cfg.beat, now);
```

## Siffrorna
Domaren (fasdom m2 + pardom, exakt slutkoden):

| mapp | poäng | inom3 % | median s | medel s | ifas % | FEL | par | spärr |
|---|---|---|---|---|---|---|---|---|
| f3 | +28,6 | 31,6 | 5,54 | 7,71 | 85,4 | 9,61 | 98,1 | OK |
| bas | 0 | 7,9 | 7,98 | 9,00 | 86,1 | 9,27 | 98,2 | |

16 av 38 skarvar snabbare (flera 1,3–2,2 s), 4 sämre: 200719@433 (7,9 -> 9,8, hoppet 0,25 syntes bara svagt), 200719@577
(1,45 -> 12,7, halvslag – följs nu inte av detektorn och kaskaden efter tidigare hopp ändrade läget), 200719@532 (20,6 -> 21,8),
160345@373 (7,9 -> 27,2, ingen detektion, kaskad). Halvslagshopp (andel 0,5) blir inte bättre – med flit.
Sämre: FEL 9,27 -> 9,61 (200719: 10,0 -> 11,0, ett fönster; i den oskarvade filen detekteras bara ett hopp, vid 90 s där basen redan
drev -0,3 slag, resten är kaskad: 165 pa->halvt, 525 dubbelt->motslag, men 555/585 dubbelt->pa och 1005 glider->pa). ifas -0,7.
Oktav 5,3 -> 4,3, paslag 93,4 -> 93,7, lead oförändrad.

## Risken
- Marginalen mot FEL-spärren är 0,16 – kontrollmängden kan gå åt endera hållet. Falsklarm syns i 160345 (406 s och 496 s, båda i
  partier där klockan redan vandrade), inga i 200719:s offbeat-parti (521 s) tack vare halvslagsundantaget.
- I ladan: en DJ-övergång till en ANNAN låt har inte samma mönster före/efter, så korrelationen mot det gamla minnet blir svagare än
  i skarvprovet (samma musik flyttad). Detektorn kan då missa (= a3c som idag), men den hoppar inte fel av det skälet.
- Topp/medel-grinden (6,5) och korrelationsgrinden (1,25) är ställda på övningsmängden; ett mjukare mönster (pads, få anslag) ger
  ingen detektion.
- Cpu: hopAdd ~15 flops per anslag (190/s), hopSeen 48 x 6 x 48 = 14 k MAC per fix (4/s) ~ 60 k op/s – försumbart mot analysatorn;
  minne 5 x 288 + 6 doubles.
