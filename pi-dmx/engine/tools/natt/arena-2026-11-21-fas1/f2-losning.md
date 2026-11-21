# f2 – två hypoteser (fas1)

## Idén
Klockan håller, bredvid a3c:s trötta lås (tau 10 s), ett snabbt fasminne (tau 1,5 s) och jämför en gång per slag den nuvarande fasen med
den bästa konkurrerande fasen; vinner konkurrenten med marginal (x1,3, och x2 över medel) tre slag i rad på samma ställe byter klockan dit
och låsets minne ersätts av konkurrentens (en källa), så vikningen inte drar tillbaka. Halvslagsrelationen (0,4-0,5 slag) får konkurrenten
aldrig ta: där ser en offbeat-bas ut precis som ett verkligt hopp, så den lämnas åt det trötta låset som förut.

## Diffen
`git diff --no-index src .arena/fas1/f2/src` (bara analyserClock.ts):

```diff
diff --git a/src/analyserClock.ts b/.arena/fas1/f2/src/analyserClock.ts
index 7ab0642..f86836c 100644
--- a/src/analyserClock.ts
+++ b/.arena/fas1/f2/src/analyserClock.ts
@@ -43,6 +43,7 @@ const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 /
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
 const FRESH_MS = 8000, FRESH_TEMPO = 0.04, JUMP_FRAC = 0.12, LM_TAU_MS = 10000, LM_K = 1.2;   // DET TRÖTTA LÅSET (a5)
+const HY_TAU_MS = 1500, HY_K = 1.3, HY_N = 3, HY_W = 2, HY_C = 2, HY_D = Math.ceil(JUMP_FRAC * ONSET_BINS), HY_H = 19;   // TVÅ HYPOTESER (f2)
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -121,6 +122,8 @@ export class BeatFeed {
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
   private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
   private freshTo = 0; jumpVetos = 0; private readonly lm = new Float64Array(ONSET_BINS); private readonly lmTmp = new Float64Array(ONSET_BINS); private lmT = 0; private lmS = 1;   // DET TRÖTTA LÅSET
+  private readonly hf = new Float64Array(ONSET_BINS); private hfS = 1;   // snabbminnet (tau HY_TAU_MS)
+  private hyAt = 0; private hyAlt = -1; private hyRun = 0; hySwitches = 0;   // TVÅ HYPOTESER
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -173,26 +176,44 @@ export class BeatFeed {
     if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
     const lag = this.phLag / nb; let err = this.bestPh + lag - shift; err -= Math.round(err);
     const big = err >= JUMP_FRAC || err <= -JUMP_FRAC; this.phWc.set(this.phWb);
-    if (!big || now < this.freshTo || this.lmAt(err - lag) * LM_K >= this.lmAt(-lag)) { beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
+    if (!big || now < this.freshTo || this.lmAt(this.lm, err - lag) * LM_K >= this.lmAt(this.lm, -lag)) { beat.anchorMs += err * nb; if (big) { this.lmTurn(this.lm, err); this.lmTurn(this.hf, err); } } else this.jumpVetos++;
     this.onsetFixes++;
   }
 
   /** DET TRÖTTA LÅSET. */
-  private lmAt(ph: number): number {
+  private lmAt(L: Float64Array, ph: number): number {
     const c = Math.round(ph * ONSET_BINS); let v = 0;
-    for (let d = -2; d <= 2; d++) { const x = this.lm[(((c + d) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS]; if (x > v) v = x; }
+    for (let d = -2; d <= 2; d++) { const x = L[(((c + d) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS]; if (x > v) v = x; }
     return v;
   }
-  private lmTurn(err: number): void {
-    const r = Math.round(err * ONSET_BINS), L = this.lm, T = this.lmTmp; T.set(L);
+  /** TVÅ HYPOTESER: nuvarande fas mot bästa andra fas (ej halvslag) i snabbminnet, en gång per slag. */
+  private hyStep(b: { anchorMs: number; bpm: number }, per: number): void {
+    const H = this.hf, M = ONSET_BINS, c0 = Math.round(-this.phLag / per * M);
+    let ci = 0, cv = -1, s = 0;
+    for (let d = -HY_W; d <= HY_W; d++) { const i = (((c0 + d) % M) + M) % M; if (H[i] > cv) { cv = H[i]; ci = i; } }
+    let ai = -1, av = 0;
+    for (let i = 0; i < M; i++) { const x = H[i]; s += x; const dd = Math.abs(i - ci), dk = dd < M - dd ? dd : M - dd; if (dk >= HY_D && dk <= HY_H && x > av) { av = x; ai = i; } }
+    const win = ai >= 0 && av > HY_K * cv && av * M > HY_C * s;
+    let dp = Math.abs(ai - this.hyAlt); if (dp > M - dp) dp = M - dp;
+    this.hyRun = win ? (this.hyAlt >= 0 && dp <= HY_W ? this.hyRun + 1 : 1) : 0; this.hyAlt = win ? ai : -1;
+    if (this.hyRun < HY_N) return;
+    let d = (ai - ci) / M; d -= Math.round(d);
+    b.anchorMs += d * per; this.lmTurn(H, d); this.hyRun = 0; this.hyAlt = -1; this.hySwitches++;
+    const k = this.hfS / this.lmS, L = this.lm; for (let i = 0; i < M; i++) L[i] = H[i] * k;   // låsets minne = konkurrentens
+  }
+  private lmTurn(L: Float64Array, err: number): void {
+    const r = Math.round(err * ONSET_BINS), T = this.lmTmp; T.set(L);
     for (let b = 0; b < ONSET_BINS; b++) L[b] = T[(((b + r) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS];
   }
   private lmAdd(now: number, b: { anchorMs: number; bpm: number }, v: number): void {
     const per = 60000 / b.bpm; let p = (now - b.anchorMs) / per; p -= Math.floor(p);
-    const dec = this.lmT > 0 && now > this.lmT ? Math.exp(-(now - this.lmT) / LM_TAU_MS) : 1; this.lmT = now;
-    const L = this.lm; this.lmS *= dec;   // lat dämpning: tabellen = L x lmS, jämförelserna (lmAt mot lmAt) tar ut skalan
+    const dt = this.lmT > 0 && now > this.lmT ? now - this.lmT : 0; this.lmT = now;
+    const L = this.lm, H = this.hf, bi = Math.floor(p * ONSET_BINS) % ONSET_BINS;   // lat dämpning: tabellen = L x lmS
+    if (dt > 0) { this.lmS *= Math.exp(-dt / LM_TAU_MS); this.hfS *= Math.exp(-dt / HY_TAU_MS); }
     if (this.lmS < 1e-200) { for (let i = 0; i < ONSET_BINS; i++) L[i] *= this.lmS; this.lmS = 1; }
-    L[Math.floor(p * ONSET_BINS) % ONSET_BINS] += v / this.lmS;
+    if (this.hfS < 1e-200) { for (let i = 0; i < ONSET_BINS; i++) H[i] *= this.hfS; this.hfS = 1; }
+    L[bi] += v / this.lmS; H[bi] += v / this.hfS;
+    if (now < this.freshTo) { this.hyRun = 0; this.hyAlt = -1; } else if (now - this.hyAt >= per) { this.hyAt = now; this.hyStep(b, per); }
   }
 
   /** EN TEMPOSÖKNING. */
@@ -496,7 +517,7 @@ export class BeatFeed {
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean, now: number): void {
-    this.freshTo = now + FRESH_MS; this.lm.fill(0); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+    this.freshTo = now + FRESH_MS; this.lm.fill(0); this.hf.fill(0); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -582,7 +603,7 @@ export class BeatFeed {
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
-      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.freshTo = now + FRESH_MS; this.lm.fill(0); }
+      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.freshTo = now + FRESH_MS; this.lm.fill(0); this.hf.fill(0); }
       this.onsetStep(cfg, now);
     }
     if (cfg.beat) this.barStep(frame, cfg.beat, now);
```

