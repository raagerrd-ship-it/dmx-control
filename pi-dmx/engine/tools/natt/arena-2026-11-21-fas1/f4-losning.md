# f4 – SAMMA MÖNSTER, FLYTTAT (strategikort: kedjan efter beslutet)

## Var tiden gick
Mätt i replay-loggar (ej gissat): efter beslutet finns ingen glidning att korta – ankaret tar hela steget direkt, beatClock har ingen utjämning, tilliten släpper inga tick. Tiden går FÖRE ett beslut: vikningens 5 s-fönster ser nya fasen först efter ~2,5 s, sedan väntar a3c:s fasminne (tau 10 s, LM_K 1,2) ~5 s till. Resten av följtiden är facithål (Beat This saknar slag → ett tick läses som ±0,5 i alla varianter).

## IDÉN
Klockan har ett bandminne (6 band × 48 fack, samma tau och lata dämpning som fasminnet) och jämför de senaste 2 s per band mot det: har HELA mönstret – alla band, med lika god likhet som före hoppet – flyttat sig ≥ 0,2 slag, två rättningar i rad, är det ett verkligt fashopp och tas direkt (~1,7 s). En kort falsk topp (offbeat-bas, uppbyggnad) ändrar mönstret i stället för att flytta det: likheten blir lägre än före (PM_RAT 0,75), eller satt mönstret inte på klockan före (PM_PRE 0,7), och då avgör a3c-låset som förut.

Efter ett mönsterhopp vrids inte fasminnet (musiken flyttade, inte klockan), och vikningens stora hopp och phLag fryses 5 s medan fönstret är blandat. Låsets veto finns kvar orört.

## SIFFRORNA
| mapp | poäng | inom3 | median | medel | ifas | FEL | par |
|---|---|---|---|---|---|---|---|
| f4 | +32,4 | 34 % | 4,95 s | 6,88 s | 85,1 % | 9,27 | 98,2 |
| bas | 0 | 8 % | 7,98 s | 9,00 s | 86,1 % | 9,27 | 98,2 |

pardom: FEL 9,27, par 98,2, oktav 5,3, paslag 93,3, lead oförändrad på alla tre filerna. På de oskarvade filerna blir allt identiskt med bas: inga mönsterhopp i övningens musik.
Bättre på 18 skarvar, lika på 16 och sämre på 4: 151659 289,9 (6,4→8,4 s), 334,4 (5,3→5,7), 200719 577,5 (1,5→2,7), 871,2 (9,4→9,9). ifas sjunker 1 enhet, mest före 160345 512,9 (100→56 %, en skarv som tas och sedan stör nästa fönster).
Prövat och förkastat: m1/m2 utan PM_RAT/PM_JUMP gav inom3 39 % men FEL 10,27 (DISK). Tre falska mönsterhopp på 200719 (två halvslag i en musik som sakta blev halvslagssymmetrisk, ett 0,12-slags tempoglid) tog bort hela a3c-vinsten. PM_RAT och PM_JUMP 0,2 dödade alla tre; GAP 0,3→0,2 gav tillbaka två träffar.

## RISKEN
- Bänkens skarvar är SAMMA låt, och den har samma mönster före och efter. En beatmatchad DJ-övergång till en ANNAN låt har inte det, och då följer klockan som a3c (~8 s). Ägarens verkliga fall vinner alltså mindre än bänken visar.
- Marginalerna mot de falska hoppen är tunna (likhetskvot 0,79/0,67 mot gränsen 0,75). Musik med halvslagssymmetri i ladan kan ge ett falskt halvslag i ≤5 s.
- Cpu: en korrelation 6×48×48 (~14 k mul) och en vikning av 2 s per rättning (4/s), plus 6 additioner per lagrat anslag. Det blir < 0,1 % av en Pi-kärna och ~5 KB typade arrayer som allokeras en gång. analyserClock.ts är delad med lotus, men ANALYSER_SHARED.md5 är inte uppdaterad.
- Källfilen har originalets nakna CR före kommentarerna, så diffen är ren. Mätningen gjordes på en byte-variant där de CR:en var LF, alltså samma kod och samma beteende.

