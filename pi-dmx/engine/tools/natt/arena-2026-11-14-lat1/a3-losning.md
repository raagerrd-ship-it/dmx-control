# a3 – SNABBARE BESKED: misstanke (klangen) + bekräftelse (pulsen)

## IDÉN
Formvägen säger inte längre en låtgräns ensam: en kort formjämförelse (80 s före mot 3 s efter, 4 s efter skarven) väcker en
MISSTANKE, och gränsen sägs först när klockan SÄKERT står på ett annat tempo än låtens (≥ 4 % ifrån, tillit > 0,5, i 2 s) – annars
dör misstanken efter 10 s. Musikaliskt: en ny låt har ny klang OCH ny puls; break, uppbyggnad, drop och ny sektion byter klang men
behåller pulsen, och klockans felhopp i break har låg tillit.

## DELAR
| del | var | mått |
|---|---|---|
| Formen = bara misstanke (`F_LA` 16→6, `fPend*`→`fSus*`, `F_TMIN` bort) | `formDecide` | **falska** 1→0 (199,85 borta; klockans fel 201–204 borta) |
| Bekräftelsen: säker ny puls i 2 s medan misstanken lever | `boundary()` | **latbyten** 3/4→4/4 (272 hittas; 130 sägs 134,7 i st f 150,6; 406 sägs 418,0) |
| – | – | takt, lastid, utanfor: ingen vinst (se SÄMRE) |

Tystnadsvägen, maxlängden, MIN_SEG, gränssnittet och klockan är orörda.

## MÄTT PÅ VÄGEN (fria prov, skripten i `prov/`)
- Formpoängen skiljer inte skarvar från låtens egna händelser på ladans rena ljud: 8 s-fönstret ger 1,07 / 1,24 / 1,51 vid skarvarna
  130 / 272 / 406 men 1,76 (237 s), 2,07 (210 s) och 2,60 (199 s) inne i låtar. Dagens träffar 400,6 och 150,6 är en nivåsänkning 14 s
  FÖRE skarven och ett glapp i NÄSTA låt som råkar ligga i domarens fönster; MIN_SEG döljer resten.
- Klockans tillit skiljer: efter skarvarna stiger den över 0,6 inom 1–2 s på det nya tempot; vid felhoppen (136–142, 200–204,
  starten) är den 0,02–0,55 och aldrig > 0,5 i 2 s.
- Tidigare besked hjälper inte klockan: gränsen flyttad i steg om 1–2 s ger låstid 1,9–2,9 s (130), 4,2–5,2 (272), 8,6–10,1 (406),
  9,7–16,7 (265) – spridning utan ordning.
- Beskedet kommer 4,7 / 6,7 / 12 s efter skarvarna 130 / 272 / 406 (bas: 20,6 s / aldrig / före skarven).
- `prov/samspel.mjs` kopplar ihop de två fria proven (gränser → klockan → tempot tillbaka): gav bas 93,06 och m1 94,15 exakt.

## MARGINALER (±25 %, `--set` genom samspel.mjs)
| gräns | −25 % | +25 % | låtgränserna | poäng |
|---|---|---|---|---|
| F_LA 6 block | 4 | 8 | 4/4, 0 falska | 94,15 / 94,15 |
| F_THR 1,3 | 0,975 | 1,625 | 4/4, 0 (vid 2,0 tappas båda i 171840) | 94,15 / 94,15 |
| F_SUS_MS 10 s | 7,5 | 12,5 | oförändrat | 94,15 / 94,15 |
| F_NEW 0,04 | 0,03 | 0,05 | oförändrat | 94,15 / 94,15 |
| F_CONF 0,5 | 0,375 | 0,625 | 4/4, 0 (406 sägs 430 vid 0,625: 1 s kvar i fönstret) | **93,04** / 94,15 |
| F_HOLD_MS 2 s | 1,5 | 2,5 | 4/4, 0 | **93,33** / **94,77** |

Låtgränsdomen står i alla. Poängen rör sig ändå ±0,8 när gränsen vid 130 flyttas en halv sekund: klockans omlåsning hamnar annorlunda
mot glappet 145–149 och breaket 213–228 (F_CONF 0,375: utanför 94,13 % = under spärren). Det är klockans lotteri – basens tal vilar
på samma tur (basens gräns 150,64 flyttad några millisekunder: 171840 går från 91,1 till 88,6 %).

