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
`conf` (klockan). Kvar på `Analyser` tills sina steg: `secSpecDirty`, `bassOnPeak` (blir räknare i spektrums steg 12), `dbgRms` (kickens steg 10, se nedan).
Getters för verktygen: `Analyser.bandOn` (`konsertReplay.mjs`), `Analyser.beatSrc` (`feedProof.mjs`).

## De små stenarnas fack (steg 4): BassOut, RiserOut, DropOut, CharacterOut

Bara data, som steg 3. Hissade i `analyser.ts` som `bo`, `ri`, `dp`, `cp`; stenarna skriver sitt eget fack som `this.a.f.<fack>.x` tills sitt steg.

| fack | fält (förr) |
|---|---|
| `f.bass` | `beHi`, `beRef`, `beShort` (förr `bass.*`), `bassline` (`profBassline`), `onsetsPerBeat` (`bassOnsetsPerBeat`) |
| `f.riser` | `buildUp`, `inRiser` (`hInRiser`) |
| `f.drop` | `dropCount`, `miniDropCount`, `buildStartCount`, `dropCand`, `secBodyRet`, `dropDemoted`, `dropSpaced`, `nearDropDb`, `nearDipDb`, `liftDb`, `stopCount`, `stopS`, `lastDropMs` (förr `drop.*`), `bodyUnderDb` (förr på `Analyser`) |
| `f.character` | `profile` (förr `character.outProfile`); ramens `profile` är samma objekt |

`DOUBLE_FROM_START`-namn som flyttade: `bassline`, `onsetsPerBeat` (bas), `buildUp` (uppbyggnad), och ur dropens lista `lastDropMs`, `dropRiseDb`,
`nearDropDb`, `nearDipDb`, `liftDb`, `stopS`. Kvar privat i stenen/kärnan: `beHiShort`, `blAccum`, `blKickSeq` (basens steg 7), dropens arbetsminne.
Getters: `Analyser.bodyUnderDb` (klockan via `HopTarget`, `ensamTakt.mjs`), `Analyser.bassOnsetsPerBeat` (`basslineProbe.mjs`).
`tools/ensam.mjs --ut` läser fält på stenen (`this[f]`); dropens räknare ligger nu i facket, så `--ut dropCount` fungerar inte förrän
verktyget läser facken (steg 6).

## Sektionens fack (steg 5): SectionOut

Bara data. De 17 publicerade fälten flyttade ur `Analyser` till `f.section` med samma namn och dagens startvärden: `section`, `sectionStartMs`,
`sectionIndex`, `sectionTier`, `prevSection`, `levelVsHighDb`, `repeatSim`, `repeatAgoMs`, `repeatTier`, `repeatHighAtMs`,
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

## Kicken efter kontraktet (steg 10)

`KickReads` (hop: `kickFlux`, `energy`, `now`, `hopMs`, `rms`, `wallNow`; level: `gain`, `envelope`, `gainLocked`; clock: `src`), eget fack `f.kick`.
`kickStep()` returnerar `void` och skriver `f.kick.kick` (förr kärnans `kk.kick = kick` senare i hoppet; ingen läser fältet däremellan).
`anchorStep()` står där kärnans rader stod (efter `envSampleStep`, före utjämningen), samma satser i samma ordning: `kickAt = 0`, förfiningen om
`pendingKickMs > 0`, ankaret om `kick`, sist `kfPrev2`/`kfPrev`. Kärnans sista skrivning `kk.kickAt = kickAtMs` är borta (samma värde).
`setVirtualClock` vid hopp: `kicks.reset()` (`lastKick`, `pendingKickMs`, `beatAnchorMs`), `f.clock.resetPhase()` (ny metod i `ClockOut`), `sections.sectionReset()`,
samma plats och ordning som förut. `dbgRms` borta: kicken läser `f.hop.rms` (samma värde, skrevs på raden före). `KICK_NOGATE`, `KICK_COOLDOWN_MS`, `KICK_EFLOOR`
är modulkonstanter i `analyserKick.ts` (förr statiska på `Analyser`; bara kicken läser dem).
`tools/ensam.mjs tappa kicks kickStep` går inte att spela upp (gick inte före steget heller): rutnätet `f.clock.src.beat` är ett objekt som dyker upp under körningen och tappas inte.

## Nivån efter kontraktet (steg 11)

`LevelReads` (hop: `rms`, `now`, `dt`, `hopMs`, `dtHop`, `gated`, `lvlSmooth`, `role`, `cfg`; clock: `bpm`, `zeroBpm`), eget fack `f.level`, kommandot `LevelCmd.flagSlow`
(Analysers `cmd = { flagSlow }`, bundet en gång). Tystnad 10 s nollar tempot med kommandot `f.clock.zeroBpm()` (ny metod i `ClockOut`), likaså `F_SIL10` i workern.
Kärnans kopior borta: `lv.intensity = intensity` (två rader i `process`, samma värde som `intensityStep` skrev) och `hInZone` (ramen läser `f.level.inZone`;
ingen skriver fältet mellan `zoneStep` och ramen i samma instans).

