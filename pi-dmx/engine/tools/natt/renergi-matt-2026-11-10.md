# r energi föll 11-08 → 11-10: ljuset eller måttet? (granskning 2026-11-10)

Fråga: nattrapporten 11-10 säger att "r energi" föll från e03663c (11-08, raden live-labfx) till f01fed9-koden (live). Siffrorna: korpus 0,16 → −0,40 (från 15 s −0,06), pop 0,41 → 0,23, megamix 0,16 → −0,04.
Svar i korthet: **ljuset har ändrats på riktigt, men måttet överdriver det och pekar fel.** På mixarna följer ljuset ljudet självt (rå RMS ur WAV:en) ungefär lika bra som förut. Det som föll där är ljusets koppling till `frame.intensity`. Den serien är bit-identisk mellan koderna, men den är en relativ sektionssignal och inte ljudets energi. Korpusens −0,40 är nästan helt motorstarten: startlooken `wave` lyser dubbelt så starkt de första 20 s av varje 40 s-klipp. Från 22 s följer ljuset ljudet *bättre* än förr.

Läsande granskning. Inget i src/ eller tools/natt.py är ändrat. Bänk: 4 körningar genom `.arena/.banklas` (`.arena/rmatt/kor.py`), analys `.arena/rmatt/analys.py`, traces i `.arena/rmatt/trace/`.

## 1. Hur "r energi" räknas (kedjan)

`tools/natt.py` → `run_one()` → `node tools/showTight.mjs <wav> --tyst [--norm -17]` → JSON-raden `tajt.energiR`.

I `tools/showTight.mjs`:
- **Ljuset** `LIT` (rad 164–177) räknas per renderruta, var 10:e hopp, alltså **26,7 ms** (`STEP_MS` 25 är nominellt). Det är medel över de 4 lamporna av `max(R,G,B)/255 × dim/255`, direkt ur motorns `eng.universe` (DMX-utgången efter output.ts). Det är medelljuset över riggen, inte ljuset per lampa.
- **Energin** `INT` = `fr.intensity` (rad 190). Det är analysatorns SEKTIONSENERGI ur `intensityStep()` i analyser.ts: lvlSmooth-EMA (upp 1,5 s / ned 3 s) mot ett golv med 150 s referens, skalad med en glidande spridning ×4 och klämd till 0..1. 0,5 = låtens snitt. Det är **inte** ljudets energi.
- `energiR = pear(envel(LIT,1), envel(INT,1))` (rad 309): Pearson på 1 s-blockmedel (40 rutor ≈ 1,07 s) **utan fördröjning**, över hela filen. `energiR15` = samma från 15 s. `nivaR` = mot `fr.level` (lvlSmooth).
- Korpusen: median över 222 klipp à 40 s, `--norm -17`. Mixarna: hela filen (600 s).
- Mätverktygen är oförändrade mellan e03663c och f01fed9: `git diff e03663c f01fed9 -- tools/natt.py tools/showTight.mjs` är tom (bara ladan.py fick `--karnor`).

## 2. Har någon indataserie bytt betydelse? Nej, ingen av dem

Samma fil i båda koderna, ruta för ruta (e03663c körd med `DMX_LABFX=1` = nattens jämförelserad live-labfx, eftersom ae16640 gjorde favoriterna till standard):

| fil | T | INT (frame.intensity) | LVL (frame.level) | LIT (ljuset) | LIT-medel |
|---|---|---|---|---|---|
| pop | identisk | **maxdiff 0,0** | **maxdiff 0,0** | r 0,56 mellan koderna | 0,313 → 0,374 |
| megamix | identisk | **0,0** | **0,0** | r 0,59 | 0,324 → 0,365 |
| lang1021 | identisk | **0,0** | **0,0** | r 0,63 | 0,210 → 0,341 |

Reproduktion: e03663c+labfx gav pop 0,406 och megamix 0,157, vilket är exakt nattens förr-tal. f01fed9 gav 0,226 och −0,038, exakt nattens nu-tal.
Mätfällorna jag letade efter finns alltså inte här. Ingen serie är fördröjd av workern (4bd8666), ingen är nollad i tystnad (frame.silent 8f89cf1) och ingen är normaliserad om (EN TEMPO, EN KLOCKA). `intensityStep()` bytte bara villkor från `rms >= noiseFloor*1.5` till `hGated`, som är samma jämförelse. **Bara ljuset ändrades.**

## 3. Oberoende mått: ljuset mot rå RMS ur WAV:en