## DIFFEN
```diff
diff --git a/src/analyserClock.ts b/.arena/fas1/f4/src/analyserClock.ts
index 7ab0642..4d5fb21 100644
--- a/src/analyserClock.ts
+++ b/.arena/fas1/f4/src/analyserClock.ts
@@ -43,6 +43,7 @@ const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 /
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
 const FRESH_MS = 8000, FRESH_TEMPO = 0.04, JUMP_FRAC = 0.12, LM_TAU_MS = 10000, LM_K = 1.2;   // DET TRÖTTA LÅSET (a5)
+const PM_WIN_MS = 2000, PM_MIN = 0.55, PM_GAP = 0.2, PM_PRE = 0.7, PM_RAT = 0.75, PM_JUMP = 0.2, PM_PRE0 = 3500, PM_PRE1 = 1000, PM_HOLD_MS = ONSET_WIN_MS;   // SAMMA MÖNSTER, FLYTTAT (fas1 f4)
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -121,6 +122,7 @@ export class BeatFeed {
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
   private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
   private freshTo = 0; jumpVetos = 0; private readonly lm = new Float64Array(ONSET_BINS); private readonly lmTmp = new Float64Array(ONSET_BINS); private lmT = 0; private lmS = 1;   // DET TRÖTTA LÅSET
+  private readonly pmM = new Float64Array(ONSET_BINS * PH_B); private readonly pmS = new Float64Array(ONSET_BINS * PH_B); private readonly pmN = new Float64Array(ONSET_BINS); private readonly pmC = new Float64Array(ONSET_BINS); private pmTo = 0; private pmR = NaN; pmJumps = 0; private readonly pmHt = new Float64Array(16); private readonly pmHc = new Float64Array(16); private pmHp = 0;   // SAMMA MÖNSTER, FLYTTAT
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -170,13 +172,49 @@ export class BeatFeed {
     const nb = 60000 / this.bestBpm;
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
-    if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
+    if (this.bestLag === this.bestLag && now >= this.pmTo) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
     const lag = this.phLag / nb; let err = this.bestPh + lag - shift; err -= Math.round(err);
     const big = err >= JUMP_FRAC || err <= -JUMP_FRAC; this.phWc.set(this.phWb);
-    if (!big || now < this.freshTo || this.lmAt(err - lag) * LM_K >= this.lmAt(-lag)) { beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
+    const pj = this.pmJump(now, beat.anchorMs, nb);
+    if (pj !== 0) { beat.anchorMs += pj * nb; this.pmTo = now + PM_HOLD_MS; this.pmJumps++; }
+    else if (!big || (now >= this.pmTo && (now < this.freshTo || this.lmAt(err - lag) * LM_K >= this.lmAt(-lag)))) { beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
     this.onsetFixes++;
   }
 
+  /** SAMMA MÖNSTER, FLYTTAT: banden de senaste PM_WIN_MS mot bandminnet; hela mönstret flyttat = hoppet (bråkdel), annars 0. */
+  private pmJump(now: number, anchor: number, bm: number): number {
+    if (now < this.freshTo || now < this.pmTo) { this.pmR = NaN; return 0; }
+    const S = this.pmS, N = this.pmN, M = this.pmM, PV = this.phV, C = this.pmC, B = ONSET_BINS; S.fill(0); N.fill(0); C.fill(0);
+    for (let i = 0; i < this.onN; i++) {
+      const j = (this.onPos - 1 - i + ONSET_RING) % ONSET_RING, t = this.onT[j];
+      if (now - t > PM_WIN_MS) break;
+      const r = (t - anchor) % bm, b = Math.floor(((r < 0 ? r + bm : r) / bm) * B) % B;
+      N[b]++; const o = b * PH_B, q = j * PH_B; for (let k = 0; k < PH_B; k++) S[o + k] += PV[q + k];
+    }
+    for (let b = 0; b < B; b++) { if (!N[b]) { this.pmR = NaN; return 0; } for (let k = 0; k < PH_B; k++) S[b * PH_B + k] /= N[b]; }
+    let wt = 0;
+    for (let k = 0; k < PH_B; k++) {
+      let mm = 0, sm = 0; for (let b = 0; b < B; b++) { mm += M[b * PH_B + k]; sm += S[b * PH_B + k]; } mm /= B; sm /= B;
+      let mv = 0, sv = 0; for (let b = 0; b < B; b++) { const x = M[b * PH_B + k] - mm, y = S[b * PH_B + k] - sm; mv += x * x; sv += y * y; }
+      if (!(mm > 0) || !(mv > 0)) continue;
+      const w = Math.sqrt(mv / B) / mm; wt += w;   // bandets tydlighet i minnet
+      if (!(sv > 0)) continue;
+      const g = w / Math.sqrt(mv * sv);
+      for (let r = 0; r < B; r++) { let a = 0; for (let b = 0; b < B; b++) a += (S[b * PH_B + k] - sm) * (M[((b - r + B) % B) * PH_B + k] - mm); C[r] += g * a; }
+    }
+    if (!(wt > 0)) { this.pmR = NaN; return 0; }
+    let rb = 0, cb = -1e9; for (let r = 0; r < B; r++) if (C[r] > cb) { cb = C[r]; rb = r; }
+    const rr = rb > B / 2 ? rb - B : rb; let pre = 0;
+    for (let i = 0; i < 16; i++) { const dt = now - this.pmHt[i]; if (dt >= PM_PRE1 && dt <= PM_PRE0 && this.pmHc[i] > pre) pre = this.pmHc[i]; }
+    this.pmHt[this.pmHp] = now; this.pmHc[this.pmHp] = C[0] / wt; this.pmHp = (this.pmHp + 1) & 15;   // före hoppet satt mönstret på klockan
+    if (Math.abs(rr) / B < PM_JUMP || cb / wt < PM_MIN || (cb - C[0]) / wt < PM_GAP || pre < PM_PRE || cb / wt < PM_RAT * pre) { this.pmR = NaN; return 0; }
+    const a = C[(rb + B - 1) % B], d = C[(rb + 1) % B], den = a - 2 * cb + d, e = (rr + (den < 0 ? 0.5 * (a - d) / den : 0)) / B;
+    const p = this.pmR; this.pmR = e;
+    if (!(p === p) || Math.abs(p - e) > 2 / B) return 0;
+    this.pmR = NaN; return e;
+  }
+  private lmClear(): void { this.lm.fill(0); this.pmM.fill(0); }
+
   /** DET TRÖTTA LÅSET. */
   private lmAt(ph: number): number {
     const c = Math.round(ph * ONSET_BINS); let v = 0;
@@ -186,13 +224,16 @@ export class BeatFeed {
   private lmTurn(err: number): void {
     const r = Math.round(err * ONSET_BINS), L = this.lm, T = this.lmTmp; T.set(L);
     for (let b = 0; b < ONSET_BINS; b++) L[b] = T[(((b + r) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS];
+    const M = this.pmM, U = this.pmS; U.set(M);
+    for (let b = 0; b < ONSET_BINS; b++) { const s = ((((b + r) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS) * PH_B; for (let k = 0; k < PH_B; k++) M[b * PH_B + k] = U[s + k]; }
   }
-  private lmAdd(now: number, b: { anchorMs: number; bpm: number }, v: number): void {
+  private lmAdd(now: number, b: { anchorMs: number; bpm: number }, v: number, q: number): void {
     const per = 60000 / b.bpm; let p = (now - b.anchorMs) / per; p -= Math.floor(p);
     const dec = this.lmT > 0 && now > this.lmT ? Math.exp(-(now - this.lmT) / LM_TAU_MS) : 1; this.lmT = now;
     const L = this.lm; this.lmS *= dec;   // lat dämpning: tabellen = L x lmS, jämförelserna (lmAt mot lmAt) tar ut skalan
-    if (this.lmS < 1e-200) { for (let i = 0; i < ONSET_BINS; i++) L[i] *= this.lmS; this.lmS = 1; }
-    L[Math.floor(p * ONSET_BINS) % ONSET_BINS] += v / this.lmS;
+    if (this.lmS < 1e-200) { for (let i = 0; i < ONSET_BINS; i++) L[i] *= this.lmS; for (let i = 0; i < ONSET_BINS * PH_B; i++) this.pmM[i] *= this.lmS; this.lmS = 1; }
+    const bi = Math.floor(p * ONSET_BINS) % ONSET_BINS; L[bi] += v / this.lmS;
+    for (let k = 0; k < PH_B; k++) this.pmM[bi * PH_B + k] += this.phV[q + k] / this.lmS;
   }
 
   /** EN TEMPOSÖKNING. */
@@ -496,7 +537,7 @@ export class BeatFeed {
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean, now: number): void {
-    this.freshTo = now + FRESH_MS; this.lm.fill(0); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+    this.freshTo = now + FRESH_MS; this.lmClear(); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -578,11 +619,11 @@ export class BeatFeed {
       const old = this.riseDb[this.risePos]; this.riseDb[this.risePos] = db; this.risePos = (this.risePos + 1) % FEED_RISE_HOPS;
       const ok = old !== 0 && db > old ? db - old : 0;
       const hi = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0);
-      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; if (cfg.beat && cfg.beat.bpm > 0) { let v = 0; for (let k = 0; k < PH_B; k++) v += this.phWc[k] * this.phV[this.onPos * PH_B + k]; this.lmAdd(now, cfg.beat, v); } this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
+      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; if (cfg.beat && cfg.beat.bpm > 0) { let v = 0; for (let k = 0; k < PH_B; k++) v += this.phWc[k] * this.phV[this.onPos * PH_B + k]; this.lmAdd(now, cfg.beat, v, this.onPos * PH_B); } this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
-      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.freshTo = now + FRESH_MS; this.lm.fill(0); }
+      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.freshTo = now + FRESH_MS; this.lmClear(); }
       this.onsetStep(cfg, now);
     }
     if (cfg.beat) this.barStep(frame, cfg.beat, now);
```