## SIFFRORNA
| | poäng | takt | utanför | låstid | låtbyten | falska | 160345 | 171840 |
|---|---|---|---|---|---|---|---|---|
| bas | 93,06 | 92,6 % | 95,2 % | 7,1 | 3/4 | 1 | 93,3 %, 13/9 s, gränser 200 264 401 | 91,1 %, 2/5 s, gräns 151 |
| m1 | 94,15 | 91,9 % | 95,6 % | 7,2 | 4/4 | 0 | 93,5 %, 13/9 s, 264 418 | 88,6 %, 2/5 s, 135 279 |
| m2 = slutkoden (F_TMIN bort) | 94,15 | 91,9 % | 95,6 % | 7,2 | 4/4 | 0 | samma | samma |

m3 inte använd. SÄMRE: takten i 171840 (91,1 → 88,6 %) – omlåsningen vid 134,7 gör klockan skör, den hoppar till 90 (2:3) i glappet
146–153 och motorn säger ett extra drop vid 148; låstiden vid 406 8,6 → 9,1 s. Kostnad 239 us/hopp (x2,3) mätt med 100 % last på
maskinen; koden gör mindre per block än bas och fem jämförelser till per hopp.

## TILL JOKERN
Provad, inte inlagd: `relock()` behåller tempominnena när klockan är säker (`if (!sure) this.tgReset()`). Hoppet 146–153 försvinner
och gränstiden slutar spela roll, men breakhoppet 218–229 kommer fram (samspel 93,97, utanför 94,28 %). Bör paras med en klocka som
håller genom break; i lotus (Sonos-gränser i låtens början) måste den grindas på `boundSure`.

## RISKEN
- Nästa låt inom 4 % av samma tempo och taktmixade DJ-övergångar (långa mixar): ingen gräns utom tystnad/maxlängd.
- 3:2- och 4:3-släktingar viks inte bort (272 är 135 → 91): låser klockan SÄKERT på en släkting mitt i en låt efter en klangändring
  blir det en falsk gräns. Samma om klockan haft fel tempo över halva de senaste 80 s och rättar sig. Inte sett på övningen.
- Tyst intro, tal mellan låtar: gränsen dröjer tills klockan är säker. Tempobyte mitt i en låt med ny klang räknas som låtgräns.
- Misstanken lever 48–75 % av tiden på övningen: en svag grind (stänger bara i en jämn groove). Det är pulsen som bär.

## DIFFEN
`git diff --no-index --binary src .arena/lat1/a3/src` – byte-exakt i `.arena/lat1/a3/a3.patch` (källfilen har blandade radslut; nedan utan CR):