Ljudet räknas som RMS per renderruta direkt ur PCM. Filen läses efter 44-byteshuvudet till filens slut (mätfällan 0365872: pop/megamix har datastorlek 0). Båda serierna glättas med 1 s glidande medel. Lag-svepet går över 0–500 ms (ljuset förskjuts efter ljudet). r anges mot dB och mot linjär RMS.

| fil | energiR (natt) | r ljus–ljud dB, lag 0 | bästa r dB (lag) | r linjär, bästa (lag) | r dB 4 s-block | ljus per ljudkvartil (tystast → starkast) |
|---|---|---|---|---|---|---|
| pop | 0,40 → **0,22** | 0,38 → 0,35 | 0,38 (0) → 0,36 (133 ms) | 0,48 (27) → **0,37** (80) | 0,43 → 0,39 | 0,23 0,24 0,34 0,44 → 0,31 0,34 0,42 0,43 |
| megamix | 0,16 → **−0,03** | 0,31 → **0,38** | 0,31 (27) → 0,38 (27) | 0,33 (27) → **0,44** (53) | 0,36 → 0,43 | 0,25 0,33 0,35 0,37 → 0,26 0,36 0,39 0,45 |
| lang1021 | 0,61 → **0,45** | 0,45 → 0,47 | 0,45 (0) → 0,47 (27) | 0,60 (0) → **0,52** (53) | 0,44 → 0,50 | 0,13 0,14 0,21 0,36 → 0,24 0,27 0,41 0,44 |
| korpus (28 klipp, var 8:e i frozen6, `--norm -17`; 2 filer saknas på disk; e03663c med DMX_LABFX=1) | 0,15 → **−0,44** (från 15 s 0,10 → −0,15) | 0,28 → **0,06** | 0,28 → 0,07 (lag 0) | 0,34 → 0,15 | 0,34 → −0,09 | – |
| korpus **från 22 s** (efter första lookbytet) | 0,12 → 0,13 | 0,26 → **0,37** | | | | |

Per klipp (från 15 s, mot dB): 14 av 28 är sämre med mer än 0,1, och 6 är bättre.
Korpusens ljus per 5 s, median över klippen:

| s | 0–5 | 5–10 | 10–15 | 15–20 | 20–25 | 25–30 | 30–35 | 35–40 |
|---|---|---|---|---|---|---|---|---|
| e03663c | 0,180 | 0,178 | 0,164 | 0,165 | 0,156 | 0,178 | 0,201 | 0,199 |
| f01fed9 | **0,366** | **0,317** | **0,295** | **0,316** | 0,158 | 0,194 | 0,198 | 0,192 |
| intensity (båda) | 0,17 | 0,31 | 0,36 | 0,39 | 0,43 | 0,47 | 0,50 | 0,52 |

Alla 28 klipp startar i looken `wave`, och första bytet ('sektion') sker vid 20,2 s i båda koderna.

Bästa lag ligger på 0–133 ms i båda koderna. Lag-svepet förklarar alltså ingenting, och ljusvägen har inte blivit långsammare.

## 4. Vad som faktiskt hände med ljuset

**Lugna och mellanstarka partier är ljusare, och toppen är oförändrad.** Ljus per intensity-fack (1 s-block):

| fil | intensity < 0,3 | 0,3–0,6 | 0,6–0,95 | ≥ 0,95 (taket) |
|---|---|---|---|---|
| pop | 0,155 → 0,247 | 0,287 → **0,386** | 0,404 → 0,384 | 0,399 → 0,403 |
| megamix | 0,250 → 0,306 | 0,333 → **0,405** | 0,315 → 0,339 | 0,368 → 0,339 |
| lang1021 | 0,112 → 0,234 | 0,196 → **0,376** | 0,294 → 0,408 | 0,365 → 0,465 |

- Ljuset blir 1,6–2,1 gånger ljusare i de lugna facken. Det stämmer med **5564abe Lamptrappan bort** (ägaren 11-08: 'Bara effekten får som den vill'). e03663c tvingade 2 av 4 lampor till 0 i `low`/`intro` för icke-sparsamma looks (`fxSparse`, ovillkorligt på i e03663c, rad 2118). Etiketterna low/intro kommer själva ur nivån relativt låten, så trappan kopplade ljuset till just `frame.intensity`. När den togs bort försvann kopplingen. Ljuset följer ljudet på sekundskala lika bra som förut. Den exakta commiten fastställs av den parallella bisekteringen; jag har inte bisekterat.
- **Verklig förlust:** kontrasten mellan tyst och starkt ljud krympte i pop (starkaste/tystaste kvartilen 1,96 → 1,37) och i lang1021 (2,75 → 1,85). I megamix ökade den (1,44 → 1,73). Mot linjär RMS föll pop 0,48 → 0,37 och lang1021 0,60 → 0,52, medan megamix steg 0,33 → 0,44. Mot dB är det ±0,07.
- **Regressionen är alltså liten och valfri.** Ljuset följer fortfarande nivån (r 0,35–0,47 mot dB i alla tre). Det som försvann är den extra mörkläggningen av lugna partier, och den tog ägaren bort med flit. Huruvida lugna partier ska vara mörkare är ägarens beslut, inte ett fel.