## Siffrorna (övning, 38 skarvar)
| | poäng | inom3 | median | medel | ifas | FEL | par | oktav | paslag |
|---|---|---|---|---|---|---|---|---|---|
| bas a3c | 0 | 7,9 % | 7,98 s | 9,00 | 86,1 | 9,27 | 98,2 | 5,3 | 93,4 |
| **f2** | **+23,9** | 26,3 % | 5,25 s | 7,17 | 83,8 | 9,61 | 97,9 | 5,0 | 93,1 |
| ref | (DISK) | 31,6 % | 4,82 s | 7,19 | 82,3 | 10,27 | 97,5 | | |

Per hoppstorlek (median bas -> f2, antal inom 3 s): 1/4 7,5 -> 4,9 s (0 -> 4); 3/8 5,8 -> 2,7 s (1 -> 3); 5/8 13,8 -> 4,8 s (0 -> 2);
3/4 7,9 -> 6,2 s (1 -> 1); 1/2 9,6 -> 10,1 s (1 -> 0). När konkurrenten byter sker det typiskt 1,9-2,5 s efter skarven.

Sämre: halvslagshoppen följs inte snabbare (200719@577 1,45 -> 12,65 s, 171840@194 10,2 -> 13,3 s); ifas 86,1 -> 83,8 (0,7 över spärren);
FEL +0,34 (200719 10,0 -> 11,0), par -0,3.

Provat och förkastat: konkurrenten utan lås och med halvslag (m1: ifas 82,5, DISK; halvslaget fastnade 20 s); halvslag via "vikningen står
kvar 1-2 s + snabbminnet håller med" (m3/m5/m6: median 4,82 men FEL 10,6 på 200719 = offbeat-basen, och ifas 82,2-83,4); tau 1,0 s i stället för 1,5 (m7: +21,2, FEL 9,6).

## Risken
- Halvslagshopp (beatmatchad övergång en halv takt fel) följs fortfarande på ~8-10 s som a3c.
- Marginalen mot ifas-spärren är liten (0,7); en låt med kraftig 16-dels-/synkoperad figur som håller i 1,5 s+ kan vrida klockan 1/4 slag
  i ladan. Kontrollmängden kan visa det.
- Följtiden ligger ofta strax under 3 s; långsammare tempo (fler ms per slag, tre slag krävs) blir långsammare.
- CPU: ett extra 48-facks minne (en addition per halvhopp) och en 48-facks genomgång per slag; ingen allokering. Försumbart.

KLAR f2 poäng 23.9 OK
