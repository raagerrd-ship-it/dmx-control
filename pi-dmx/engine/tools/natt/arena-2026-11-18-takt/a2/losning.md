# a2 FASVAKTEN (PLL) - lösning

**Idén.** Rutnätet hoppar inte längre till vikningens högsta topp var 250 ms. Det följer i stället toppen *nära sin egen fas* (±5 av 48 fack, ±0,1 slag) med en förstärkning som växer med toppens tydlighet. En topp långt bort tas bara om den är 1,3 gånger starkare i 8 sökningar i följd (~2,2 s). Analysen av basens json visade att glidningen inte var glidning: 5 s-vikningen hade två nästan lika toppar (t.ex. 160345 230-255 s: +43 och +177 ms, 3,2 mot 3,1 x medel) och klockan studsade mellan dem. En PLL med smalt fångstområde sitter kvar på den topp den har.

**Delarna** (allt i `onsetStep`/`relock` i analyserClock.ts, i workerns taktväg)

| del | vad den gör | mått (m1 mot bas) |
|---|---|---|
| D1 lokal fasdetektor | fasfelet = parabeltopp i vikningen inom ±PH_CAP fack runt rutnätets fas (`foldB` = bästa tempots vikning) | glider 14,2 -> 7,0 |
| D2 tillitsstyrd förstärkning | k = (topp/medel - 1,5) x 0,25, högst 0,7 per sökning: svagt anslag ger liten rättning, tydligt nästan hel | stökigt 2,6 -> 1,7 |
| D3 fjärrtopp med uthållighet | en topp utanför fånget tas helt först efter PH_N = 8 sökningar på samma ställe och >= PH_HOLD 1,3 x den lokala | motslag 6,3 -> 5,3, dubbelt 10,0 -> 2,0 (200719) |
| D4 infångning | hel snäppning som förr vid kallstart, låtgräns och tempohopp > 3 % (PH_JUMP; 1,25 % gav fasryck av 0,5 %-sökningens tempoflaxande, sond 160345) | fel tempo 6,8 -> 5,8 |

**Kostnaden.** Bara i workern: kopia av 48 fack när en tempokandidat blir bäst plus 11 jämförelser per sökning (var 250 ms), ingen ny FFT. Huvudtråden rörs inte. Nytt minne: en Float64Array(48) = 384 B. Ingen allokering per hopp.

**Siffrorna** (m1, `taktdom.json` = `taktdom-m1.json`): FEL 29,9 -> **19,9 (poäng +10,0)**. 151659 32,7 -> 20,4; 160345 33,9 -> 18,2; 200719 23,0 -> 21,0. Oktav 10,4 -> 8,5. Lead: -53/-60/-67 (bas -53/-60/-60, inom 10 ms).
**Sämre: ettan** 85,7 -> 81,1 = **DISK** (gränsen är 82,7). 151659 98,2 (lika), 160345 89,0 (90,4), **200719 56,1 (68,9)**. Felet på 200719 sitter i taktmodellen, inte i fasen: från 300 till 410 s ligger ticken rätt men ettan sitter 2 slag fel. Det börjar i övergången 88 -> 94 bpm vid 291-298 s, där klockan gick på halvt tempo (Beat This 176). Där är det slumpen som avgör om ettan hamnar på 1 eller 3. Taktmodellen kan inte skilja 1 från 3 (backbeaten skiljer bara 1/3 från 2/4). Sedan drar ett gammalt minne (BAR_DECAY 0,99) tillbaka till fel etta vid 460 s.
Två prov som inte höll (de finns inte i diffen): (a) barReset vid tempohopp: 200719 gav 54,6. (b) läcka barJ:s bråkdel mot heltal 5 % per slag (m2 = `verktyg/taktdom-m2-jlackage.json`): ingen skillnad i takten, ettan 80,5, 151659 föll till 92,8. Bägge förkastade. Src är m1:s logik. Bänken är deterministisk, så m1:s siffror gäller för koden.

**Risken.** Ett fel lås hålls kvar längre: en verklig fasändring utan tempohopp eller låtgräns tar ~2,2 s i stället för 0,25 s. Musik där basen ligger på offbeat i långa stycken (151659 445-470 s) leder fortfarande till motslag, bara 2 s senare. Musik utan trumma: förstärkningen går mot 0 när toppen är svag, så rutnätet rullar på sitt tempo (bra i breaks). Vid låtbyten kommer infångningen genom låtgränsen och tempohoppet. Ettan är den svaga punkten. En joker bör ta D1-D4 och koppla taktmodellen till stabilare ettlogik (till exempel en annan deltagares).

