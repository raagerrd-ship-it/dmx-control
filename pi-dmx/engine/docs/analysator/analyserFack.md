# analyserFack.ts - anteckningar

Flytten 2026-11-21 (arkitekturen a014 "varje sten får ett eget fack", `.arena/run-20261121-133215-s984029/r4/r4-m01.a014.solution.md`).
Filen är delad (samma byte i lotus-light-link) och importerar bara `analyserProfile.ts`, så att stenarna slipper importera `analyser.ts`.

## Rattarna

`sysEnv`, `env` och `numEnv` flyttade ordagrant ur `analyser.ts` (`numEnv` = förr `Analyser.secEnv`). `sysEnv` läser systemets prefix
(`DMX_`/`LOTUS_`), sedan det andra systemets prefix, sist profilens `sys`. `env` läser namnet utan prefix, sedan profilens `bare`.

## Konstanterna

Bara konstanter som fler än en del läser. En konstant som bara en sten läser flyttar in i den stenen när stenen får sitt steg.
`analyser.ts` re-exporterar `BASS_SPAN_DB`, `SECTION_AGG_HOP` och `BODY_CEIL_DB_S`, och dess statiska namn (`Analyser.BIG_EVERY` osv.)
pekar på samma konstant (ingen kopia).

## stabilise

Dagens `DOUBLE_FROM_START`-knep: ett talfält som börjar som heltal (0) skrivs först 0,5 och sedan värdet, så att V8 ger fältet
flyttalsform från start och inte deoptimerar när musiken börjar. Varje fack får sin egen lista med exakt de namn som flyttar dit;
startvärdena flyttar ordagrant (också 0,5-startvärdena). `tools/refaktor/startvarden.mjs` provar dem mot referensen.

## Typerna

`BeatGrid`, `AnalyserDetection`, `Cfg` (analysatorns färdiga konfiguration) och `Role`. `analyser.ts` re-exporterar dem.
