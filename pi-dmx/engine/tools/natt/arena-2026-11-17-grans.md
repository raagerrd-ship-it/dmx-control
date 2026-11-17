# Natten 2026-11-17: (1) ljusdomarens brus, (2) arenan grans - gränsen utan lucka

Ägaren: "Kör 1 först sen 2. Utan att fråga mig så jag sover". Inget är inlagt i src och inget är utlagt.

## (1) Ljusdomarens brus (tools/natt/ljusbrus-2026-11-17.md, verktyg tools/arena/ljusskak.py)
Samma kod, bara ett annat lookval (KR_SEED 1-3, KR_TOG):
- Domarpoängen sprider med std 2,8 (4,2 med toggle-beslutet). Frö mot frö spänner −9,5 till +9,2.
- Mot −1,5 fäller bruset ensamt 4 av 8 frön, och lampspridningen fäller 6 av 8.
- l171840 bär mest: basens jitter är bara 17,6 ms, så ±7 ms ger ±39 %.

Med medel av N frön faller bruset som 1/√N, och 4 frön ger std ≈ 1,4. En ensam bänks ljuspoäng går alltså inte att döma på under ±5,6.
Lampspridningen sprider ±15 % mellan två frön, så även medlet av 4 frön ger ungefär ±7 %. Spärren på 94 % ligger inne i bruset.

## (2) Arenan grans
Bas = HEAD 9c15472 (arenan fras r0 inlagd). Domare frasdom.py, med det nya informationsmåttet missade (gränser utan byte inom 16 slag).
Mängderna är desamma som i fras. Ljuset:
- Rundorna: −5,6 på en ensam bänk, lampspridningen bara som information.
- Finalen: medel av 4 lookfrön, spärr −3,0, med lampspridning och slocknat.

Utgångsläget: 28 av 83 ägargränser utan lookbyte på övningen (34 %), mest refräng 10/22 och vers 8/24. 20 av de 28 ligger där detektorn säger 'high'.

### RESULTAT: INGEN VINNARE ENLIGT REGLERNA. Bäst: g6 (bara effects.ts)
g6 = analysatorns nästan-drop (nearDropDb >= 20 dB, redan i split) räknas som en landning genom r0:s landningsväg. Efter ett gissat byte
(sektion/build) får den byta efter 2 s, annars efter 6 s och bara utanför high. analyserDrop.ts är orörd.

| | övning | mellan | KONTROLL |
|---|---|---|---|
| byte på ägarens gräns, bas -> g6 | 22,7 -> 31,2 % | 20,5 -> 27,3 % | 23,5 -> 29,4 % |
| lag (slag), bas -> g6 | 8,5 -> 7,3 | 7,5 -> 7,2 | 8,7 -> 8,1 |
| missade gränser, bas -> g6 | 34,1 -> 29,7 % | 25,0 -> 34,1 % | 37,3 -> 35,3 % |
| byte på ettan, bas -> g6 | 41,7 -> 43,5 % | 42,5 -> 42,1 % | 38,9 -> 37,5 % |
| lösa byten /min, bas -> g6 | 0,98 -> 1,22 | 1,54 -> 1,44 | 1,48 -> 1,27 |
| poäng | +11,12 | +7,02 | +6,02 (1:a) |

Kontroller av g6:
- Drop, minidrop och uppbyggnad är identiska med bas. Kostnad ×0,97.
- Takt och låtbyten (latskak) är identiska på både övningen och kontrollen.
- Ljuset på medel av 4 frön: +1,85 poäng. Lampspridningen är däremot −8,9 % (16,1/10,7/+0,1 per fil), och spärren på 94 % ger DISK enligt reglerna i uppgiften.
- Alla tre som bänkades med 4 frön (j0, g4, g6) föll på lampspridningen: −8,3 %, −9,2 % och −8,9 %. Det tyder på brus, eller på att varje
  ny lookföljd förlorar mot basens lyckade dragning, inte på något fel i g6. Det är ägarens sak att avgöra om g6 är värd ett ögonprov.

### Ranking

| deltagare | idé | övning | mellan | kontroll | ljus (ensam / 4 frön) |
|---|---|---|---|---|---|
| g6 | nästan-drop som landning | +11,1 | +7,0 | +6,0 | +0,7 / +1,9 (lampspr −8,9 %) |
| g4 | klang, senaste takten mot frasen före | +7,1 | +3,8 | +4,6 | +3,2 / +2,9 (lampspr −9,2 %) |
| g1 | sektion high->high på klangnyhet | +5,2 | +0,4 | – | +4,0 |
| g3 | anslagsmönster per sextondel | +5,1 | −1,2 | – | −1,5 |
| g2 | basgångens mönster | +2,5 | +0,8 | – | +1,4 |
| g8 | dirigenten läser befintliga fält | +1,7 | +2,0 | – | +0,2 |
| g5 | sångens/melodins klangform | +1,4 | 0,0 | – | −0,2 |
| g7 | klangfärgens flytt | +0,6 | −0,3 | – | −0,3 |
| JOKERN j0 | g6 + släpp uppslukningen efter 8 s + 2 s-regeln även för minidrop | +15,2 | +6,1 | +4,7 | −7,4 / −6,2 DISK (äkta) |

j0 med g4:s frasnyhet (m3): +19,6 på övningen, ljus −12,4, förkastad av jokern. g4:s frasbyte tappade landningar.
Ingen runda 2: ingen kandidat höll på både okänd musik och ljuset med marginal. Remixer på samma signaler hade överanpassat som i fras.

### Fynd värda mer än varianterna
- Nyhetsvittnena (klang, anslag, basgång, sång, klangflytt) hittar framför allt gränser som landningen eller sektionsbytet redan tar.
  Fem av åtta höll inte på mellan. Detektorns 'high' innehåller ingen realtidssignal som skiljer vers från refräng tillförlitligt
  (AUC 0,55-0,8 i g5/g8).
- 14 av de 28 missade gränserna HAR redan ett sektionsbyte från detektorn (g8), men dirigenten byter inte look. Skälen är uppslukningen
  på 24 s, att manuset väljer samma look, MIN_HOLD 8 s och luckan. j0 släppte uppslukningen efter 8 s, men ljuset föll på riktigt (−6,2 på 4 frön).
- Den starkaste signalen för en ny del är fortfarande basens återkomst: minidropen (r0) och nästan-dropen (g6).

## Om ägaren vill gå vidare
g6 som ögonprov: backup-tagg, .arena/grans/g6/src/effects.ts -> src, bygg, commit. Ingen delad fil. Lampspridningens spärr föll inom bruset,
så ögat avgör. Annars: lägg till den här natten först efter ögonprovet av f0 + r0 + dagens fem (en justering i taget).
Inför nästa ljusarena bör domaren dömas på medel av 4 frön, och lampspridningen få en brusmätt gräns (ungefär −15 % på 4 frön), inte 94 %.

Tokens ungefär 2,6 M (brusagenten 0,14 M + 8 deltagare ~2,0 M + jokern 0,22 M + orkestratorn). Tid 01:10-08:40.
Idébanken (alla lösningar, diffar och rankingar) ligger i tools/natt/arena-2026-11-17-grans/.
