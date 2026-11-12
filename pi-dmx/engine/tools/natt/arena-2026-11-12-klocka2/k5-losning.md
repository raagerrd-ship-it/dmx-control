# k5 – UNDERDELNINGEN (klocka2, 2026-11-12)

## Idén
Viks ringen på 4/3 (eller 2/3) av pulsen roterar de riktiga slagen över slagets TREDJEDELAR (0, 1/3, 2/3 lika starka = triolfantom); på pulsen själv är tredjedelarna tomma. Tempogrammet föreslår som förr, men ett förslag som är ett exakt syskon (±2,5 %) till en tolkning som stått ~9 s släpps bara om underdelningen medger det: uppåt (4/3, 2/3) bara om förslagets egna tredjedelar är tomma, nedåt (3/4, 3/2) bara om det regerandes tredjedelar är fulla – annars står tolkningen och bara familjens fintempo följer tempogrammet. Det är musikanalys (var anslagen faller inom slaget, mätt i tolftedelar på samma ring), ingen utjämning: inget tempo filtreras, och kallstart, låtgräns och icke-syskon går exakt som i dag.

Mätt på övningsmixen (probe.mjs, per varv): tredjedelarnas andel av toppen på rätt tempo p98 ≤ 0,17 i 15 av 16 låtar, på 4/3-fantomen median 0,35–0,77.

Bara `src/analyserClock.ts` ändrad (+60/−2): `subFold` (en vikning i 12 platser, återanvänder klockans arbetsytor – inga nya objekt per hop), `subJudge` (två vikningar per VARV = +0,7 % av tempogrammets kostnad), fem konstanter. Inga flaggor.

## Siffrorna (mätning 3, städad kod; mätning 2 gav exakt samma)
Poäng **+2,20, OK**.

| mått | bas | k5 | % |
|---|---|---|---|
| mix_klocka | 97,88 | 97,88 | 0 |
| mix_las | 2,78 | 2,78 | 0 |
| mix_hopp | 0,00 | 0,00 | 0 |
| mix_still | 2,93 | 2,93 | 0 |
| klipp_klocka | 98,32 | 98,32 | 0 |
| utfl_min | 0,82 | 0,80 | +2,4 |
| utfl_tid | 2,11 | 2,24 | **−6,2** |
| syskon_tid | 2,67 | 1,87 | +30,1 |
| lotus_ratt | 116 | 116 | 0 |
| lotus_syskon | 5 | 5 | 0 |
| lotus_vaxling | 17 | 17 | 0 |
| kallaren | 2,98 | 2,98 | 0 |

Spärrarna: syntet 6/8, on-beat 0,41, fas 0,91 / 6 / 70 (114) – allt lika med bas. Sämre: utfl_tid (l1021: en hållen tolkning gör en utflykt längre, 11,6 → 14,4 %). Vinsten sitter i de långa inspelningarna (lang1011 96↔128: syskontid 13,1 → 9,0 %, megamix 1,13 → 0,45 %).

## Vad som inte gick
- **Domen flyttar klockan själv** (utan förslag från tempogrammet): 3/4-fantomregeln (syskonets topp ≥ 1,15 × + tomma tredjedelar) gav övningsmixen 99,5 → 90,6 % rätt; triolfantomregeln ensam 99,2 % men pop utflykter 0,9 → 1,4/min. Ett varvs underdelning räcker för veto, inte för eget byte.
- **Rent håll** (inga syskonbyten alls): lang1011 13,1 → 1,3 % men övningsmixen 99,5 → 93,2 % (fel tolkning låses).
- **Håll direkt efter tempovalets fönster (mätning 1)**: syskon_tid 1,43 (+46 %) men lotus_ratt 116 → 114 = DISK. Domen fördröjde riktiga 3:2-byten ~1,5 s i låtens första 20 s (Ricky Rose Dricker Vin, Status behov). Därför kravet att tolkningen stått 24 varv.
- **±4 % syskontolerans**: låtbyte utan låtgräns (129 → 94) hölls som syskon, lås 2,5 → 13,6 s.
- Etableringstid 12–16 varv: syskon_tid 1,51 i sonden, inte mätt mot lotus (budgeten slut, risken var DISK).

## Risken
- **Källarfelet löses inte**: övningsklippens växlingar är inte exakta syskon (160↔92, 104↔146 ≈ 1,40, 154↔144) – domen rör dem aldrig. Lotusbanken (31 s per klipp) hinner knappt nå hållet, så lotusvinsten är obevisad.
- Äkta shuffle/12-8 med lika starka bastrioler ser ut som en triolfantom: ett riktigt byte uppåt kan då nekas.
- En fel tolkning som stått 9 s försvaras: gles bas (tredjedelarna når inte 0,3) kan hålla kvar klockan på 2/3 av pulsen längre än i dag.
- Break/tystnad: efter relock eller tempobyte börjar bevisen om, så risken ligger i låtens mitt, inte i starten.
