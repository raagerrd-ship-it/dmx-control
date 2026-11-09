# a3f – finalen: r0 står kvar, och D1 (sektionen läser den klassade dropen) är prövad och förkastad

## Utfall i korthet
Levererad kod = **r0 oförändrad**. `mot-r0.diff` är tom, och `losning.diff` = r0 mot engine/src (e047c6f).
`tvavagar.json` är r0:s mätning, som gäller eftersom koden är byte-identisk.
D1 mättes en gång (mätning 1 av 2) och blev DISK. Mätning 2 användes inte: att mäta om identisk kod hade inte gett något nytt.

## DELAR mot r0
### D1 – sektionen läser detektorns klassade händelser i stället för den råa slam-kandidaten (FÖRKASTAD)
- **Mekanismen:** sista punkten på listan. Sektionens drop-evidens (`dropCand + secBodyRet`) räknades som detektorns händelser,
  alltså full drop + dropSpaced + dropDemoted, i stället för slam-kandidaten.
- **Flyttat/ändrat:** analyser.ts:2899 (`dropCand++` vid kandidatens fyrning bort) och analyser.ts:2906–2911 dropClassify
  (`dropCand++` på varje klassad händelse). Alla läsare var oförändrade: :1142 secDropsNow, :1478 R_DROPS, :1649/:3033 g.drops.
  Diffen och mätningen ligger i `v1-D1/` (D1.diff, tvavagar.json, mat1.log).
- **Siffror (mot r0):**

  | | r0 | D1 |
  |---|---|---|
  | poäng | +4,32 | +2,87 |
  | ned_s | 1,90 s | 2,50 s (+36,7 % → +16,7 % mot bas) |
  | korta | 32,3 % | 38,6 % (−6,3 % → −27,3 %) |
  | upp_s | 1,35 | 1,35 (oförändrad) |
  | ljusdomaren | +0,02 | **−0,83** → **DISK** (< −0,5) |

  Övriga 14 mått var oförändrade. CPU-kvoten var 0,90, latensen 80 ms och worker p99 6 hop.
- **Lärdom till idébanken:** sektionen sitter på en knivsegg åt båda hållen.
  - Mer drop-evidens gör att etiketten hänger kvar i high och ger fler korta delar. Det beror på `dropped → high` plus
    secDropHoldUntil på flankhändelser som slam-kandidaten inte hade.
  - Mindre evidens gör upp_s sämre (a2: 1,35 → 1,90 s).
  - r0:s val (sektionen läser kandidaten, ljuset läser flanken) är det enda uppmätta läget utan DISK.
  - Ska punkten lösas måste sektionens high-ingång och hållet frikopplas från dropräknaren och mätas för sig. Det är en egen mekanism,
    inte ett byte av räknare.

## FLYTTAT (räknas inte i effects.ts) – samma som r0
Se r0/losning.md, tabellen FLYTTAT. Kort:
- flanken: effects.ts:785 → analyser.ts:2914
- klassningen och 12 s-spärren: effects.ts:1590–1603 → analyser.ts:2906
- nästan-drop, lyft och stopp: effects.ts:1207–1266 → analyser.ts:2932
- tystnaden: effects.ts:153, 1383–1404, 1897, 1912 och boundaryDetector.ts:185 → analyser.ts:3058 / frame.silent
- brusgrinden en gång: analyser.ts:2152

## SIFFRORNA (levererat = r0, övning)
- Domarens rad: **+4,32** (långsamma +7,20 %). drop_falska 5,71 → 0 och ned_s 3,00 → 1,90. grid40 −1,0 %, gridfel −7,0 %, korta −6,3 %,
  övriga ±0.
- Ljusdomaren +0,02 utan spärrar. Latensen 80 ms. Worker p99 6 hop (X = 7). workerUs 50,1 µs/hop (< 130). Inga nya objekt per hop.
- Kontrollmängden (orkestratorns mätning av r0): +0,15 utan DISK, ljus +4,3.

## RISK
- Densamma som r0: flanken körs per hop (375 Hz) i stället för per renderruta, och sektionen läser kandidaten (se D1).
- Tystnaden 0,02 → 0,05 är troligen orsaken till korta/gridfel −6/−7 %. Det är inte undersökt här.
- Dropklippens drop_ms (216) begränsas av facit och inte av detektorn. Min egen sond på 7 korta klipp visade att kroppen landar
  14,62–14,98 s, och minidropparna sitter redan på landningen. Att flytta dem mot 15,0 s vore att anpassa sig till bänken.
