# a2 – Analysatorns sökning som enda källa

**IDÉN.** Effektklockans tempogram (tgScore/tgStep) och dess ±2,5 %-skanning är borttagna. Klockans tempo är nu analysatorns frame.bpm (scoreEnv/alignScore), och klockan själv gör bara fas + fintempo inom heltalsavrundningen (5 vikningar ±0,5 %), ettan (a5-modellen) och hållet genom breaket. Ramens `bpm`/`bpmConfidence` skrivs efter matningen från `cfg.beat` (split.ts), så effekterna (trust, frasräknaren) och låtgränsen läser samma tempo och samma tillit som klockan. Det är bättre att trimma (en tempokälla), men bänken visar att analysatorns heltalssökning är klart sämre än tempogrammet. **Kortet förlorar.**

**DIFFEN:** `losning.diff` (beatFeed.ts −70 rader: tempogrammet och dess fält/konstanter borta; split.ts +5).

**SIFFRORNA** (a2 = v3, ranking mot bas): **−9,98, OK** (ingen spärr). Långsamma −15,26 %, snabba −2,06 % (cpu +1,8 %, latens 90 mot 85 ms = −5,9 %). Ljusdomaren +1,2. Worker p99 6 hop. upp_s/ned_s 1,35/2,25 = bas.
- Sämre: mix_klocka 97,1 → 85,6, klipp_klocka 98,4 → 77,1, mix_las 3,5 → 6,9 s, mix_hopp 0,08 → 1,04/min, ettan 91 → 75, grid40 56 → 49, gridfel 15 → 46 ms.
- Bättre: mix_still 4,15 → 0,08 s (+98 %). Heltalstempot står stilla direkt.
- Prövat och förkastat:
  - **v1** (klockan = skuggrutnätet + fast offset 17 ms, kortet ordagrant). Lokalt drev skuggans ±2,5 %-skanning iväg (Ledin 102 → 87,9). Fasen skilde 15–150 ms mot rise-rutnätet beroende på låt, alltså finns ingen offset som fungerar. Avbruten före mätning (den fick aldrig låset).
  - **v4** (även skuggan låst på frame.bpm ±0,5 % = en sökning på riktigt), mätt i `v4/tvavagar.json`. upp_s 1,35 → 6,40 s = **DISK** (spärr a). Tempomåtten som v3.

**DUBBLETTER KVAR / KRAV EN KÄLLA (runda 1, mitt korts punkter):**
- (1) En temposökning: **delvis.** Effektklockan söker inget tempo (beatFeed.ts:102–105, 166, 307, 318–322). Skuggrutnätets ±2,5 %-vikning finns kvar, eftersom den styr analysatorns kickgrind och sektioner. Att ta bort den (v4) bröt upp_s-spärren. Analysatorn läser inte klockan, utan klockan läser analysatorn (kortets riktning).
- (2) En tillit: **genomförd för ramen.** frame.bpm och frame.bpmConfidence = cfg.beat efter matningen (split.ts:238–241). Effekternas trust (effects.ts ~1774), frasräknaren (~1674) och hasBeat (cfg.beat) läser alltså klockan. profile.beat (analysatorns profBeat) är inte rörd.
- (3) beatIdx, (4) pulskurvorna, (5) låtgränsen i taktvägen: **inte tagna.** De ligger inte i kortets mekanism, och budgeten lades på tempokällan.

**RISKEN:** Klockans tempo hoppar nu i heltalssteg med analysatorns lås. På Pi:n (samma kod i workern) bör det bete sig som i bänken. Men varje omlåsning i analysatorn (OCT-UP/DOWN, challenger) slår direkt igenom till ljuset, och tidigare dämpades det av tempogrammet. Fasen räknas på en 5 s-vikning vid ett tempo som kan vara 0,5 % fel, och på ARM ger det samma resultat som här (deterministiskt). Cpu-vinsten är liten (+1,8 %, inom bruset 6 %). Rekommendation: **ta inte in a2.** En enda källa bör byggas på tempogrammet (a1-riktningen), med analysatorn som konsument.

KLAR a2 poäng -9.98 OK
