# a1 (kortet TIDEN): ettan räknas i musikens slag, inte i rutnätets index

## IDÉN
Rutnätets inre ankare hoppar ofta ett halvt slag (av- och påslag) och glider så **hela slag** mot musiken. Taktmodellen förde
bok per rutnätsindex % 4, så varje glidning vred ettan ett slag och minnet (~25 takter) tog 30-60 s att lära om. Det är förskjutningarna
1 och 3 i basen. Nu summerar barStep ankarets hopp, J = summan av (Δpos − Δt/per), och bokför varje slag på platsen (index − round(J)) % 4.
Ettan väljs i den ramen (barM) och läggs ut som barOff = (barM + round(J)) % 4, så den publicerade ettan följer musiken genom glidningen.
Fönstret och vikterna är orörda. Profilen över slaget visar att anslaget (basstigning, basnot, diskant) ligger inom ±0,05 slag från
det inre slaget och att BAR_WIN0..1 = −0,2..0,3 redan täcker det. Smalare eller förskjutna fönster gav sämre resultat offline.
Felet låg i VILKET slag mätningen bokfördes på, inte i fönstret.

## DELARNA
| del | vad den gör | mått |
|---|---|---|
| D1 hoppsumman barJ/barPos/barAt (barStep) | summerar ankarets hopp i slag sedan barReset | (krävs av D2/D3) |
| D2 plats = (barIdx − jr) % 4 (barCommit(jr)) | bokför slaget i musikens ram | tillsammans med D3: etta 33,5 → 66,3, omval 1,41 → 0,60 (m1) |
| D3 barOff = (barM + jr) % 4 per hop | den publicerade ettan följer glidningen direkt | se D2; D2 utan D3 (eller tvärtom) är fel |
| (förkastad) grind \|J − jr\| ≤ 0,25 | mät inte när rutnätet ligger ett halvt slag fel | m2: etta 58,3, omval 0,80 (sämre, borttagen) |

## DIFFEN
(CR tagna bort för läsbarhet; filen har blandade radslut. Sanningen ligger i a1/src/analyserClock.ts.)
```diff
diff --git a/src/analyserClock.ts b/.arena/etta/a1/src/analyserClock.ts
index 384c61c..5b68f1d 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta/a1/src/analyserClock.ts
@@ -85,6 +85,7 @@ export class BeatFeed {
   private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
   private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);   // ETTAN (a5)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
+  private barM = 0; private barJ = 0; private barPos = NaN; private barAt = 0;   // ettan räknas i musikens slag
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -386,16 +387,18 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; this.barM = 0; this.barJ = 0; this.barPos = NaN; }
 
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
+      if (idx === this.barIdx + 1) this.barCommit(jr);
       this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
     }
     if (pos - idx <= BAR_WIN1) {
@@ -403,11 +406,12 @@ export class BeatFeed {
       if (rl > this.bL) this.bL = rl;
       const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
     }
+    this.barOff = (((this.barM + jr) % 4) + 4) % 4;
   }
 
   /** Slaget barIdx är färdigmätt. */
-  private barCommit(): void {
-    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
+  private barCommit(jr: number): void {
+    const K = this.barK, L = this.barL, B = this.barB, slot = (((this.barIdx - jr) % 4) + 4) % 4;
     for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
     if (this.barN < 1000) this.barN++;
@@ -419,7 +423,7 @@ export class BeatFeed {
       const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
+    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
```

## SIFFRORNA (m1 = slutkoden, ettdom.json = kopia av ettdom-m1.json; m2-koden är borttagen)
| fil | etta bas → a1 | omval bas → a1 | paslag bas → a1 | förskj a1 [0,1,2,3] |
|---|---|---|---|---|
| 151659 | 42,5 → 80,0 | 1,28 → 0,35 | 78,0 → 77,4 | 80,0 / 15,7 / 3,0 / 1,4 |
| 172432 | 32,0 → 39,3 | 1,51 → 0,94 | 51,2 → 50,6 | 39,3 / 29,5 / 11,5 / 19,7 |
| 160345 | 25,9 → 79,5 | 1,44 → 0,51 | 81,8 → 80,7 | 79,5 / 0,4 / 1,9 / 18,2 |
| medel | 33,46 → 66,29 | 1,411 → 0,600 | 70,36 → 69,56 | |

Poäng = 32,83 + 5 × 0,81 = **36,9**. Sämre: paslag −0,6 till −1,1 per fil (inom spärren). Det kommer av att relock flyttar det inre
ankaret med en annan barOff. Mixen 172432 är svag kvar. Sonden visar två felsorter där: (a) långa stycken där ramen är rätt men
särdragen väljer fel plats (150-240 s; det är vikterna och särdragen, inte tiden), (b) J:s bråkdel ligger nära ±0,5. Rutnätet står
då nästan halvvägs, och avrundningen kan vrida fel.

## RISKEN
- Live-mic och breaks: står rutnätet på av-slaget länge (J ≈ k + 0,5) är ramens heltal en slantsingling. Hysteres och läckage av
  bråkdelen provades offline och var båda sämre.
- Tempobyte inom låten med ett avlägset ankare ger stora pos-hopp. De räknas in i J, vilket är rätt så länge tempot är samma oktav.
  Vid ett oktavbyte betyder platserna inget, som förut.
- Låtbyten: barReset nollar J. Inget nytt minne och ingen allokering per hop, bara fyra tal.
- Musik utan trumma: oförändrat mot bas, eftersom särdragen och vikterna är desamma.
