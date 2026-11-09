# a4r – r-pi: Pi:ns verklighet (remix av r0)

**IDÉN.** a4r är r0 bit för bit: `diff -r r0/src a4r/src` är tom, och losning.diff mot engine/src är därför r0:s diff. Kortets fråga gällde om r0:s −7,7 % huvudtråds-CPU är brus eller kod. Svaret blev "kod, men inte i huvudtrådens kod": huvudtråden gör samma arbete som i bas, och det som skiljer är hur den långsamma tråden (workern) belastar PC:ns delade kärnor. Ingen av de billiga Pi-ändringar jag provade bar något i siffrorna, så jag levererar ingen av dem (ägaren: varje rad ska bära).

## KRAV (fil:rad i `.arena/entempo/a4r/src`, samma som r0 och granskat i r0/KRAV_EN_KALLA.txt)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1102/1456/1734 (sökningen borta), :1768 `setClock`, :1511/1707 R_CLOCK, :2371/2389/2516 spärr och grind på klockans rutnät; beatFeed.ts:335 (KICK_PHASE_MS 45) |
| 2 | en tillit | beatFeed.ts:338, split.ts:242 |
| 3 | en takträknare | effects.ts:2010–2020 |
| 4 | en pulskurva | effects.ts:1302 |
| 5 | låtgränsen | analyser.ts:1770 (trackBoundaries), split.ts:234 (H_BOUND), beatFeed.ts:328 relock |

## DELAR
| del | från | mått (r1 / här) |
|---|---|---|
| hela r0 | r0 (a4 låtgräns, a6 tillit, a7 beatIdx, a5 tillstånd, r0:s spärrtak och krona) | samma 17 mått som r0, ljusdomaren +5,2 |
| (inget eget) | – | – |

## BRUS ELLER KOD (mätt)
1. **Domarens egen mätning av identisk r0-kod** (`mat1.json` = tvavagar.json): kvoten blev 1,0665 mot r0:s 1,0765. Två domarmätningar av samma kod hamnar inom 1 %, så skillnaden mot bas är inte slumpen i en enskild mätning.
2. **Egna parkörningar** (dmxDump worker på 55 s lang1021, med och utan effekter, bas och r0 växelvis, 5–8 par per omgång): r0 låg 8–16 % högre i 4 av 6 omgångar och lika i 2. Utan rendering kvarstår skillnaden, så den sitter inte i effekterna.
3. **Huvudtrådens kod är densamma.** cpu-profilen utan inlining visar att de heta raderna är samma DSP i båda (fönstring, magnitud, fastBandStep). r0 lägger bara till `setClock` och två fält i hop-recordet, ungefär 0,1 µs per hop. Inga deopt-stormar (`--trace-deopt`: 52 mot 48). Skräpsamlingen ökar bara marginellt (61 mot 70 scavenges på 55 s, ~3 ms totalt).
4. **Skillnaden följer workern.** När klockans värden inte når analysatorn (setClock av) sjönk huvudtrådens CPU med ~10 µs per hop, fast huvudtråden då gör *mindre* av ingenting: setClock påverkar per hop bara vad som skrivs till workern (R_CLOCK, B_CONF). Utan R_CLOCK sjönk den delvis. Med processens affinitet låst till 2 logiska kärnor föll *båda* från ~52 till ~39 µs per hop när trådarna låg på skilda fysiska kärnor (mask 5) i stället för syskon (mask 3). PC:n har 2 kärnor och 4 trådar, och där gör hyperthreading huvudtrådens CPU-tid beroende av vad workern gör på syskontråden.
5. **Det som inte hjälpte (mätt, bortvalt):** färre väckningar av workern (var 2:a hop: halva antalet notify, CPU oförändrad) och att setClock bara skriver vid ändring (oförändrad).

**Slutsats:** de 7 % är verkliga på PC:n men är en kostnad av hur trådarna delar kärnorna, inte en extra beräkning i huvudtråden. Pi Zero 2 W har ingen hyperthreading, och workern låses till en egen kärna (CPUAffinity 1 2). Där bör effekten utebli, men det är inte bevisat på Pi:n.

## WORKERN HINNER MED (bevis)
- All analys i en tråd (inline, 55 s, 4 par): bas 191 µs per hop, r0 160 (−16 %). Huvudtråden ensam i worker-läget: bas ~67, r0 ~74. Det ger workern ~122 µs per hop i bas och ~85 i r0 (−30 %), eftersom tempovikningen (computeBpm/alignScore) är borta.
- Domaren i realtid: p99 5 hop (bas 6), ≥ 2 hop efter 34,9 %, eftersläpning p99 0,25 ms (r0).
- Pi:n, uppskattning med ARM ≈ 3–4 × PC: workern ~250–350 µs av hoppets 2 667 µs, alltså ~10–13 % av en kärna. Det är inte mätt på Pi:n.

## SIFFRORNA (tvavagar.json = mat1)
Mot bas −0,57 och mot r0 **+0,20**, vilket bara är CPU-brus (kvoten 1,0665 mot 1,0765). Alla 17 kvalitetsmått är identiska med r0, ljusdomaren +5,2, inga spärrar, p99 5 hop. Budget: 1 av 3 --mat, resten egna 55 s-körningar i `a4r/prof/`.

## RISKEN
- Hyperthreading-förklaringen är stark men inte fullständig: med skilda kärnor låg r0 kvar 5–8 % över bas, inom bruset.
- På Pi:n kommer klockans tempo till analysatorn 1–7 hop sent (precis som i r0).
- Windows väckning (~16–27 µs väggtid per hop runt Atomics.notify) säger inget om Linux futex på ARM.
