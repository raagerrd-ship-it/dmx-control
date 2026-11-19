# a4 – OMLÅSNING PÅ HELA SLAGET (takt13) – DISK på par

## IDÉN
När vikningen av banden sätter klockan på en halvslagspunkt där basen inte slår, och basens linjära stigning (sub+kick, inte dB) är minst lika stark ett halvt slag bort, låser klockan om dit: till det närmaste hela slaget där basen slår. Det gäller bara inom 30 s efter ett tempohopp (> 4 %) eller en låtgräns. Taktmodellen nollställs vid omlåsningen och tar om paret själv. Det lagar motslaget efter låtbytet i 171840 (135 -> 90 bpm, 20 s på motslag): FEL 7,4 -> 3,7. Men samma tecken lurar klockan i andra låtar med bas på offbeaten (151659 425-455 s), och nollställningen av taktmodellen kostar paret.

## DELARNA
| del | vad den gör | mått (m2) | varifrån |
|---|---|---|---|
| A linjär basring | `linV`: sub+kick linjär stigning över 6 hop, i samma ring som `onV`, viks till `foldLs` | – (mätverktyg) | ny |
| B halvslagskvoten | `bestQ` = basens topp ±4 fack runt bandtoppens halvslagspartner / runt bandtoppen | – | ny |
| C omlåsningen | `halfOn` när q >= 1,1 i 6 tillämpade sökningar i följd (armerad 30 s efter tempohopp/låtgräns), av när q < 0,75; fasen = basens topp vid partnern | 171840 FEL 7,4 -> 3,7 (275/285 motslag -> på); 151659 10,4 -> 14,6 (435/445 nya motslag) | kortet |
| D taktmodellen om | `barReset()` vid in/ur | par 171840 98,6 (m1, utan D) -> 86,7 (m2): D gör skada, ta inte med | kortet ("paret rättas efteråt") |

Om jokern vill ha något är det A+B+C utan D, och med strängare armering. Breakarmering (m1) gav fler falska omlåsningar (sond 151659: alla falska kom efter `brk` eller ett tempohopp 106 -> 96).

## KOSTNADEN
Allt körs där klockan går (ingen FFT): +1 addition per ringvärde i vikningen (~1000 per sökhop), 18 uppslag per bästa kandidat och 6 per hop i ringen. Nytt minne ~4,5 kB (Float32 1024 + 54 double), ingen allokering per hop.

## SIFFRORNA (bas: FEL 10,3 / par 97,5 / oktav 5,6 / paslag 91,9)
| mätning | FEL | par | oktav | paslag | poäng |
|---|---|---|---|---|---|
| m1 (C med armering även på break, utan D) | 10,8 | 91,4 | 7,6 | 89,9 | -3,56 DISK (par) |
| m2 (armering bara på tempohopp/låtgräns, + D) | 10,4 | 92,5 | 6,3 | 91,3 | -2,67 DISK (par medel, par 171840) |

Per fil i m2, FEL/par: 151659 14,6/95,9 (bas 10,4/98,8), 171840 3,7/86,7 (7,4/97,1), 200719 13,0/94,9 (13,0/96,7). Det som blev sämre: 151659 (falsk omlåsning efter tempohoppet vid 423 s), paret överallt (D), 200719 oktav/fel tempo flyttade sig i fönster som 155 och 475 (klockan tog en annan väg efter omlåsningen).

## RISKEN
Basens stigning avgör inte ensam vad som är slaget. House och psytrance med bas på offbeaten ger samma kvot som ett riktigt motslag, och 151659 visar det. Utan trumma finns ingen bas att låsa på, så delen tiger. I udda takter och breaks är den ofarlig så länge den bara armeras av tempohopp och låtgräns. Med aux in från mixer flyttas sub-nivån, men kvoten är relativ.

Offline-analysen (`scratchpad`: IIR-emulering av sub+kick mot Beat This) förutsade både träffen i 171840 och de falska i 151659 ~430-460 och 200719 ~673-681. Mekanismen är alltså tvetydig i musiken själv, inte bara felavstämd.

