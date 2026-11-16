# a6 – ettan: slagräkning som följer rutnätets glidning + HMM med övergångsstraff

## IDÉN
Rutnätets slagindex glider mot musiken: fasrättningarna (onsetStep, ofta ±0,5 slag) flyttar ankaret så att samma musikaliska slag byter nummer, och dagens hypoteser (`barIdx % 4`) ligger i den glidande numreringen. Det var huvudfelet: i dumpen var sanningen (Beat This-ettan i rutnätets index) bytt 44-182 gånger per fil, men räknat i ett glidkompenserat index var den konstant inom låten (151659: plats 2 i 390 s). Ettan väljs nu i det kompenserade indexet med en Viterbi-lik modell över de fyra platserna (en hypotes kan som mest ligga BAR_P = 16 efter ledaren, och ettan byts först när ledaren byts), så den blir kvar tills bevisen tydligt säger annat, och den publicerade ettan följer automatiskt varje glidning.

## DELARNA
| del | vad den gör | mått (offline-sim på dumpen, 3 övningsfiler; mätt m1 sist) |
|---|---|---|
| D1 GLIDRÄKNAREN (barC, barPT, barPI i barCommit) | summerar (tb - förra tb)/per - (idx - förra idx) för varje färdigmätt slag; slot = (idx + round(barC)) % 4; barOff = (barH - round(barC)) % 4 | bär ETTA: sim bas 34,8 % till 74,2 % med dagens andelsbeslut kvar (omval 1,62 till 0,66) |
| D2 HMM-BESLUTET (barS, BAR_P = 16, BAR_MEAN_A = 0,02) | samma särdrag (basens stigning + 0,5 basgång - 0,5 diskant), varje slag normerat mot löpande medel (50 slag); poäng till slaggets plats, sedan minus ledaren och golv -BAR_P; byte bara när nuvarande inte leder | ovanpå D1: sim 74,2 % till 80,3 %, omval 0,66 till 0,78; UTAN D1 bara 45 % (räcker inte ensam) |
| D3 relock/reset | nollställer poäng, medel och glidräknare (barH = 0 → barOff = 0, publicerad etta fortsätter som förr) | oförändrad logik; prov m2 (inget ankarskifte vid relock, barH = barOff) gav 72,7 % / 0,51, alltså lite sämre → inte med |

Mätt m1 (hela varianten D1+D2+D3): **etta 73,6 % (bas 33,5), omval 0,49/min (bas 1,41), paslag 70,3 (bas 70,4), poäng +44,73.**

## DIFFEN
Bara src/analyserClock.ts. Ingen allokering per hopp (bara skalärer + en Float64Array(4) som ersätter tre). ANALYSER_SHARED.md5 är inte uppdaterad (orkestratorn/lotus-porten).

