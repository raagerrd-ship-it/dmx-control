# dubbla67: DUBBLA KÄLLOR 6 (minsta på-tid) och 7 (ctx-hjälpare)

Bas: HEAD 8f89cf1 (engine/dist). Kopia: `.arena/dubbla67/src`, bygge `.arena/dubbla67/dist`. Inga delade filer rörda
(analyser.ts, split.ts, slowWorker.ts, analyserClock.ts orörda). Radnummer avser HEAD-filerna (engine/src).

**Resultat:** punkt 6 är gjord och DMX-md5-identisk. I punkt 7 är ingen effekt bytt. Ingen kandidat ger bit-identiskt ljus
när man räknar efter i koden, så inga nya ctx-fält är tillagda. Ett fält som ingen läser vore död kod.

## Ändringen (punkt 6)
- `output.ts:27`: blocket MINSTA PÅ-TID. `MIN_ON_MS 150` och `CH_MIN_ON_MS 100` exporteras härifrån. `HOLD_MS 120` ligger kvar
  bredvid dem. Kommentaren förklarar varför de tre är olika.
- `effects.ts:308` och `effects.ts:315`: de egna konstanterna är borta. Importen sker på rad 17. Logiken i steg 2 (1429–1440) är orörd.
- `effects/types.ts:171`: kommentaren pekar nu på output.ts. De gamla env-namnen DMX_MIN_ON_MS/DMX_CH_MIN_ON_MS finns inte längre.

## Tabell

| post | fil:rad | bytt/lämnad + skäl |
|---|---|---|
| MIN_ON_MS 150 | effects.ts:308 -> output.ts | BYTT (flyttad, exporterad, samma värde). Läses i effects.ts:1431 |
| CH_MIN_ON_MS 100 | effects.ts:315 -> output.ts | BYTT (flyttad, exporterad, samma värde). Läses i effects.ts:1439 |
| HOLD_MS 120 | output.ts:27 | kvar på sin plats, nu i samma block |
| En gemensam hålltid (granskningens förslag) | - | LÄMNAD. Det skulle ändra ljuset. De tre håller olika saker: lampnivån före uttoningen (150), en färgkanals andel (100) och monodimmerns nolla (120). De två första gäller inte fastLight, den tredje gäller alltid. Hållogiken i steg 2 hänger på uttoningens tillstånd (lampLvl/lampPeakAt/lampRatio) och ligger därför kvar i effects.ts. Bara värdena bor i output.ts |
| ctx.beatMs (fältet) | - | INTE TILLAGT. Det är meningslöst utan läsare. Om det läggs till blir det motorns egen period `beatPeriod(beat)` (effects.ts:1636: hasBeat ? 60000/bpm : 500), vid halvering x2. Ingen av de tio effekterna nedan ger då samma värde |
| beatMs basgang | effects/basgang.ts:20 `60/bpm : 0.5` | LÄMNAD. hasBeat: grinden är `bpm` sann, inte hasBeat. Med bpm > 0 och tillit under MIN_BEAT_CONFIDENCE (vanligt enligt effects.ts:1630) blir värdet 60/bpm i stället för 0,5. 60/bpm är inte heller bitlikt med ms/1000. Halvering: ålder/slag räknas mot ohalverat slag |
| beatMs droppar | effects/droppar.ts:16 | LÄMNAD. Samma som basgang (hasBeat). Halvering: `(beatIdx%2 + beatFrac) * beatS`, där beatIdx/beatFrac är halverade men beatS inte är det. Ett halverat ctx.beatMs dubblar värdet |
| beatMs drops | effects/drops.ts:14 `0.12 * (60/bpm : 0.5)` | LÄMNAD. hasBeat-grinden och bitlikheten s/ms som i basgang |
| beatMs eko | effects/eko.ts:16 | LÄMNAD. hasBeat-grinden och bitlikheten s/ms som i basgang |
| beatMs forvarning | effects/forvarning.ts:20–21 `bpm > 0 ? 240000/bpm : 2000` | LÄMNAD. hasBeat: med bpm > 0 men ingen takt blir det 240000/bpm i stället för 2000. Halvering: takter kvar räknas i musikaliska takter, så x2 vore fel |
| beatMs nedrakning | effects/nedrakning.ts:16 `bpm > 0 ? 60000/bpm : 500` | LÄMNAD. Fallbacken 500 är samma, men grinden är bpm > 0 och inte hasBeat. Det skiljer när takten är osäker |
| beatMs stegring | effects/stegring.ts:15 `240000/bpm : 2000` | LÄMNAD. Samma som forvarning (4 x 60000/bpm är bitlikt, men grinden är det inte) |
| beatMs sug | effects/sug.ts:16 `240000/bpm : 2000` | LÄMNAD. Samma som forvarning |
| beatMs fyr | effects/fyr.ts:11–12 | LÄMNAD. Ingen period räknas. `bpm > 0` används som låstest i stället för c.hasBeat. Ett byte ändrar läget när tilliten är låg |
| beatMs rullandning | effects/rullandning.ts:10–11 | LÄMNAD. Samma som fyr |
| ctx.dt (fältet) | - | INTE TILLAGT. Motorns dt (effects.ts:1604) är tiden sedan förra rutan, med tak 0,1 s. Effekternas dt är tiden sedan effekten SJÄLV körde sist, med tak 0,2 s, och 0,025 första gången. Första rutan efter varje aktivering ger därför olika dt, och vid ruthopp över 100 ms skiljer taket |
| dt drift | effects/drift.ts:18 | LÄMNAD. Vid aktivering glider driftPos med min(1, 0,2/1,5) i stället för 0,025/1,5 |
| dt sangare | effects/sangare.ts:16 | LÄMNAD. Röstfiltret och golvet tar ett annat steg vid aktivering (0,025 första gången, annars upp till 0,2) |
| dt sokljus | effects/sokljus.ts:14 | LÄMNAD. Avklingningen av reveal tar ett annat steg vid aktivering |
| dt makeRise | effects/color.ts:49 (airglow.ts:10, effects/split.ts:10) | LÄMNAD. Klockan gäller per lampa, med dt 0 första anropet och tak 0,2 vid återaktivering |
| dt moment | moment.ts:173 | LÄMNAD. Klockan är Date.now (nowWall), inte nowP. Den räknas bara när stunden visas (showTick) och har tak 0,2 och start 0,025. step() får dtSec (effects.ts:2044), men showTick körs inte varje ruta |
| (dt lab/lab4) | lab.ts:42, lab4.ts:39 | LÄMNAD av samma skäl (start 0,025, tak 0,2, egen klocka) |
| ctx.voice (fältet) | - | INTE TILLAGT. Varje kopia har ett eget tillstånd (vS/vFloor) som bara uppdateras när just den effekten eller grenen körs, och med sin egen dt. En kurva per ruta i motorn skulle låta golvet krypa även när effekten inte körs, så ljuset ändras |
| voice sangare | effects/sangare.ts:18–20 | LÄMNAD. Tillståndet uppdateras bara när sångaren renderar |
| voice moment | moment.ts:198–201 | LÄMNAD. Tillståndet uppdateras bara i stundens tysta gren (`quiet`) |
| voice lab | lab.ts:142–144 | LÄMNAD. Eget tillstånd i labbet |
| voice lab4 | lab4.ts:49–50, 98 | LÄMNAD. Andra konstanter (0,08 s glättning, 0,03 golvmarginal), så det är inte samma kurva |

