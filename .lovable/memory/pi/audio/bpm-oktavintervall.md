---
name: BPM-oktavintervall 90..180 och dess följdändringar
description: BPM_MIN/MAX är 90/180 (exakt en oktav); refineSong, effects låg-BPM-spärr och låtminnets foldBpm MÅSTE hållas i takt
type: feature
---

`Analyser.BPM_MIN/BPM_MAX = 90/180` (2026-08-30, portat från lotus-spegeln). Bytet från
80/160 är ett TÄCKNINGSval, inte oktav-tydlighet: båda är exakt en oktav, så b och 2b är
lika oskiljbara i båda. Vinsten är 165–180 (hardstyle, psytrance, dnb-halvtempo) som förut
viktes till halvtempo (MÄTT: 170 lästes som 85). Priset: 80–89 (ballader) viks upp till
160–178.

**Tre ställen måste följa intervallet, annars blir bytet en regression:**
1. `tools/refineSong.mjs` — båda vikningsställena (hela låten + `bpmIn()`). `index.ts`
   laddar refinerns tempo med FULL tillit och skriver över `cfg.beat`.
2. `effects.ts` låg-BPM-spärr (`bpm < 100`). 80–89-ballader är nu oskiljbara från
   160–178 och hanteras av energi-hysteresen, inte av tempot.
3. `songMemory.ts` `foldBpm()` — lagrade låtar kan ha gammal oktav. Lagret nollställs
   INTE; vikning sker vid läsning och före blandningen i `mergeInto`.

**Oktav-commit och låtbytesvakt måste ha SAMMA tröskel** (`Analyser.BPM_COMMIT = 24`).
`bpmStable++` sker bara i glid-grenen; med olika trösklar uppstår ett dödläge där
oktav-/grannrättning är stängd men låtbytesvakten ännu inte öppnat — ett lås 33 % fel
(90 mot verkligt 120, ratio 1.33) kunde inte lämnas förrän tystnad.

**Sömmen är kvar:** en låt på 178 vars estimat vandrar till 181 viks till 90.5 →
ratio 0.508 → nedåtgrenen halverar låset. "Dubblera ja, halvera nej" är INTE implementerat
(koden är symmetrisk); ingreppspunkten är nedåtgrenen (`octaveVote <= -8`) plus
grannrättningen när `med < localBpm`. Medvetet öppet designval.
