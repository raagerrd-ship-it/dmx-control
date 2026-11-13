# a-k4 – nya infallsvinklar, sonderade (DMX, övningsmixen 41,8 min, 13 riktiga tempobyten)

**Kort: fyra billiga sonder, ingen bär en mätning. Tre fynd om VAR tiden går är mer värda än idéerna.**

## Fynd först (bas, `.arena/klocka2/bas/klockdom/ovn.json`)

1. **Omlåsningen sitter i tempogrammet, inte i klockan.** `tempoBpm` blir rätt median 2,7 s efter övertoningens slut; klockan följer 0,1–0,2 s senare (median 2,8). Övertoningen är 3 s, så nya takten har hörts i 5,7 s när klockan byter.
2. **Kickarnas tillit är döv för en ny takt.** `repeatRate` står på 0,99–1,00 genom hela övertoningen i 5 av 7 kontrollerade byten (kickgrinden släpper bara igenom kickar på det gamla rutnätet). Den kan inte säga "ny takt hörs".
3. **Övningen har nästan inget fel tempo att vinna.** 48 av 50 klipp ≥ 0,9 rätt, mixen 97,9 %. "Rätt tempo större del av tiden" går bara att visa via låstiden här; kontrollens 83 % (en låt på 2/3 hela låten) syns inte i någon övningssond.

## Idé 1 – KORT ÖRA: ett 2 s-fönster som bara frågar "vilken takt hörs just nu"
Samma vikning som tempogrammet men bara de senaste 2 s, utan minne; pekar dess topp på ett annat tempo än regenten med kvot ≥ X i N varv byter klockan direkt. Borde vinna mix_las. Faller på att 2 s (3–4 slag) ger fantomer.
**Sond** (`k4-kortora/`, klockan bit-identisk med bas, bara loggning):
| regel | lås median / medel (bas 2,75 / 2,72) | falsklarm inne i låtarna |
|---|---|---|
| toppen rätt 2 varv, ingen kvot | 1,5 (om den fick styra ensam; 4 av 13 byten SENARE än bas) | 3,38/min |
| kvot ≥ 1,7, 0,8 s | 2,15 / 2,38 | 0,62/min |
| kvot ≥ 2,0, 0,8 s | 2,65 / 2,48 | 0,27/min |
| kvot ≥ 2,5, 1,2 s | 2,65 / 2,66 | 0,00/min |
**Dom: faller.** Vid en säker tröskel är vinsten 0,1 s; vid 0,6 s vinst kommer 0,6 falska byten per minut (bas har 0,33 utflykter/min i mixen).

## Idé 2 – FÖRKLARA BORT: dra bort regentens takt ur ansatserna och lyssna på resten
Regentens fasprofil (medel per fasfack) dras från varje värde i ringen; resten viks på alla tempon. Är regenten rätt ska resten sakna takt (dess egna 4:3/3:2-fantomer försvinner med den); en ny låt eller en regent som själv är en fantom lämnar en stark takt kvar. Borde vinna både mix_las och syskon_tid.
**Sond** (`k4-forklara/`, bit-identisk klocka): restens topp / regentens topp `q` är median 1,22 (p90 1,97) MITT I stadiga låtar – resten är inte tom.
| regel (2 s-fönster) | lås median / medel | falsklarm |
|---|---|---|
| q ≥ 1,0, 0,8 s | 2,45 / 2,48 | 6,9/min |
| q ≥ 1,5, 0,8 s | 2,65 / 2,57 | 3,8/min |
**Dom: faller i den här formen.** 48 fasfack och ±1 % tempofel räcker inte för att ta bort kickarna; det som blir kvar är kickarnas kanter. En riktig version kräver subtraktion per slag i tid, inte per fasfack – inte billigt, och osonderat.

## Idé 3 – KICKARNAS EGNA INTERVALL: fyra lika intervall i följd = en takt, oavsett tempogrammet
Låsa på slagens tidpunkter: 4 kickintervall inom 8 % ger ett tempo direkt. Sonderat med och utan kickgrind (`DMX_KICK_NOGATE=1`).
| | lås median | fel besked inne i låtarna |
|---|---|---|
| med grind, 4 intervall | 2,65 | 11,9/min |
| utan grind, 4 intervall | 2,55 | 27,3/min |
**Dom: faller.** Kickspärren (0,6 slag) gör intervallen jämna av sig själv; 183–194 kickar/min ger ständigt "lika intervall" på fel tempo.

## Idé 4 – TRENDEN: utmanaren stiger medan regenten faller i flera varv (en övertoning) i stället för kvot 1,35
En fill stiger i 1–3 varv, en övertoning i 8+. Byt redan vid kvot 1,0 om trenden hållit N varv.
**Sond** (`k4-trend/`; kontroll: regeln "1,35 i 2 varv" återger basens lås exakt, 2,75 / 2,72, 0 fel):
| regel | lås median / medel | fel byte |
|---|---|---|
| kvot ≥ 1,0 i 2 varv, ingen trend | 2,60 / 2,55 | 0,67/min |
| trend 3 varv, kvot ≥ 1,0 | 2,75 / 2,69 | 0,03/min |
| trend 4 varv, kvot ≥ 0,8 | 2,75 / 2,72 | 0 |
**Dom: faller.** Det snabba minnet når kvot 1,0 bara ~0,2 s före 1,35 × 2 varv. Regeln är inte flaskhalsen; fönstret (3,5 s) och minnet (0,4/varv) är det.

## Vad sonderna säger tillsammans
- Inom vikningen av basens dB-stigning finns högst ~0,6 s att hämta på övningens 3 s-övertoningar, och bara mot falska byten. Jag har ingen sonderad idé som förtjänar en mätning.
- Det osonderade som återstår, i fallande tilltro:
  a) **Tolkningen vid låset ur taktens mönster** (upprepar sig ansatsmönstret efter 4 slag av kandidaten eller efter 4 slag av dess 3:2-/4:3-syskon?). Siktar på kontrollens 83 % (mix_klocka, klipp_klocka, dubbel vikt). Kan INTE sonderas på övningen (fynd 3) – den som har en mängd med fel-tolkade DMX-låtar kan avgöra den på en timme.
  b) Idé 2 med subtraktion per slag.
- Min sond och domaren: klockans tal i `k4-kortora`, `k4-forklara` och `k4-trend` är identiska med basens diag-körning prov för prov (0 skiljer), och lås-talen jämförs mot domarens egna (`mixLatar[].lock`). Falsklarmen är räknade bara där tempogrammet är rätt, från 10 s efter skarven.

Verktyg: `<mapp>/diag.mjs` (kopia av tempoHoppDiag med extra kolumner), `<mapp>/analys.py`.
