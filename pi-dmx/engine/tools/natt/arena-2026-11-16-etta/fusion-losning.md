# JOKERN (fusion) – r0 till runda 2 (lagad efter disken på mellan, m3 gäller)

## LAGNINGEN (m3)
m1 föll på mellan: paslag 77,6 < 80,2 − 2. **Orsak:** ettan byts genom att det publicerade ankaret flyttas hela slag (`cfg.beat.anchorMs += barOff·per`). Effektklockans tick är `beatIdx > lastBeatIdx`. Minskar barOff (till exempel 1 → 0) flyttas ankaret ett slag bakåt i tiden, och då hoppar beatIdx fram. Det ger ett EXTRA tick mitt i slaget, och det tick:et paras inte med något slag. Ökar barOff backar beatIdx och följs tyst (inget extra tick). Glidräkningen byter barOff per hop när J passerar ±0,5, ofta mitt i slaget, och tillsammans med återstarten blir det fler byten. Bevis på övningen: m1 hade 13–73 fler tick per fil än bas och nästan lika många fler opararade tick (160345: +20 tick, +20 opararade). I 151659 är tempot bit-identiskt med bas (cbpm skiljer 0 %), så där kommer skillnaden enbart från tick:en. Relock-skiftet (a6:s ledtråd) är samma som i a1, och a1 höll paslag på mellan.
**Lagningen:** barOff ökar bara. Det nya värdet nås med +1..+3 slag (+3 ≡ −1 mod 4), så ettan byts alltid genom att ankaret flyttas framåt i tiden och aldrig genom ett extra tick. Vid relock flyttas det inre ankaret med `barOff & 3` som förr, och resten (en multipel av 4) står kvar i barOff, så det publicerade ankaret är kontinuerligt. m2 (bytet hölls till slaget, båda riktningarna kvar) räckte inte: paslag 69,72. m3: 70,40 (bas 70,36), färre tick än bas och fler parade per tick.

## IDÉN
Två delar, båda från de deltagare som höll bäst på mellanmängden: a1:s glidräkning (bokför varje slag i musikens numrering, ankarets hopp summerade) och a2:s återstart (kicken kommer tillbaka på ettan) som en fjärde term i basens oförändrade andelsbeslut, med en ny spärr: varje slags återstart får väga högst BAR_R_MAX = 2 gånger låtens kicknivå. Resten är basens kod.