### Vad som krävs för att ta punkt 7 vidare (ändrar ljuset, så det kräver bänk och ladan)
- ctx.beatMs = `beatPeriod(beat)`: ett fält plus en rad i var och en av de åtta period-effekterna. fyr och rullandning går över
  till `c.hasBeat`. Det ändrar ljuset när tilliten är låg. Mät med domare.py (takt) och ägarens öga.
- Alternativt ett fält för RÅ period (`rawBeatMs`, effects.ts:1637, används redan av buildProg på rad 2007). Det är bitlikt för
  nedrakning/stegring/sug/forvarning (`c.beatMs || 500`, `c.beatMs ? 4*c.beatMs : 2000`), men det flyttar bara förbifarten och
  rättar den inte. 60/bpm-effekterna (basgang/droppar/drops/eko) är inte bitlika mot ms/1000.
- ctx.dt och ctx.voice ändrar alltid aktiveringsrutan respektive golvets historik. Det är ett ladan-beslut, inte en omflyttning.

## BEVIS: DMX-md5 per lampa, bas (engine/dist, 8f89cf1) mot ny (.arena/dubbla67/dist)

| wav | körning | rutor | md5 bas | md5 ny | lika |
|---|---|---|---|---|---|
| tools/ladan-2026-10-21/lang-20261021T203952.wav | `DUMP_SPLIT=sync node tools/dmxDump.mjs` | 11250/11250 | 56e423b97f 4a99ab96b1 2700857721 a9aff19aab | 56e423b97f 4a99ab96b1 2700857721 a9aff19aab | IDENTISK |
| tools/ladan-2026-10-21/lang-20261021T203952.wav | `DUMP_MOMENTS=1 DUMP_SPLIT=inline node tools/dmxDumpMoment.mjs` | 11250/11250 | 8be6858ab1 17dda43a75 f03c25adc5 a873089b25 | 8be6858ab1 17dda43a75 f03c25adc5 a873089b25 | IDENTISK |
| tools/megamix_ladan.wav | `DUMP_SPLIT=sync node tools/dmxDump.mjs` | 22500/22500 | 9bf54cd187 1757d6c62f 3cfde800f8 a726d97f02 | 9bf54cd187 1757d6c62f 3cfde800f8 a726d97f02 | IDENTISK |
| tools/megamix_ladan.wav | `DUMP_MOMENTS=1 DUMP_SPLIT=inline node tools/dmxDumpMoment.mjs` | 22500/22500 | 2cb7675fa4 4040505644 16dc4aef11 29fbb6ca25 | 2cb7675fa4 4040505644 16dc4aef11 29fbb6ca25 | IDENTISK |
| tools/ladan-2026-11-07/lang-20261107T154200.wav | `DUMP_SPLIT=sync node tools/dmxDump.mjs` | 22500/22500 | e562165e9b 51ea86e42d 322db5fd3d e4f35cea5a | e562165e9b 51ea86e42d 322db5fd3d e4f35cea5a | IDENTISK |
| tools/ladan-2026-11-07/lang-20261107T154200.wav | `DUMP_MOMENTS=1 DUMP_SPLIT=inline node tools/dmxDumpMoment.mjs` | 22500/22500 | 126f309f6e df8ac0dd8c 9cdcd39edd d821adec4b | 126f309f6e df8ac0dd8c 9cdcd39edd d821adec4b | IDENTISK |

Alla 6: IDENTISK (md5, rutor och ljussumma per lampa). Råutdata: `.arena/dubbla67/md5/` (bas-*, ny-*), körskript `.arena/dubbla67/kor.sh` (högst två samtidigt).

