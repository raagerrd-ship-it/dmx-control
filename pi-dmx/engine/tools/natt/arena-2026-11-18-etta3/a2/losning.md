# a2 TVÅ RUTNÄT, EN KLOCKA (etta3)

## Idén
Den publicerade klockan är a6:s, men taktminnet (barStep/barCommit/barBack) samlar sina särdrag på ett eget internt rutnät = a6-rutnätet förskjutet bD slag, där bD följer basens gamla fas (subk-vikningens topp, utan a6:s lead-ankare). Ettan väljs i det interna rutnätet och översätts till a6-klockan via glidräkningen (barJ ser det interna rutnätets slagtider), så bara resultatet (vilket slag som är ettan) når klockan.

## Delarna
| del | vad den gör | mått | varifrån |
|---|---|---|---|
| A gamla fasen (`bestPhO`) | subk-toppens fas (parabel) vid bästa kandidaten, räknas redan i a6:s lag-kod | krävs för B | basen före a6 (takt-bas) |
| B internt rutnät (`bD`) | vid varje fasrättning: bD += gammal rättning - a6:s rättning | m1 rått (ingen gräns, omslag vid ±0,65): ren 60,3 (bas 86,6), 171840 75 -> 19, DISK-lik | kortet |
| C spärren `BD_MAX 0.2` | rättningen tas bara om \|bD\| stannar inom 0,2 slag, annars behålls bD (gamla fasens motslagshopp ignoreras) | m2: ren 86,9 (+0,3), trean 10,9 -> 4,9, omval +0,03 | lagningen |
| D barStep på internt rutnät | pos = a6-pos - bD, barCommit får interna slagtider | bär A-C | |

## Kostnaden
Allt i workern (BeatFeed). Per fasrättning (var 250 ms): en parabel + ~10 flyttal. Per hop: en subtraktion. Inget nytt minne (två fält), ingen allokering. Huvudtråden orörd.

## Siffrorna (m2, övningen; bas inom parentes)
| fil | ren | trean | etta alla | omval | FEL | lead |
|---|---|---|---|---|---|---|
| 151659 | 93,3 (92,8) | 6,2 (6,0) | 94,2 (93,9) | 0,1 | 10,2 (10,4) | -60 (-60) |
| 171840 | 75,5 (75,3) | 3,5 (21,8) | 72,5 (74,8) | 0,8 (0,6) | 7,4 | -53 |
| 200719 | 91,9 (91,8) | 4,9 (4,9) | 69,3 (67,0) | 1,3 (1,5) | 14,0 (13,0) | -67 |

Medel: ren 86,9 (86,6), trean 4,9 (10,9), etta 78,7 (78,6), omval 0,77 (0,74), paslag 92,0 (91,9), FEL 10,5 (10,3), oktav 5,2 (5,6). **Poäng +0,12, OK.**
Sämre: trean-felet på 171840 (140-180 s) flyttade bara till förskjutning 3 (2,7 -> 20,8), ren rörs inte; etta alla 171840 -2,3; FEL 200719 +1.

Fynd (m1): gamla fasen hoppar ofta ett halvt slag (offbeat-bas, 171840 40-60 s). Ett rutnät som följer den fullt slår om ±1 slag och ettan roterar 0->3->2->1. Basens gamla etta-fördel satt alltså inte i en fin fasskillnad (median-felet mot Beat This skiljer <10 ms), utan i att klocka och minne hoppade ihop. Med spärren blir B nästan basen: idén bär ingen ettvinst.

## Diffen
Hela i `.arena/etta3/a2/diff.txt` (nedan). Obs: basens analyserClock.ts har ensamma CR före vissa kommentarer; m2 mättes på en kopia där de blivit LF (samma kod), filen är nu återställd byte för byte utom diffen.

## Risken
- Liten: med spärren är bD ≤ 0,2 slag, minnets fönster (-0,2..0,3) flyttas högst så. Breaks/låtbyten: bD nollas bara när klockan tappas (tystnad >10 s), inte vid relock.
- Musik utan trumma: subk-toppen saknas -> bD står still.
- Udda takter: oförändrat från basen.