## Spektrumet efter kontraktet (steg 12)

`SpectrumReads` (hop: `lvlSmooth`, `gated`, `cfg`, `bigOn`; level: `activeMs`), eget fack `f.spectrum`. `bigCounter` är stenens privata fält:
`bands.bigTick()` (`if (++bigCounter >= BIG_EVERY) bigStep()`) står på kärnans två gamla platser (`process` utan `bigOn`, `drainBig`).
`PEAK_DECAY` är modulkonstant i stenen (förr statisk på `Analyser`; bara spektrumet läser den). Omstarten läser `specN` med `bands.resume(st)`.
Flaggorna blev räknare i `SpectrumOut`: `bigN` (ett steg per stor-FFT, sist i `bigStep`; förr `secSpecDirty = true` per band) och `bassOnPeaks`
(förr `bassOnPeak = true`). Läsaren minns senast sedda: `sections.specSeen` (start −1 = smutsigt, som förr `secSpecDirty = true`) och `sections.bpkSeen`
(start 0, som förr `false`). Smutsigt ⇔ `bigN !== specSeen`; flera toppar mellan två läsningar ger ett `bpk`, som förr. `specSeen` läses också av kärnans
`bigAgg` (samma fält, som förr den delade flaggan) tills sektionens steg flyttar `bigAgg` in i stenen.

## Sektionen efter kontraktet (steg 13)

`SectionReads` (hop: `role`, `bigOn`, `breaking`, `rms`, `flux`, `nowWall`, `dtHop`, `centSmooth`, `wallNow`; level: `activeMs`, `intensity`; kick: `kick`;
clock: `bpm`, `phaseMs`; drop: `dropCand`, `secBodyRet`; riser: `buildUp`; spectrum: `bigN`, `bandDbRaw`, `bandAbs`, `bassOnRing`, `bassOnN`, `bassOnPeaks`), eget fack `f.section`.
Sektionens privata delar och ledningen mellan trådarna ligger i stenen (förr på `Analyser`):

- `agg` (förr `secAgg`, insamlarens summor), `secSpecHop`, `specSeen`/`bpkSeen` privata; `secDump`/`dbgSecBlock` (körbankens krokar) nås som `an.sections.x`.
- `bigAgg(…)` ordagrant ur kärnan (workern med `bigOn`, anropas i `drainBig`).
- `toRecord(r, o)`: recordets `R_SEC_*` och `R_DROPS`/`R_ACTIVE`/`R_BUILD` plus nollningen (förr i `pushSlowRecord`), på samma plats.
- `fromRecord(r, o)`: sektionsdelen sist i `slowStep`, ordagrant. `wire = { drops, active, build }` är workerns indata: `drops` förr `secVDrops`,
  `active`/`build` skrevs förr i nivåns och uppbyggnadens fack (bara i workern utan `bigOn`, där ingen annan läser dem).
- Läsarna `dropsNow()` (slow: `wire.drops`, annars `dropCand + secBodyRet`), `activeNow()`, `buildNow()` (slow utan `bigOn`: `wire`, annars facken).
- `resume(st)`: `wire.drops = st[BS_CAND]` (förr `secVDrops = drop.dropCand` direkt efter `drop.resume`).
- `pack(s)`/`unpack(s)`: `S_SECTION` … `S_LVL_HIGH` i tillståndsblocket; `|| 'intro'` och `|| ''` följer med ordagrant.
- `carry()`: SECTION_CARRY-blocket i `hintTrackChange` (ratten läses i stenen, därför inget argument).
- Rattarna `SECTION_SCORE_F32`, `SECTION_CARRY`, `SECTION_WIN` (`RANK_WIN`), `SECTION_RUN`, `SECTION_RUN_IN`, `SECTION_REPEAT`, `SECTION_EARLY_DB`, `SECTION_DUMP`
  är modulkonstanter i `analyserSection.ts` (förr statiska på `Analyser` och `export const SECTION_SCORE_F32`); `Analyser.BE_SPAN_DB`, `BE_MEM_BEATS`, `BASSON_LEN`,
  `BODY_HIGH_MS/DB` borta (ingen läser dem längre; värdena i facket). `stabilise(secRank)` sist i stenens konstruktor (förr sist i Analysers).

`tools/ensam.mjs tappa sections sectionHop` gick inte att spela upp före steget (AVVIKER i 162 337 steg) och provas inte här.