## 5. Varför måttet överdriver (och blir negativt)

1. `frame.intensity` är ingen energiserie. Mot rå dB följer den ljudet bara r 0,50 (pop), 0,32 (megamix) och 0,58 (lang1021), medan `frame.level` följer r 0,80–0,89. Den är högpassad mot ett golv med 150 s referens: efter en lång stark sträcka sjunker den mot 0,5 fast ljudet är kvar. Den ligger också i taket 1,00 i 14–17 % av tiden (p90 = 1,00), så starka partier blir lika. energiR mäter alltså hur väl ljuset följer **dirigentens sektionsbegrepp**, inte musikens energi.
2. Måttet var delvis cirkulärt. Lamptrappan släckte i sektioner som härleds ur samma nivå relativt låten, så r mot intensity blev högt delvis av konstruktion. Utan trappan försvinner den delen, fast ljuset mot ljudet står still.
3. **Korpusen mäter motorstarten.** Varje 40 s-klipp är en ny motor. Halva klippet (0–20,2 s) är startlooken `wave`, medan intensity stiger 0,17 → 0,52 under uppvärmningen (mätfälla 44). I e03663c halverade lamptrappan sannolikt `wave` (sektion intro/low, icke-sparsam; mönstret stämmer, men sektionen är inte loggad i trace), och ljuset låg platt på 0,16–0,18. Nu lyser den på alla 4 lampor (0,30–0,37) och faller till 0,16 vid första sektionsbytet. Ljus som sjunker medan intensity stiger ger r −0,44. Fönstret från 15 s rättar inte detta, eftersom 15–20 s fortfarande är startlooken. Från 22 s är energiR 0,12 → 0,13 och r mot ljudet 0,26 → 0,37.

## 6. Slutsats

**Mixarna: mestadels mått, och lite verkligt ljus.** `frame.intensity` och `frame.level` är bit-identiska mellan koderna, och mätverktygen är oförändrade. Fallet i energiR (pop −0,18, megamix −0,19, lang1021 −0,16) kommer av att ljuset ändrades i lugna och mellanstarka partier (+0,06 till +0,18 i ljus) och inte längre trappar med dirigentens sektioner. Mot rå ljud-dB är förändringen pop 0,38 → 0,35, megamix 0,31 → 0,38 och lang1021 0,45 → 0,47. Den verkliga förlusten är **kontrast** i pop (starkast/tystast 1,96 → 1,37) och lang1021 (2,75 → 1,85). Troligast är det lamptrappans borttagning (5564abe, ägarens beslut 11-08). Den slutsatsen bygger på mönstret, inte på bisektering. Det är i så fall ingen bugg.

**Korpusen: verkligt, men bara de första 20 s efter motorstart.** Startlooken `wave` lyser dubbelt (0,17 → 0,32 i snitt 0–20 s), och sedan faller ljuset när första sektionsbytet kommer. Det drar ner r mot ljudet från 0,28 till 0,06. Efter första bytet följer ljuset ljudet bättre än förr (0,26 → 0,37). Live syns det vid motorstart. Om samma sak sker efter låtbyte med paus har jag inte mätt; mixarna (sammanhängande) visar det inte. Vill ägaren ha det mörkare i början är det en fråga om startlooken eller om att låta `wave` välja själv, inte om energilagret.

**Måttfelet:** energiR korrelerar mot fel serie (`frame.intensity` = relativ, högpassad och klämd sektionsenergi; mot ljudet r 0,32–0,58), och korpusens 15 s-fönster tar inte bort startlooken.

## 7. Förslag till rättning (skrivs inte här, huvudchatten väljer)

Rubrikmåttet "r energi" bör vara ljuset mot **ljudet** (rå RMS ur samma PCM som matas in, i dB, 1 s-block), inte mot `frame.intensity`. Det gamla måttet behålls under eget namn (`intensR`) som mått på ljusets koppling till dirigenten. Korpusens rubrik räknas från 1 s efter första lookbytet (startlooken och uppvärmningen bort; 15 s räcker inte, bytet sker vid 20,2 s).

`tools/showTight.mjs` (natt.py läser bara JSON-raden):

