# r1-förslag k4

## Vad i k4b som ger vinsten och förlusten

k4b har två oberoende delar:
- **Sökningen (`onsetStep`)**: blippen hoppas över (`scanFar`) + fintempots krona (`SCAN_HOLD` 1,06). Bär utfl_min (övning 0,82 → 0,30, kontroll +43,9) och troligen mix_hopp (kontroll +46,2).
- **Tempovalet (`tgStep`)**: regent + bevissumma (fh1) + k2b:s okänd-regel. Bär lite: utan sökningsdelen gav den utfl_min 0,81 (k4 mätning 2). På kontrollmängden är k4b sämre än bas på utfl_tid −7,9, syskon_tid −2,9, lotus_vaxling −2,4 – just de mått k2c vinner (+16,7, +5,4, +9,8, källaren +25,0).

Slutsats: k4b:s sökning och k2c:s tempoval kompletterar varandra och rör olika funktioner.

## Sonderat (fria sonder, övning 86,7 min, `tempoHoppDiag` + `tempoHoppUtflykt`)

| variant | utflykter | /min | tid i utflykt % | stilla-median i sonden (bas 3,40) |
|---|---|---|---|---|
| bas | 71 | 0,82 | 2,11 | 3,40 |
| k2c (domarens diag) | 64 | 0,74 | 1,39 | 3,40 (16/16 = bas) |
| k4b mätning 2 (domarens diag) | 26 | 0,30 | 1,53 | 2,75 |
| **A: k2c + k4b:s sökning, alltid på** | **21** | **0,24** | **1,22** | **4,00** |
| B: som A men bara när `tolkBpm > 0` | 26 | 0,30 | 1,51 | 4,05 |

Per fil A: ovn 3 / 0,25 %, pop 3 / 1,52, mega 0 / 0, l1021 5 / 10,94, l1011 4 / 1,35, l1028 6 / 1,17. Alla 16 lås efter låtbyte = basens i både A och B.
Kod: `k4b/samprov/analyserClock-a.ts` (A), `k4b/samprov/src` (B); sonderna i `k4b/samprov/sond-a` och `sond`.

## Det som måste sägas om mix_still

- Basen klarar övningens mix_still på TUR: låt 15 står stilla efter 2,16 s i domarens körning, 5,7 s i diag-körningen av samma kod. Utan den är medianen (2,93 + 3,86)/2 = 3,40 = DISK.
- Måttet avgörs av att fintempot växlar mellan 0,5 %-grannar (114,0 ↔ 114,6), inte av låsningen. Varje ändring i sökningen kastar om låt 5, 9, 14 och 15 med 0,3–25 s.
- A i sonden: låt 5 2,9 → 4,0, låt 9 2,5 → 8,3, övriga = bas. Sonden och domaren har varit oense om låt 9 och 15 i varje körning, så 4,00 är varken en dom eller ett frikännande.
- k4b klarade sig (3,15, kontroll = bas) för att bevissumman låser låt 13 fortare (3,86 → 3,15), inte för att sökningen är ofarlig. Den hjälpen finns inte i A.
- Att spärra sökningsdelen till "tolkning satt" (B) ger inte basens stilla-tider: tolkningen sätts igen efter 8 varv (~3 s).

## FÖRSLAG samrad-1 (ett)

**k2c oförändrad i `tgStep`, `famStep`, `tolkStep`, `tolkEscape` + k4b:s två ändringar i `onsetStep`, alltid på (= variant A):**
1. `onsetStep`, sökningens start: `const cb = this.scanFar > 0 ? this.scanFar : beat.bpm; this.scanFar = 0;` – `cb` ersätter `beat.bpm` i TG_SNAP-villkoret och som centrum i grenen `tempoBpm > 0`.
2. `onsetStep`, efter klämningen av `bestBpm`: `if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_SNAP) { this.scanFar = this.bestBpm; return; }`
3. `onsetStep`, poängen: `score = (mx / mean) * (c === 0 && this.scanStep === 0.005 ? SCAN_HOLD : 1)`, `SCAN_HOLD = 1.06`.
4. Nytt fält `scanFar = 0`. k4b:s regent/bevissumma/tgAccL tas INTE med (överlappar tolkningen).

Väntat på övningen: utfl_min ~0,24, utfl_tid ~1,2, syskon_tid ≤ k2c:s 1,02, mix_las = bas. **Osäkert: mix_still** (se ovan) och lotus motfas (kronan kostade en fil i k4b: 6 → 7).

Om samrådet inte vill ta mix_still-risken: gå vidare med k4b som den är (enda varianten med DMX-vinst som hållit kontrollmängden) och lägg k2c:s håll ovanpå i en senare omgång.