## Kedjan (steg 14): `| null`, `off()`, `neutral()`

- De avstängbara stenarna (`kicks`, `bass`, `drop`, `riser`, `character`, `sections`) är `X | null` i `Analyser` och anropas med `?.` överallt,
  också deras transport (`pack`/`unpack`/`resume`, `toRecord`/`fromRecord`, `rates`, `reset`, `carry`). Är stenen av är transporten av, i båda trådarna.
  Grundstenarna `levels` och `bands` saknar `| null`. Vakt: `grep -nE "this\.(kicks|bass|drop|riser|character|sections)\.[A-Za-z]" src/analyser.ts` = 0.
- Prova utan en sten (på en backup-gren, döm på bänken): byt kedjeraden mot `off('namn')`, eller `off('namn', this.f.<fack>)` där facket har `neutral()`.
  `off()` kör `neutral()` och loggar `[analysator] sten av: <namn>` (en rad per `Analyser`, alltså en per tråd).
- `neutral()` finns där startvärdet inte är det neutrala:
  `SectionOut` (`section = ''`: okänd, `sectionCode('') = 0`; med `'intro'` skulle drops lugn-veto alltid gälla),
  `BassOut` (`beHi = beRef = 0`: `bassLevel = 1` i stället för NaN),
  `KickOut` (`kickAt = 0`: startvärdet 0,5 skulle klockan läsa som en kick vid 0,5 ms, `analyserClock.ts` `frame.kickAtMs > 0`).
- Provet: `node tools/refaktor/avstangning.mjs [sek] [wav]` bygger en kopia per sten under `.arena/flytten/s14/av/` (DMX och lotus profil) och kör
  odelad, inline och inline med omstart. Krav per ruta: stenens ramfält neutrala, inget NaN, samma `typeof` som påslaget, inget undantag, loggraden syns,
  för sektionen 0 `[dropcalm]` med DROP_TRACE. Samma prov på påslaget bygge ska fälla (kontrollkolumnen).

## Den långsamma delen (steg 15): `slowPart()`

- `slowPart()` i `analyser.ts` = `h.body` ur banden 0–2, `drop?.dropStep()`, `riser?.riserStep()`, `character?.profileStep()`. Anropas på två ställen:
  `drainBig` (workern med `bigOn`, värdena ur hop-recordet) och `process` utan `bigOn` (odelat). En ny sten i den långsamma vägen läggs till här, på ett ställe.
- Anroparen sätter först `h.sec`, `h.lvh` och `h.conf` (ur recordet resp. sektionens/klockans fack). `h.conf` sattes förr mellan uppbyggnaden och karaktären;
  drop och uppbyggnad läser inte `conf` (`DropReads`/`RiserReads`), så tidigare är samma sak (bevis.sh).
- `bigRingPush` + `bigTick` står kvar hos anroparen, före `slowPart`. I `process` kör de före `fastBandStep`, trumkittet och `zoneStep`, i `drainBig` efter `zoneStep`.
  Att flytta in dem i `slowPart` (planens skiss) är byte-identiskt i båda profilerna men inte med `FAST_BANDS=0`: där läser trumkittet `bandOn`, som `bigStep` skriver
  (prov: 53 933 av 56 250 hopp avvek i `drum.snare`/`drum.hat`, `.arena/flytten/s15/B`).

## Basen före pushBig (steg 17)

`bassEnergyStep` står i `process` före `if (big)` (förr i `fillFrame`), så att basens fält (`beHi`, `beRef`, `beShort`, `energy`) är färdiga innan
hopprecordet skrivs: en sten i workern kan få dem samma hopp. Flytten kommuterar: basen läser `hop.dtHop`, `clock.bpm` och `section.section`, och inget av
dem skrivs mellan de två platserna (`setClock` kör före, i början av `process`; sektionen packas upp före, i `pullSlowState`; banden 0–1 skrivs av
`fastBandStep`/`bigStep` före). Ingen läser basens fält däremellan (`pushBig` packar upp drop/uppbyggnad/karaktär, `slowPart` läser bara `bass.bassline`).
Inget värde kommer senare: ramen läser samma tal på samma hopp. Mätt av h1 (hålets arena) 0 av 537 981 hopp, och av `bevis.sh` i steget.

## Trådarna (steg 18a): en tagg per fält, läsningarna kontrolleras av tsc

Varje fack har en rad `static readonly TRAD = { fält: 'tagg', … } as const satisfies Taggat<XOut>` bredvid fälten. Taggen säger var fältet
skrivs när analysatorn är delad (huvudtråden `fast` + workern `slow`, med `bigOn` som i båda profilerna):

