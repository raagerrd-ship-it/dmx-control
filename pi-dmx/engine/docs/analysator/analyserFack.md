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

Kvar på `Analyser` tills sin stens steg: `hInZone` (nivå, steg 11).

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

## Grundfacken (steg 3): LevelOut, SpectrumOut, KickOut, ClockOut

Bara data: fälten flyttade ur `Analyser` (och tre ur stenarna) in i facken, läsarna ändrade, logiken orörd. I `analyser.ts` hissas
facken överst i `process`, `fillFrame`, `pushBig`, `drainBig`, `bigAgg` och `envSampleStep` (`lv`, `sp`, `kk`, `ck`); i stenarna
`this.a.f.<fack>.x` tills stenens eget steg.

| fack | fält (förr) |
|---|---|
| `f.level` | `gain`, `envelope`, `activeMs`, `silentMs` (förr `levels.silentMs`), `intensity` (`hIntensity`), `levelCeil`, `inZone` (`levels.inZoneState`), `gainLocked` |
| `f.spectrum` | `bandAbs`, `bandDbRaw`, `bandLvl`, `bandOn`, `fbOn`, `bassOnRing`, `bassOnN` (Float32Array som förut), `sink` (`specSink`, `setSpectrumSink` skriver hit) |
| `f.kick` | `kick` (`hKick`), `kickAt` (`hKickAt`, startvärdet 0,5), `beatAnchorMs`, `pendingKickMs`, `lastKick` (förr `kicks.lastKick`), `kfPrev`, `kfPrev2`, `dbgKick` |
| `f.clock` | `bpm` (`localBpm`), `conf` (`localBpmConfidence`), `phaseMs`/`phaseConf` (`beatPhaseMs`/`beatPhaseConf`), `src` (`beatSrc`: samma objekt, motorns cfg eller ett eget `{ beat }`) |

Startvärdena är dagens, ordagrant (`envelope` och `src` saknar startvärde som förut och sätts i konstruktorn). `DOUBLE_FROM_START`-namnen
flyttade till facken: `activeMs` (nivå), `pendingKickMs`, `kfPrev`, `kfPrev2`, `beatAnchorMs`, `lastKick` (kick; kickens egen lista togs bort),
`conf` (klockan). Kvar på `Analyser` tills sina steg: `secSpecDirty`, `bassOnPeak` (blir räknare i spektrums steg 12), `dbgRms` (kickens steg 10).
Getters för verktygen: `Analyser.bandOn` (`konsertReplay.mjs`), `Analyser.beatSrc` (`feedProof.mjs`).

## De små stenarnas fack (steg 4): BassOut, RiserOut, DropOut, CharacterOut

Bara data, som steg 3. Hissade i `analyser.ts` som `bo`, `ri`, `dp`, `cp`; stenarna skriver sitt eget fack som `this.a.f.<fack>.x` tills sitt steg.

| fack | fält (förr) |
|---|---|
| `f.bass` | `beHi`, `beRef`, `beShort` (förr `bass.*`), `bassline` (`profBassline`), `onsetsPerBeat` (`bassOnsetsPerBeat`) |
| `f.riser` | `buildUp`, `inRiser` (`hInRiser`) |
| `f.drop` | `dropCount`, `miniDropCount`, `buildStartCount`, `dropCand`, `secBodyRet`, `dropDemoted`, `dropSpaced`, `dropRiseDb`, `nearDropDb`, `nearDipDb`, `liftDb`, `stopCount`, `stopS`, `lastDropMs` (förr `drop.*`), `bodyUnderDb` (förr på `Analyser`) |
| `f.character` | `profile` (förr `character.outProfile`); ramens `profile` är samma objekt |

`DOUBLE_FROM_START`-namn som flyttade: `bassline`, `onsetsPerBeat` (bas), `buildUp` (uppbyggnad), och ur dropens lista `lastDropMs`, `dropRiseDb`,
`nearDropDb`, `nearDipDb`, `liftDb`, `stopS`. Kvar privat i stenen/kärnan: `beHiShort`, `blAccum`, `blKickSeq` (basens steg 7), dropens arbetsminne.
Getters: `Analyser.bodyUnderDb` (klockan via `HopTarget`, `ensamTakt.mjs`), `Analyser.bassOnsetsPerBeat` (`basslineProbe.mjs`).
`tools/ensam.mjs --ut` läser fält på stenen (`this[f]`); dropens räknare ligger nu i facket, så `--ut dropCount` fungerar inte förrän
verktyget läser facken (steg 6).

## Sektionens fack (steg 5): SectionOut

Bara data. De 17 publicerade fälten flyttade ur `Analyser` till `f.section` med samma namn och dagens startvärden: `section`, `sectionStartMs`,
`sectionIndex`, `sectionTier`, `prevSection`, `levelVsHighDb`, `repeatSim`, `repeatAgoMs`, `repeatSection`, `repeatTier`, `repeatHighAtMs`,
`repeatHighEndAtMs`, `expectHighMs`, `expectSource`, `secBuildAt`, `secBuildSeen`, `boundaryNov`. `DOUBLE_FROM_START`-namnen som flyttade:
`expectHighMs`, `levelVsHighDb`, `sectionStartMs`, `secBuildAt`, `secBuildSeen`, `repeatSim`, `repeatAgoMs`. Hissat som `sc` i `process`,
`fillFrame`, `pushBig` och `pullSlowState`; sektionen och basen skriver/läser `this.a.f.section.x` tills sitt steg. Sektionens privata delar
(`secAgg`, `secSpecHop`, `secDump`, `dbgSecBlock`) står kvar på `Analyser` till steg 13. Getter: `Analyser.boundaryNov` (`boundaryBench.mjs`).

## Drop efter kontraktet (steg 9)

`DropReads` (hop: `dtHop`, `nowWall`, `body`, `lvlSmooth`, `sec`, `lvh`, `wallNow`; spectrum: `bandDbRaw`; level: `activeMs`; riser: `buildUp`), eget fack `f.drop`.
`HopOut` fick `wallNow` (analysatorns väggklocka, `makeFack(() => this.wallNow())`): stenarna loggar med den (`[dropfire] wall …`) utan att nå `Analyser`.
Dropens transport (`pack`/`unpack`/`resume`) ligger i stenen, ordagrant de gamla raderna i `drainBig`, `pushBig` och konstruktorns omstart.
Rattarna `BODY_RISE_DB`, `BODY_GONE_MIN_MS`, `DROP_QUALITY_DB`, `DROP_RISE_LOW_DB`, `DROP_UNDERPEAK_MIN`, `MINI_SPACING_MS`, `DROP_TRACE` står i `analyserDrop.ts`
(bara drop läser dem; anteckningarna om dem står kvar i `analyser.md`).
