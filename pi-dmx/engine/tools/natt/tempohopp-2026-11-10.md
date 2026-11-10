# Tempohoppen i den delade klockan (analyserClock.ts) – 2026-11-10 kväll

Uppdrag: "lös tempohoppen i analysatorn" (lotus i källaren 11-10: NEW CLUB MIX 2025 hoppar 125 -> 82/84/86 -> 125 inom sekunder, tilliten på golvet 0,20).
Domslut enligt ägaren 21:25: analysatorn döms bara på analysmåtten, inte på ljuset.
Backup-tagg: `backup/fore-tempohopp-20261110` (= 36a5bb6). Ingen deploy, ingen push, inget skrivet i lotus-light-link.

## Orsaken (mätt offline)

Mätverktyg: `tools/tempoHoppDiag.mjs` kör motorns kedja (tvavagarKor mix-jobbet, createAnalyser 'inline' + låtgräns) med en instrumenterad BeatFeed.
`tools/tempoHoppUtflykt.mjs` räknar sedan UTFLYKTER: tempot lämnar ett hållet tempo (> 4 %) och kommer tillbaka (inom 2 %) inom 15 s.
Ett sådant hopp är fel åt ena hållet, oavsett facit.
Mängden är 128 min ljud: övningsmixen (42 min), kontrollmixen (21 min), pop_ladan, megamix_ladan, lang1021, lang1011, lang1014, lang1107 och lang1028.

- **Bas: 185 utflykter (1,45/min), varav 30 till ett 2/3-, 3/2-, 3/4- eller 4/3-syskon. Klockan är i utflykt 4,63 % av tiden.**
  pop_ladan (125 bpm, närmast klubbmixen) har 12 utflykter, varav 5 till ~84 (2/3). Det är lotus symptom.
- **Var tempobytena kommer ifrån:** 359 av 528 tempobyten (68 %) kom via TVÅ MINNEN, alltså att det snabba minnet (3,5 s, EMA 0,4) ersatte det långsamma.
  Regeln var att det snabba minnets topp bara behövde peka ANNANSTANS (> 6 steg) två varv i följd (0,74 s).
  Kronans marginal TG_HOLD 1,35 gällde bara exakta 4:3/3:2-syskon (±2 steg = ±1 %). Allt annat bytte fritt.
  Fantomerna ligger ofta på 1,38–1,46 x eller 1–3 % bredvid 3:2, till exempel 129,8 -> 88,8, 131,9 -> 95,3 och 134,9 -> 93,4. De klarade sig därför förbi syskonkollen.
  Fills och breaks lyfter sådana toppar i 3,5-sekundersminnet, och klockan studsade tillbaka 1–4 s senare.
- **Exempel, pop 209 s:** tilliten är 0,81 och tydligheten 1,0 (125 är klart). Ett varv senare väljer snabba minnet 83 (2/3), tilliten faller till 0,3 och efter 3,2 s är klockan tillbaka på 125.
- **Tilliten på golvet 0,20 är en följd, inte orsaken.** Golvet är coastens golv (MIN_BEAT_CONFIDENCE): fel tempo ger kickar utanför rutnätet, så fasträffarna hamnar under 0,2 och coasten tar över.
  Tydligheten (tgClear) faller samtidigt, eftersom två toppar är nästan lika starka.
- **Kontrollmixens "13,5 % på 2/3|3/2" (mix_23) är inte hopp.** Det är en enda låt (Hannes Aitman – Hopeless Nights, facit 130/124) som står stilla på ~100 hela låten (3/4, vikt).
  Varianterna ändrar det knappt (13,06 %).
- **Låtgränsen (relock) ger också några syskonutflykter i DMX-mixarna.** Efter tgReset väljer första varvet utan minne, till exempel 84,9 vid pop 131,6 s.
  Lotus får låtgränser från Sonos trackName, och inne i en lång DJ-mix kommer inga sådana. Lotus-symptomet är alltså snabbvägen.

## Ändringen (i src, en rad + kommentar)

Snabba minnet får bara ersätta det långsamma om dess topp slår det regerande tempots poäng i SAMMA minne med kronans marginal TG_HOLD, och det gäller alla tempon, inte bara syskonen.
En ny låt utan låtgräns klarar det fortfarande, eftersom förra låtens poäng dör ur 3,5-sekundersfönstret.
`sib0`-raden försvann (blev oanvänd). Inga nya konstanter, inga flaggor.