| tagg | skrivs | syns för en sten i | korsar trådarna |
|---|---|---|---|
| `S` | huvudtråden | huvudtråden | nej |
| `L` | workern | workern | nej |
| `IN` | huvudtråden, färdigt före `pushBig` | båda (samma hopp) | hopprecordet (B), tempot recordet (R) |
| `UT` | workern | båda (huvudtråden när blocket packats upp) | storblocket (BS), sektionen och tempot tillståndsblocket (S) |
| `K` | konstruktorn | båda | nej (samma bygge i båda trådarna) |

`BÅDA` (samma steg räknat i båda trådarna, hålets q1) finns inte: det vore två kopior av samma storhet. Odelat (`all`) kör allt i en tråd; taggarna gäller det delade läget.

- `satisfies Taggat<XOut>`: ett nytt fält utan tagg, eller en tagg för ett fält som inte finns, ger tsc-fel. Metoder (`neutral`, `zeroBpm`) taggas inte och syns överallt.
- Ett inbäddat objekt (`CharacterOut.profile`) har en tagg per fält i objektet.
- Stenens läsning skrivs `Ser<tråd, fack, fält>` i dess `XReads` (förr `Readonly<Pick<XOut, …>>`): `hop: Ser<'L', 'hop', 'kickHit' | 'conf'>`.
  Ett fält som inte syns i tråden ger `TS2344 … does not satisfy the constraint` med listan över det som syns. En sten med metoder i båda trådarna
  (basen, nivån, spektrumet, sektionen) har en `Ser` per tråd på samma rad (`Ser<'S', …> & Ser<'L', …>`); kommentaren över `XReads` säger vilka metoder som kör var.
- Kärnan (`analyser.ts`) läser facken direkt och kontrolleras inte av taggarna.

Kända avvikelser i dagens kod (inte ändrade):
- (Rättat i steg 21: `level.levelCeil` räknades förr av `zoneStep` i båda trådarna; nu bara i huvudtråden, taggen `IN`.)
- Grenarna utan `bigOn` (`SECTION_AGG=env`, `FAST_BANDS=0`) följer inte taggarna (där kör stor-FFT:n i huvudtråden). De tas bort i steg 19.

## Borttagen sten syns (steg 18a): `finns` och `stenarAv`

- De sex avstängbara stenarnas fack (`kick`, `bass`, `drop`, `riser`, `character`, `section`) har `finns = true` (tagg `K`).
- `off(namn, this.f.<fack>)` tar nu alltid facket: kör `neutral()` om det finns, sätter `finns = false` och loggar `[analysator] sten av: <namn>`.
- Ramen har `stenarAv` (skrivs en gång i konstruktorn, 0 per hopp): en bit per avstängd sten, 1 kick, 2 bas, 4 drop, 8 uppbyggnad, 16 karaktär, 32 sektion.
  Ett 0 i ett ramfält betyder "stenen säger 0" när biten är 0, och "ingen sten" när den är satt.
- En sten som måste skilja de två fallen läser `<fack>.finns` (tagg `K`, syns i båda trådarna).

## Platserna ur taggarna (steg 18b)

`split.ts` har bara kärnans platser kvar som konstanter (`B_SEQ`, `B_N`, `B_ENVF`; `BS_SEQ`, `BS_SPEC_N`, `BS_SKIPPED`; `S_REC_SEQ` … `S_LOST_FLAGS`;
recordets `R_*`). Fackens platser räknas fram en gång vid laddning med `platser(tagg, fack, först)` (analyserFack.ts):

| block | taggen | facken | förr |
|---|---|---|---|
| `B` hopprecordet (huvud → worker, per hopp) | `IN` | alla utom `clock` | `B_RMS` … `B_CONF`, `B_ENVBPM` |
| `R` recordet (huvud → worker, per env-sampel) | `IN` | `clock` | `R_CLOCK`, `R_CLOCK_CONF` |
| `BS` storblocket (worker → huvud, per hopp) | `UT` | alla utom `clock`, `section` | `BS_BODY` … `BS_BUILDSTART` |
| `S` tillståndsblocket (worker → huvud, per record) | `UT` | `clock`, `section` | `S_PHASE_MS` … `S_BUILD_SEEN` |

Platsen heter som fältet: `B.hop.rms`, `BS.drop.dropCount`, `BS.character.profile.punch`, `S.section.section`. Längderna (`BIG_REC_LEN` 16, `REC_LEN` 37,
`BIG_STATE_LEN` 24, `STATE_LEN` 26) räknas fram och är desamma som förut; ordningen inom blocken är TRAD-radernas. Vid laddning kontrolleras att varje
`IN`- och `UT`-fält har fått en plats (annars startar analysatorn inte). Pack- och uppackraderna står kvar handskrivna där de stod (kärnans i `pushBig`/`drainBig`,
stenarnas i deras `pack`/`unpack`/`resume`), så den heta vägen är samma raka laddning och lagring; platsobjekten är frysta och hissade till modulkonstanter
(`const P = BS.drop`, `const Bh = B.hop`). En plats för ett fält som inte har taggen finns inte i typen: `B.bass.energy` ger tsc-fel tills taggen är `IN`.