```diff
@@ rad ~303 (efter const I15 = ...)
 const I15 = Math.max(0, T.findIndex((t) => t >= startS + 15));
+// LJUDET SJÄLVT (granskning 2026-11-10): RMS i dB per renderruta ur samma PCM som analysatorn får (GAIN + klämning), inte en analysatorserie.
+const RAWDB = T.map((t) => { const i1 = Math.min(nSamples, Math.round(t * SR) + HOP), i0 = Math.max(0, i1 - 10 * HOP); let q = 0;
+  for (let i = i0; i < i1; i++) { let x = d.readInt16LE(44 + i * 2) / 32768 * GAIN; x = x > 1 ? 1 : x < -1 ? -1 : x; q += x * x; }
+  return 10 * Math.log10(Math.max(1e-10, q / Math.max(1, i1 - i0))); });
@@ rad 309
-    energiR: pear(envel(LIT, 1), envel(INT, 1)), nivaR: pear(envel(LIT, 1), envel(LVL, 1)),
+    energiR: pear(envel(LIT, 1), envel(RAWDB, 1)), nivaR: pear(envel(LIT, 1), envel(LVL, 1)),   // ljuset mot LJUDET (rå dB), 1 s-block
+    intensR: pear(envel(LIT, 1), envel(INT, 1)),   // förr "energiR": ljuset mot frame.intensity = dirigentens sektionsenergi (relativ, klämd)
@@ rad 314
-    energiR15: pear(envel(LIT.slice(I15), 1), envel(INT.slice(I15), 1)), nivaR15: pear(envel(LIT.slice(I15), 1), envel(LVL.slice(I15), 1)),
+    energiR15: pear(envel(LIT.slice(I15), 1), envel(RAWDB.slice(I15), 1)), nivaR15: pear(envel(LIT.slice(I15), 1), envel(LVL.slice(I15), 1)),
+    intensR15: pear(envel(LIT.slice(I15), 1), envel(INT.slice(I15), 1)),
+    // EFTER STARTLOOKEN (granskning 11-10): korpusklippen är motorstarter, första lookbytet sker vid ~20 s
+    energiRfx: pear(envel(LIT.slice(IFX), 1), envel(RAWDB.slice(IFX), 1)),
@@ rad 303 (bredvid I15)
+const IFX = Math.max(0, T.findIndex((t) => t >= (WHY.length ? WHY[0].t : startS + 15) + 1));
```

`tools/natt.py`:

```diff
@@ rad 113
-METRIC_TAJT = ['kickLagMs', 'kickTraff', 'kickHojd', 'energiR', 'energiRtopp', 'nivaR', 'energiR15', 'nivaR15', 'litLugn', 'litFart', 'litFull']
+METRIC_TAJT = ['kickLagMs', 'kickTraff', 'kickHojd', 'energiR', 'energiRtopp', 'nivaR', 'energiR15', 'nivaR15', 'energiRfx', 'intensR', 'intensR15', 'litLugn', 'litFart', 'litFull']
@@ rad 199 (korpusraden: rubriken från 15 s, uppvärmningen syns i parentes)
-...  r {f(korpus["median"]["energiR"])} (fran 15 s {f(korpus["median"].get("energiR15"))}, niva {f(korpus["median"].get("nivaR15"))})  ...
+...  r ljud efter startlooken {f(korpus["median"].get("energiRfx"))} (hela {f(korpus["median"]["energiR"])}, fran 15 s {f(korpus["median"].get("energiR15"))}, mot intensity {f(korpus["median"].get("intensR15"))})  ...
@@ rad 272 (scoreboardens korpuskolumn "k r")
-           f'{(out["korpus"] or {}).get("n", "-")} | {f(km.get("kickLagMs"), 0)}/{f(km.get("kickTraff"))} | {f(km.get("energiR"))} | ...
+           f'{(out["korpus"] or {}).get("n", "-")} | {f(km.get("kickLagMs"), 0)}/{f(km.get("kickTraff"))} | {f(km.get("energiRfx"))} | ...
```

`energiRtopp` och `energiRruta` (rad 310–311) får samma byte INT → RAWDB. **Jämförbarhet:** "r energi" i scoreboarden har då en ny betydelse. Raden efter rättningen ska taggas, och e03663c-raden räknas om med samma kod (`--dist .arena/rmatt/e03663c/dist`). Med den nya definitionen blir pop 0,38 → 0,35, megamix 0,31 → 0,38, lang1021 0,45 → 0,47 och korpus efter startlooken 0,26 → 0,37 (avsnitt 3, lag 0). Lag-svepet behövs inte i måttet, eftersom bästa lag är 0–133 ms och vinner högst 0,02.