```ts
-        let sib0 = false; for (...) { ... sib0 = true; }   // utan closure
-        const fc = ...;   // syskon: bara med kronans marginal i det snabba
-        if (fk >= 0 && dd > TG_SW_STEPS && (!sib0 || fv >= fc * TG_HOLD)) { ... }
+        const fc = ...;   // det regerande tempots poäng i det snabba
+        // TEMPOHOPPEN (11-10): kronans marginal mot ALLA tempon, inte bara syskonen
+        if (fk >= 0 && dd > TG_SW_STEPS && fv >= fc * TG_HOLD) { ... }
```
Patchen ligger i `prov/tempohopp-kronan-20261110.patch`.
Src-bygget är bit-identiskt med den bänkade mappen `.arena/tempohopp/v2`: tempoHoppDiag pop_ladan gav samma samp-spår. Kommentarerna och CRLF skiljer.

## Alla mått före -> efter (bas = HEAD 36a5bb6)

Utflykter (tempoHoppDiag + tempoHoppUtflykt, 128 min):

| | utflykter/min | varav syskon | tid i utflykt | pop_ladan | tempobyten (via snabba) | övningsmix rätt % / lås s | kontrollmix rätt % / lås s |
|---|---|---|---|---|---|---|---|
| bas | 1,45 | 30 | 4,63 % | 12 (5 syskon) | 528 (359) | 98,76 / 2,5 | 83,71 / 2,9 |
| **efter** | **1,00** | **21** | **2,93 %** | 9 (3 syskon) | 303 (129) | 99,54 / 2,8 | 84,70 / 3,0 |

DMX tempobänk (tools/arena/tvavagar.py --mat, motorns kedja), övning / kontrollmängden:

| mått | bas övning | efter övning | bas kontroll | efter kontroll |
|---|---|---|---|---|
| mix_klocka % | 97,24 | **97,88** | 82,42 | **83,41** |
| mix_las s | 2,48 | 2,78 | 2,82 | 3,02 |
| mix_still s | 2,73 | 2,93 | 2,91 | 3,72 |
| mix_hopp /min | 0,05 | **0,00** | 0,73 | **0,67** |
| klipp_klocka % | 98,28 | 98,32 | 84,31 | **85,78** |
| ettan % | 100 | 100 | 96,08 | 96,08 |
| gridfel ms (basens fönster) | 22,9 | **20,95** | 8,25 | 8,20 |
| grid40 % | 52,39 | 53,10 | 78,66 | 78,05 |
| upp_s / ned_s | 15,35 / 2,65 | 15,35 / 2,65 | 14,90 / 3,80 | 14,90 / 3,80 |
| traff % / korta % | 75 / 32,3 | 75 / 34,0 | 60 / 24,2 | 64 / 22,2 |
| drop_traff / drop_falska / drop_ms | 100 / 0 / 216 | 100 / 0 / 216 | 100 / 0,87 / 141 | 100 / 0,87 / 141 |
| gr_ratt / gr_falska | 73,3 / 0 | 73,3 / 0 | 57,1 / 0,48 | 57,1 / 0,48 |
| mix_23_klocka % | 0,26 | 0,11 | 13,51 | 13,06 |
| cpu-kvot (ABBA mot engine/dist) | – | 0,985 | – | 1,016 |
| latens ms | 80 | 80 | 90 | 95 (t90 15 -> 20; maskinen var belastad, realtidsparets bas p99 205 hop) |
| tvavagar-poäng | – | +0,40 | – | −2,59 (latens + ljusdomare) |

Låsen är 0,2–0,3 s långsammare (mix_las, mix_still). Det är priset för att ett byte måste slå det regerande tempot med marginal. Sektioner, drops och låtgräns är oförändrade.

Lotus tempobänk (lotusbank.py, LIVE = {BENCH_GRID 1, LOTUS_ANALYSER_SPLIT ''}, 503 + 8 filer):

| | korpus | syntet | kick R/P | on-beat | fas med/motfas/i fas | fasBt med/motfas/i fas (n) | följare raw |
|---|---|---|---|---|---|---|---|
| bas (.arena/lotus-dmxprofil2, 11-10 18:28, samma src) | 462/503 | 6/8 | 0,32/0,88 | 0,40 | 0,88/22/265 | 0,88/21/240 (400) | 0,96 |
| **efter** (.arena/tempohopp/v2, funktionellt identisk med src) | **463/503** | **6/8** | 0,32/0,88 | 0,40 | 0,89/20/266 | 0,88/19/239 (401) | 0,97 |