## DELAR
| del | från vem | mått den bär (siffra) | med/struken + skäl |
|---|---|---|---|
| Glidrättning: J = Σ(Δpos − Δt/per) per hop, slot = (idx − round J) % 4, barOff = (barM + round J) % 4 | a1 | mätt ensam (a1 m1): etta 33,5 → 66,3, omval 1,41 → 0,60; mellan 61,9 (bäst av alla) | MED. Den enklaste av fyra glidrättningar och den som höll bäst på osedd musik. Sim: ramens sanna etta konstant i 96/74/81 % av slagen (utan rättning 57/57/68 %) |
| Glidrättning a6 (per färdigmätt slag) | a6 | samma mekanism som a1 i sim (avrundning, utan hysteres) | STRUKEN: dubblett av a1 (en rättning, inte flera) |
| Glidrättning a8 (grind 0,6 + hysteres 0,7) | a8 | sim med basens beslut: 47,2 mot a1:s 66,4 (hysteresen fäller den) | STRUKEN: bär bara ihop med mallarna |
| Glidspåret a4 (bara onsetStep-fixar > 0,15) | a4 | missar ankarflyttar som inte går via onsetStep | STRUKEN: ofullständig |
| Återstart R: max(0, kickmax − max(två förra slagen)) / löpande kicknivå, vikt 1 som K | a2 | ovanpå a1 i sim: 66,4 → 61,1 OKLIPPT; massan på Beat This-ettan 69/59/78 % (K: 29/28/29) | MED, men bara med klippet nedan |
| Klippet BAR_R_MAX = 2 | fusion (nytt) | sim a1+R: 61,1 → 79,8; parameterhärva (decay×marginal×BAR_MIN, 27 kombinationer) 78,8, sämst 77,4 (a1 ensam 65,4, sämst 52,6). Klipp 1/2/4 och vikt 0,5/1 ger alla 77–80 | MED. Enstaka jättevärden efter breaks (p99 ≈ 4, max obegränsat när kicknivån är nära noll) styrde valet fel i 100 slag |
| a2:s BAR_DECAY 0,95 + BAR_MARGIN 0,10 | a2 | sim ovanpå a1+R: 0,97 → 75,5, 0,99 → 79,8 | STRUKEN: kort minne behövs inte när ramen glider rätt; basens 0,99/0,06 är bäst |
| Mallarna (log-likelihood sub/kick/diskant × 8 delar) | a8 | övning 77,9 men mellan 54,9 (störst tapp) | STRUKEN: skattade ur Beat This på övningen, överanpassade |
| HMM-beslutet BAR_P 16 | a6 | övning 73,6, mellan 47,9 | STRUKEN: tappar mest på osedd musik |
| Drop/minidrop som vittne + split.ts | a4 | mellan 47,0 | STRUKEN: svag på mellan, kräver nya fält i taktvägen |
| Bastonen (chroma 40–250 Hz, FFT) + decay 0,97 | a3 | sim ovanpå a1: 66,4 → 66,3–68,5 (inget som bär) | STRUKEN: bär inget ovanpå glidrättningen, kostar FFT i snabba vägen och +393 kB hop-ring |
| Backbeat-bandet / nyhet per slag | a5 / a7 | övning +16,8 / +5,5 | STRUKEN: svagast |
| Ettbytet bara framåt i tiden (barOff ökar 1..3, relock med barOff & 3) | fusion (lagningen) | paslag 69,52 → 70,40 (bas 70,36), etta 78,8 → 79,8; tick per fil 1047/2142/1182 → 1011/2050/1126 (bas 1034/2069/1162) | MED. Tar bort extra tick mitt i slaget vid varje ettbyte |
| Bytet hållet till rutnätets slag (m2) | fusion | paslag 69,72, etta 77,6 | STRUKEN: extra tick kvar, bara flyttade |
| Basens B (diskant talar emot) | bas | sim utan B: 78,6 mot 79,8 | BEHÅLLEN (ingen är bättre) |

split.ts behöver ingen ändring: R byggs av specAbs.sub + specAbs.kick, som redan går i taktvägen (H_SA_SUB, H_SA_KICK) till workern. Ingen allokering per hop (en Float64Array(4) och åtta tal i konstruktorn). ANALYSER_SHARED.md5 är inte omräknad (görs vid inläggning/lotus-porten).

## SIFFRORNA (ettdom m3, ettdom.json = ettdom-m3.json = koden i src; m1 och m2 sparade, tick i kr-m1/ och kr-m2/)
| fil | etta bas → fusion | omval bas → fusion | paslag bas → fusion | förskjutning 0/1/2/3 |
|---|---|---|---|---|
| 151659 | 42,5 → 93,2 | 1,28 → 0,12 | 78,0 → 78,6 | 93/5/1/1 |
| 172432 | 32,0 → 67,5 | 1,51 → 1,20 | 51,2 → 50,7 | 68/14/8/10 |
| 160345 | 25,9 → 78,7 | 1,44 → 1,03 | 81,8 → 81,9 | 79/4/1/17 |
| medel | 33,5 → 79,8 | 1,41 → 0,78 | 70,36 → 70,40 | **poäng +49,50, OK** |

Mätningar: m1 +48,6 (paslag 69,52, DISK på mellan), m2 +47,2 (paslag 69,72), m3 +49,5. Tre av fyra mätningar använda, inga sonder. Det som är sämre än bas: paslag i 172432 −0,5 pe (tempot där skiljer efter första relock, som i a1 och a6). Omval är högre än a1 ensam (0,60).

