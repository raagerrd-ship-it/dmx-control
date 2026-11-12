# k5-bonus – avslutad i förtid (klocka2, 2026-11-12)

Bonusrundan avbröts på ägarens besked efter 1 av 3 mätningar. Ingen variant här är bättre än k1 eller k5, och ingen dom på kontrollmängden finns.

## Delarna jag provade

| del | ursprung | mått den bär | med/struken + skäl |
|---|---|---|---|
| Frasregeln: exakt syskon (4:3, 3:2, 2:1 ±1 %) till en krönt regent tas först efter 16 slag netto | k1 | syskon_tid 2,67 → 1,05, utfl_tid 2,11 → 1,48 (k1:s egen mätning) | med i sista koden – bär hela vinsten |
| "Regenten måste leva" (snabba minnet ≥ 0,45 × toppen) | k1 | mix_still (lås efter låtbyte utan låtgräns) | med – följer med frasregeln |
| Underdelningens veto direkt (syskon släpps på medgivande, annars aldrig) | egen (k5) | syskon_tid | struken – sond: lang1011 12,7 % syskontid mot 5,0 % med frasregeln; ett evigt håll låser fel tolkning |
| Underdelningen som vikt i frasregeln (utmanare med fulla tredjedelar räknas inte) | egen + k1 | syskon_tid, utfl_tid | struken – sond: alla sex övningslistor siffra för siffra lika med k1 ensam. Ej mätt i domaren |
| Samma, plus dubbelt räknat varv när regenten är triolfantomen | egen + k1 | – | ej provad – sonden avbröts |
| ±2,5 % syskontolerans i stället för ±1 % | egen (k5) | syskon_tid | struken – sond: lås 2,6 → 5,0 s på en övningslåt (ny låt utan låtgräns hölls) |
| Håll mot icke-syskon när regenten lever räknat ÖVER tempogrammets golv (≥ 0,5) | egen, efter k2b:s/fusionens "annan läsning av samma låt" | utfl_min, utfl_tid | struken – mätning 1: DISK |
| Långt minne/tolkning (tgAccL, tolkStep), smalare skanning och öppen kickgrind i hållet | k2b / fusion | kallaren, lotus_vaxling | aldrig byggd – se fynd 2 |

## Mätning 1 (övning) – poäng +3,70, **DISK**
k1:s familjeregel + håll mot icke-syskon (golvräknad "regenten lever" ≥ 0,5). Sparad som `klockdom-m1-disk.json` (= `klockdom.json`).

| mått | bas | k5-bonus m1 | % |
|---|---|---|---|
| mix_klocka | 97,88 | 97,91 | 0 |
| mix_las | 2,78 | 2,78 | 0 |
| mix_hopp | 0,00 | 0,05 | −26,0 |
| mix_still | 2,93 | **3,86** | −31,5 (DISK: > bas + 0,3) |
| klipp_klocka | 98,32 | 98,32 | 0 |
| utfl_min | 0,82 | 0,75 | +8,5 |
| utfl_tid | 2,11 | 1,44 | +31,8 |
| syskon_tid | 2,67 | 1,03 | +61,5 |
| lotus_ratt / lotus_syskon / lotus_vaxling | 116 / 5 / 17 | 116 / 5 / 17 | 0 |
| kallaren | 2,98 | 2,98 | 0 |

Syntet 6/8, on-beat 0,41, fas 0,91 / 6 / 70 (114) – lika med bas. Källarklippen är oförändrade, klipp för klipp (2,13 / 2,98 / 5,53 / 1,28 byten per min). Mot k1 ensam (+8,17) gav tillägget +0,1–2 pe på tre mått och kostade mix_still och mix_hopp.

## Fynden
1. **Underdelningen tillför inget utöver k1:s frasregel.** Som direkt veto är den sämre, som vikt i frasregeln ger den exakt k1:s siffror i sonden. Tredjedelsmåttet skiljer fantom från puls i snitt (övningsmixen: rätt tempo p98 ≤ 0,17, 4/3-fantomen median 0,35–0,77), men per varv är fantomens nedre svans för brusig för att slå "vänta 16 slag".
2. **Håll mot icke-syskon fäller mix_still.** Vid källarklippens växlingar är regenten lika död i det snabba minnet som vid ett låtbyte (golvräknad kvot −0,2–0,16 i källaren, 0,07–0,27 vid övningsmixens låtbyten). Samma håll som ger k2b:s/fusionens källarvinst fördröjer alltså låtbytet; utan låtgränsen går de inte att skilja på det här särdraget. Även min snäva variant (bara ≥ 0,5, tre episoder på 87 min) räckte för DISK.
3. **Fria sonder förutsäger inte mix_still.** tempoHoppDiag visade identiska lås på alla 16 övningslåtar för varianten som sedan fick mix_still 3,86 i domaren (tvavagarKor mäter "stilla ±1 % i 5 s", inte första rätta låset). Den som vill ha marginal på mix_still måste mäta den i domaren.

## Läget i mappen
- `src/analyserClock.ts` = k1:s fil + underdelningen som vikt i frasregeln. Den har en provratt kvar (`K5_MODE`, env) och är INTE mätt i domaren – inte en leverans, bara sista sondläget. Standardläget gav k1:s siffror i sonden.
- `k5-bonus.diff` = det läget mot `engine/src` (+69/−3, bara analyserClock.ts).
- `klockdom.json` hör till mätning 1 (annan kod än `src/` nu).
- Sonderna: `sond-b1.txt` (k1-fusionens fem varianter), `sond-b2.txt` (golvräknad "regenten lever"), `sond-b3.txt` (vikten, avbruten efter första varianten).

## Rekommendation
Ska något av detta in är det k1:s frasregel som den är; k5:s underdelning kan läggas åt sidan. Källarfelet kräver något annat än ett håll i klockan.
