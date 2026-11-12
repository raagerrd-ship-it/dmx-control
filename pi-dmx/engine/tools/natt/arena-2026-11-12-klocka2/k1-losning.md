# k1 – syskonfamiljen som en hypotes

## Idén
Tempon i exakta förhållanden 4:3, 3:2 och 2:1 (±1 %) är samma rytm läst på olika sätt: tempogrammet följer familjen som i dag, men när familjen följts 16 slag efter låsets tempoval (toppröstens fönster) byter klockan medlem först när den andra medlemmen vunnit varven 16 slag netto. Det är musikanalys och inte utjämning: beviset räknas i klockans egna takter, hållet gäller bara medan regentens rytm fortfarande finns i det snabba minnet (poäng ≥ 0,45 × toppen), och ett tempo utanför familjen, en låtgräns eller en kallstart går exakt som förr.

Ändringen är `famStep` i `src/analyserClock.ts` (+42/−3 rader, inga allokeringar, inga flaggor); inget annat rört.

## Siffrorna (mätning 3 av 3, övning) – poäng **+8,17, OK**

| mått | bas | k1 | % |
|---|---|---|---|
| mix_klocka | 97,88 | 97,88 | 0 |
| mix_las | 2,78 | 2,78 | 0 |
| mix_hopp | 0,00 | 0,00 | 0 |
| mix_still | 2,93 | 2,93 | 0 |
| klipp_klocka | 98,32 | 98,32 | 0 |
| utfl_min | 0,82 | 0,76 | +7,3 |
| utfl_tid | 2,11 | 1,48 | +29,9 |
| syskon_tid | 2,67 | 1,05 | +60,9 |
| lotus_ratt | 116 | 116 | 0 |
| lotus_syskon | 5 | 5 | 0 |
| lotus_vaxling | 17 | 17 | 0 |
| kallaren | 2,98 | 2,98 | 0 |

Spärrarna: syntet 6/8, on-beat 0,41, fas 0,91 / 6 / 70 – lika med bas. Inget mått sämre. Vinsten sitter i de långa inspelningarna (lang1011 syskontid 13,1 → 4,3 %, lang1021 9,4 → 3,0 %).

## Vad som inte gick
- **Medlemmen krönt efter 16 slag, tolerans 3 %, med 5:4** (mätning 1): syskon_tid 0,97 men **DISK** – lotus_ratt 115 (Hotel in Minsk: fel första lås 142 hölls kvar) och mix_still 3,86 (nya låtar i syskonförhållande hölls tills låtgränsen kom).
- **Utan "regenten lever"**: låsen i mixen 2,6 → 5,9 s, 1,8 → 5,0 s, 7,5 → 16,1 s.
- **Tröskel 0,5 / 0,7**: lang1011 tappade vinsten (hållen där ligger lägst 0,48).
- **Kröning 32 slag**: syskon_tid bara 1,66 (lang1011 växlar var 24:e slag).
- **5:4 i familjen** (mätning 2, +7,17): en ny låt 104 → 129 utan låtgräns låste 7,5 → 9,4 s och gav ett mix_hopp; hållen i övrigt desamma.
- **Tolerans 2 %**: källaren 2,98 → 2,77 men låset 152 → 102 gick 2,6 → 3,5 s (risk för mix_still-spärren).

## Risken
- **Källarfelet är inte löst**: källarklippen och lotusbanken är oförändrade. Lotusklippen är för korta (kröningen sker runt 20 s), och källarens byten är till stor del icke-syskon (8:7, 1,1×) eller ligger 1–3 % från exakt kvot.
- Fel medlem som överlever tempovalet + 16 slag sitter kvar tills den rätta vunnit 16 slag netto – långsammare rättning live än i dag.
- Tröskeln 0,45 är satt på få episoder (hållen 0,48–0,77, nya låtar 0,23–0,38): smal marginal.
- Ny låt utan låtgräns i exakt syskonförhållande (inom 1 %) med överlappande rytm kan hållas upp till en fras.
- Kontrollmängden och tvavagar.py är inte körda.