Ändringar i kärnan för att taggarna ska stämma (samma värden, bevisat av `bevis.sh`):
- `h.sec`, `h.lvh`, `h.conf` skrivs i `process` före `pushBig` i alla roller (förr bara odelat; `pushBig` packade `section.section` m.fl. direkt).
- `h.bpm = ck.bpm` i `envSampleStep` i alla roller och följer hopprecordet varje hopp (förr `bigEnvBpm` bara i hopp med env-sampel). Workern läser det bara i
  `stepBassline`, som fortfarande bara kör när `B_ENVF` = 1, och då är talet detsamma. `bigEnvBpm` är borta.
- Workern packar upp hela hoppets IN-fält på ett ställe, efter basens `accumulate` (som läser förra hoppets `kickHit`, som förut) och före `stepBassline`.
  Det gäller nu också `level.intensity`, `kick.kick` och `hop.breaking`, så sektionens `bigAgg()` läser facken i stället för fyra argument.
- `drop.dropCand` packas nu också upp i huvudtråden (taggen `UT`); ingen läser det där i det delade läget.

## Skuggprovet (steg 18b): `tools/splitProof.mjs`

Ramfälten jämförs som förut (unionen av alla nycklar, rekursivt; ett nytt ramfält kommer med av sig självt och måste stå i baslinjen `VANTAT` för att få skilja).
Nytt: i det delade läget (inline) jämförs dessutom varje fackfält med taggen `IN` eller `UT` mellan huvudtråden (`an.f`) och workern (`an.inlinePeer.f`),
efter `process()` i varje hopp, med `Object.is`; tempots `R`-fält bara i hopp då ett record skrevs. Listan läses ur `FACK[n].TRAD` i bygget, så ett nytt fält
eller en ny tagg provas utan att någon skriver provet. Skiljer ett fält ljuger taggen (eller transportraden saknas, eller fältet skrivs efter `pushBig`),
och provet säger `FEL tråd IN bass.energy …` och `DELNING FEL`.

## Grenarna utan bigOn borta (steg 19)

Backup-tagg `backup/fore-bigon-bort-20261122`. Ingen profil körde dem (båda profilerna har `SECTION_AGG=hop`, `FAST_BANDS=1`), och alla tre ändringsproven
hittade fel just där. Nu gäller:

- Delat läge har alltid stora vägen: `fast`/`slow` utan stora vägens buffertar kastar i konstruktorn (`createSplitBuffers` skapar dem alltid), så `bigOn` = delat.
  Odelat (`all`) är kvar som förut: hela kedjan i `process`, sektionen per hopp i `sectionAggStep`.
- De snabba banden (`fastBandStep`, `fbLvl`/`fbAbs`/`fbOn`/`fbDbRaw`) gäller alltid i ramen och trumkittet; `Analyser.FAST_BANDS` borta.
- Sektionen går alltid per hopp: `SECTION_AGG_HOP` borta (också re-exporten ur `analyser.ts`), `sectionFlushAgg`, `toRecord`, recordets `R_SEC_*`/`R_DROPS`/`R_ACTIVE`/`R_BUILD`
  (recordet 37 -> 14 platser, ringen 296 -> 112 kB), `wire.active`/`wire.build`, `activeNow`/`buildNow` (nu `lv.activeMs`/`ri.buildUp`), `fromRecord()` utan argument.
- Spektrumets basonset (`bassOnRing`, `bassOnN`, `bassOnPeaks`, `BASSON_*`) fanns bara för den grenen och är borta, likså sektionens `bpkSeen` och läsningarna
  `flux`, `bandAbs`, `bassOn*` i `SectionReads`. Kvar (alltid 0 i dag, inte städat): sektionens `bon`/`bpk`/`flux`/`rms4`-summor och rangtermerna med vikt 0.
- `slowWorker.ts`: en vänteslinga (den utan stora vägen är borta).
- Profilraderna `SECTION_AGG` och `FAST_BANDS` saknar läsare (står kvar, som `SIL_CLEAR_PENDING`). `DMX_SECTION_AGG=env`/`DMX_FAST_BANDS=0` gör inget längre;
  röktestet med dem utgår.

## Ett anrop per sten (steg 20)

