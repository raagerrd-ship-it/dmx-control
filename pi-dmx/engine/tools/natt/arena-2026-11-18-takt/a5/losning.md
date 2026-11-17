# a5 ÅTERLÅSNINGEN - lösning

## Idén
Klockan rättade förut fasen fullt mot 5 s-vikningens topp var 250:e ms, så ett kort fel toppläge (offbeat-bas, hihat, uppbyggnad)
flyttade den direkt till motslaget eller en tredjedel bredvid. Nu har den ett trött lås: ett fasminne (anslagen vikta mot klockan, tau 10 s)
röstar, och ett hopp på 0,12 slag eller mer tas bara om minnet håller med. Efter en låtgräns, ett nytt slag eller ett tempohopp över 4 %
nollas minnet och i 8 s får alla hopp passera, så klockan låser om lika snabbt som förr.

## Delarna
| del | vad den gör | mått (m2 mot bas) |
|---|---|---|
| A trött lås (`lmAt`/`lmAdd`/`lmTurn`, villkoret i `onsetStep`) | hopp med \|err\| >= JUMP_FRAC 0,12 tas bara om lm(err)·1,2 >= lm(0); minnet vrids med klockan när ett hopp tas | glider 14,2 -> 7,0, motslag 6,3 -> 5,6 |
| B återlåsning (`freshTo`, 8 s) | efter `relock`, nytt `cfg.beat` eller tempohopp > 4 %: minnet nollas och inget veto | håller gränsfönstren som förr (fel tempo 6,8 -> 7,4, inom bruset) |

Del A utan B går inte: utan nollning håller minnet förra låtens fas. Prövat och bortvalt: kickröst (kickarna sitter ofta på offbeat-basen,
200719 FEL 31), bara tidsspärr 6 s (200719 FEL 23 = bas), kort vikningsfönster 3 s under färskperioden (200719 FEL 17 men etta 58,7, m1 DISK på etta 82,0).

## Kostnaden
Allt ligger i klockan och körs i slow-workern (BEAT_FEED=slow). Per andra hopp en Math.exp och 48 multiplikationer, per skanning (~4/s)
två läsningar på 5 fack och ibland en vridning (48 kopior). Huvudtråden: inget. Nytt minne: 2 × 48 float64 = 0,8 kB. Ingen allokering per hopp.