```diff
diff --git a/.arena/etta3/bas/src/analyserClock.ts b/.arena/etta3/a2/src/analyserClock.ts
index 0832641..e6a11bc 100644
--- a/.arena/etta3/bas/src/analyserClock.ts
+++ b/.arena/etta3/a2/src/analyserClock.ts
@@ -24,6 +24,7 @@ const TRUST_UP = Number(process.env.DMX_TRUST_UP || '0.12'), TRUST_LEAK_MS = Num
 const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1024, ONSET_MIN_PEAK = 1.5;   // LÖPANDE TAKT
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN (a6)
+const BD_MAX = 0.2;   // TAKTMINNETS RUTNÄT (etta3 a2)
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
@@ -117,7 +118,7 @@ export class BeatFeed {
   }
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
-  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
+  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0; private bestPhO = NaN; private bD = 0;
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -154,6 +155,7 @@ export class BeatFeed {
         const off = den < 0 ? 0.5 * (a - d) / den : 0;
         this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
         let sx = 0, sb = 0; for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldMean(b); if (v > sx) { sx = v; sb = b; } }
+        if (sx > 0) { const a3 = this.foldMean(sb - 1), d3 = this.foldMean(sb + 1), e3 = a3 - 2 * sx + d3; this.bestPhO = (sb + 0.5 + (e3 < 0 ? 0.5 * (a3 - d3) / e3 : 0)) / ONSET_BINS; } else this.bestPhO = NaN;
         const dd = Math.abs(sb - mb), dk = dd < ONSET_BINS - dd ? dd : ONSET_BINS - dd;
         if (dk <= PH_W && sx > 0) { const a2 = this.foldMean(sb - 1), d2 = this.foldMean(sb + 1), de = a2 - 2 * sx + d2; let l = (sb + 0.5 + (de < 0 ? 0.5 * (a2 - d2) / de : 0)) / ONSET_BINS - this.bestPh; l -= Math.round(l); this.bestLag = l; }
         else this.bestLag = NaN;
@@ -169,6 +171,8 @@ export class BeatFeed {
     if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
     let err = this.bestPh + this.phLag / nb - shift; err -= Math.round(err);
     beat.anchorMs += err * nb;
+    if (this.bestPhO === this.bestPhO) { let so = (shift + this.bD) % 1; if (so < 0) so += 1; let eo = this.bestPhO - so; eo -= Math.round(eo);
+      const d = this.bD + eo - err; if (d <= BD_MAX && d >= -BD_MAX) this.bD = d; }
     this.onsetFixes++;
   }
 
@@ -419,9 +423,9 @@ export class BeatFeed {
     const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
     const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
     if (!(beat.bpm > 40)) return;
-    const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
+    const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per - this.bD, idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
-      if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per);
+      if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + (this.barIdx + this.bD) * per, per);
       this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0;
     }
     if (pos - idx <= BAR_WIN1) {
@@ -518,7 +522,7 @@ export class BeatFeed {
     if (now - this.lastTrustLog > 4000) { this.lastTrustLog = now; if (isLogOn()) console.log(`[tillit] mönster ${this.repeatRate.toFixed(2)} · fasträff ${this.onBeatRate.toFixed(2)} · bpm ${cfg.beat ? cfg.beat.bpm.toFixed(1) : 0}`); }
     const pllConf = this.pllKicks >= 12 ? this.onBeatRate : 0;
     if (quietMs > 10000) {
-      if (cfg.beat || this.onN > 0) { this.barReset(); cfg.beat = null; cfg.beatErr = 0; this.onN = 0; this.scanC = 99; this.tgReset(); }
+      if (cfg.beat || this.onN > 0) { this.barReset(); this.bD = 0; cfg.beat = null; cfg.beatErr = 0; this.onN = 0; this.scanC = 99; this.tgReset(); }
       return;
     }
     const beat0 = cfg.beat;
@@ -559,6 +563,7 @@ export class BeatFeed {
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
+      if (!cfg.beat && this.tempoBpm > 0) this.bD = 0;
       if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
       this.onsetStep(cfg, now);
     }
```