## Ljuset – effektfynd, inte analysatorns dom (ägaren 21:25)

Ljusdomaren (bank.py + domare.py) sätter DISK på lampspridningen (lampspr) på lang1021: 0,316 -> 0,239 (−24,3 %, under gränsen 80 %).
Pop går 0,292 -> 0,305 (+4,6 %) och megamix 0,373 -> 0,369 (−0,9 %). Medlet blir −6,9 % och ljuspoängen +4,2.
På kontrollmängden blir medlet −7,4 % (lang1028 −20,0 / +1,0 / −3,4) och ljuspoängen −1,3.
Varianterna v3 och v7 (samma snabbväg) ger samma −23 % på lang1021. v4 (kronan överallt) ger −12 %.

I lang1021 (160 bpm) står klockan nu på rätt 156–160 där basen låg på 80. Exempel: 100,9–109,9 s, där basen står på 80 och efter-varianten på 156,5.
Efter låtgränsen 142,7 s blir klockan också lugnare.

**Öppen fråga till effekt-/dirigentsidan:** vad gör att lamporna sprids mindre när tempot ligger stilla (eller på rätt dubbeltempo)?
Två kandidater: lookbyten som triggas av tempobyte eller relock, och effekter vars lampspridning beror på slagintervallet.
Inga siffror per effekt är tagna.

## Provat och förkastat (utflykter/min, tid i utflykt; varianterna i .arena/tempohopp)

| variant | utflykter | tid | stoppat av |
|---|---|---|---|
| v1 samma kandidat i båda varven | 1,25 | 4,69 % | liten effekt |
| v3 = efter + samma kandidat | 1,07 | 3,61 % | inte bättre än efter. Sektionerna = bas, lampspr lang1021 −23 % |
| v4 = v3 + kronan mot alla i det LÅNGSAMMA | **0,74** | 3,47 % | lotus 459/503, 5/8: kronan låste kallstartens första gissning (Klaas Cambodia 130 -> 97,4, syntet 100 -> 150). DMX-bänken utan DISK (upp_s 15,35 -> 10,45, gridfel 22,9 -> 25,0) |
| v11 = v4, kronan mot alla först när det långsamma fönstret är fullt | 0,84 | 3,28 % | lotus 462/503 6/8 (< 463), ned_s 3,15 |
| v5/v6 TG_SW_N 4 | 1,06 / 1,17 | 2,8 / 3,3 % | lås 2,5 -> 3,5 s, kontrollmix 2,9 -> 4,5 s |
| v7 aldrig syskon via snabba + marginal för andra | 1,00 | 2,76 % | ned_s 3,65 |
| v9/v10 kronan mot alla (+v7) | 0,79 / 0,80 | 3,4 / 2,7 % | ned_s 3,15 / 3,6, kontrollmixens lås 3,5 s |
| v12 bara syskon (±2 %) spärrade i snabba | 1,34 | 4,18 % | nästan ingen effekt: icke-syskonfantomerna är huvuddelen |

Patcharna för v4 och v11 ligger i `prov/tempohopp-v4-allkrona-20261110.patch` och `prov/tempohopp-v11-allkrona-uppvarmning-20261110.patch`.
v11 är det starkaste kvarvarande uppslaget: den har färre utflykter och bättre sektionsträff, men lotus ligger på 462.

## Kvar / inte hunnet
- **Port till lotus:** huvudchatten kopierar analyserClock.ts till lotus-light-link och kör `analyser_shared.py --write` (manifestet ANALYSER_SHARED.md5 är INTE uppdaterat här).
- **Klubbmixen själv är inte inspelad.** Lotus-symptomet är reproducerat på pop_ladan och mixarna, inte på NEW CLUB MIX 2025. Ögat i källaren dömer.
- **Relockens utflykter i DMX:** första varvet efter låtgränsen väljer utan minne. Det är orört.
- **Lampspridningsfrågan ovan.**
- Kontrollmixens Hannes Aitman (stilla på 3/4 hela låten) är en annan fråga än hoppen.
- Bänkräkning: tvavagar 4 hela + 1 avbruten, lotusbank 3, plus delbänkar (lang-jobb, bank.py v3) och 13 diag-set.