Kicken: `kicks.hopStep()` = `kickStep()` + `anchorStep()`, där `kickStep` stod. `anchorStep` flyttade förbi `silenceStep`, env-ackumuleringen, basens
`accumulate` (odelat) och `envSampleStep` (med `pushSlowRecord`, som inline/sync kör workern och `pullSlowState`: skriver `clock.phaseMs`/`phaseConf` och sektionen).
Ankaret läser `kick`, `pendingKickMs`, `kfPrev`/`kfPrev2`, `hop.kickFlux`, `hop.hopMs`, `wallNow`; inget av det skrivs däremellan, och ingen läser ankarets fält
däremellan (recordet packar bara klockan). `wallNow` är samma hopp: i proven samma virtuella tid, live några µs tidigare, aldrig ett hopp senare.

Nivån: två anrop, `levels.rawStep()` (AGC om olåst och över brusgolvet, sedan tystnaden) där AGC:n stod, `levels.smoothStep()` (intensiteten, sedan nivåtaket)
där intensiteten stod. Tystnaden flyttade förbi `level = rms * gain` och `kicks.hopStep()` (läser inte `silentMs`; zeroBpm skriver `clock.bpm`, kicken läser `clock.src`)
och står kvar före `envSampleStep` (flaggan F_SIL350/F_SIL10 hamnar i samma hopps record, `zeroBpm` före `h.bpm = ck.bpm`). `zoneStep` flyttade förbi
stora ringen (odelat), `fastBandStep`, trumkittet och `wallNow`: inget av dem läser `levelCeil`/`inZone` (spektrumet läser bara `activeMs`), och `lvlSmooth`/`dtHop`
ändras inte efter utjämningen. `agcStep`, `silenceStep`, `intensityStep`, `kickStep`, `anchorStep` är privata; `zoneStep` är kvar publik (workern, `drainBig`).

Det som stoppar ett enda nivåanrop: `const level = Math.min(1, rms * lv.gain)` (`process`, rad 682) läser `level.gain` som AGC:n just skrev, och
`h.lvlSmooth = ema(h.lvlSmooth, level, aAtt, aRel)` (rad 701) är det `intensityStep` och `zoneStep` läser. AGC:n måste alltså före och intensitet/tak efter
kärnans två rader. Ett anrop kräver att utjämningen av `lvlSmooth` (hoppfackets fält, `IN` till workern) flyttar in i nivå-stenen: ett ägarbyte, inte en omflyttning.

## Nivåtaket bara i huvudtråden (steg 21, ägaren 11-22: "Lägg in.")

`zoneStep` körs bara i huvudtråden (i `smoothStep`, privat). `level.levelCeil` har taggen `IN`: `pushBig` packar den, `drainBig` packar upp den med de andra
IN-fälten (hopprecordet 16 -> 17 platser). Workerns enda läsare är uppbyggnaden (`lc` i `riserStep`). `inZone` är `S` (bara ramen). `LevelReads` har ingen `L`-del längre.

Det här ändrar bara beteendet efter en omstart av workern. Förr började en ny worker om på fackets startvärde 0,5, medan låtens tak i proven ligger på 0,08–0,24
och bara sjunker 1,5 %/s; uppbyggnaden (`lvlSmooth > 0.3 * lc` m.fl.) var då i praktiken död i upp till 1–2 min. Nu får den nya workern huvudtrådens tak från första hoppet.
Utan omstart är allt byte-identiskt. Den andra vägen (bara workern räknar, `UT`) går inte: huvudtråden behöver taket samma hopp för `breaking` och `inZone`.

`tools/refaktor/omstart.mjs` har därför `TILLATET = {buildUp, inRiser}`: de två ramfälten får skilja mot referensen, bara i hopp efter den första omstarten,
och räknas för sig (`tillåtna … hop`). Allt annat (andra fält, räknarna, loggraderna) prövas som förut mot `dist-kedja1`.

## Nivån ett anrop: stenen äger utjämningen (steg 22, ägaren 11-22)

`levels.hopStep()` står där AGC:n stod och gör i ordning: AGC, tystnaden, rå nivå `level = min(1, rms * gain)`, utjämningen `lvlSmooth` (samma
asymmetriska EMA som kärnans `ema`, skriven ut i stenen), intensiteten, nivåtaket. Fälten bytte fack (en källa): `hop.level` -> `level.level` (`S`),
`hop.lvlSmooth` -> `level.lvlSmooth` (`IN`, hopprecordets plats `Bl.lvlSmooth` i stället för `Bh.lvlSmooth`; längden 17 som förut). Läsarna: kärnan
(`breaking`, `lvlVU`, ramens `level`/`levelRaw`/`silent`), spektrumet (`S` och `L`), dropen och uppbyggnaden (`L`) läser nu `level.lvlSmooth`.
Takterna `aAtt`/`aRel` (utjämningen) och `aIUp`/`aIDown` (intensiteten) sätts av stenens `rates(dtHop)` i konstruktorn. Kärnan behåller egna `aAtt`/`aRel`
för `engSmooth` och `centSmooth` (samma tal i dag, men de hör till energin och centroiden, inte nivån: nivåns takt kan ändras utan att röra dem).

