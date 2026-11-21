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

## HopOut, hoppfacket (steg 2)

Kärnans fält per hopp, nås som `this.f.hop` (i `analyser.ts` hissat till `const h = this.f.hop` överst i `process`, `fillFrame`,
`pushBig`, `drainBig`, `bigAgg`, `envSampleStep` och konstruktorn) och som `this.a.f.hop.x` i stenarna tills stenens eget steg.
`Analyser.role`, `.bigOn` och `.cfg` är getters hit (för motorn, lotus och verktygen; inte i heta vägen).

Namnbyten: `hRms`→`rms`, `hNow`→`now`, `hDt`→`dt`, `hKickFlux`→`kickFlux`, `hEnergy`→`energy`, `hNowWall`→`nowWall`, `hBody`→`body`,
`hLevel`→`level`, `hFlux`→`flux`, `hBreaking`→`breaking`, `hGated`→`gated`, `dSec`→`sec`, `dLvh`→`lvh`, `dConf`→`conf`, `dBpm`→`bpm`;
`dtHop`, `lvlSmooth`, `centSmooth`, `kickHit`, `role`, `bigOn`, `cfg` behåller namnet. `hopMs` och kopian `hHopMs` är ett fält:
startvärdet 0,5 (det heta fältets), konstruktorn skriver `dtHop * 1000` innan något läser det (enda läsarna, `silenceStep` och
`kickRefine`, kör efter den gamla skrivningen i `process`, och aldrig i workern). Startvärdena är dagens, ordagrant (0,5-knepet);
`lvlSmooth` och `kickHit` står i `HopOut`s `stabilise`-lista i stället för i `DOUBLE_FROM_START`.

Kvar på `Analyser` tills sin stens steg: `hKick`, `hKickAt` (kick, steg 10), `hIntensity`, `hInZone` (nivå, steg 11), `hInRiser` (uppbyggnad, steg 8).

### Skrivkartan: vem skriver varje fält, per tråd (DMX och lotus lika)

| fält | huvudtråden (`fast`, `bigOn`) | workern (`slow`, `bigOn`) | odelat (`all`) |
|---|---|---|---|
| `rms` | `process` | `drainBig` (`B_RMS`) | `process` |
| `now`, `dt` | `process` | – | `process` |
| `gated`, `kickFlux`, `energy` | `process` | – | `process` |
| `hopMs`, `dtHop` | konstruktorn | konstruktorn | konstruktorn |
| `lvlSmooth`, `centSmooth` | `process` | `drainBig` (`B_LVL`, `B_CENT`) | `process` |
| `kickHit` | `process` (trumkittet) | `drainBig` (`B_KICKHIT`) | `process` |
| `nowWall` | `process` | `drainBig` (`B_WALL`) | `process` |
| `breaking`, `level`, `flux` | `process` | – (`breaking` går som parameter till `bigAgg`) | `process` |
| `body` | `pushBig` (`BS_BODY`, workerns värde ett varv sent) | `drainBig` | `process` |
| `sec`, `lvh` | – | `drainBig` (`B_SEC`, `B_LVH`) | `process` före `dropStep` |
| `conf` | – | `drainBig` (`B_CONF`) | `process` före `profileStep` |
| `bpm` | – | `drainBig` (`B_ENVBPM`) | `envSampleStep` |
| `role`, `bigOn`, `cfg` | konstruktorn | konstruktorn | konstruktorn |

Ett streck = fältet har sitt startvärde i den tråden för alltid. Det är rätt så länge ingen sten i den tråden läser fältet; byter en sten
tråd måste kartan gås igenom (a014 b5, giftprovet).