## RISKERNA
- barOff växer utan tak (ungefär +2 per ettbyte), så beatIdx % 16 (frasläget) ligger inte längre på samma plats som i bas. Frasen var ändå inte förankrad i musiken. Talet är ett heltal gånger per och tål flera tusen byten.
- Relock flyttar det inre ankaret med barOff & 3 som förr. Tempot efter en relock är alltså fortfarande inte bit-identiskt med bas (cbpm skiljer i 42 % av raderna i 172432/160345, lika mycket som i a6). Det fällde inte a1 eller a6 på mellan, men det är inte bevisat ofarligt.
- Glidräkningen litar på att rutnätets hopp är rätt räknade. Ligger rutnätet på offbeat länge (a7:s fynd) står J nära k + 0,5 och avrundningen kan vrida ramen. Simen visar det i 160345 (135–210 s: ramen byter 3 → 2 utan låtgräns, ettan fel tills ramen går tillbaka).
- Återstarten kräver luckor i kicken (breaks, fills, kickpaus). Jämn four-on-the-floor utan luckor ger nästan inga R-bevis, och då avgör basens K/L/B som i a1. En upptakt där kicken kommer in på fyran röstar fel (a2:s 172432), men klippet håller varje sådan röst liten.
- Musik utan trumma: som bas/a1, inga nya bevis.
- Låtbyten: barReset nollar J, R och kicknivån. De första 16 slagen efter en gräns har ingen etta.
- Live-mic: R är normerad mot låtens egen kicknivå och tål gain. Rumsbas som brummar sänker kontrasten.
- Mellanmängden är inte körd på fusionen (bara på deltagarna). Delarna valdes för att de höll där, inte för övningspoängen.

## DIFFEN (git diff --no-index --ignore-cr-at-eol .arena/etta/bas/src .arena/etta/fusion/src)
```diff
diff --git a/.arena/etta/bas/src/analyserClock.ts b/.arena/etta/fusion/src/analyserClock.ts
index 384c61c..2644e1f 100644
--- a/.arena/etta/bas/src/analyserClock.ts
+++ b/.arena/etta/fusion/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -85,6 +85,8 @@ export class BeatFeed {
   private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
   private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);   // ETTAN (a5)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
+  private barM = 0; private barJ = 0; private barPos = NaN; private barAt = 0;   // ettan räknas i musikens slag (a1)
+  private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -386,45 +388,52 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barR.fill(0); this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barOff -= this.barOff & 3; this.barM = 0; this.barJ = 0; this.barPos = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
     const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
     const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
     if (!(beat.bpm > 40)) return;
-    const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
+    const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
+    if (this.barPos === this.barPos) this.barJ += pos - this.barPos - (now - this.barAt) / per;
+    this.barPos = pos; this.barAt = now; const jr = Math.floor(this.barJ + 0.5);
     if (idx !== this.barIdx) {
-      if (idx === this.barIdx + 1) this.barCommit();
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
+      if (idx === this.barIdx + 1) this.barCommit(jr);
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0; this.bE = 0;
     }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
+      if (k > this.bE) this.bE = k;
       if (rl > this.bL) this.bL = rl;
       const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
     }
+    { const d = ((((this.barM + jr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
   }
 
   /** Slaget barIdx är färdigmätt. */
-  private barCommit(): void {
-    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
+  private barCommit(jr: number): void {
+    const K = this.barK, L = this.barL, B = this.barB, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; R[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+    { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
+      if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
+      this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
-    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
+    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3], sR = R[0] + R[1] + R[2] + R[3];
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
+      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
+    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean): void {
-    if (this.innerValid && this.innerBpm > 0) this.innerAnchor += this.barOff * (60000 / this.innerBpm);
+    if (this.innerValid && this.innerBpm > 0) this.innerAnchor += (this.barOff & 3) * (60000 / this.innerBpm);
     this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
```
