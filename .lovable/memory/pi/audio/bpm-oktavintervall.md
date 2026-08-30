---
name: BPM-intervall 60..180 och den asymmetriska oktavrättningen
description: BPM_MIN/MAX är 60/180 (INTE en oktav); OCT_UP 8 / OCT_DOWN 24; refineSong, effects och songMemory.foldBpm måste hållas i takt
type: feature
---

`Analyser.BPM_MIN/BPM_MAX = 60/180` (2026-08-30). Intervallet är **inte** en oktav
(ratio 3) — det är avsiktligt: 60..180 rymmer båda representanterna för allt mellan
60 och 90, så en lugn låt på 70 behåller sitt tempo i stället för att tvingas upp till
140. Vikningen garanterar därmed ingen unik representant; vilken oktav som gäller
avgörs av off-beat-testet och oktavgrenarna, inte av `while`-loopen.

**Terminering:** loopen kräver bara `MAX >= 2*MIN`. Med `MAX < 2*MIN` (t.ex. 90..170)
studsar 175 → 87.5 → 175 i all evighet och motorn hänger.

Sökningen (`lagMin`/`lagMax`) täcker 55..185 oberoende av intervallet, så bytet kostar
ingen CPU — bara kanterna viks.

## Asymmetrin: dubblera lätt, halvera trögt
`OCT_UP = 8` (~2 s bevis), `OCT_DOWN = 24` (~6 s). Ett halvtempo-lås gör showen trögt
fel men körbar; ett dubbeltempo-lås strular med varje effekt. Med det vidare intervallet
är halvtempo dessutom **representerbart** (66 för 132, 71 för 142) och satt annars kvar.
MÄTT över 8 seeder: intervallbytet med symmetriska 8/8 sänkte svag bas 132 till 75 % och
breakdown 142 till 72 % — `OCT_DOWN = 24` tog tillbaka båda (100 % / 88 %).

**Grannrättningen är SYMMETRISK.** PROVAT (dubbla röster nedåt, och 1.5×) och förkastat:
det är ett grann-fel på 10–30 %, och den vanligaste nedåträttningen är "122 låst mot
verkligt 136" — precis den rättning vi vill ha. Dubbla röster nedåt sänkte brusigt rum
45 % → 31 % och shuffle 29 % → 16 % utan att ge något tillbaka.

## Tre ställen måste följa intervallet
1. `tools/refineSong.mjs` — båda vikningsställena (hela låten + `bpmIn()`). `index.ts`
   laddar refinerns tempo med FULL tillit och skriver över `cfg.beat`.
2. `effects.ts` låg-BPM-spärr (`bpm < 100`). Med 60..180 är ett tempo under 100 oftast
   en faktiskt lugn låt, så spärren är meningsfull igen (med 90..180 kunde det lika väl
   vara en 85-ballad vikt till 170).
3. `songMemory.ts` `foldBpm()` — lagrade låtar kan ha gammal oktav. Lagret nollställs
   INTE; vikning sker vid läsning och före blandningen i `mergeInto`.

**Oktav-commit och låtbytesvakt måste ha SAMMA tröskel** (`BPM_COMMIT = 24`) — annars
dödläge: rättningen stängd medan `bpmStable` bara växer i glid-grenen.

**Bänkläge (8 seeder, testBpmHard):** 124/132/90/158 = 100 %, crossfade 91 %,
breakdown 88 %, brusigt rum 45 %, shuffle 116 = 29 %. De två sista är kända svaga fall
och oförändrade av detta arbete.