## DIFFEN
```diff
diff --git a/.arena/takt13/bas/src/analyserClock.ts b/.arena/takt13/a4/src/analyserClock.ts
index 0832641..39922d6 100644
--- a/.arena/takt13/bas/src/analyserClock.ts
+++ b/.arena/takt13/a4/src/analyserClock.ts
@@ -24,6 +24,7 @@ const TRUST_UP = Number(process.env.DMX_TRUST_UP || '0.12'), TRUST_LEAK_MS = Num
 const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1024, ONSET_MIN_PEAK = 1.5;   // LÖPANDE TAKT
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN (a6)
+const HALF_IN = 1.1, HALF_OUT = 0.75, HALF_N = 6, HALF_ARM_MS = 30000;   // takt13 a4 OMLÅSNING PÅ HELA SLAGET
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
@@ -67,7 +68,9 @@ export class BeatFeed {
   private gridCoasting = false;
   private readonly onT = new Float64Array(ONSET_RING); private readonly onV = new Float32Array(ONSET_RING); private readonly hiV = new Float32Array(ONSET_RING); private hiPrev = 0; private onPos = 0; private onN = 0; private onHalf = false; private onPrev = 0;   // LÖPANDE TAKT
   private readonly foldS = new Float64Array(ONSET_BINS); private readonly foldN = new Float64Array(ONSET_BINS); private onNext = 0;
-  onsetFixes = 0;
+  onsetFixes = 0; halfFixes = 0;
+  private readonly linV = new Float32Array(ONSET_RING); private readonly linR = new Float64Array(FEED_RISE_HOPS); private linPrev = 0; private readonly foldLs = new Float64Array(ONSET_BINS);   // a4 HELA SLAGET
+  private bestQ = 0; private bestHb = 0; private halfRun = 0; private halfOn = false; private halfArm = -1e12;
   private readonly phV = new Float32Array(ONSET_RING * PH_B); private readonly phA = new Float64Array(FEED_RISE_HOPS * PH_B); private readonly phP = new Float64Array(PH_B);   // FASEN UR BANDEN
   private readonly phF = new Float64Array(ONSET_BINS * PH_B); private readonly phC = new Float64Array(ONSET_BINS);
   private readonly riseDb = new Float64Array(FEED_RISE_HOPS); private risePos = 0;
@@ -135,14 +138,14 @@ export class BeatFeed {
     }
     const c = this.scanC++, ref = this.scanRef;
     const bpm = this.scanC0 * (1 + c * this.scanStep), bm = 60000 / bpm;
-    this.foldS.fill(0); this.foldN.fill(0); this.phF.fill(0);
+    this.foldS.fill(0); this.foldN.fill(0); this.phF.fill(0); this.foldLs.fill(0);
     let tot = 0, n = 0; const PV = this.phV, PF = this.phF;
     for (let i = 0; i < this.onN; i++) {
       const j = (this.onPos - 1 - i + ONSET_RING) % ONSET_RING, t = this.onT[j];
       if (t > this.scanNow) continue;
       if (this.scanNow - t > ONSET_WIN_MS) break;
       const r = (t - ref) % bm, b = Math.floor(((r < 0 ? r + bm : r) / bm) * ONSET_BINS) % ONSET_BINS;
-      this.foldS[b] += this.onV[j]; this.foldN[b]++; tot += this.onV[j]; n++;
+      this.foldS[b] += this.onV[j]; this.foldLs[b] += this.linV[j]; this.foldN[b]++; tot += this.onV[j]; n++;
       const o = b * PH_B, q = j * PH_B; for (let k = 0; k < PH_B; k++) PF[o + k] += PV[q + k];
     }
     if (n >= 100 && tot > 0) {
@@ -157,6 +160,9 @@ export class BeatFeed {
         const dd = Math.abs(sb - mb), dk = dd < ONSET_BINS - dd ? dd : ONSET_BINS - dd;
         if (dk <= PH_W && sx > 0) { const a2 = this.foldMean(sb - 1), d2 = this.foldMean(sb + 1), de = a2 - 2 * sx + d2; let l = (sb + 0.5 + (de < 0 ? 0.5 * (a2 - d2) / de : 0)) / ONSET_BINS - this.bestPh; l -= Math.round(l); this.bestLag = l; }
         else this.bestLag = NaN;
+        { let vOn = 0, vOff = 0, hb = mb; const LS = this.foldLs, N = this.foldN;
+          for (let d = -PH_W; d <= PH_W; d++) { const qa = (mb + d + ONSET_BINS) % ONSET_BINS, qb = (mb + TG_HALF + d + ONSET_BINS) % ONSET_BINS, a3 = N[qa] ? LS[qa] / N[qa] : 0, b3 = N[qb] ? LS[qb] / N[qb] : 0; if (a3 > vOn) vOn = a3; if (b3 > vOff) { vOff = b3; hb = qb; } }
+          this.bestQ = vOn > 0 ? vOff / vOn : vOff > 0 ? 99 : 0; this.bestHb = hb; }
       }
     }
     if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
@@ -164,6 +170,12 @@ export class BeatFeed {
     if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanFar = this.bestBpm; return; }
     const oldMs = 60000 / beat.bpm, idx = Math.floor((now - beat.anchorMs) / oldMs), fr = (now - beat.anchorMs) / oldMs - idx;
     const nb = 60000 / this.bestBpm;
+    if (Math.abs(this.bestBpm / beat.bpm - 1) > 0.04) this.halfArm = now;
+    if (!this.halfOn) { this.halfRun = this.bestQ >= HALF_IN && now - this.halfArm < HALF_ARM_MS ? this.halfRun + 1 : 0; if (this.halfRun >= HALF_N) { this.halfOn = true; this.halfRun = 0; this.halfFixes++; this.barReset(); } }
+    else if (this.bestQ < HALF_OUT) { this.halfOn = false; this.barReset(); }
+    if (this.halfOn) { const LS = this.foldLs, N = this.foldN, B = ONSET_BINS, hb = this.bestHb, qa = (hb + B - 1) % B, qd = (hb + 1) % B;
+      const a3 = N[qa] ? LS[qa] / N[qa] : 0, c3 = N[hb] ? LS[hb] / N[hb] : 0, d3 = N[qd] ? LS[qd] / N[qd] : 0, e3 = a3 - 2 * c3 + d3;
+      let p = (hb + 0.5 + (e3 < 0 ? 0.5 * (a3 - d3) / e3 : 0)) / B - this.phLag / nb; p -= Math.floor(p); this.bestPh = p; this.bestLag = NaN; }
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
     if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
@@ -472,8 +484,8 @@ export class BeatFeed {
   }
 
   /** LÅTGRÄNSEN. */
-  private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+  private relock(soft: boolean, now: number): void {
+    this.halfOn = false; this.halfRun = 0; this.halfArm = now; this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -490,8 +502,8 @@ export class BeatFeed {
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
@@ -518,7 +530,7 @@ export class BeatFeed {
     if (now - this.lastTrustLog > 4000) { this.lastTrustLog = now; if (isLogOn()) console.log(`[tillit] mönster ${this.repeatRate.toFixed(2)} · fasträff ${this.onBeatRate.toFixed(2)} · bpm ${cfg.beat ? cfg.beat.bpm.toFixed(1) : 0}`); }
     const pllConf = this.pllKicks >= 12 ? this.onBeatRate : 0;
     if (quietMs > 10000) {
-      if (cfg.beat || this.onN > 0) { this.barReset(); cfg.beat = null; cfg.beatErr = 0; this.onN = 0; this.scanC = 99; this.tgReset(); }
+      if (cfg.beat || this.onN > 0) { this.barReset(); cfg.beat = null; cfg.beatErr = 0; this.onN = 0; this.scanC = 99; this.halfOn = false; this.halfRun = 0; this.tgReset(); }
       return;
     }
     const beat0 = cfg.beat;
@@ -552,12 +564,13 @@ export class BeatFeed {
           if (this.onHalf) V[w + k] = u > P[k] ? u : P[k];
           P[k] = u;
         } }
+      const kl = (sa?.sub ?? 0) + (sa?.kick ?? 0), oldL = this.linR[this.risePos], okL = kl > oldL ? kl - oldL : 0; this.linR[this.risePos] = kl;
       const old = this.riseDb[this.risePos]; this.riseDb[this.risePos] = db; this.risePos = (this.risePos + 1) % FEED_RISE_HOPS;
       const ok = old !== 0 && db > old ? db - old : 0;
       const hi = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0);
-      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
+      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.linV[this.onPos] = okL > this.linPrev ? okL : this.linPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
-      this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
+      this.onPrev = ok; this.linPrev = okL; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
       if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
       this.onsetStep(cfg, now);
```
