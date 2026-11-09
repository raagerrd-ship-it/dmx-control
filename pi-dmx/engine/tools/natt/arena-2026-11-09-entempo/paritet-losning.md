# LOTUSPARITET 0: den delade analysatorn med lotus väg bakom profilen (2026-11-09)

Bas: e451800 (EN KLOCKA). Lotus nuvarande kopia = `backup/fore-entempo-20261109` (analyser.ts b00a4763, split.ts f4993b2b, slowWorker.ts cfe40ad4).

## Profilvärdet på ETT ställe: `sys.BEAT_FEED`

`src/analyser.ts:49` `const OWN_TEMPO = clockMode() === null;` och `clockMode()` (`analyser.ts:3961`) läser `sysEnv('BEAT_FEED')`. Det är samma värde som redan styr klockan i `createAnalyser` (`:3896`) och `hopFeedFactory` (`:3956`).

| BEAT_FEED | vem | tempo |
|---|---|---|
| saknas (lotus profil) | `OWN_TEMPO = true` | analysatorns egen temposökning (computeBpm, scoreEnv, alignScore, shiftDetect). Skuggan matas via setBeatGrid som förr. Ingen klocka, ingen taktväg. |
| `'slow'` / `'inline'` (DMX profil `'slow'`) | `OWN_TEMPO = false` | klockan (analyserClock.ts) är enda tempot. Den egna sökningen anropas aldrig. |

Vad som ligger bakom `OWN_TEMPO` (fil:rad i `.arena/paritet/src/analyser.ts`):
- `:1107-1297` scoreEnv (`:1114`), alignScore (`:1228`), shiftDetect (`:1262`). Det här är den gamla koden ordagrant och används bara på lotus väg.
- `:1651` envStep: `if (OWN_TEMPO) { this.envStepOwn(); return; }`. `:1657-1671` envStepOwn är det gamla env-steget (TEMPO_HOLD, stride, computeBpm).
- `:1743` pullSlowState: med OWN_TEMPO tar snabba sidan localBpm, conf och bpmF från långsamma sidans tillstånd, som förr.
- `:1920` långsamma sidan läser klockans tempo ur env-recordet (R_CLOCK) bara när `!OWN_TEMPO`.
- `:1947-2491` tempoGramStep (`:1951`), bpmHistSort, offBeatStep och computeBpm (`:1990`). Gamla koden ordagrant, används bara på lotus väg.
- `:3125-3128` kickspärren. Med OWN_TEMPO gäller den gamla formeln på localBpm, utan KICK_CAP_MS. Med klockan gäller rutnätet med tak 330.
- `:3146` och `:3273` rutnätsgrindarna. Med OWN_TEMPO gäller `localBpmConfidence > 0.5` som förr, med klockan `grid.confidence > 0.5`.

Det som inte gates gör ingenting på lotus väg. R_CLOCK skrivs i env-recordet men läses inte. `trackBoundaries++` är bara en räknare. `setClock` i process() körs bara med hopLane, och hopLane finns bara med BEAT_FEED 'slow'. Klockan i process() finns bara när clockMode är satt.

## Bevis (md5)

### 1. Lotus: gammal (backup-taggens tre filer + lotus profil) mot ny (paritet/src delade filer + lotus profil), lotus tsconfig
Byggen: `.arena/paritet-lotus-gammal`, `.arena/paritet-lotus-ny`. Utdata finns i `bevis/lotus-gammal.txt` och `bevis/lotus-ny.txt`.

| wav (120 s) | läge | gammal | ny |
|---|---|---|---|
| lang-20261021T203952 | all | 17578ad3b8fc | 17578ad3b8fc |
| lang-20261021T203952 | inline | 17578ad3b8fc | 17578ad3b8fc |
| lang-20261021T203952 | sync | 17578ad3b8fc | 17578ad3b8fc |
| lang-20261011T191741 | all | 05529e96d5bd | 05529e96d5bd |
| lang-20261011T191741 | inline | 05529e96d5bd | 05529e96d5bd |
| lang-20261011T191741 | sync | 05529e96d5bd | 05529e96d5bd |

`tools/analyserParity.mjs --style lotus --secs 120` på lang1021: **0 / 45 000 avvikande hop** och 0 avvikande loggrader. Med `--grid` blev det också **0 / 45 000** (`bevis/parity-lotus*.txt`).
Kontroll: e451800:s filer med lotus profil ger 44 292 / 45 000 avvikande hop (`bevis/kontroll-e451800-lotus.txt`, bygget `.arena/paritet-lotus-e451800`). Testet skiljer alltså på riktigt.

### 2. DMX: engine/dist (e451800) mot .arena/paritet/dist, hela filerna (`bevis/dmx-engine.txt`, `bevis/dmx-paritet.txt`)

| wav | verktyg | engine/dist md5 per lampa | paritet/dist |
|---|---|---|---|
| lang-20261021T203952 | `DUMP_SPLIT=sync dmxDump` | 46fb14899f bf878647d9 5290728035 d1c2b95f02 | identisk |
| lang-20261021T203952 | `DUMP_MOMENTS=1 DUMP_SPLIT=inline dmxDumpMoment` | 58709931ba 84aea23a0e 5c29b4f653 41def0ef39 | identisk |
| lang-20261107T154200 | `DUMP_SPLIT=sync dmxDump` | 847cfbbd02 e3046d2109 f3814bafff b57283b4bb | identisk |
| lang-20261107T154200 | `DUMP_MOMENTS=1 DUMP_SPLIT=inline dmxDumpMoment` | e2300e4059 70797d3c06 552f20a51e ce0fea57e7 | identisk |

Även sum, frames och [dropfire]-raden är lika. Det enda som skiljer är cpuUsPerHop, som är en tidsmätning. Alla andra .js i paritet/dist är byte-lika med engine/dist.

### 3. `python tools/arena/tvavagar.py --snabb .arena/paritet`
`SNABBKOLL .arena\paritet 33 s: md5 120 s lang1021 IDENTISK` (`bevis/snabb.txt`)

## Ändrade delade filer (md5 CRLF->LF)

| fil | e451800 | paritet |
|---|---|---|
| analyser.ts | 864613b1adfefeebe2715fecc0657bbf | **8e22d6d0760dd7fbd1550e66cc327f37** (ändrad) |
| split.ts | 4b5312c13de60f2a7d978a3b1d7ff6b6 | oförändrad |
| slowWorker.ts | ab875f44c6cdc8a687c9ed8805d7501e | oförändrad |
| analyserClock.ts | c7525c9a3857dc47b63d7a575b0a01ac | oförändrad |

analyserProfile.ts är oförändrad i båda repona. Lotus profil saknar BEAT_FEED och hamnar därför på lotus väg. DMX har `'slow'` och kör klockan.

Kvar att göra, inte gjort här: lägg in analyser.ts i engine/src, kör `analyser_shared.py --write` för ANALYSER_SHARED.md5 och porta de fyra delade filerna till lotus-light-link. Lotus behöver då också analyserClock.ts, eftersom analyser.ts importerar den statiskt. Ingenting är skrivet i engine/src, engine/dist, git eller lotus-light-link.