Ordningen: utjämningen och intensitet/tak körs nu före `kicks.hopStep()`, env-ackumuleringen och `envSampleStep` i stället för efter. Inget där emellan läser
`lvlSmooth`, `level`, `activeMs`, `intensity`, `levelCeil` eller `inZone` (kicken läser `gain`/`envelope`/`gainLocked`, recordet bara klockan), och inget där
skriver det nivån läser (`rms`, `now`, `dt`, `gated`, `dtHop`). Alla värden kommer alltså samma hopp, tidigare i hoppet.

## Ramfälten heter efter delen som skapar dem (steg 23, ägaren 11-22: "Byt")

Bara ramens (`Frame`) namn; fackens fält heter som förut, där visar facket redan delen.

| förr | nu | del (fackets fält) |
|---|---|---|
| `beatAnchorMs` | `kickAnchorMs` | kick (`f.kick.beatAnchorMs`) |
| `buildStartCount` | `dropBuildCount` | drop (`f.drop.buildStartCount`) |
| `buildProg` | `sectionBuildProg` | sektion (`secBuildAt`/`secBuildSeen`, räknas i `fillFrame`) |
| `levelVsHighDb` | `sectionLevelVsHighDb` | sektion (`f.section.levelVsHighDb`) |
| `inZone` | `levelInZone` | nivå (`f.level.inZone`) |
| `breaking` | `levelBreaking` | nivå (räknas i kärnan ur nivåns `lvlSmooth`/`levelCeil`, går som `hop.breaking`) |

`HopFrame` (split.ts, taktmatningen) följer med: `kickAnchorMs`. Effekternas `ctx.levelVsHighDb` och servern/websocketens nyckel `inZone` heter
som förut (de är inte ramen). Inspelningarnas format är oförändrat: `longRecord` skriver kolumnen `breaking`, inspelarens flaggor är positionella.
Proven mot äldre byggen döper om referensens toppfält med `tools/refaktor/namnkarta.mjs` (`analyserParity.mjs`, därmed `fakenow.mjs`, och `omstart.mjs`);
verktyg som kan köra äldre byggen läser det nya namnet med det gamla som reserv.

## Tre döda ramfält bort (steg 24, ägaren 11-22: "Om det är gammalt för test så ta bort")

`levelRaw` (nivå), `dropRiseDb` (drop), `repeatSection` (sektion): ingen läste dem (varken ljuset, UI:t, servern eller lotus), bara proven.
Borta ur `Frame`, startramen och `fillFrame`. Räkningen som bara fanns för dem är också borta: dropens `dropRiseDb` (fack, tagg `UT`, `stabilise`,
långsamma tillståndets plats), sektionens `repeatSection` (fack, tagg `UT`, plats) med etikettlistorna `secFpLab`/`secFp2Lab` och `bestLab`, och
`repeatSection` i korbank-kroken `dbgSecBlock`. Nivåns `level.level` står kvar (VU-mätaren och spektrumet läser den). Proven hoppar över fälten
när referensen har dem (`BORT` i `tools/refaktor/namnkarta.mjs`), och `flyttkarta.json` har tappat de två fackfälten.

## Virvel och hi-hat i spektrum-stenen (steg 25)

`hatHit`/`snareHit` flyttade från `Analyser` till spektrumets fack (`SpectrumOut`, tagg `S`, `stabilise` som förr i `DOUBLE_FROM_START`), räkningen
från kärnan till slutet av `fastBandStep` (samma satser, samma plats i hoppet: direkt efter banden). Takterna `dHat`/`dSnare` och `aBandLvl` i
spektrumets `rates(dtHop)` (konstruktorn). Ramens `drum.hat`/`drum.snare` läser facket. Inget annat läser fälten; workern rör dem inte.
`flyttkarta.json`: `hatHit`, `snareHit`.

## Lilla FFT:n en egen sten (steg 26)