**Diffen** (`git diff --no-index src .arena/takt/a2/src`, finns också som `diff.patch`):

```diff
diff --git a/src/analyserClock.ts b/.arena/takt/a2/src/analyserClock.ts
index 0bbcb78..281f75e 100644
--- a/src/analyserClock.ts
+++ b/.arena/takt/a2/src/analyserClock.ts
@@ -41,6 +41,7 @@ const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5,
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
+const PH_CAP = 5, PH_HOLD = 1.3, PH_N = 8, PH_KS = 0.25, PH_KMAX = 0.7, PH_JUMP = 0.03;   // FASVAKTEN (a2 takt)
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -101,6 +102,7 @@ export class BeatFeed {
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
   private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0;
+  private readonly foldB = new Float64Array(ONSET_BINS); private bestMean = 0; private bestPk = 0; private phAcq = true; private phFar = 0; private phFarE = 0;   // FASVAKTEN
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -135,16 +137,28 @@ export class BeatFeed {
         const a = this.foldMean(mb - 1), cc = this.foldMean(mb), d = this.foldMean(mb + 1), den = a - 2 * cc + d;
         const off = den < 0 ? 0.5 * (a - d) / den : 0;
         this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
+        this.bestMean = mean; this.bestPk = mx; for (let b = 0; b < ONSET_BINS; b++) this.foldB[b] = this.foldN[b] ? this.foldS[b] / this.foldN[b] : 0;
       }
     }
     if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
     if (this.tempoBpm > 0) this.bestBpm = Math.min(159.9, Math.max(80, this.bestBpm));
     if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanFar = this.bestBpm; return; }
     const oldMs = 60000 / beat.bpm, idx = Math.floor((now - beat.anchorMs) / oldMs), fr = (now - beat.anchorMs) / oldMs - idx;
-    const nb = 60000 / this.bestBpm;
+    const nb = 60000 / this.bestBpm, jump = Math.abs(this.bestBpm / beat.bpm - 1) > PH_JUMP;
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
     let err = this.bestPh - shift; err -= Math.round(err);
+    if (this.phAcq || jump) { this.phAcq = false; this.phFar = 0; }
+    else {
+      const F = this.foldB, c0 = Math.floor(shift * ONSET_BINS); let lb = c0, lv = -1;
+      for (let d = -PH_CAP; d <= PH_CAP; d++) { const q = (c0 + d + ONSET_BINS) % ONSET_BINS; if (F[q] > lv) { lv = F[q]; lb = c0 + d; } }
+      const a = F[(lb - 1 + ONSET_BINS) % ONSET_BINS], cc = F[(lb + ONSET_BINS) % ONSET_BINS], d2 = F[(lb + 1 + ONSET_BINS) % ONSET_BINS], den = a - 2 * cc + d2;
+      let le = (lb + 0.5 + (den < 0 ? 0.5 * (a - d2) / den : 0)) / ONSET_BINS - shift; le -= Math.round(le);
+      const far = Math.abs(err) * ONSET_BINS > PH_CAP + 0.5 && this.bestPk >= lv * PH_HOLD;
+      if (far) { this.phFar = this.phFar > 0 && Math.abs(err - this.phFarE) * ONSET_BINS <= PH_CAP ? this.phFar + 1 : 1; this.phFarE = err; } else this.phFar = 0;
+      if (far && this.phFar >= PH_N) this.phFar = 0;
+      else { const k = (lv / this.bestMean - ONSET_MIN_PEAK) * PH_KS; err = le * (k > PH_KMAX ? PH_KMAX : k > 0 ? k : 0); }
+    }
     beat.anchorMs += err * nb;
     this.onsetFixes++;
   }
@@ -450,7 +464,7 @@ export class BeatFeed {
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0; this.phAcq = true;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -529,7 +543,7 @@ export class BeatFeed {
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
-      if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
+      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.phAcq = true; }
       this.onsetStep(cfg, now);
     }
     if (cfg.beat) this.barStep(frame, cfg.beat, now);
```
