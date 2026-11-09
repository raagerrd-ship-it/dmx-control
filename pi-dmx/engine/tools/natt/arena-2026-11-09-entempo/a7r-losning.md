# a7r – r-portbar: klockan inflyttad i analysatorn, profilen på ETT ställe

**IDÉN.** Klockan (tempogram, rutnät, etta, tillit) är nu en del av analysatorn: `analyserClock.ts` (beatFeed.ts ordagrant flyttad, utan motorberoenden) importeras statiskt av `analyser.ts`. Analysatorn läser sin klocka själv: ur sin EGEN taktväg (`hopLane`) i början av varje `process()`, eller genom att köra klockan sist i `process()` när det inte finns någon taktväg (lotus). Ingen `setClock` utifrån och ingen modul som registrerar sig i profilen. Var klockan körs avgör profilen på ETT ställe, `sys.BEAT_FEED` (`'slow'` DMX, `'inline'` lotus), och lotus ljus rörs inte.

Diffen mot r0: 8 filer, varav analyserClock.ts är flytten. Bit-identisk med r0: md5 lika på lang1021 och megamix i sync- och momentläget, alla 17 mått lika, ljusdomaren +5,2.

## KRAV (fil:rad i `.arena/entempo/a7r/src`; r0:s fem, oförändrade, + ARKITEKTUREN)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1103 och 1735 (computeBpm/scoreEnv/alignScore borta), :1512/1708 R_CLOCK (klockans bpm till långsamma sidan), :2373 spärren, :2391/2518 grinden på klockans rutnät; analyserClock.ts:345 (inre rutnät + KICK_PHASE_MS, null i coast) |
| 2 | en tillit | analyserClock.ts:349 (ramen = klockans bpm och tillit), split.ts:244 (ramen + `clockBpm/clockConf`); effects.ts:1772 trust, :1672/1675 frasräknaren, hasBeat (cfg.beat) |
| 3 | en takträknare | effects.ts:2010–2020 (rutnätets index, `>> 1`, en paritet, monoton) och :1359/1363 |
| 4 | en pulskurva | effects.ts:1302 |
| 5 | låtgränsen | analyser.ts:1771 trackBoundaries, split.ts:236 H_BOUND, analyserClock.ts:339 relock() |
| A | klockan I analysatorn | analyser.ts:33 (statisk import av klockan), :2052 (analysatorn läser klockans tal ur sin egen taktväg, i stället för r0:s `an.setClock` i split.ts), :3085 (klockan sist i process() utan taktväg), :3088–3092 `clock`/`clockOut`/`publishClock`, :3142/3147 (klockan skapas av createAnalyser), :3201 hopFeedFactory (`new BeatFeed()`, ingen profilfabrik), :3206 clockMode; slowWorker.ts:19/30 (ingen dynamisk modulimport i workern); split.ts:223 |
| P | profilen på ETT ställe | analyserProfile.ts:35 `BEAT_FEED` (slowHopFeedModule/slowHopFeed borta); analyserClock.ts:14–21 (MIN_BEAT_CONFIDENCE/GRID_EARLY_MS bor här, loggbrytaren via setClockLog, ClockCfg i stället för EngineConfig); beatClock.ts:30 re-export; beatFeed.ts = 6 raders namn + DMX-loggbrytare; index.ts:201 `publishClock` utan taktväg |

## DELAR
| del | från | måttet |
|---|---|---|
| alla fem krav, sektionsfixarna (spärrtak 330 ms, kronan) | r0 (a4, a5, a6, a7, a1/a8) | r0:s alla 17 mått, ljus +5,2 – här bit-identiska |
| klockan inflyttad, självläsning i process() | egen (kortet) | md5 = r0 (bevis: verktyg/dumpInline.mjs, 55 s lang1021 sync/inline) |
| `BEAT_FEED 'inline'` = lotusvägen (klockan i process(), ingen worker) | egen | md5 på 55 s lang1021 = taktvägens (4b027bb51f…) – lotus får samma klocka utan taktväg |

## BORTVALT
- Ingen ny ljus- eller tempoändring. Kortet gäller portbarhet, och varje sådan ändring skulle bryta bit-identiteten mot r0, som är beviset att flytten är ren.
- Färskare klocktal i worker-läget (läsa tillståndsblocket i process() i stället för förra feedens kopia). Det skulle ge lägre fördröjning men inte bit-lika, och sync-läget visar ingen skillnad.
- `setClock` finns kvar som publik metod. Den anropas bara av klockan själv och av bänkverktyg som bygger `new Analyser` och kör `BeatFeed.update` utanför (konsertReplay/rytm): verktygen ändras inte.

## SIFFRORNA (mätning 1 av 3 = tvavagar.json)
- **Poäng −0,11 mot bas, alltså +0,66 mot r0 (−0,77). OK.** Långsamma +1,27 % (= r0), snabba −2,18 % (r0 −3,83). Skillnaden är bara CPU-brus: kvot 1,044 mot r0:s 1,077, bruset 6 %. Latens 85 ms, p99 5 hop, ljusdomaren +5,2 utan spärrar, upp_s/ned_s 1,35/1,90.
- Inget blev sämre mot r0.

## RISKEN
- **Lotus:** `analyserClock.ts` måste följa med analyser.ts i det delade manifestet, och lotus profil sätter `BEAT_FEED: 'inline'`. Lotus egen taktmatning (setBeatGrid från lotus motor) ska då bort: annars styr två rutnät grinden. Bara provat i DMX-bänken, inte på lotus.
- **Pi:n:** i worker-läget läser analysatorn klockans tal från förra feeden, samma fördröjning som r0 (1–7 hop). Utan delning körs klockan i huvudtråden (~20 % av motorns CPU), och det gäller lotus på Pi:n.
- Kör någon `createAnalyser` utan delning och anropar `BeatFeed.update` utanför, körs klockan två gånger. Inget bänkverktyg gör så (de odelade bygger `new Analyser`).