Ny delad fil `analyserFft.ts` (`SmallFft`, `Analyser.fft`), nytt fack `FftOut` (registret `FACK.fft`, hopprecordets platser `B.fft`). Ett anrop per
hopp, `fft.hopStep(samples)`, först i `process`: fönstret och `rms`, 512-FFT:n, `flux`/`kickFlux`/`energy`, centroiden, snabba bandens
magnitud och utjämningen `engSmooth`/`centSmooth`. Fälten bytte fack: `hop.rms` -> `fft.rms` (`IN`), `hop.kickFlux`/`energy`/`flux` -> `fft.*` (`S`),
`hop.centSmooth` -> `fft.centSmooth` (`IN`), `Analyser.engSmooth` -> `fft.engSmooth` (`S`), spektrumets `fbMag`/`fbPrevMag` -> `fft.*` (`S`; FFT:n byter plats
på dem först i hoppet, spektrumet läser båda). Läsarna: nivån och kicken (`Ser<'S','fft',…>`), sektionen och uppbyggnaden (`Ser<'L','fft',…>`),
spektrumet, kärnan (`gated`, pack/unpack, ramen). Takterna `aAtt`/`aRel` och fönstret i stenens `init(fbTop)` (konstruktorn); kärnans `ema()` och
`hannWindow` borta (`hannWindow` exporteras ur `analyserFft.ts`, stor-FFT:n använder den).

Ordningen: `engSmooth`/`centSmooth` räknas nu först i hoppet i stället för efter kicken och 100 Hz-steget. Däremellan läser ingen dem (kicken läser
`kickFlux`/`energy`/`rms`, nivån `rms`; inline-workern läser hopprecord från tidigare hopp), och `pushBig` packar samma hopps värde som förr.
`energy` läser nivåns `gain` före `levels.hopStep()`, som förr. `flyttkarta.json`: `hRms`, `hKickFlux`, `hEnergy`, `hFlux`, `centSmooth` pekar på
`f.fft.*`, nya: `engSmooth`, `sumSq`, `rmsRecalc`, `fbMax`, `onsetPeakReady`, `onsetPeakDecay`, `aAtt`, `aRel`, `buffer.length/.constructor`.

## Anslagskurvan bort, 100 Hz-steget kvar i kärnan (steg 27)

Uppdraget var att göra anslagskurvan (`envAccum`/`envBassAccum`/`envHighAccum`, ringarna `envRing`/`envBassRing`/`envHighRing`, `envPos`/`envFilled`,
dubbelslagsdämpningen `REFRAC_N`/`REFRAC_ATT`) till en egen sten, "klockans tempounderlag". Genomgången visade att ingen läser den: klockan
(`analyserClock.ts`, `BeatFeed`) läser ramen (`onset`, `kick`, basbandets stigning), inte ringarna, sedan den gamla temposökningen togs bort
(97ac0bfb "död tempokod bort"). Ringarna skrevs i huvudtråden och i workern (recordets `R_ENV`/`R_BASS`/`R_HIGH`), och det enda som läste dem var
dubbelslagsdämpningen, vars värde bara gick tillbaka in i ringen och recordet. En sten för den hade varit en del som inte ändrar något ljus.
Därför borta (byte-identiskt bevisat), med ratten `HIGH_DIAG` som bara fyllde diagnostikringen.

Kvar i kärnan: **100 Hz-steget** `tickStep()` (`tickT`, förr `envAccumT`/`envSampleStep`): tempot sett vid hoppet (`h.bpm = ck.bpm`), basgångens steg
(odelat direkt, delat via `bigEnvFlag` i hopprecordet) och recordet till workern (`pushSlowRecord`, utan argument). Det är kärnans transport, inte
analys. Recordet: `R_FLAGS`…`R_BIGSEQ` omnumrerade (3 platser kortare). Kandidat, inte rört: kärnans tempotelemetri utan skrivare
(`tempoGram`, `dbgTgAt`, `debugCandidates`, `lagBounds`, `evidence*`, `cand*`, `rawBpmLast`, `localBpmF`; `ENV_LEN`/`TEMPO_ENV_S` finns bara för `tempoGram`).

## Död kod bort (steg 28)

Ägaren 11-22: "om det är gammalt för test så ta bort". Borta ur kärnan: tempotelemetrin utan skrivare (`tempoGram`, `tempoGramSnapshot`,
`lagBounds`, `diagLagMin/Max`, `dbgTgAt`, `dbgBestLag`, `dbgLagMin/Max`, `debugCandidates()`, `cand*`, `evidence*`, `evidRelockVotes`, `tempoShifts`,
`rawBpmLast`, `localBpmF`, `dbgPhase`, `ENV_LEN` och env-läsningen `TEMPO_ENV_S`). Tillståndsblockets plats 3 (`S_BPMF`, alltid 0) är ledig. Ur lilla
FFT:n: `mag512`/`prevMag` och `onsetPeak`/`onsetPeakDecay` (se analyserFft.md). Läsarna: inga i src/UI/server; lotus `tools/tempo-facit-pc/bench.mjs`
och `tempoShift.mjs` läser med `?.`/`|| 0` (skriver tomt). `tools/evidence.mjs`, `offlineRefine.mjs`, `peaks.mjs` läste nollor sedan 97ac0bfb
och stannar nu på `an.lagBounds` (kandidat att ta bort).