```diff
diff --git a/src/analyserClock.ts b/.arena/etta/a6/src/analyserClock.ts
index 384c61c..438d868 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta/a6/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_P = 16, BAR_MEAN_A = 0.02, BAR_MIN = 16, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT (a6)
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -83,7 +83,7 @@ export class BeatFeed {
   private pwWn = 0; private pwDt = 0; private pwCand = 0; private pwRun = 0; private pwQuietAt = 0; pwVetos = 0; pwFixes = 0;
   private tgHalfR = 0; octR = 0; private octN = 0; private octHi = false;   // OKTAVKANTEN
   private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
-  private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);   // ETTAN (a5)
+  private readonly barS = new Float64Array(4); private mK = 0; private mL = 0; private mB = 0; private barH = 0; private barC = 0; private barPT = 0; private barPI = NaN;   // ETTAN (a6)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
@@ -386,16 +386,16 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barS.fill(0); this.mK = 0; this.mL = 0; this.mB = 0; this.barH = 0; this.barC = 0; this.barPI = NaN; this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
 
-  /** ETTAN (se BAR_DECAY). */
+  /** ETTAN (se BAR_P). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
     const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
     const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
     if (!(beat.bpm > 40)) return;
     const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
-      if (idx === this.barIdx + 1) this.barCommit();
+      if (idx === this.barIdx + 1) this.barCommit(beat);
       this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
     }
     if (pos - idx <= BAR_WIN1) {
@@ -406,20 +406,19 @@ export class BeatFeed {
   }
 
   /** Slaget barIdx är färdigmätt. */
-  private barCommit(): void {
-    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
-    K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+  private barCommit(beat: NonNullable<EngineConfig["beat"]>): void {
+    const per = 60000 / beat.bpm, tb = beat.anchorMs + this.barIdx * per;
+    if (this.barPI === this.barPI) { const c = this.barC + (tb - this.barPT) / per - (this.barIdx - this.barPI); this.barC = c - 4 * Math.floor(c / 4); }
+    this.barPT = tb; this.barPI = this.barIdx;
+    const o = Math.round(this.barC) % 4, slot = (((this.barIdx + o) % 4) + 4) % 4, S = this.barS, a = this.barN > 0 ? BAR_MEAN_A : 1;
+    this.mK += a * (this.bK - this.mK); this.mL += a * (this.bL - this.mL); this.mB += a * (this.bB - this.mB);
+    S[slot] += (this.mK > 0 ? this.bK / this.mK : 0) + (this.mL > 0 ? BAR_W_BASS * this.bL / this.mL : 0) - (this.mB > 0 ? BAR_W_BACK * this.bB / this.mB : 0);
+    let bi = 0; for (let i = 1; i < 4; i++) if (S[i] > S[bi]) bi = i;
+    const mx = S[bi]; for (let i = 0; i < 4; i++) S[i] = S[i] - mx > -BAR_P ? S[i] - mx : -BAR_P;
     if (this.barN < 1000) this.barN++;
-    if (this.barN < BAR_MIN) return;
-    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
-    if (!(sK > 0)) return;
-    let bi = 0, best = -1e9, second = -1e9;
-    for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
-      if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
-    }
-    if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
+    if (this.barN >= BAR_MIN && S[this.barH] < 0) this.barH = bi;
+    const off = (((this.barH - o) % 4) + 4) % 4;
+    if (off !== this.barOff) { this.barOff = off; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
```

## SIFFRORNA (ettdom, m1 = levererad; ettdom.json = kopia av ettdom-m1.json, ettdom/kr-*.json är m2:s körning)
| fil | etta % | omval /min | paslag % | förskjutning 0/1/2/3 |
|---|---|---|---|---|
| 151659 | 93,5 (bas 42,5) | 0,12 (1,28) | 78,1 (78,0) | 94/0/4/2 |
| 172432 | 60,6 (bas 32,0) | 1,04 (1,51) | 51,5 (51,2) | 61/26/6/7 |
| 160345 | 66,6 (bas 25,9) | 0,31 (1,44) | 81,3 (81,8) | 67/2/6/26 |
Sämre: inget mått sämre än bas. 160345 nådde inte simens 80 %: efter relocken vid 264 s satt ettan på förskjutning 3 till nästa gräns (415 s). Tempot efter en relock är inte bit-identiskt med bas (cbpm skiljer i 45 % av raderna efter första relocken i 160345/172432): relock flyttar inre ankaret med barOff hela slag och onsetStep:s vikning (bm ≠ per) är känslig för det. Det fanns redan i bas; paslag påverkas inte i medel.

## RISKEN
- Glidräknaren tror på rutnätet: när fasen hoppar ett halvt slag fram och tillbaka (offbeat-låsning) avgör avrundningen vid 0,5. Bänken visar att vanlig avrundning är bäst (hysteres 0,6-0,8 var sämre i simen), men på live-mic med mer brus kan halvslagshopp bli fler.
- Musik utan trumma/breaks: z blir brus och poängen glider; golvet -16 gör att ettan inte byts av kort brus men en lång break kan flytta den. Efter en äkta låtgräns krävs 16 slag + bevis innan den nya ettan tas.
- 172432 (många gränser, svag fas, paslag 51 %) är kvar på 61 %: där är rutnätet självt osäkert och glidningarna många.
- Sonder: 3 dumpar (dump.mjs, särdrag per slag med bas-dist) + en fjärde som kraschade (min dumpwrapper skickade inte `beat`). Simulatorn sim.py/sim2.py/sim3.py och ana.py ligger i mappen.