## Diffen
```diff
diff --git a/src/analyserClock.ts b/.arena/takt/a5/src/analyserClock.ts
index 0bbcb78..710fdcd 100644
--- a/src/analyserClock.ts
+++ b/.arena/takt/a5/src/analyserClock.ts
@@ -41,6 +41,8 @@ const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5,
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
+const FRESH_MS = 8000, FRESH_TEMPO = 0.04;   // a5 ÅTERLÅSNINGEN
+const JUMP_FRAC = 0.12, LM_BINS = 48, LM_TAU_MS = 10000, LM_K = 1.2;   // a5 DET TRÖTTA LÅSET
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -101,6 +103,8 @@ export class BeatFeed {
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
   private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0;
+  private freshTo = 0; jumpVetos = 0;   // a5
+  private readonly lm = new Float64Array(LM_BINS); private readonly lmTmp = new Float64Array(LM_BINS); private lmT = 0;   // a5 fasminnet
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -110,6 +114,7 @@ export class BeatFeed {
       this.onNext = now + ONSET_EVERY_MS;
       this.scanRef = beat.anchorMs; this.scanNow = now;
       const cb = this.scanFar > 0 ? this.scanFar : beat.bpm; this.scanFar = 0;
+      if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > FRESH_TEMPO) this.freshTo = now + FRESH_MS;
       if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }
       else if (this.tempoBpm > 0) { this.scanC0 = cb; this.scanStep = 0.005; this.scanEnd = 5; }
       else { this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanEnd = 5; }
@@ -145,10 +150,30 @@ export class BeatFeed {
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
     let err = this.bestPh - shift; err -= Math.round(err);
-    beat.anchorMs += err * nb;
+    const big = err >= JUMP_FRAC || err <= -JUMP_FRAC;
+    if (!big || now < this.freshTo || this.lmAt(err) * LM_K >= this.lmAt(0)) { beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
     this.onsetFixes++;
   }
 
+  /** a5 DET TRÖTTA LÅSET: fasminnet (anslagen vikta mot klockan över ~LM_TAU_MS) röstar mellan nuvarande fas och hoppet. */
+  private lmAt(ph: number): number {
+    const c = Math.round(ph * LM_BINS); let v = 0;
+    for (let d = -2; d <= 2; d++) { const x = this.lm[(((c + d) % LM_BINS) + LM_BINS) % LM_BINS]; if (x > v) v = x; }
+    return v;
+  }
+  /** Klockan hoppade err slag: minnet följer med. */
+  private lmTurn(err: number): void {
+    const r = Math.round(err * LM_BINS), L = this.lm, T = this.lmTmp; T.set(L);
+    for (let b = 0; b < LM_BINS; b++) L[b] = T[(((b + r) % LM_BINS) + LM_BINS) % LM_BINS];
+  }
+  /** Ett anslag in i fasminnet. */
+  private lmAdd(now: number, b: { anchorMs: number; bpm: number }, v: number): void {
+    const per = 60000 / b.bpm; let p = (now - b.anchorMs) / per; p -= Math.floor(p);
+    const dec = this.lmT > 0 && now > this.lmT ? Math.exp(-(now - this.lmT) / LM_TAU_MS) : 1; this.lmT = now;
+    const L = this.lm; for (let i = 0; i < LM_BINS; i++) L[i] *= dec;
+    L[Math.floor(p * LM_BINS) % LM_BINS] += v;
+  }
+
   /** EN TEMPOSÖKNING. */
   private tgScore(bpm: number, now: number, win = TG_WIN_MS): number {
     const S = this.fullS, N = this.fullN, Hs = this.tgH, oT = this.onT, oV = this.onV, oH = this.hiV; S.fill(0); N.fill(0); Hs.fill(0);
@@ -449,8 +474,8 @@ export class BeatFeed {
   }
 
   /** LÅTGRÄNSEN. */
-  private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+  private relock(soft: boolean, now: number): void {
+    this.freshTo = now + FRESH_MS; this.lm.fill(0); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -467,8 +492,8 @@ export class BeatFeed {
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
@@ -525,11 +550,11 @@ export class BeatFeed {
       const old = this.riseDb[this.risePos]; this.riseDb[this.risePos] = db; this.risePos = (this.risePos + 1) % FEED_RISE_HOPS;
       const ok = old !== 0 && db > old ? db - old : 0;
       const hi = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0);
-      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
+      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; if (cfg.beat && cfg.beat.bpm > 0) this.lmAdd(now, cfg.beat, this.onV[this.onPos]); this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
-      if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
+      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.freshTo = now + FRESH_MS; this.lm.fill(0); }
       this.onsetStep(cfg, now);
     }
     if (cfg.beat) this.barStep(frame, cfg.beat, now);
```

## Siffrorna (m2, övningen)
| fil | FEL bas -> a5 | lead | etta bas -> a5 |
|---|---|---|---|
| 151659 | 32,7 -> 22,4 | -53 (-53) | 97,8 -> 98,3 |
| 160345 | 33,9 -> 23,2 | -60 (-60) | 90,4 -> 93,3 |
| 200719 | 23,0 -> 22,0 | -67 (-60) | 68,9 -> 67,0 |
| medel | 29,9 -> 22,6 (**+7,3**) | | 85,7 -> 86,2 |

Sämre: fel tempo 6,8 -> 7,4, oktav 10,4 -> 11,1 (spärr 13,4). På 200719 blev etta 1,9 sämre och leaden flyttades 7 ms (spärren ligger på 10),
så ett lead-fel kan dyka upp på okänd musik. Ettan är kaotisk: små fasskillnader direkt efter en gräns ger en annan stapelplats i minuter.

## Risken
- Låtbyte som gränsdetektorn missar eller hittar sent (8-10 s): minnet håller gamla låtens fas tills de nya anslagen tagit över, några sekunder.
- Breaks: minnet klingar av men behåller förhållandet, så fasen hålls genom breaket. Det är meningen, men ett break med egen fas släpper sent.
- Live-mic och musik utan trumma: svag vikning ger ett otydligt minne, och då beter sig klockan ungefär som basen.
- Ligger klockan redan på motslaget när färskperioden tar slut håller låset fel lika hårt. Minnet följer anslagen, inte facit, så det
  släpper först när vikningen visat det rätta läget en stund.