```diff
diff --git a/src/boundaryDetector.ts b/.arena/lat1/a3/src/boundaryDetector.ts
index 04cdb7c..580a3dd 100644
--- a/src/boundaryDetector.ts
+++ b/.arena/lat1/a3/src/boundaryDetector.ts
@@ -22,11 +22,12 @@ const TEMPO_REF_S = 20;   // latens etablerade tempo
 const F_NB = 24, F_BLO = 40, F_BHI = 12000;   // LATENS FORM
 const F_CLO = 250, F_CHI = 5000;   // kromagrammets omfang
 const F_BLK_MS = 500;   // ett sarlagsblock
-const F_LB = 160, F_LA = 16, F_G = 2;   // block: 80 s fore, 8 s efter, 1 s glapp runt skarven
+const F_LB = 160, F_LA = 6, F_G = 2;   // block: 80 s fore, 3 s efter, 1 s glapp runt skarven
 const F_WC = 6, F_WB = 1;   // vikter kroma, tempo
-const F_THR = 1.3;   // MATT (med F_TMIN)
-const F_TMIN = 0.3;   // en falsk grans nollar tempolaset och byter manus, en missad kostar bara...
+const F_THR = 1.3;   // MISSTANKEN: sa stor skillnad mot laten
 const F_RING = 256;
+const F_SUS_MS = 10000;   // sa lange lever misstanken
+const F_NEW = 0.04, F_CONF = 0.5, F_HOLD_MS = 2000;   // BEKRAFTELSEN: klockan saker pa ett annat tempo sa lange
 
 /** Median. */
 function median(a: Float64Array): number {
@@ -85,7 +86,8 @@ export class BoundaryDetector {
   private fLb = new Float32Array(F_RING * F_NB); private fC = new Float32Array(F_RING * 12);
   private fT = new Float64Array(F_RING); private fBpm = new Float64Array(F_RING); private fCount = 0;
   private fLastBpm = 0;
-  private fPendAt = 0; private fPendScore = 0;
+  private fSusAt = 0; private fSusEnd = 0; private fSusScore = 0; private fSusBpm = 0;   // MISSTANKEN
+  private fNewSince = 0; private fNewBpm = 0;   // BEKRAFTELSEN
   private fMa = new Float64Array(F_NB); private fMb = new Float64Array(F_NB); private fCa = new Float64Array(12); private fCb = new Float64Array(12);
   private fMedA = new Float64Array(F_LB); private fMedB = new Float64Array(F_LA);
 
@@ -116,9 +118,8 @@ export class BoundaryDetector {
     this.formDecide();
   }
 
-  /** Skarven provas F_G + F_LA block bakat. */
+  /** Skarven provas F_G + F_LA block bakat: MISSTANKEN. */
   private formDecide(): void {
-    if (this.fPendAt) return;
     const j = this.fCount - 1 - F_G - F_LA, a0 = j - F_G - F_LB, b0 = j + F_G;
     if (a0 < 0 || this.fCount - a0 > F_RING) return;
     const R = F_RING, sAt = this.fT[j % R];
@@ -138,9 +139,13 @@ export class BoundaryDetector {
     dT /= F_NB;
     let dot = 0, na = 0, nb = 0; for (let p = 0; p < 12; p++) { dot += ca[p] * cb[p]; na += ca[p] * ca[p]; nb += cb[p] * cb[p]; }
     const dC = 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
-    const dB = foldBpm(median(this.fMedA), median(this.fMedB));
+    const ref = median(this.fMedA), dB = foldBpm(ref, median(this.fMedB));
     const sc = dT + F_WC * dC + F_WB * dB;
-    if (sc >= F_THR && dT >= F_TMIN) { this.fPendAt = sAt; this.fPendScore = sc; }
+    if (sc >= F_THR && ref > 40) {
+      const now = this.fT[(this.fCount - 1) % R];
+      if (now >= this.fSusEnd || sc > this.fSusScore) { this.fSusAt = sAt; this.fSusScore = sc; this.fSusBpm = ref; }
+      this.fSusEnd = now + F_SUS_MS;
+    }
   }
 
   /** Matas varje hop med ramens niva/tempo. */
@@ -251,9 +256,13 @@ export class BoundaryDetector {
       }
     }
 
+    if (now < this.fSusEnd && o.bpm > 40 && o.bpmConfidence > F_CONF && Math.abs(o.bpm / this.fSusBpm - 1) >= F_NEW) {
+      if (!this.fNewSince || Math.abs(o.bpm / this.fNewBpm - 1) >= F_NEW) { this.fNewSince = now; this.fNewBpm = o.bpm; }
+    } else this.fNewSince = 0;
+
     let why = "";
     let back = 0;
-    if (this.fPendAt) { why = `latform ${this.fPendScore.toFixed(2)}`; back = Math.max(0, now - this.fPendAt); this.fPendAt = 0; }
+    if (this.fNewSince && now - this.fNewSince >= F_HOLD_MS) { why = `latform ${this.fSusScore.toFixed(2)} + puls ${this.fSusBpm.toFixed(0)}>${this.fNewBpm.toFixed(0)}`; back = Math.max(0, now - this.fSusAt); }
     else if (tLive > MAX_SEG_MS) why = "maxlängd";
     if (!why) return false;
 
@@ -271,6 +280,6 @@ export class BoundaryDetector {
   private commit(): void {
     this.boundaryCount++;
     this.playStart = 0;
-    this.resetNovelty(); this.fPendAt = 0; this.loudSince = 0;
+    this.resetNovelty(); this.fSusEnd = 0; this.fNewSince = 0; this.loudSince = 0;
   }
 }
```
