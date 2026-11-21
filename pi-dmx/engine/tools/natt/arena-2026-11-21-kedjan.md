# Kedjan: varje sten får ett eget fack

## Siffrorna först

| | i dag | efter |
|---|---|---|
| **Ta bort drop för gott** | filen + 16 rader i 3 filer, varav 3 i andra stenar (`analyserRiser.ts:38`, `analyserSection.ts:69, 346`), och man måste själv hitta på värden åt läsarna | filen + 7 rader i `analyser.ts` (6 efter steg 15) + ≈3 döda `BS_`-rader i `split.ts`. **0 rader i andra stenar**, och läsarna får neutrala värden ur facket |
| Prova utan drop på bänken (på en backup-gren, före beslutet) | samma 16 rader | 1 rad (`off('drop')`). Det är provet, inte slutläget: efter bänken kommer raden antingen tillbaka, eller så raderas filen enligt raden ovan |
| Prova utan sektion | ≈30 rader i 4 filer | 1 rad (konstruktorns `stabiliseNumbers(this.sections.secRank)`, `analyser.ts:743`, flyttar in i stenen i steg 13, så att raden inte kraschar) |
| Ta bort klockan | – | 3 rader i `createAnalyser` (`analyser.ts:1002, 1007, 1055`). 0 i `index.ts`, som redan har grenen utan taktväg (`:206`). Se (d) |
| Stenar som importerar `analyser.ts` | 8 av 8 | 0 (alla delade rattar och typer i `analyserFack.ts`, se b7) |
| Läsningar `this.a.x` i stenarna | 124 namn enligt greppet (uppgiftens tabell: 126) | 0. Varje namn har ett hem i tabell b7 |
| Fält med två skrivare i samma tråd, eller skrivna av fel ägare | 16 rader (tabell b6) | 0 |
| Ställen där en sten skriver i en annan dels värde | 5 (`localBpm`, `secSpecDirty`, `bassOnPeak`, `bigCounter`, `secAgg`) | 0 (blir kommandon, räknare eller flyttar till ägaren) |
| "Vem läser drop?" | leta för hand | `grep -nE "DropOut\|f\.drop\b" src/` ger alla handtag: ≈11 rader, varav 5 läsare (b2) |
| Extra tid per hopp | – | **Inte mätt på den riktiga huvudtråden** (den nya `analyser.ts` finns inte än). Mätt: drop + bas (som i DMX och lotus mest kör i workern) inom bruset, −0,08…+0,05 µs. Modellprov av huvudtrådens mönster (20 hoppfält per hopp bakom `f.hop`, tre stenar via fack): hela mönstret kostar ≈0,1 µs per hopp, gammal och ny lika inom bruset. Uppskattning för hela flytten: < 1 µs mot budgeten ≈6,6 µs. **Grinden är tidsprovet efter varje steg** (nytt i `bevis.sh`, se e), inte uppskattningen. |
| Fält som tappar flyttalsformen | – | 0. Två skydd flyttar med fältet: dagens **startvärde ordagrant** (också 0,5-knepet, till exempel `hKickAt = 0.5`, `analyser.ts:248`) och dagens 16 namn ur `DOUBLE_FROM_START` (`:152-156`), som får `stabilise` i fackets konstruktor (b1). Prov: `startvarden.mjs` jämför varje flyttat fälts värde före första hoppet med `Object.is`, och deopt-räkningen i replay ska vara ≤ ref + 1. |
| Allokeringar per hopp | 0 | 0 |
| Extra minne | – | ≈2 kB per tråd (10 små fackobjekt; fälten flyttar, de kopieras inte) |
| Delat minne mellan trådarna | – | oförändrat (samma `R_`/`B_`/`BS_`/`S_`-layout) |
| Nya filer | – | 1 (`analyserFack.ts`), så de delade filerna blir 13 → 14 |
| Flytten | – | 16 steg (alla fack skapas först, sedan en sten i taget). Varje steg bevisas byte för byte med `tools/refaktor/bevis.sh` **i både DMX:s och lotus profil**, plus nya prov: tid, deopt, startvärden och omstart (se e och f) |
| Lotus i varje steg | `bevis.sh` kör bara DMX-profilen, och den kör aldrig lotus klockväg (`hopSelf`) | lotusgrinden: samma bygge med lotus profilfil, paritet `--style lotus` odelat och delat, med `Date.now` bunden till ljudklockan. Förprovad: A/A 0 avvikelser på 56 250 hopp. En ändring på 1 ms i lotus klockväg fälls (21 806 av 22 500 hopp), men DMX:s två paritetskörningar ser 0 |

**Förprov på exakt den här skissen.** Kodblocken i b1, (c) och bilagan är utplockade maskinellt ur det här dokumentet (`.arena/run-20261121-133215-s984029/scratch/a014/check2/extract.mjs`). Proven ligger i `scratch/a014/`. Ingen kod är skriven för hand vid sidan av. `eq.mjs` och `transport.mjs` kördes på versionen med `stabilise` i alla fack (`check4/`). Sedan dess har bara facket ändrats (`kickAt`, `dtHop`, `resetPhase`), inte drop eller bas, och `tsc` är körd om på den här versionen (`check6/`). Lotusgrinden är provad i `check5/`. Utfallet:

| prov | vad | utfall |
|---|---|---|
| `tsc --strict` | facket, basen och drop, utplockade ur den här versionen (`check6/`, med `kickAt = 0.5` och `resetPhase`) | 0 fel |
| `eq.mjs` | omskrivna drop och bas mot dagens byggda stenar (`dist/`, byggd 11-21 13:24, efter senaste ändringen i `src`), 3 000 000 slumpade hopp med drops, minidrops, slam-kandidater och stopp. Varje utfält jämförs i varje hopp med `Object.is`. | 0 avvikelser |
| `transport.mjs` | stenens `pack`, `unpack` och `resume` mot dagens rader `analyser.ts:487-488`, `443-444` och `651-652`, återgivna ordagrant, 1 000 000 hopp | 0 avvikelser |
| `tid.mjs` | gammal och ny drop + bas i var sin process, växelvis, 5 par | se (e) |
| `check3/hop.mjs` | modell av huvudtrådens mönster: gammal (fälten på en `Analyser` med 160 fält) mot ny (fack hissade), 5 omgångar | se (e) |
| A/A-prov | `piBench.mjs` med samma bygge som gammal och ny, och `dmxDump` med `DUMP_SPLIT=sync` ×5 | brusnivån på PC:n, se (e) |
| deopt-räkning | `node --trace-deopt tools/dmxDump.mjs`, 150 s | dagens `dist` 145 och 144 (två körningar), referensen `dist0` 124 |
| lotusgrinden, A/A | `check5/`: `dist` kopierat två gånger, `analyserProfile.js` utbytt mot lotus kompilerade profil. `analyserParity.mjs --style lotus --grid --hint-every 97 --reset-every 211`, odelat och `--split inline`, 60 s och 150 s | utan `fakenow.mjs` (60 s): 21 806 av 22 500 hopp avviker redan A/A (`beatPhaseMs` skiljer 6 ms), eftersom klockvägen läser `Date.now()` (`analyser.ts:964-966`). Med `fakenow.mjs` (`Date.now` = ljudklockan, 12 rader): **0 av 56 250**. Odelat: 0 |
| lotusgrinden biter | samma, med `GRID_PHASE_OFFSET_MS + 1` i `publishPhase` (`:966`) i det nya bygget | lotusgrinden: 21 806 av 22 500 hopp avviker. Samma ändring i DMX-bygget under `bevis.sh`-raderna (`--style dmx`, odelat och inline): **0 av 22 500**. DMX-beviset ser alltså inte lotus klockväg |

Det här provar logiken och transportraderna, en sten i taget, och att lotusgrinden fungerar. Det provar **inte** trådarna, `split.ts`, hoppordningen, omstarten eller tabellerna b5/b6. Det gör bara `bevis.sh`, lotusgrinden och `omstart.mjs`, och de körs efter varje steg i flyttplanen.

## Antaganden

1. "Ta bort en sten" betyder att filen och raderna som anropar den raderas. Före beslutet provar man på bänken med en rad (`off('namn')`) på en backup-gren, som ägaren redan gör med andra ändringar. Raden är provet, inte ett läge som står kvar: efter bänken kommer stenen tillbaka eller raderas. Det blir ingen ratt och ingen env-flagga.
2. "Byte-identiskt" betyder det som `tools/refaktor/bevis.sh` redan prövar. Varje fält i varje ruta ska vara lika, både odelad och delad (inline), på tre inspelningar à 700 s med låtbytes-hint och temponollning. DMX-utgångens md5 ska också vara lika, med den riktiga workern i synk-läge. För lotus gäller samma paritet med lotus profilfil och `--style lotus` (lotusgrinden, f).
3. Budgeten +10 % gäller huvudtråden per hopp på Pi:n. I dag finns ingen tidsgrind: `bevis.sh` skriver ut `cpuUsPerHop` men låter tiden inte påverka "BEVIS OK". Flytten bygger därför grinden först (f, "Före start"), och den slutliga domen fälls på Pi:n med `tools/refaktor/piBench.mjs`.
4. Kärnan är ingen sten. Till kärnan räknas 512-FFT:n, rms, flux, utjämningen, trumkittet, tempot, ramen och transporten av kärnans egna fält. Kärnan är kedjans ryggrad.
5. Lotus får exakt samma filer. **Lotus profil är DMX:s rad för rad sedan 11-10** (`lotus-light-link/pi/src/audio-analyser/analyserProfile.ts:20-46`: `FAST_BANDS '1'`, `SECTION_AGG 'hop'`, `ANALYSER_SPLIT 'worker'`). Båda systemen kör alltså `bigOn` och har drop, uppbyggnad, karaktär, basgång, 2048-FFT och sektionens insamlare i workern. Den enda skillnaden är att `BEAT_FEED` saknas i lotus. Då blir `hopSelf` sant (`analyser.ts:1008`), och analysatorn matar taktvägen själv i `fillFrame` med sig själv som `HopTarget` (`:963-966`). Dessutom pekar `beatSrc` i lotus på analysatorns eget `{ beat }`, som `setClockGrid` skriver i (`:668`, `:632`), eftersom lotus konfig saknar `detection`. Den vägen provas av lotusgrinden i varje steg (f). Grenarna utan `bigOn` (`SECTION_AGG=env` eller `FAST_BANDS=0`) körs av inget system. De flyttas ordagrant och röktestas, men de är ingen grind.

## Frågorna som avgör formen

**1. Vad är en sten?**
En fil med en klass och ett fack. Det är dagens 8 delar. Klockan är redan en sten (se g).

**2. Var ska datan bo?**
I ett litet objekt per sten, facket, och inte i `Analyser`. Varje fält får en ägare. Jag valde bort en gemensam `Float64Array`-tavla. Den skulle göra transporten gratis, men all matte skulle bli `o[D_COUNT]++` i stället för `o.dropCount++`, och strängar som `section` och `Float32Array`-banden passar inte i den.

**3. Hur vet man vad en sten läser?**
Genom stenens `Reads`-typ, en `Pick<>` per fack, fält för fält. Kompilatorn stoppar varje läsning som inte står där. Typen kostar inget när koden körs.

**4. Ska kedjan vara en lista som loopas, `for (s of stenar) s.step()`?**
Nej, av två skäl:
- Anropet blir megamorft (8 klasser på samma ställe), och då kan V8 inte inlina det.
- Dagens ordning är inte en sten i taget. Nivån har fyra steg på fyra platser i hoppet (`agcStep`, `silenceStep`, `intensityStep`, `zoneStep`), och kick och bas har två var. En loop skulle flytta stegen och bryta byte-identiteten.

Ordningen står därför kvar som raka anrop i `analyser.ts`, där den redan är bevisad.

**5. Vad händer när en sten saknas?**
Facket finns kvar med neutrala värden, och alla som läser det fortsätter som förut. **All transport av stenens värden stängs av samtidigt**, eftersom varje transportrad är en metod på stenen och anropas med `?.`. Det gäller alla tre slagen av transport: `BS_`-blocket (`pack`/`unpack`), omstarten (`resume`) och sektionens record (`toRecord`/`fromRecord`). Annars kan den andra tråden skriva över det neutrala värdet (se b5). Raderas stenen, försvinner transporten med filen, eftersom den bor där. En rad i loggen visar att stenen är av, och `tools/livstecken.mjs` visar dess ramfält som döda.

Facket står kvar också när filen är raderad. Det är inte död data: `Frame` är det yttre gränssnittet (villkor 3), och motorn och lotus läser till exempel `f.dropCount`. Facket är det som ger de 11 ramfälten sina neutrala värden. Kostnaden är ≈15 tal.

**6. Måste beroende stenar falla med?**
Nej. Bland de stenar som går att ta bort är alla beroenden mjuka, och koden har redan reservvärden: `analyserBass.ts:16` och `analyserSection.ts:128` faller tillbaka på 500 ms per slag när tempot saknas, och klockan läser `an.bodyUnderDb ?? 0` på `analyserClock.ts:554`. De hårda beroendena gäller nivå och spektrum, och de kan inte sättas till `null` eftersom typen inte tillåter det. Därför behövs ingen kaskadmekanism.

**7. Hur fungerar snabb och långsam väg?**
En regel räcker: **varje fält har en skrivare per tråd.** Skrivaren är stenen om den kör i den tråden, annars stenens transport. Regeln gäller också kärnans hoppfält. Tabell b6 visar de 16 ställen som bryter mot regeln i dag, och vart deras extra skrivare tar vägen.

Regeln har en baksida som typen inte ser: `Reads` säger vad en sten läser, men inte om någon skriver det i den tråd där stenen kör. Ett fält utan skrivare har fortfarande sitt startvärde, så inget kompileringsfel uppstår. Därför finns **skrivkartan** i b5: för varje hoppfält står det vem som skriver det i huvudtråden, i workern och odelat. Den behövs bara när en sten byter tråd, och då kontrolleras den med `giftprov.mjs` (b5).

**8. Vad kostar det i den heta vägen?**
I stenarna blir det lika många laddningar (`this.lv.activeMs` i stället för `this.a.activeMs`), plus en laddning av `this.o` för de publicerade fälten. I huvudfilen hissas facken en gång per funktion. Det kostar 3–4 laddningar per funktion, inte en per fält. Huvudfilen läser `h.cfg`, `h.role` och `h.bigOn` direkt ur det hissade facket (`this.cfg.detection` på `analyser.ts:824, 827, 840` blir `h.cfg.detection`). Adapterns getters är bara för motorn, lotus och verktygen, aldrig i den heta vägen. Vad som är mätt och inte: se (e).

**9. Hur bevisas flytten?**
Med `bevis.sh` efter varje steg, i båda profilerna. Fem prov saknas i dag och byggs före steg 1 (f, "Före start"):
- en tidsgrind och en deopt-räkning i `bevis.sh`
- **lotusgrinden**: samma paritet med lotus profilfil och `--style lotus`, så att `hopSelf`-vägen provas. `Date.now` binds till ljudklockan, annars avviker redan A/A (förprovet)
- `startvarden.mjs`, som jämför varje flyttat fälts värde före första hoppet
- ett omstartsprov (`omstart.mjs`) som startar om den långsamma sidan mitt i en inspelning och jämför byte för byte mot referensen med samma omstart Avstängningen provas med ett eget prov i steg 14. Ordningen är först alla fack (steg 2–5), sedan en sten i taget (steg 6–13). Därför finns varje fack som en sten läser redan när stenen skrivs om, och efter stenens steg ger `grep -c "this\.a\." src/<sten>.ts` 0.

**10. Lotus?**
En ny delad fil. Lotus kör DMX:s profil, så trådkartan är densamma. Den enda egna vägen är klockan (`hopSelf`), och den provas i varje steg av lotusgrinden, inte först i slutet. Lotus filer portas en gång, i sista steget (16), och då är varje steg redan provat med lotus profil.

---

## (a) Idén i tre meningar

Varje sten får ett eget fack, ett litet objekt med det den lämnar ut, och en `Reads`-typ som säger exakt vilka fält ur andra fack den läser, och kompilatorn tillåter inget annat. Kedjan är dagens ordning rad för rad i `analyser.ts`, och varje sten som går att ta bort anropas med `?.` och returnerar `void`: att ta bort en sten är att radera filen och dess ≈7 anropsrader (ingen rad i andra stenar), och att prova utan den på bänken är en rad, `off('namn')`; i båda fallen står facket kvar med neutrala värden, stenens transport försvinner med den och alla som läste facket fortsätter. Snabb/långsam-uppdelningen bygger på samma fack, eftersom varje fält i varje tråd har en enda skrivare (stenen eller dess transport): vad en sten läser står i dess `Reads`, och vem som skriver det i varje tråd står i skrivkartan.

---

## (b) Kontraktet

### b1. Var datan bor: `analyserFack.ts` (ny, delad)

Facken skapas en gång per analysator, alltså en uppsättning per tråd. De skapas före stenarna, så att drop kan läsa uppbyggnaden och uppbyggnaden kan läsa drop. Facket är bara data, dess `stabilise`-lista och, där det behövs, `neutral()`.

**Flyttalsformen följer med fältet.** Dagens `DOUBLE_FROM_START` (`analyser.ts:152-156`) körs på `this` (`:742`). Ett fält som flyttat till ett fack finns inte längre på `this`, och slingan skulle tyst hoppa över det. Därför får varje fack en egen lista med exakt de namn ur dagens lista som flyttar dit, 16 stycken: `HopOut` 2, `LevelOut` 1, `KickOut` 4 (plus `lastKick`, som i dag stabiliseras i `analyserKick.ts:5` och flyttar med till facket), `ClockOut` 1, `RiserOut` 1, `SectionOut` 7. Basens två (`profBassline`, `bassOnsetsPerBeat`) och `blAccum` fanns redan i `BassOut`/stenen. `dbgRms` slås ihop med `hRms` till `hop.rms`, som startar på 0,5 och alltså redan är flyttal. Kvar i `analyser.ts` står kärnans egna namn: `sumSq`, `lastT`, `envAccum`, `envAccumT`, `envBassAccum`, `lvlVU`, `engSmooth`, `snareHit`, `hatHit`, `rawBpmLast`. Inga andra fält får listan, så att räknare som `dropCount` förblir heltal som i dag.

Listan är inte dagens enda skydd. Dagen skyddar också fält med startvärdet 0,5 (`hRms`, `hNow`, `hKickAt` … på `analyser.ts:246-248`, `dLvh`/`dConf`/`dBpm` på `:254`). **Regeln är därför att startvärdet flyttar ordagrant med fältet**, och att `startvarden.mjs` kontrollerar det (f). Vid två sammanslagningar finns två startvärden, och då gäller det heta fältets: `hopMs` får `hHopMs` 0,5 och `rms` får `hRms` 0,5. Båda skrivs innan något läser dem (konstruktorn `:719`, hoppet `:825-826`). Stenarnas eget arbetsminne (ringar, envelopper) och deras transport ligger kvar privat i stenen.

```ts
/** FACKEN: allt en sten lämnar ut. Ett fack per sten, en skrivare per fält och tråd. */
import { PROFILE } from './analyserProfile.js';

// 1. RATTARNA (ordagrant ur analyser.ts:29-39 och secEnv, så att stenarna slipper importera analyser.ts)
const ENV = typeof process !== 'undefined' ? process.env : undefined;
const ALIAS_PREFIX = PROFILE.envPrefix === 'LOTUS_' ? 'DMX_' : 'LOTUS_';
export function sysEnv(name: string) { return ENV?.[PROFILE.envPrefix + name] ?? ENV?.[ALIAS_PREFIX + name] ?? PROFILE.sys[name]; }
export function env(name: string) { return ENV?.[name] ?? PROFILE.bare[name]; }
export function numEnv(name: string, def: number) { const v = sysEnv(name), x = Number(v); return v !== undefined && v !== '' && Number.isFinite(x) ? x : def; }

// 2. KONSTANTER SOM FLER ÄN EN DEL LÄSER (en källa). En konstant som bara EN sten läser flyttar in i den stenen (tabell b7).
export const BODY_CEIL_DB_S = 0.15;   // drop, uppbyggnad
export const BE_FALLBACK_MS = 500;    // bas, sektion, ramen
export const BE_MEM_BEATS = 240;      // bas, sektion
export const BASS_SPAN_DB = 36;       // bas; effects.ts får den via analyser.ts som förut
export const BASSON_LEN = 32;         // spektrum, sektion (i dag Analyser.BASSON_LEN, analyser.ts:213)
export const BIG_EVERY = 3;           // spektrum, kärnan (analyser.ts:191)
export const SECTION_AGG_HOP = (sysEnv('SECTION_AGG') || 'env') === 'hop';   // spektrum, sektion, kärnan (analyser.ts:43-44)
export const BODY_HIGH_MS = numEnv('SECTION_BODY_HIGH', 0), BODY_HIGH_DB = numEnv('SECTION_BODY_HIGH_DB', 3);   // drop, sektion

/** Dagens DOUBLE_FROM_START-knep, en kopia i stället för nio. */
export function stabilise(o: object, keys: readonly string[]): void {
  const r = o as Record<string, unknown>;
  for (const k of keys) { const v = r[k]; if (typeof v === 'number') { r[k] = 0.5; r[k] = v; } }
}

// 3. TYPER som flyttar hit ur analyser.ts:47-50. analyser.ts re-exporterar dem, så motorn och lotus ser samma namn.
export interface AnalyserDetection { autoGainTarget: number; tauUp: number; tauDown: number; noiseFloor: number; maxGain?: number }
export interface BeatGrid { bpm: number; anchorMs: number; confidence?: number; }
export interface Cfg { audio: { rate: number }; fft: { size: number; hop: number }; detection: AnalyserDetection; onset: { enhancements: boolean } }
export type Role = 'all' | 'fast' | 'slow';

// 4. FACKEN. Startvärde = dagens startvärde (byte för byte).
//    neutral() = värdet när stenen är av. Finns bara där det skiljer sig från startvärdet.

/** HOPPET: kärnans fält. Skrivare: kärnan i den tråd där hoppet räknas, annars transporten ur B_-recordet. */
export class HopOut {
  // Trådens roll och konfiguration. Skrivs EN gång i Analysers konstruktor. Analyser.role, .bigOn och .cfg blir getters hit.
  role: Role = 'all'; bigOn = false; cfg!: Cfg;
  dtHop = 0; hopMs = 0.5;   // som i dag (:279, :246); båda skrivs i konstruktorn (:718-719). hopMs = i dag både hopMs och kopian hHopMs (:836, som tas bort)
  rms = 0.5; now = 0.5; dt = 0.5; nowWall = 0.5; gated = false;   // rms = i dag både hRms och dbgRms (samma värde, analyser.ts:825-826)
  kickFlux = 0.5; energy = 0.5; flux = 0.5; lvlSmooth = 0; centSmooth = 0.5; body = 0.5; breaking = false;
  kickHit = 0;   // trumkittet (analyser.ts:878-879); i workern ur B_KICKHIT (:468)
  // TIDSOFFSET, inte kopior: långsamma värden sedda vid hoppet. I workern är de transportens syn ur B_SEC/B_LVH/B_CONF/B_ENVBPM
  // (analyser.ts:434-435, 467, 474, 477), alltså ägarens värde ett varv tidigare. Odelat sätts de ur ägaren direkt före läsningen (:894, :897, :921).
  sec = 'intro'; lvh = 0.5; conf = 0.5; bpm = 0.5;
  constructor(readonly wallNow: () => number) { stabilise(this, ['lvlSmooth', 'kickHit']); }   // ur DOUBLE_FROM_START (:153-154)
}
export class LevelOut {   // intensity = i dag hIntensity, inZone = i dag inZoneState, gainLocked = i dag Analyser.gainLocked (:313)
  gain = 1; envelope = 0; activeMs = 0; silentMs = -0; intensity = 0.5; levelCeil = 0.5; inZone = false; gainLocked = false;
  constructor() { stabilise(this, ['activeMs']); }
}
export class SpectrumOut {
  readonly bandAbs = new Float32Array(8); readonly bandDbRaw = new Float32Array(8);   // förblir Float32Array (avrundningen!)
  readonly bandLvl = new Float32Array(8); readonly bandOn = new Float32Array(8); readonly fbOn = new Float32Array(8);
  readonly bassOnRing = new Float32Array(BASSON_LEN); bassOnN = 0;   // i dag på Analyser (:213), skrivs bara av spektrum
  bigN = 0; bassOnPeaks = 0;   // räknare i stället för flaggorna secSpecDirty och bassOnPeak (steg 12)
  sink: ((mag: Float32Array, binHz: number) => void) | null = null;   // i dag Analyser.specSink; setSpectrumSink skriver hit
}
export class KickOut {
  kick = false;        // i dag kickStep():s returvärde → hKick
  kickAt = 0.5;        // i dag hKickAt = 0.5 (:248): förfinad tid för förra kicken, 0 om ingen detta hopp. 0,5 = flyttal från start,
                       // eftersom första skrivningen i den heta vägen är beatAnchorMs (≈1,7e12). Ramen ser aldrig 0,5: anchorStep skriver 0 först.
  beatAnchorMs = 0; pendingKickMs = 0; lastKick = 0; kfPrev = 0; kfPrev2 = 0;
  dbgKick: null | { flux: number; thresh: number; med: number; mad: number; energy: number; gain: number; rms: number; env: number; locked: boolean } = null;
  constructor() { stabilise(this, ['pendingKickMs', 'kfPrev', 'kfPrev2', 'beatAnchorMs', 'lastKick']); }   // lastKick ur analyserKick.ts:5
}
export class ClockOut {
  bpm = 0; conf = 0;   // i dag localBpm/localBpmConfidence: analysatorns enda kopia av klockans tempo
  constructor() { stabilise(this, ['conf']); }   // localBpmConfidence (:155); localBpm står inte i dagens lista och får den inte
  phaseMs = 0; phaseConf = 0;   // i dag beatPhaseMs/beatPhaseConf: gridfasen
  // Rutnätet. SAMMA objekt som dagens beatSrc (analyser.ts:668): motorns cfg, eller ett eget { beat } som setClockGrid skriver i.
  // Facket håller handtaget, inte en kopia av rutnätet.
  src: { beat?: BeatGrid | null } = { beat: null };
  set(bpm: number, conf: number) { this.bpm = bpm > 40 ? bpm : 0; this.conf = bpm > 40 ? conf : 0; }   // = Analyser.setClock
  zeroBpm() { this.bpm = 0; }   // nivåns tystnad 10 s (analyserLevel.ts:78) och F_SIL10 (analyser.ts:512)
  resetPhase() { this.phaseMs = 0; this.phaseConf = 0; }   // setVirtualClock vid hopp i klockan (analyser.ts:596)
}
export class SectionOut {
  section = 'intro'; sectionStartMs = 0; sectionIndex = 0; sectionTier = 1; prevSection = ''; levelVsHighDb = 0;
  repeatSim = 0; repeatAgoMs = 0; repeatSection = ''; repeatTier = -1; repeatHighAtMs = 0; repeatHighEndAtMs = 0;
  expectHighMs = 0; expectSource = 0; secBuildAt = 0; secBuildSeen = 0; boundaryNov = 0;
  constructor() { stabilise(this, ['expectHighMs', 'levelVsHighDb', 'sectionStartMs', 'secBuildAt', 'secBuildSeen', 'repeatSim', 'repeatAgoMs']); }   // (:153, :155)
  neutral() { this.section = ''; }   // '' = okänd, sectionCode('') = 0 (split.ts:55-56). Med 'intro' skulle drops lugn-veto alltid gälla.
}
export class RiserOut { buildUp = 0; inRiser = false; constructor() { stabilise(this, ['buildUp']); } }
export class BassOut {
  beHi = NaN; beRef = NaN; beShort = 0; energy = 0; bassline = 0; onsetsPerBeat = 0;
  constructor() { stabilise(this, ['bassline', 'onsetsPerBeat']); }
  neutral() { this.beHi = 0; this.beRef = 0; }   // annars blir frame.bassLevel = 10^NaN = NaN
}
export class DropOut {
  dropCount = 0; miniDropCount = 0; buildStartCount = 0; dropCand = 0; secBodyRet = 0;
  dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0; nearDropDb = -0; nearDipDb = -0; liftDb = -0; stopCount = 0; stopS = -0;
  lastDropMs = -1.5e9; bodyUnderDb = 0;
  constructor() { stabilise(this, ['lastDropMs', 'dropRiseDb', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS']); }
}
export class CharacterOut { readonly profile = { punch: 0.4, bass: 0.5, bright: 0.3, beat: 0.5, bassline: 0 }; }

export interface Fack { hop: HopOut; level: LevelOut; spectrum: SpectrumOut; kick: KickOut; clock: ClockOut;
  section: SectionOut; drop: DropOut; riser: RiserOut; bass: BassOut; character: CharacterOut }
export function makeFack(wallNow: () => number): Fack {
  return { hop: new HopOut(wallNow), level: new LevelOut(), spectrum: new SpectrumOut(), kick: new KickOut(), clock: new ClockOut(),
    section: new SectionOut(), drop: new DropOut(), riser: new RiserOut(), bass: new BassOut(), character: new CharacterOut() };
}

/** En avstängd sten: facket får sitt neutrala värde, och det syns i loggen. */
export function off(name: string, fack?: { neutral(): void }): null {
  fack?.neutral();
  console.log(`[analysator] sten av: ${name}`);
  return null;
}
```

HopOut har inte längre några kopior av andra stenars värden. `kick`, `kickAt`, `inZone`, `inRiser` och `intensity` ligger bara hos sin ägare, och ramen läser dem där. `role`, `bigOn` och `cfg` skrivs i Analysers konstruktor, eftersom de blir kända först där. Stenarna skapas som fältinitierare före konstruktorns kropp, precis som i dag, och läser fälten först när de kör.

### b2. En sten deklarerar vad den läser och vad den lämnar ut

```ts
/** DET DROP LÄSER. Inget annat går att nå. */
export interface DropReads {
  hop:      Readonly<Pick<HopOut, 'dtHop' | 'nowWall' | 'body' | 'lvlSmooth' | 'sec' | 'lvh' | 'wallNow'>>;
  spectrum: Readonly<Pick<SpectrumOut, 'bandDbRaw'>>;
  level:    Readonly<Pick<LevelOut, 'activeMs'>>;
  riser:    Readonly<Pick<RiserOut, 'buildUp'>>;
}
export class DropDetector {
  constructor(r: DropReads, private readonly o: DropOut) { /* … */ }   // läser: r, lämnar ut: o
  dropStep(): void { /* … */ }                                           // void: allt resultat går till o
  pack(s: Float64Array): void { /* … */ } unpack(s: Float64Array): void { /* … */ } resume(s: Float64Array): void { /* … */ }   // transporten
}
```

Kontraktet har fyra regler:

1. Det stenen läser står i `XReads`. Allt där är `readonly`, så stenen kan inte skriva i det.
2. Det stenen lämnar ut står i `XOut`. Där skriver bara stenen: dess steg i den tråd där den kör, och dess egna transportmetoder i den andra.
3. **En avstängbar sten returnerar `void`.** Allt den räknar fram hamnar i facket. Försöker någon använda ett returvärde, till exempel `const k = this.kicks?.kickStep()`, får uttrycket typen `void | undefined`, och `tsc --strict` stoppar tilldelningen till en `boolean`.
4. Vill en sten ändra något hos en annan sten blir det ett kommando, alltså en metod hos mottagaren (`clock.zeroBpm()`, `kicks?.reset()`), eller en räknare som mottagaren läser (`bigN`, `bassOnPeaks`). De fem ställena står i b6.

**Vem rör mitt fack?** `grep -nE "DropOut|f\.drop\b" src/` hittar varje handtag, eftersom det bara finns två vägar till facket: `this.f.drop` i `analyser.ts`, och en `Reads`- eller konstruktortyp som måste nämna `DropOut`. Efter flytten ger greppet ≈11 rader:

| # | vad | var | slag |
|---|---|---|---|
| 1 | uppbyggnaden | `RiserReads`: `Pick<DropOut, 'lastDropMs'>` | **läsare**: lugn efter drop |
| 2 | sektionen | `SectionReads`: `Pick<DropOut, 'dropCand' \| 'secBodyRet'>` | **läsare**: hopp till high (insamlaren, `toRecord`, `dropsNow()`; se g) |
| 3 | ramen | `fillFrame`: `const dp = this.f.drop` (i dag `analyser.ts:950-951`) | **läsare**: 11 ramfält |
| 4 | **klockan** | `get bodyUnderDb() { return this.f.drop.bodyUnderDb; }` på `Analyser`, läst som `HopTarget` (`analyserClock.ts:554`, `split.ts:159`). Läsningen sker i huvudtrådens `Analyser` (`split.ts:185`) och går till klockan via `H_UNDER`. | **läsare**: break-minnet |
| 5 | kedjan | `new DropDetector(this.f, this.f.drop)` | konstruktion |
| 6–7 | stenen | `analyserDrop.ts`: importen och `o: DropOut` | ägaren, med transporten |
| 8–10 | facket | `analyserFack.ts`: `class DropOut`, `drop: DropOut` i `Fack`, `new DropOut()` i `makeFack` | deklarationer |

Läsarna är rad 1–4 plus recordet för grenen utan `bigOn`, som nu ligger i sektionens `toRecord` och därför täcks av rad 2. **Skrivarna** av `DropOut` är bara stenen själv: `dropStep` i sin tråd, och `unpack`/`resume` i den andra. Dagens tredje skrivare, `this.drop.dropCand = r[o + R_DROPS]` i workern utan `bigOn` (`analyser.ts:536`), försvinner. Det värdet är sektionens indata och blir `wire.drops` i sektionen (g).

### b3. Hur kedjan byggs: en rad per sten i `analyser.ts`

```ts
export class Analyser {
  readonly f: Fack = makeFack(() => this.wallNow());   // DATAN, skapas före stenarna
  private readonly cmd = { flagSlow: (fl: number) => this.flagSlow(fl) };   // bunden en gång: nivån flaggar tystnad till workern

  // KEDJAN. Grundstenarna saknar "| null": typen tillåter inte att de tas bort.
  readonly levels = new LevelTracker(this.f, this.f.level, this.cmd);
  readonly bands  = new SpectrumBands(this.f, this.f.spectrum);
  readonly kicks:     KickDetector | null     = new KickDetector(this.f, this.f.kick);
  readonly bass:      BassTracker | null      = new BassTracker(this.f, this.f.bass);
  readonly drop:      DropDetector | null     = new DropDetector(this.f, this.f.drop);
  readonly riser:     RiserDetector | null    = new RiserDetector(this.f, this.f.riser);
  readonly character: CharacterProfile | null = new CharacterProfile(this.f, this.f.character);
  readonly sections:  SectionTracker | null   = new SectionTracker(this.f, this.f.section);

  // STÄNG AV EN STEN = byt dess rad, till exempel:
  //   readonly riser:    RiserDetector | null  = off('uppbyggnad');
  //   readonly sections: SectionTracker | null = off('sektion', this.f.section);   // facket har neutral()

  // ADAPTERN mot motorn, lotus och verktygen: samma namn som i dag, en rad var.
  get role() { return this.f.hop.role; }   get bigOn() { return this.f.hop.bigOn; }   get cfg() { return this.f.hop.cfg; }
  get localBpm() { return this.f.clock.bpm; }   get section() { return this.f.section.section; }   get bodyUnderDb() { return this.f.drop.bodyUnderDb; }
  // … osv. för de fält som verktygen i tools/ läser (steg 2–5 greppar fram dem). Statiska namn som Analyser.RANK_WIN blir
  //     static readonly RANK_WIN = RANK_WIN, alltså samma konstant och inte en kopia.

  constructor(cfgIn: AnalyserConfig, splitIn?: SplitInit) {
    const h = this.f.hop;
    h.role = splitIn?.role ?? cfgIn.role ?? 'all';            // i dag this.role = … (:635)
    // … h.bigOn = true där i dag (this as { bigOn }).bigOn = true (:647), och const cfg = h.cfg = { … } (:656)
    this.f.clock.src = cfgIn.detection ? cfgIn : { beat: null };   // i dag this.beatSrc = … (:668), samma objekt
  }
```

`this.f` skickas in hel, men stenen tar bara ut de fack dess `Reads` nämner. Det är vanlig strukturell typning i TypeScript och kostar inget när koden körs. Konstruktorns rader som rör avstängbara stenar flyttar alla, så att en avstängd sten aldrig nås därifrån:

| rad i dag | vad | efter |
|---|---|---|
| `:731-733` | `this.riser.aSpecSlow`, `aNovSlow`, `this.character.aProf` | `this.riser?.rates(dtHop)`, `this.character?.rates(dtHop)`, samma formel |
| `:737`, `:741` | ramens `profile: this.character.outProfile` och dess `stabiliseNumbers` | `this.f.character.profile`: facket finns alltid, så ramens objekt finns även med karaktären av |
| `:743` | `stabiliseNumbers(this.sections.secRank)` | sist i `SectionTracker`s konstruktor, eftersom `secRank` är stenens eget fält. Samma objekt, samma tidpunkt: före första hoppet. |
| `:651-652` | omstartens läsning av `bigState` | `this.drop?.resume(st)`, `this.sections?.resume(st)` (c, g) |

Grepvakten för detta i steg 14: `grep -nE "this\.(kicks|bass|drop|riser|character|sections)\.[A-Za-z]" src/analyser.ts` ska ge 0, alltså bara `?.`-anrop kvar. Dessutom stoppar `tsc --strict` varje sådan rad när typen blir `| null`. Men en rad som "rättas" med `?.` och sedan skickar `undefined` vidare (som `stabiliseNumbers(this.sections?.secRank)`, som då gör `Object.keys(undefined)`) syns bara när den körs. Därför flyttar `:743` in i stenen i stället för att få `?.`, och därför kör avstängningsprovet i steg 14 konstruktorn med varje sten av.

Samma byggkod körs i båda trådarna. En avstängd sten är därför `null` både i huvudtråden och i workern, och då är också dess transport av på båda sidor.

Ett namn att se upp med: i `fillFrame` heter ramen redan `f` (`const f = this.outFrame`, `:943`) och trumkittet `dr` (`const dr = this.outDrum`, `:940`). Fackets lokala namn blir därför `dp` för drop och `bo` för bas, och facket självt nås som `this.f`.

### b4. I vilken ordning: hoppet, oförändrat

Ordningen är dagens. Den är redan bevisad, och flytten ändrar den inte.

DMX och lotus kör samma profil, alltså samma trådkarta (antagande 5). Kolumnen gäller därför båda. Odelat (`role 'all'`, som verktygen och bänkarna kör med `new Analyser`) körs allt i en tråd, i samma ordning.

| # | steg | sten | tråd i delat läge (DMX och lotus) |
|---|---|---|---|
| 1 | 512-FFT, rms, flux | kärnan | huvud |
| 2 | `agcStep` | nivå | huvud |
| 3 | `kickStep` → `f.kick.kick` | kick `?.` | huvud |
| 4 | `silenceStep` | nivå | huvud |
| 5 | `accumulate` (basgång) | bas `?.` | worker (`drainBig`, `:466`) |
| 6 | env-sampel 100 Hz: `stepBassline` och record till workern (`sections?.toRecord`) | bas `?.`, kärnan, sektion `?.` | `stepBassline` i worker (`B_ENVF`, `:467`), recordet i huvud |
| 7 | `anchorStep`: förfining, ankare, kfPrev (i dag rad 847-856) | kick `?.` | huvud |
| 8 | utjämning nivå/energi/centroid | kärnan | huvud |
| 9 | `intensityStep` → `f.level.intensity` | nivå | huvud |
| 10 | `bigRingPush` + `bigTick()` (2048-FFT var 3:e hopp) | spektrum | worker |
| 11 | `fastBandStep` | spektrum | huvud |
| 12 | trumkit (läser `f.kick.kick`), sedan `zoneStep` | kärnan, nivå | `zoneStep` i huvud **och** worker |
| 13 | `dropStep` | drop `?.` | worker |
| 14 | `riserStep` → `f.riser.inRiser` | uppbyggnad `?.` | worker |
| 15 | `profileStep` | karaktär `?.` | worker |
| 16 | `bassEnergyStep` (i ramen) | bas `?.` | huvud |
| 17 | sektionens insamlare | sektion `?.` | worker (`bigAgg`). `sectionAggStep` i huvudtrådens ram återvänder direkt när `bigOn` är på (`analyserSection.ts:340`); odelat är det den som samlar |
| 18 | sektionsblock, 1 s (`fromRecord` → `sectionHop`) | sektion `?.` | worker |
| 19 | klockan | klockan | **här skiljer systemen.** DMX: motorn matar taktvägen efter `process` (`index.ts:206`, `hopLane.feed(frame, cfg, analyser)`). Lotus: analysatorn matar den själv sist i `fillFrame` (`hopSelf`, `:963-966`) och publicerar fasen med `publishPhase`. I båda kör `BeatFeed` i workerns `HopLaneSlow`. |

I kod blir varje rad i tabellen ett anrop. Facken hissas en gång överst i varje het funktion (`process`, `fillFrame`, `pushBig`, `drainBig`). Ett utdrag ur grenen `!big` (i dag `analyser.ts:892-900`, som odelat läge kör):

```ts
const h = this.f.hop, sp = this.f.spectrum, sc = this.f.section;   // en gång överst i process()
// …
h.body = (sp.bandDbRaw[0] + sp.bandDbRaw[1] + sp.bandDbRaw[2]) / 3;
h.sec = sc.section; h.lvh = sc.levelVsHighDb;
this.drop?.dropStep();
this.riser?.riserStep();          // skriver f.riser.inRiser; inget returvärde
h.conf = this.f.clock.conf;
this.character?.profileStep();
```

### b5. Snabb och långsam väg

**Regeln:** varje fält har en skrivare per tråd, stenen eller dess transport.

I DMX och i lotus kör drop i workern:

- I workern skriver `drop.dropStep()` i `f.drop`, och `drop.pack(s)` lägger värdena i `BS_`-blocket.
- I huvudtråden skriver bara `drop.unpack(s)` i `f.drop`, och ramen läser `f.drop`.

Odelat (`role 'all'`) skriver `dropStep` direkt, och ingen transport körs. Det finns en tredje väg i koden, workern utan `bigOn` (`SECTION_AGG=env` eller `FAST_BANDS=0`). Ingen profil kör den. Där behöver workern bara summan `dropCand + secBodyRet` som sektionens indata: `sections.toRecord` lägger den i `R_DROPS`, och `sections.fromRecord` lägger den i sektionens egen `wire.drops` (g). Den vägen flyttas ordagrant och röktestas i steg 12 och 13 (f).

Transporten anropas som `this.drop?.unpack(s)`. **Är stenen av, är transporten av.** Det är viktigt för sektionen. I dag gör `pullSlowState` om kod 0 till `'intro'` (`SECTIONS[s[S_SECTION]] || 'intro'`, `analyser.ts:367`). Skulle transporten gå med stenen av, fick huvudtråden alltså `'intro'` i stället för det neutrala `''`, och drops lugn-veto skulle då alltid gälla. Med transporten av står `''` kvar i huvudtråden. `B_SEC` blir `sectionCode('') = 0`, och workerns drop läser `dSec = SECTIONS[0] = ''` (`analyser.ts:474`). Därmed blir värdet lika odelat och delat.

**Skrivkartan för hoppfacket.** Vem skriver varje fält i `HopOut`, per tråd (radnummer i dagens `analyser.ts`; DMX och lotus lika):

| fält (i dag) | huvudtråden (`fast`, `bigOn`) | workern (`slow`, `bigOn`) | odelat (`all`) |
|---|---|---|---|
| `rms` (`hRms`) | `:826` | `:468` (`B_RMS`) | `:826` |
| `now`, `dt` (`hNow`, `hDt`) | `:826` | **–** | `:826` |
| `gated`, `kickFlux`, `energy` | `:827`, `:832` | **–** | `:827`, `:832` |
| `hopMs` (`hHopMs`), `dtHop` | `:836`, konstruktorn | konstruktorn (bara `dtHop`) | `:836`, konstruktorn |
| `lvlSmooth`, `centSmooth` | `:861`, `:864` | `:468` (`B_LVL`, `B_CENT`) | `:861`, `:864` |
| `kickHit` | `:878-879` | `:468` (`B_KICKHIT`) | `:878-879` |
| `nowWall` (`hNowWall`) | `:885` | `:473` (`B_WALL`) | `:885` |
| `breaking`, `flux` | `:888`, `:900` | **–** (`breaking` går som parameter till `bigAgg`, `:479`) | `:900` |
| `body` (`hBody`) | `:443` (`BS_BODY`, workerns värde ett varv sent) | `:473` | `:893` |
| `sec`, `lvh` (`dSec`, `dLvh`) | **–** | `:474` (`B_SEC`, `B_LVH`) | `:894` |
| `conf` (`dConf`) | **–** | `:477` (`B_CONF`) | `:897` |
| `bpm` (`dBpm`) | **–** | `:467` (`B_ENVBPM`) | `:921` |

Ett streck betyder att fältet har sitt startvärde i den tråden för alltid. Det är rätt så länge ingen sten i den tråden läser fältet, och det är just det som måste kontrolleras när en sten byter tråd. Kartan tas fram med `grep -nE "this\.(h[A-Z]|d[A-Z])\w* = " src/analyser.ts` på dagens kod och står som kommentar i `HopOut` efter steg 2.

Hur ska man läsa "en sten kan ligga i endera vägen"? I dag avgörs placeringen av `bigOn`, som båda profilerna slår på, och flytten ändrar inte det. Vill man flytta **en** sten till andra tråden är receptet:

1. Gå igenom stenens `Reads`, fält för fält, och slå upp varje fält i skrivkartan (för andra fack: deras ägare och transport i b6). Fält som räknas fram i måltråden kostar 0. Fält med en skrivare i den andra tråden kräver en plats i recordet: `B_` från huvudtråden till workern, `BS_` från workern till huvudtråden. **Fält med ett streck i måltråden kräver en skrivrad där**, till exempel samma rad som odelat läge har.
2. Gå igenom läsarna av stenens fack (greppet i b2). Fråga för varje läsare: **i vilken `Analyser`-instans görs läsningen?** Det är den som räknas, inte var konsumenten till slut kör. Läses facket i den andra trådens instans krävs en plats. Klockan är exemplet: den kör i taktvägens worker, men läser `bodyUnderDb` i huvudtrådens `Analyser` (`HopLaneFast.feed`, `split.ts:185`) och har sin egen transport `H_UNDER` till `HopLaneSlow` (`split.ts:245`, som skriver i ett eget `target`, `:229`). Klockan kräver alltså aldrig en `B_`/`BS_`-plats.
3. Lägg till en rad i `pack` och en i `unpack` per plats, och en konstant per plats i `split.ts`.
4. **Kör giftprovet.** `tools/refaktor/giftprov.mjs <sten>` (≈20 rader, nytt, körs bara vid trådbyte) bygger analysatorn delat inline. Före första hoppet skriver det ett giftvärde i varje fält som stenens `Reads` nämner, i måltrådens fack: `NaN` för tal och `'\u0000gift'` för strängar. Sedan kör det 30 s av en inspelning och skriver ut varje fält som fortfarande har giftvärdet. Ett sådant fält har ingen skrivare i måltråden. Fältlistan läses ur `Reads`-gränssnittet i stenens källfil med ett reguljärt uttryck. Provet ändrar inget i `src`.

**Exempel: drop till huvudtråden.**

| behov | finns i huvudtråden? | kostnad |
|---|---|---|
| `hop.dtHop`, `nowWall`, `lvlSmooth`, `level.activeMs` | ja (skrivkartan; `activeMs` skrivs av nivån) | 0 |
| `hop.sec`, `hop.lvh` | **nej, streck i skrivkartan.** De skrivs bara i workern (`:474`) och odelat (`:894`). Utan skrivrad läser drop `'intro'` och 0,5 för alltid, så lugn-vetot gäller alltid och varje slam-kandidat kräver `buildUp ≥ 0,25`. Giftprovet visar båda | 1 rad: `h.sec = sc.section; h.lvh = sc.levelVsHighDb;` före `dropStep`, samma som `:894` |
| `hop.body` | ja, via `BS_BODY` (`analyser.ts:443`) | 0 |
| `riser.buildUp` | ja, via `BS_BUILD` | 0 |
| `spectrum.bandDbRaw[6]` | **nej**, räknas bara i workerns `bigStep` (`analyser.ts:472`) | 1 `BS_`-plats |
| läsare i workerns `Analyser`: uppbyggnaden (`lastDropMs`) och sektionens insamlare (`dropCand + secBodyRet`) | – | 2 `B_`-platser |
| klockan (`bodyUnderDb`) | läses redan i huvudtrådens `Analyser` (`split.ts:185`), där drop nu kör | 0 |
| dropens egna 13 `BS_`-platser | behövs inte längre | −13 platser, `pack`/`unpack` tas bort |

Summan blir ≈10 rader i 3 filer (`split.ts`, `analyser.ts` och `analyserDrop.ts`), plus giftprovet. Det är **inte** byte-identiskt och ska inte vara det. Uppbyggnaden i workern ser `lastDropMs` ett hopp senare, och med den riktiga workern kommer band 6 ett varv efter. Ändringen är en beteendeändring som döms på bänken, inte av `bevis.sh`.

### b6. Vem skriver vad: de 16 ställen som bryter mot regeln i dag

Det här är tabellen som steg 2–13 bygger på. Byte-identiteten vilar på att varje flyttad sats hamnar på samma plats i hoppet.

| fält i dag | skrivare i dag | ägare efter | hur |
|---|---|---|---|
| `beatAnchorMs` | kärnan 851, kick 76, `setVirtualClock` 596 | kick | 851 flyttar in i `anchorStep`, 596 blir del av `kicks?.reset()` (sista raden) |
| `pendingKickMs` | kärnan 852, kick 79, `setVirtualClock` 595 | kick | samma |
| `kicks.lastKick` | kick 60, `setVirtualClock` 594 | kick | 594 blir del av `kicks?.reset()` |
| `kfPrev`, `kfPrev2` | kärnan 855-856, läses av kick 71 | kick | flyttar in i `anchorStep`, sist |
| `hKickAt` | kick 81, kärnan 901 | kick (`kickAt`) | `anchorStep` sätter 0 först, och förfiningen skriver värdet. Rad 901 skrev samma värde och tas bort. Ingen läser fältet mellan rad 849 och ramen. |
| `hKick` | kärnan 885 (ur returvärdet) | kick (`kick`) | `kickStep` skriver `o.kick` |
| `kickHit` | kärnan 878-879; transporten 468 i workern | kärnan (`hop.kickHit`) | oförändrat, det är trumkittet |
| `hIntensity` | nivå 103, kärnan 888 och 900 (samma värde) | nivå (`intensity`) | kärnans två skrivningar tas bort |
| `hInZone` | kärnan 900 (kopia av `levels.inZoneState`) | nivå (`inZone`) | kopian tas bort |
| `hInRiser` | transporten 444, uppbyggnaden via retur 476/896, kärnan 890/900 | uppbyggnad (`inRiser`) | stenen skriver i sin tråd, `unpack` i den andra |
| `localBpm` | kärnan, klockan (`setClock`), **nivå** (`analyserLevel.ts:78`) | klockan (`ClockOut`) | nivåns skrivning blir kommandot `clock.zeroBpm()`; F_SIL10 (:512) likaså |
| `bigCounter` | kärnan `++` (:472, :871), **spektrum** nollställer (`analyserSpectrum.ts:104`) | spektrum (privat) | `if (++this.bigCounter >= BIG_EVERY) this.bigStep()` flyttar in som `bands.bigTick()`, samma två platser |
| `secAgg` | **sektion** (`analyserSection.ts:345-347, 351-353`) och kärnan `bigAgg` (:502-504) skriver; kärnan läser och nollar (`pushSlowRecord` :338-351, `slowStep` :525-531) | sektion (privat `agg`) | alla fyra ställena blir sektionens metoder (g) |
| `secSpecDirty`, `bassOnPeak` | spektrum sätter (:151, :134), **sektion** nollar (:343, :353) | spektrum | räknare `bigN`/`bassOnPeaks`, sektionen minns senast sedda (steg 12) |
| `drop.dropCand`, `activeMs`, `buildUp` i workern utan `bigOn` (ingen profil kör den) | transporten `slowStep` :536 skriver i tre andra stenars fält | sektion (`wire`) | sektionens egen ledning (g) |
| `beatAnchorMs`, `pendingKickMs`, `lastKick`, `beatPhaseMs`/`beatPhaseConf`, sektionens nollning, alla i `setVirtualClock` :594-596 | kärnan, i andra stenars fält | kick, klockan, sektion | tre kommandon på samma plats och i samma ordning: `this.kicks?.reset()` (bara de tre kickfälten), `ck.resetPhase()` (`ClockOut`, b1), `this.sections?.sectionReset()` (finns redan). Raden `this.lastT = 0` (:597) är kärnans och står kvar |

Kicken kör bara i huvudtråden. Workern får `kick` som parameter till sektionens insamlare (`B_KICK`, `analyser.ts:479`) och `kickHit` till hoppfacket (`B_KICKHIT`, `:468`), så regeln gäller i båda trådarna.

### b7. Var varje läsning hamnar: alla 124 namn

Greppet `grep -oE "this\.a\.[A-Za-z0-9_]+" src/analyser<Sten>.ts | sort -u` på dagens filer ger 124 namn. Tabellen placerar vart och ett. Namn i fetstil var luckor i första skissen.

| sten | namn | eget fack eller privat | läses ur andra fack |
|---|---|---|---|
| sektion | 43 | **SectionOut** (17): `section`, `sectionStartMs`, `sectionIndex`, `sectionTier`, `prevSection`, `levelVsHighDb`, `repeatSim`, `repeatAgoMs`, `repeatSection`, `repeatTier`, `repeatHighAtMs`, `repeatHighEndAtMs`, `expectHighMs`, `expectSource`, `secBuildAt`, `secBuildSeen`, `boundaryNov`. **Privat** (6): **`secAgg`** → `agg`, **`secSpecHop`**, **`secDump`**, **`dbgSecBlock`**, `secSpecDirty` → `specSeen`, `bassOnPeak` → `bpkSeen` | hop (9): `dtHop`, `centSmooth`, `wallNow`, `hRms`→`rms`, `hNowWall`→`nowWall`, `hFlux`→`flux`, `hBreaking`→`breaking`, **`role`**, **`bigOn`**. kick: `hKick`→`kick`. nivå: `hIntensity`→`intensity`, `activeMs`. klocka: `localBpm`→`bpm`, **`beatPhaseMs`**→`phaseMs`. drop: `dropCand`, `secBodyRet`. uppbyggnad: `buildUp`. spektrum (4): `bandDbRaw`, `bandAbs`, `bassOnRing`, `bassOnN` |
| nivå | 16 | **LevelOut** (5): `gain`, `envelope`, `activeMs`, `levelCeil`, `hIntensity`→`intensity` | hop (9): `lvlSmooth`, `hGated`→`gated`, `dtHop`, `role`, `hRms`→`rms`, `hNow`→`now`, `hHopMs`→`hopMs`, `hDt`→`dt`, `cfg`. klocka: `localBpm` (läser `bpm`, skriver via `zeroBpm()`). kommando: `flagSlow` |
| spektrum | 16 | **SpectrumOut** (10): `bandLvl`, `bandOn`, `bandDbRaw`, `bandAbs`, `fbOn`, `bassOnRing`, `bassOnN`, `specSink`→`sink`, `secSpecDirty`→`bigN`, `bassOnPeak`→`bassOnPeaks`. **Privat**: `bigCounter` | hop (4): `lvlSmooth`, `hGated`→`gated`, `cfg`, `bigOn`. nivå: `activeMs` |
| kick | 16 | **KickOut** (6): `pendingKickMs`, `beatAnchorMs`, `kfPrev`, `kfPrev2`, `hKickAt`→`kickAt`, `dbgKick` | hop (6): `hKickFlux`→`kickFlux`, `hEnergy`→`energy`, `hNow`→`now`, `hHopMs`→`hopMs`, `wallNow`, **`dbgRms`**→`rms`. nivå (3): `gain`, `envelope`, **`gainLocked`**. klocka: **`beatSrc`**→`src` |
| drop | 11 | **DropOut**: `bodyUnderDb` | hop (7): `wallNow`, `dSec`→`sec`, `dLvh`→`lvh`, `lvlSmooth`, `hNowWall`→`nowWall`, `hBody`→`body`, `dtHop`. nivå: `activeMs`. uppbyggnad: `buildUp`. spektrum: `bandDbRaw` |
| uppbyggnad | 9 | **RiserOut**: `buildUp` | hop (4): `lvlSmooth`, `centSmooth`, `hNowWall`→`nowWall`, `dtHop`. nivå: `levelCeil`, `activeMs`. drop: `lastDropMs`. spektrum: `bandDbRaw` |
| bas | 8 | **BassOut**: `profBassline`→`bassline`, `bassOnsetsPerBeat`→`onsetsPerBeat`. **Privat**: `blAccum`, `blKickSeq` | hop: `dBpm`→`bpm`, `dtHop`. klocka: `localBpm`→`bpm`. sektion: `section` |
| karaktär | 5 | – | spektrum: `bandLvl`, `bandOn`. bas: `profBassline`→`bassline`. hop: `kickHit`, `dConf`→`conf` |

Två omdöpta läsningar är inte ordagranna och måste bevisas:

- **`dbgRms` → `hop.rms`.** Båda skrivs ur samma `rms` på rad 825-826, före `kickStep` (:833), och inget annat skriver `dbgRms`. I workern skriver transporten `hop.rms` (:468), men kicken kör aldrig där. `Analyser.dbgRms` blir en getter för verktygen.
- **`beatSrc` → `clock.src`.** Det är samma objekt, inte en kopia. Motorns `publishClock(cfg)` skriver fortfarande i `cfg.beat`, och kicken läser `clock.src.beat`.

**Statiska rattar** som stenarna läser via `Analyser.X` eller importerar ur `analyser.ts`:

| ratt | läses av | hem |
|---|---|---|
| `BE_FALLBACK_MS`, `BE_MEM_BEATS`, `BASS_SPAN_DB` (`BE_SPAN_DB`), `BASSON_LEN`, `BIG_EVERY`, `SECTION_AGG_HOP`, `BODY_HIGH_MS`, `BODY_HIGH_DB`, `BODY_CEIL_DB_S` | två eller fler | `analyserFack.ts` avsnitt 2 |
| `KICK_COOLDOWN_MS`, `KICK_EFLOOR`, `KICK_NOGATE` (:261-263) | bara kick | `analyserKick.ts` |
| `PEAK_DECAY` (:192) | bara spektrum | `analyserSpectrum.ts` |
| `RANK_WIN`, `RANK_RUN`, `RANK_RUN_IN`, `REPEAT`, `SECTION_EARLY_DB`, `SECTION_SCORE_F32`, `SECTION_CARRY` | bara sektion | `analyserSection.ts` |
| `BODY_RISE_DB`, `BODY_GONE_MIN_MS`, `DROP_QUALITY_DB`, `DROP_RISE_LOW_DB`, `DROP_UNDERPEAK_MIN`, `MINI_SPACING_MS`, `DROP_TRACE` | bara drop | `analyserDrop.ts` |

Jag har kontrollerat med grep att varje ratt i de fyra nedre raderna bara förekommer en gång i `analyser.ts`, alltså på raden där den definieras. `BIG_EVERY` förekommer 5 gånger, eftersom kärnan läser den, och därför ligger den i facket.

---

## (c) Två stenar omskrivna

### Bas: hela filen

Det här ändras:

- `a: Analyser` blir `BassReads` och `BassOut`.
- Fälten `blAccum`, `blKickSeq` och `envSeq` flyttar in i stenen. De är basens egen ackumulator.
- Ackumuleringen, som i dag finns i två likadana kopior i `analyser.ts` (rad 466 och 843), blir `accumulate()`.
- `bassEnergyStep` skriver `o.energy` i stället för att returnera värdet (regel 3). Ramen läser facket.
- `kickHit` läses ur hoppfacket, eftersom det är kärnans trumkit.

```ts
/**  BASEN. Anteckningar: docs/analysator/analyserBass.md */
import { BASS_SPAN_DB, BE_FALLBACK_MS, BE_MEM_BEATS, stabilise,
  type HopOut, type ClockOut, type SectionOut, type SpectrumOut, type BassOut } from './analyserFack.js';

const DOUBLE_FROM_START = ['blPrev1', 'blPrev2', 'blTrough', 'blAccum'] as const;   // blAccum flyttad hit ur analyser.ts:153
const BE_TOP_BEATS = 16, BE_FAST_BEATS = 2, BE_BEAT_MIN_MS = 300, BE_BEAT_MAX_MS = 600;

/** DET BASEN LÄSER. Inget annat går att nå. */
export interface BassReads {
  hop:      Readonly<Pick<HopOut, 'dtHop' | 'bpm' | 'kickHit'>>;   // bpm = tempot vid hoppet (i dag a.dBpm); kickHit = trumkittet
  clock:    Readonly<Pick<ClockOut, 'bpm'>>;                       // i dag a.localBpm
  section:  Readonly<Pick<SectionOut, 'section'>>;                 // i dag a.section
  spectrum: Readonly<Pick<SpectrumOut, 'bandLvl'>>;                // i dag läst åt basen i analyser.ts:466 och :843
}

export class BassTracker {
  private readonly hop: BassReads['hop']; private readonly clock: BassReads['clock']; private readonly sec: BassReads['section'];
  private readonly sp: BassReads['spectrum'];
  constructor(r: BassReads, private readonly o: BassOut) {
    this.hop = r.hop; this.clock = r.clock; this.sec = r.section; this.sp = r.spectrum;
    stabilise(this, DOUBLE_FROM_START);
  }
  private beHiShort = NaN;

  /** BASENERGIN MED SLAGET SOM TIDSENHET, ett hopp (snabba vägen, anropas ur fillFrame). */
  bassEnergyStep(sub: number, kick: number): void {
    const o = this.o, x = 5 * Math.log10(sub + 1e-7) + 15 * Math.log10(kick + 1e-7), hopMs = this.hop.dtHop * 1000;
    let per = this.clock.bpm > 40 ? 60000 / this.clock.bpm : BE_FALLBACK_MS;
    per = per < BE_BEAT_MIN_MS ? BE_BEAT_MIN_MS : per > BE_BEAT_MAX_MS ? BE_BEAT_MAX_MS : per;
    o.beHi = !(x <= o.beHi) ? x : o.beHi + (x - o.beHi) * (hopMs / (BE_TOP_BEATS * per));
    this.beHiShort = !(x <= this.beHiShort) ? x : this.beHiShort + (x - this.beHiShort) * (hopMs / (BE_FAST_BEATS * per));
    o.beRef = this.sec.section === 'high' || !(o.beHi <= o.beRef) ? o.beHi : o.beRef + (o.beHi - o.beRef) * (hopMs / (BE_MEM_BEATS * per));
    let e = 1 - (this.beHiShort - x) / BASS_SPAN_DB;
    o.beShort = e > 0 ? e : 0;
    e = 1 - (o.beHi - x) / BASS_SPAN_DB;
    o.energy = e > 0 ? e : 0;
  }

  private blAccum = 0; private blKickSeq = -100; private envSeq = 0;   // ur Analyser: ackumulatorn är basens egen
  private blPrev1 = 0; private blPrev2 = 0; private blRef = 0.1; private blLastOnset = -100;
  private blOnsets = new Int32Array(32); private blOnsetPos = 0; private blTrough = 1;

  /** Hoppets bidrag till basgången. I dag två likadana rader i analyser.ts (466 och 843). */
  accumulate(): void {
    const bl = this.sp.bandLvl[1] + this.sp.bandLvl[2]; if (bl > this.blAccum) this.blAccum = bl;
    if (this.hop.kickHit >= 1) this.blKickSeq = this.envSeq;
  }

  /** TYDLIG BASGÅNG, ett env-sampel (100 Hz). */
  stepBassline(): void {
    const v = this.blAccum; this.blAccum = 0;
    const seq = ++this.envSeq;
    const p1 = this.blPrev1;
    if (v < this.blTrough) this.blTrough = v;
    if (p1 >= this.blPrev2 && p1 > v && p1 > 0.05 && p1 - this.blTrough >= 0.25 * this.blRef && seq - 1 - this.blLastOnset >= 6) {
      if (seq - 1 - this.blKickSeq >= 6) { this.blOnsets[this.blOnsetPos] = seq - 1; this.blOnsetPos = (this.blOnsetPos + 1) & 31; }
      this.blLastOnset = seq - 1;
      this.blRef += (p1 - this.blRef) * 0.1;
      this.blTrough = p1;
    } else if (this.blRef > 0.05) this.blRef *= 0.999;
    this.blPrev2 = p1; this.blPrev1 = v;
    let n = 0; for (let i = 0; i < 32; i++) if (seq - this.blOnsets[i] <= 200 && this.blOnsets[i] > 0) n++;
    const beats2s = (this.hop.bpm > 0 ? this.hop.bpm : 120) / 30;
    const opb = n / beats2s;
    this.o.onsetsPerBeat = opb;
    const raw = Math.max(0, Math.min(1, (opb - 0.4) / 0.8));
    this.o.bassline += (raw - this.o.bassline) * 0.01;
  }
}
```

Anropsplatserna i `analyser.ts` blir `this.bass?.accumulate()` (rad 466 och 843), `this.bass?.stepBassline()` (rad 467 och 921) och `this.bass?.bassEnergyStep(A[0], A[1])` (rad 948). Ramen läser därefter `const bo = this.f.bass` och tar `bo.energy`, `beShort`, `beHi` och `beRef`. Karaktären läser `bassline` via `Pick<BassOut, 'bassline'>` i stället för `a.profBassline`.

Lägg märke till rad 466: i workern läses `kickHit` där **före** transporten på rad 468 skriver det nya värdet. Basen ser alltså förra hoppets `kickHit`. Det följer med oförändrat, eftersom anropet ligger kvar på samma rad.

### Drop: kontraktet och ändringarna

Hela filen står i bilagan. Den är genererad maskinellt ur dagens `analyserDrop.ts`, med enbart de byten som står nedan, och ingen `this.a` finns kvar.

| i dag | efter | varför |
|---|---|---|
| `import { Analyser, BODY_RISE_DB, … } from "./analyser.js"` | import ur `analyserFack.js` och `BS_`-platserna ur `split.js`. Sju rattar flyttar in i filen (bara drop läser dem). | stenen beror inte längre på huvudfilen |
| `this.a.hNowWall`, `hBody`, `dtHop`, `lvlSmooth` | `this.h.nowWall`, `body`, `dtHop`, `lvlSmooth` | hoppfacket |
| `this.a.dSec`, `this.a.dLvh` | `this.h.sec`, `this.h.lvh` | sektionen sedd vid hoppet |
| `this.a.bandDbRaw[6]` | `this.sp.bandDbRaw[6]` | spektrumfacket |
| `this.a.activeMs` | `this.lv.activeMs` | nivåfacket |
| `this.a.buildUp` | `this.ri.buildUp` | uppbyggnadens fack |
| `this.a.bodyUnderDb = …` (enda skrivningen i `Analyser`) | `this.o.bodyUnderDb = …` | dropens eget fack |
| `this.dropCount++` och 13 andra publicerade fält | `this.o.dropCount++` osv. | samma |
| `Analyser.BODY_HIGH_MS`, `BODY_HIGH_DB` | `BODY_HIGH_MS`, `BODY_HIGH_DB` ur facket | delas med sektionen |
| `this.a.wallNow()` i loggraderna | `this.h.wallNow()` | loggtexten blir identisk (verktyg läser `[dropfire] wall`) |
| transporten i `analyser.ts:443-444`, `487-488` och dropens del av `651-652` | `pack`, `unpack`, `resume` i stenen, ordagrant (provat med `transport.mjs`, 0 avvikelser) | av med stenen = av med transporten |

Anropsplatserna i `analyser.ts`:

- Rad 475 och 895 blir `this.drop?.dropStep()`.
- Rad 443-444 blir `h.body = s[BS_BODY]; this.drop?.unpack(s); this.riser?.unpack(s);`.
- Rad 487-488 blir `s[BS_BODY] = h.body; this.drop?.pack(s); this.riser?.pack(s);`.
- Rad 651-652 delas på tre ägare: `this.bigSeq = st[BS_SEQ]` blir kvar i kärnan, sedan `this.bands.resume(st)` (`specN`), `this.drop?.resume(st)` och `this.sections?.resume(st)` (dagens `secVDrops = dropCand`, se g).
- Rad 950-951 läser `const dp = this.f.drop` (inte `dr`, som redan är `outDrum` på rad 940).
- `riserStep` läser `Pick<DropOut, 'lastDropMs'>`, och sektionen läser `Pick<DropOut, 'dropCand' | 'secBodyRet'>`.
- Klockan får `bodyUnderDb` via en getter på `Analyser` (`get bodyUnderDb() { return this.f.drop.bodyUnderDb; }`). V8 inlinar den.

De tre transportlistorna skiljer sig från varandra i dag: `unpack` saknar `dropCand`, och `resume` saknar fem fält. De flyttas ordagrant och städas inte i flytten.

---

## (d) Vad det kostar att ta bort och lägga till en sten

### Ta bort

Två saker ska inte blandas ihop:

- **Ta bort för gott** = radera filen och raderna som anropar stenen. Det är slutläget, och det är den siffran som ska jämföras med i dag.
- **Prova utan** = byta kedjeraden mot `off(…)` på en backup-gren och döma på bänken. Det är ett prov på en rad, inget läge som står kvar. Efter bänken kommer raden tillbaka, eller så tas stenen bort för gott.

Facket står kvar i båda fallen, så läsarna ändras inte. Facket bär ramfälten, och `Frame` får inte ändras (villkor 3).

| sten | ta bort i dag | ta bort efter | prova utan, efter |
|---|---|---|---|
| drop | filen + 16 rader i 3 filer (`analyser.ts` ×13, `analyserRiser.ts:38`, `analyserSection.ts:69, 346`), och läsarna måste få påhittade värden | filen + 7 rader i `analyser.ts`: import, kedjerad, `dropStep` ×2, `pack`, `unpack`, `resume`. 6 rader efter steg 15, när de två `dropStep` blir ett. 13 `BS_`-konstanter i `split.ts` blir döda och tas bort (≈3 rader). **0 rader i andra stenar** | 1 rad |
| uppbyggnad | filen + ≈15 rader i 3 filer (`riser.` ×4, `buildUp` läst i drop ×3, sektion ×2, `analyser.ts` ×6) | filen + 7 rader: import, kedjerad, `riserStep` ×2, `pack`, `unpack`, `rates`. 0 i andra stenar | 1 rad |
| karaktär | filen + 7 rader i `analyser.ts` (445, 478, 485, 733, 737, 741, 898). Ramens `profile` pekar på stenens objekt | filen + 6 rader: import, kedjerad, `profileStep` ×2, `pack`, `unpack` | 1 rad |
| bas | filen + 5 rader i `analyser.ts` (466, 467, 843, 921, 948), och `bassLevel` blir NaN om man inte hittar på ett värde | filen + 6 rader: import, `accumulate` ×2, `stepBassline` ×2, `bassEnergyStep`. Kedjeraden byts mot `this.f.bass.neutral()` i konstruktorn | 1 rad (`off('bas', this.f.bass)`) |
| kick | filen + ≈14 rader i 3 filer (`analyser.ts` 594-596, 833, 849-856, 901, `analyserCharacter.ts:24`) | filen + 5 rader: import, kedjerad, `kickStep`, `anchorStep`, `reset` | 1 rad |
| sektion | ≈30 rader i 4 filer | inte meningsfullt, sektionen är för stor | 1 rad (`off('sektion', this.f.section)`) |

Vill man radera filen hittar man alla rader med greppet i b2. Kompilatorn hittar resten, eftersom `this.drop` då inte längre finns.

**Vad mekanismen för "prova utan" kostar:** `| null` på sex fält, ≈10 `?.` i `analyser.ts`, funktionen `off()` (4 rader) och avstängningsprovet i steg 14. Utan den skulle provet kräva samma raderingar som slutläget, på en gren. `?.` kostar en jämförelse per anrop som alltid går samma väg (e).

### Vad som händer med dem som läste stenen

Värdena nedan gäller i **både** odelat och delat läge, och i båda profilerna, eftersom transporten stängs av med stenen.

| sten av | läses av | värdet utan stenen | följd | syns |
|---|---|---|---|---|
| **kick** | ramen (`kick`, `kickAtMs`, `beatAnchorMs`, `drum.kick`), klockan (`kickAtMs`, `beatAnchorMs`), sektionen (kickar per block), basgången (via `kickHit`), karaktären (punch) | `kick=false`, `kickAt=0`, `beatAnchorMs=0`; `kickHit` avtar till 0 | klockan låser bara på band-onset och får sämre fas. Ny takt startar på `frame.beatAnchorMs \|\| now` (`analyserClock.ts:626`). Sektionens täthet blir 0. | startloggen; `livstecken` visar `kick` och `kickAtMs` som döda |
| **bas** | ramen (`bassEnergy`, `bassEnergyShort`, `bassLevel`), karaktären (`bassline`) | 0, 0, `bassLevel=1` (via `neutral()`), `bassline=0` | effekter som följer basenergin står still | dito |
| **drop** | ramen (11 fält), uppbyggnaden (`lastDropMs`), sektionen (`dropCand + secBodyRet`), **klockan** (`bodyUnderDb`, `analyserClock.ts:554`) | räknare 0, `lastDropMs = −1,5e9`, `bodyUnderDb = 0`. I workern `wire.drops = 0`, eftersom `R_DROPS` och `BS_CAND` aldrig skrivs. | inga drops. Sektionen hoppar inte till high på en drop. **Klockan ser aldrig ett break** (`TG_BRK_DB` 24), så låtminnet "break och drop är samma låt" slutar verka. | dito |
| **uppbyggnad** | ramen (`buildUp`, `inRiser`), drop (lugn-vetot), sektionen (bänkkroken) | 0 / false | slam-kandidaten fyrar aldrig i intro, där den kräver `buildUp ≥ 0,25` (`analyserDrop.ts:135`). Full drop på flanken påverkas inte. | dito |
| **karaktär** | ramen (`profile`) | 0,4 / 0,5 / 0,3 / 0,5 / 0 | profilen står still på mitten | dito |
| **sektion** | ramen (13 fält), drop (`sec`, `lvh`), basen (`=== 'high'`) | `section=''` (via `neutral()`), `lvh=0`, i båda trådarna. Recordets `R_SEC_*` skrivs aldrig och står kvar på 0. | Drops lugn-veto gäller aldrig, eftersom `''` inte är `'low'`/`'intro'` och `0 > −6`. Fler slam-kandidater fyrar alltså. Basens referens låses inte i refrängen. Dirigenten får `''`, och det tål den: `?? ''` och `\|\| ''` (`effects.ts:1063, 1172, 1527`) ger smart-läge utan sektionsmanus (`effects.ts:930`), och effekternas `ctx.section` blir `'intro'` (`effects.ts:1927`). | dito, plus provet i steg 14 |
| **klockan** | ramen (bpm, fas, tillit), bas, sektion, kick (rutnätsgrinden via `clock.src`), karaktär (beat) | `bpm=0`, rutnätet `null`/`undefined`, `cfg.beat = undefined` | alla har redan reservvärden (`analyserBass.ts:16`, `analyserSection.ts:128`, `analyser.ts:957`, kickens `gk && gk.bpm > 40`). Analysatorn går vidare, men dirigenten tappar takten. | `frame.bpm = 0` i varje ruta; `/api/health` saknar `split`-raden för taktvägen (`index.ts:110`) |
| **nivå** | grund | – | `activeMs=0` stänger spektrumet (`analyserSpectrum.ts:117`), drop, uppbyggnaden och sektionen | typen tillåter inte `null` |
| **spektrum** | grund | – | drop, uppbyggnad, karaktär, bas, sektion och klockans band står utan indata | typen tillåter inte `null` |

Ingen sten faller med en annan automatiskt. Det behövs inte, eftersom alla beroenden mellan avstängbara stenar är mjuka.

**Klockan tas bort på ett annat sätt.** Den är ingen `| null`-sten i kedjan, eftersom den inte körs ur `process` i DMX. I DMX kör motorn den (`index.ts:206`: `analyser.hopLane.feed(frame, cfg, analyser)`) och workerns `HopLaneSlow`, som byggs av `hopFeedFactory` (`analyser.ts:1004, 1055`; `slowWorker.ts:11`). I lotus kör analysatorn den själv i `fillFrame` (`hopSelf`, `:963-966`). Odelat skapas den på `:1002`, och med `BEAT_FEED=inline` på `:1007`. Att ta bort klockan är alltså tre rader i `createAnalyser`, alla i analysatorn:

| rad | i dag | utan klockan |
|---|---|---|
| `:1055` | `hopFeedFactory` ger `() => new BeatFeed()` | ger `undefined`. Då byggs varken taktvägens buffertar (`createSplitBuffers(false)`), `HopLaneFast` eller `hopSelf` (`:1004-1008`), och workern får ingen `HopLaneSlow` (`slowWorker.ts:11`) |
| `:1002` | `a.clock = new BeatFeed()` (odelat) | raden tas bort |
| `:1007` | `fast.clock = new BeatFeed()` (`BEAT_FEED=inline`) | raden tas bort |

`index.ts` behöver ingen ändring. Rad 206 har redan grenen utan taktväg, `else analyser.publishClock(cfg)`, och den skriver `cfg.beat = undefined` (`analyser.ts:973`). `split.ts` importerar fortfarande `trustStep` ur `analyserClock.ts`, så filen kan inte raderas så länge taktvägen finns i `split.ts` (g).

Två fack har ett neutralt värde som skiljer sig från startvärdet: bas (NaN → 0) och sektion (`'intro'` → `''`). Det är de enda `neutral()`-metoderna.

### Lägga till

En ny sten som kan ligga i worker-vägen och ger ramen två fält:

| | i dag | efter |
|---|---|---|
| ny fil | 1 | 1 (stenen, dess `Reads`, `pack`/`unpack`) |
| fack | fält direkt på `Analyser` | `XOut` i `analyserFack.ts`, ≈3 rader, med `stabilise` för de tal som blir flyttal i hoppet |
| `analyser.ts` | import, fält, anrop i `process` **och** i `drainBig`, transport i `pushBig` **och** i `drainBig`, ramraderna, ≈7 ställen | import, kedjerad, anrop i `process` och `drainBig`, `pack`- och `unpack`-anrop, ramraderna, ≈7 ställen (6 efter steg 15) |
| `split.ts` | 2 `BS_`-platser + `BIG_STATE_LEN` | samma |
| `Frame` | 2 fält | samma |

Att lägga till blir alltså inte billigare räknat i ställen. Det är ungefär 10 ställen både före och efter, och 9 efter steg 15. Vinsten ligger på annat håll:

- Den nya stenen kan inte råka läsa eller skriva något den inte deklarerat.
- Ingen befintlig sten ändras.
- Behövs stenen i andra tråden, säger dess `Reads` exakt vilka platser i recordet som krävs (b5).

Det som är dyrt i dag är att ta bort en sten och att hitta dess läsare, och det är det som blir billigt.

---

## (e) Kostnad i µs och minne

### Uppmätt, och vad det inte täcker

Allt nedan är mätt på PC:n den 21/11. Ingen siffra är mätt på den riktiga, omskrivna `analyser.ts`, eftersom den inte finns än. Därför är grinden per steg (nedan) det som avgör, och siffrorna här är bara skälet att tro att grinden går igenom.

**1. Drop och bas, stenarnas logik** (`check2/tid.mjs`). Dagens byggda drop och bas (`dist/`) mot de omskrivna, samma 400 000 hopp med slumpade insignaler, gammal och ny i var sin process, växelvis, 20 körningar per process, minsta värdet:

| par | gammal (min, µs/hopp) | ny (min, µs/hopp) | skillnad |
|---|---|---|---|
| 1 | 1,748 | 1,703 | −0,04 |
| 2 | 1,721 | 1,693 | −0,03 |
| 3 | 1,714 | 1,768 | +0,05 |
| 4 | 1,750 | 1,737 | −0,01 |
| 5 | 1,784 | 1,700 | −0,08 |

Mediandifferensen är −0,03 µs, alltså inom bruset. **Det här säger lite om huvudtråden.** I DMX och lotus kör `dropStep`, `accumulate` och `stepBassline` i workern (`drainBig`, `analyser.ts:466-475`). På huvudtråden kör bara `bassEnergyStep` och dropens `unpack`. Provet läser dessutom ur en liten falsk `Analyser`.

**2. Huvudtrådens mönster, som modell** (`check3/hop.mjs`). Det som ändras på huvudtråden är mönstret: ≈30 hoppfält bakom ett hissat `f.hop`, stenar som läser andra fack via sparade referenser, och `?.`-anrop. Modellen har samma mönster i mindre skala: 20 hoppfält skrivs och läses per hopp, tre stenar läser tre fack var och skriver i ett fjärde, och den gamla varianten har fälten på ett objekt med 160 fält. Minsta tid per 1000 hopp, fem omgångar i var sin process:

| omgång | gammal | ny | ny utan `stabilise` |
|---|---|---|---|
| 1 | 107,7 | 99,8 | 95,0 |
| 2 | 96,5 | 78,8 | 79,7 |
| 3 | 81,5 | 86,4 | 93,4 |
| 4 | 85,6 | 69,0 | 93,4 |
| 5 | 94,3 | 67,8 | 76,6 |

Hela mönstret kostar alltså ≈0,07–0,11 µs per hopp, både gammalt och nytt, och skillnaden är under 0,02 µs. Även om den riktiga filen skulle vara tio gånger dyrare än modellen ligger det långt under budgeten 6,6 µs. Två saker visar modellen **inte**: den riktiga filens storlek och inlining, och deopt när ett fält tappar flyttalsformen (i modellen är första skrivningen redan ett flyttal, och `--trace-deopt` gav 5/4/4 rader, alla i provets egen toppslinga). Det första fångar tidsgrinden, det andra deopt-räkningen.

**3. Hur mycket PC:n brusar** (A/A-prov, samma bygge som gammal och ny):

| prov | utfall |
|---|---|
| `piBench.mjs dist dist`, 4 par (lotusstil, delad inline, hela analysen i en tråd) | medel per varv 79–153 µs, summan 114,2 mot 114,6 µs (+0,3 %) |
| `dmxDump` med `DUMP_SPLIT=sync`, huvudtrådens `cpuUsPerHop`, 5 körningar | 101–127 µs |

En enskild körning på PC:n kan alltså inte se 3 %. Summan över fyra växelvisa par kan det ungefär (A/A: 0,3 %). PC:n var dessutom belastad av andra jobb.

**4. Deopt i replay** (`node --trace-deopt tools/dmxDump.mjs <bygge> lang-20261113T160345.wav 150`, antal rader `bailout (kind: deopt`):

| bygge | deopt |
|---|---|
| dagens `dist`, körning 1 och 2 | 145, 144 |
| `.arena/ref/dist0` (före uppdelningen 11-14) | 124 |

Räkningen är stabil inom ±1, och därför duger den som grind. Att dagens bygge har ≈20 fler än `dist0` är inte utrett. Det ligger utanför den här flytten, eftersom grinden mäter mot flyttens egen referens `dist-kedja0`.

### Grinden per steg (ny, byggs före steg 1)

`bevis.sh` har i dag ingen tidsgrind, och den kör bara DMX-profilen. Rad 18-19 skriver ut `cpuUsPerHop`, men `ok` påverkas inte av tiden. Fyra prov läggs till, ≈16 rader (alla rader nedan står före dagens rad 21, och `$REF` ersätter `.arena/ref/dist0`):

```bash
# 5. TID: hela analysen (lotusstil, inline), 4 par växelvis. FEL över +3 %.
p=$(node tools/refaktor/piBench.mjs $REF/analyser.js dist/analyser.js $W/lang-20261113T160345.wav 4 | tail -1 | sed 's/.*(\(-\{0,1\}[0-9.]*\) %).*/\1/')
echo "tid ny mot ref: $p %"; awk "BEGIN{exit !($p > 3)}" && { echo "TID FEL"; ok=0; }
# 6. DEOPT: FEL över ref + 1 (räkningen är stabil inom ±1).
dc() { node --trace-deopt tools/dmxDump.mjs "$PWD/$1" $W/lang-20261113T160345.wav 150 2>/dev/null | grep -c 'bailout (kind: deopt'; }
d0=$(dc $REF); d1=$(dc dist); echo "deopt $d0 -> $d1"; [ $d1 -gt $((d0 + 1)) ] && { echo "DEOPT FEL"; ok=0; }
# 7. LOTUS: samma bygge med lotus profilfil. Paritet --style lotus odelat och inline (hopSelf), Date.now = ljudklockan (fakenow.mjs).
LP=../../../lotus-light-link/pi/src/audio-analyser/analyserProfile.ts
lp() { rm -rf "$1-lotus"; cp -r "$1" "$1-lotus"; npx tsc $LP --outDir "$1-lotus" --target es2022 --module nodenext --moduleResolution nodenext --skipLibCheck --types node; }
lp $REF; lp dist
for s in "" "--split inline"; do
  r=$(node tools/refaktor/fakenow.mjs --old $REF-lotus/analyser.js --new dist-lotus/analyser.js --style lotus --secs $SECS --grid --hint-every 97 --reset-every 211 $s $F 2>&1 | tail -1)
  echo "lotus $s: $r"; echo "$r" | grep -q 'avvikande hop 0, avvikande loggrader 0' || ok=0
done
# 8. STARTVÄRDEN: varje flyttat fält har dagens värde före första hoppet (flyttkarta.json växer steg för steg).
node tools/refaktor/startvarden.mjs $REF/analyser.js dist/analyser.js tools/refaktor/flyttkarta.json || ok=0
```

- `fakenow.mjs` är provet ur förprovet (12 rader, flyttas till `tools/refaktor/`). Den binder `Date.now` till den ljudklocka som `analyserParity.mjs` redan sätter i lotusstil (`setAudioClockMs`, rad 97), och startar sedan `analyserParity.mjs` oförändrad. Utan den avviker lotus klockväg redan A/A, eftersom `fillFrame` skickar `Date.now()` till klockan och fasen (`analyser.ts:964-966`).
- Profilfilen är data och samma på båda sidor. Lotus profil ingår inte i manifestet, så `ref` och `ny` får samma fil.
- `startvarden.mjs` (≈30 rader) skapar `new Analyser(cfg)` ur båda byggena, i båda stilarna, och jämför för varje rad i `flyttkarta.json` (`"hKickAt": "f.kick.kickAt"`, osv.) det gamla fältets värde med det nyas, med `Object.is`. Det fångar till exempel `kickAt = 0` mot dagens `0.5`, och `0` mot `-0`. Kartan är tabell b7 och b6 i maskinform och skrivs i steg 2–5.
- Ger tidsprovet utslag, körs det om en gång. Ger det utslag igen, backas steget. Samma gäller deopt-räkningen.
- PC-grinden fångar grova fel, som en getter i en het slinga eller ett megamorft anrop. Den fina domen fälls på Pi:n: `piBench.mjs` på lotus-Pi:n efter steg 5, 9, 13 och 15, mot `dist-kedja0`. Varje grupp får högst +3 %, och hela flytten högst +10 % (budgeten). Går en grupp över, delas den upp commit för commit tills steget som kostar är hittat.
- `latens-pi.sh` live efter deploy, som i dag.

### Uppskattat för hela flytten

| | i dag | efter | varför |
|---|---|---|---|
| läsa en annan dels värde | `this.a.activeMs`: 2 laddningar | `this.lv.activeMs`: 2 laddningar | stenen sparar fackets referens i konstruktorn |
| skriva ett eget publicerat värde | `this.dropCount`: 1 | `this.o.dropCount`: 2 | kan hissas till `const o = this.o` i en het funktion om Pi:n visar att det behövs |
| huvudfilens hoppfält (≈30 per hopp, till exempel rad 826, 832, 885, 933-934) | `this.hRms` | `h.rms` med `const h = this.f.hop` hissad | +3–4 laddningar per funktion (`process`, `fillFrame`, `pushBig`, `drainBig`), inte per fält. Modellen: inte mätbart. |
| anrop per hopp | direkta, monomorfa | samma anrop, ≤10 med `?.`, plus `bigTick()` | en laddning och en jämförelse som alltid går samma väg. V8 inlinar som förut. |
| `cfg`, `role`, `bigOn` i heta vägen (`this.cfg.detection` :824, :827, :840, `this.bigOn` :842) | fält på `Analyser` | `h.cfg`, `h.role`, `h.bigOn` ur det hissade facket | ingen getter i heta vägen. Adapterns getters är bara för motorn, lotus och verktygen. |
| flyttalsformen | `DOUBLE_FROM_START` på `this` (:742) och startvärden 0,5 (:246-254) | samma namn i varje facks konstruktor (b1), och startvärdena ordagrant | annars börjar t.ex. `activeMs` eller `kickAt` som heltal, och V8 deoptimerar när musiken börjar. Grind: `startvarden.mjs` och deopt-räkningen (ref + 1). |
| sektionens `dropsNow()`/`activeNow()`/`buildNow()` | – | en jämförelse på en konstant roll | körs i blocket var 1 s, inte per hopp |
| allokeringar per hopp | 0 | 0 | facken skapas en gång. Enda closuren (`wallNow`) skapas vid start. |
| **tid per hopp, huvudtråden** | 66–95 µs (PC, uppmätt 11-14) | uppskattat < 1 µs extra. Inte mätt på den riktiga filen. | budgeten +10 % ≈ 6,6 µs. Grinden per steg avgör. |
| minne | – | ≈+2 kB per tråd | 10 objekthuvuden och referenser; fälten flyttar och kopieras inte. Banden förblir `Float32Array`. |
| delat minne | ring 1024×37, stora ringen 2048×16 + PCM, block 24/26 | oförändrat | layouten rörs inte |
| kod | 13 delade filer | 14 | `analyserFack.ts` ≈150 rader. `analyser.ts` blir ≈30 rader kortare (`bigAgg`, SECTION_CARRY-blocket, kopiorna), men får ≈20 rader adapter-getters. |

---

## (f) Flyttplan

**Före start** (inget i `src` ändras här):

- Sätt backup-taggen `backup/fore-kedjan-<datum>`.
- Bygg referensen `.arena/ref/dist-kedja0` från taggen.
- Låt `bevis.sh` ta referensen som argument (en rad: `REF=${REF:-.arena/ref/dist0}`), och lägg till prov 5–8 (e): tid, deopt, lotusgrinden och startvärdena.
- **Prova lotusgrinden på dagens kod** innan den används: A/A (`ref` mot en kopia av `ref`) ska ge 0 avvikelser, och samma ändring som i förprovet (`GRID_PHASE_OFFSET_MS + 1` i `publishPhase`) ska fällas. Båda är redan gjorda en gång (förprovet, `check5/`), men görs om med de riktiga sökvägarna.
- **Bygg omstartsprovet** `tools/refaktor/omstart.mjs` (≈40 rader). Det finns inte i dag: `SPLIT_TEST_CRASH` (`slowWorker.ts:15, 25`) är bara en krok, och inget i `src/` eller `tools/` skickar `{type:'crash'}`. En riktig worker-krasch går inte heller att jämföra byte för byte, eftersom omstarten sker efter en `setTimeout` (`analyser.ts:1034`). Provet gör därför omstarten i inline-läge, där den blir deterministisk:
  1. Det bygger analysatorn som `createAnalyser` gör i inline-läge (`analyser.ts:1005-1012`): `createSplitBuffers`, en `fast` och en `slow` med `setInlinePeer`, och taktvägen som där.
  2. Var 60:e sekund i inspelningen (≈11 gånger på 700 s) byter det den långsamma sidan mot en ny: `fast.setInlinePeer(new Analyser(cfg, { role: 'slow', split: buffers, resumeSeq: fast.fastReadSeq() }))`. Det är samma konstruktoranrop som workern gör efter en omstart (`slowWorker.ts:9`, med `resumeSeq` från `analyser.ts:1034`). Den nya sidan har tomma privata fält och måste hämta allt via `resume` och `bigState`, där talen nu inte är 0.
  3. Det kör referensen och det nya bygget med **samma** omstarter, och jämför varje ramfält i varje hopp med `Object.is`, som `analyserParity.mjs`.
  4. "Fortsätta" betyder två saker: ramarna är byte-identiska med referensen efter varje omstart, och räknarna (`dropCount`, `miniDropCount`, `buildStartCount`, `dropDemoted`, `dropSpaced`, `stopCount`) är aldrig lägre direkt efter en omstart än direkt före.
  5. **Provet ska bita.** Ta bort en rad ur dagens omstart i en kopia av referensen, till exempel `this.drop.stopCount = st[BS_STOPS]` (`:652`). Då ska provet rapportera avvikelse. Annars är provet fel och byggs om.

  Provet täcker `resume`-raderna, inte tidsförloppet i en riktig omstart (luckan i recordflödet). Det tidsförloppet ändras inte av flytten.
- Frys andra analysatorändringar, inklusive nattarenorna, under flytten.
- Ingen deploy förrän steg 16.

**Efter varje steg:**

```
npx tsc -p tsconfig.json
REF=.arena/ref/dist-kedja0 bash tools/refaktor/bevis.sh               # DMX odelad + inline, DMX-md5 med worker, TID, DEOPT, LOTUS odelad + inline, STARTVÄRDEN
node tools/refaktor/omstart.mjs .arena/ref/dist-kedja0 dist            # omstart var 60 s, byte för byte
grep -c "this\.a\." src/analyser<stenar omskrivna hittills>.ts        # 0 för varje sten som har haft sitt steg
```

Bara i steg 12, 13 och 15, som rör grenarna utan `bigOn`: ett röktest med `DMX_SECTION_AGG=env DMX_FAST_BANDS=0 REF=… bash tools/refaktor/bevis.sh`. Inget system kör de grenarna, så röktestet är ingen grind för DMX eller lotus. Det visar bara att de flyttade ordagrant.

Ett steg per commit. Fallerar något prov backas den commiten.

**Ordningen: först alla fack, sedan en sten i taget.** Stenarna läser varandras fack i en ring: uppbyggnaden läser `DropOut.lastDropMs` och drop läser `RiserOut.buildUp`, basen läser `SectionOut.section`, karaktären läser `BassOut.bassline`. Ingen stenordning gör att varje sten bara läser fack som redan finns. Därför flyttar steg 2–5 bara **data**: fältdeklarationen flyttar ur `Analyser` in i facket, och varje läsare ändras.

- I `analyser.ts`: `this.activeMs` → `lv.activeMs`, med facket hissat överst i funktionen.
- I en sten som inte har haft sitt steg än: `this.a.activeMs` → `this.a.f.level.activeMs`. Det är tillfälligt, en laddning till per läsning tills stenens eget steg byter till den sparade referensen `this.lv.activeMs`. Tidsgrinden mäter det som det är, och steget får +3 % som alla andra.
- Kompilatorn hittar varje läsare som glömts, eftersom fältet inte längre finns på `Analyser`. Verktygen i `tools/` som läser interna fält (≈10 stycken) hittas med grep och får en getter i adaptern.
- `DOUBLE_FROM_START`-namnen flyttar i samma steg som sina fält (b1).

Därefter skriver steg 6–13 om en sten i taget mot fack som alla finns.

| steg | vad | rör | extra prov |
|---|---|---|---|
| 1 | `analyserFack.ts`: rattarna, de delade konstanterna (b7), `stabilise` och typerna `AnalyserDetection`, `BeatGrid`, `Cfg`. `analyser.ts` re-exporterar `BASS_SPAN_DB`, `SILENCE_LEVEL`, typerna och `SECTION_AGG_HOP` som förut. | 2 filer, ren flytt | `npx tsc` på lotus-sidan med samma filer |
| 2 | **Data: hoppfacket.** `h*` (utom `hKick`, `hKickAt`, `hInZone`, `hInRiser`, `hIntensity`), `dtHop`, `hopMs`/`hHopMs`, `lvlSmooth`, `centSmooth`, `kickHit`, `dSec`/`dLvh`/`dConf`/`dBpm`, `role`, `bigOn`, `cfg` → `f.hop`. `this.hX` → `h.x` i `analyser.ts`, `this.a.hX` → `this.a.f.hop.x` i stenarna. `role`/`bigOn`/`cfg` får getters för adaptern. `lvlSmooth`, `kickHit` ur `DOUBLE_FROM_START`. Skrivkartan (b5) skrivs som kommentar i `HopOut`. | alla stenar | hoppfältens rader i `flyttkarta.json`, så att `startvarden.mjs` provar dem |
| 3 | **Data: grundfacken** `LevelOut` (med `gainLocked`), `SpectrumOut` (med `bassOnRing`, `bassOnN`, `sink`), `KickOut` (med `lastKick`), `ClockOut` (med `phaseMs`/`phaseConf` och `src = beatSrc`). `Float32Array` förblir `Float32Array`. | `analyser.ts` + läsarna | grep `tools/` efter fältnamnen |
| 4 | **Data: de små stenarnas fack** `BassOut`, `RiserOut`, `DropOut`, `CharacterOut` (ramens `profile` pekar på `f.character.profile`, `:737`, `:741`). | `analyser.ts` + läsarna | – |
| 5 | **Data: `SectionOut`**, de 17 publicerade fälten och deras 7 namn ur `DOUBLE_FROM_START`. | `analyser.ts` + läsarna | Pi-bänk grupp 1 (steg 2–5) |
| 6 | Karaktär (5 läs, 0 skriv): `Reads`, sparade fackreferenser, `pack`/`unpack`, `rates` i stenen | 2 filer | `tools/ensam.mjs` läser i dag insignaler ur `this.a.`-kedjor. Låt den läsa `XReads` i stället (≈10 rader). |
| 7 | Bas, enligt (c) | 3 filer | `check2/eq.mjs` mot den byggda filen, före `bevis.sh` |
| 8 | Uppbyggnad: `riserStep` skriver `o.inRiser` i stället för att returnera, `pack`/`unpack`/`rates` i stenen. `hInRiser` och raderna 890 och 900 (`this.hInRiser = inRiser`) tas bort, och ramen läser `f.riser.inRiser`. | 3 filer | – |
| 9 | Drop, enligt (c). Sju rattar flyttar ur `analyser.ts:143-149`. Rad 651-652 delas som i (c). | 4 filer | `check2/eq.mjs`, `check2/transport.mjs`; `omstart.mjs` är här det prov som bär (dropens `resume`). Pi-bänk grupp 2 (steg 6–9). |
| 10 | Kick, se tabell b6. `kickStep` skriver `o.kick`. Raderna 847-856 blir `this.kicks?.anchorStep()` på samma plats, med samma satser i samma ordning: `o.kickAt = 0`, sedan förfiningen om `pendingKickMs > 0`, sedan ankaret om `o.kick`, sist `kfPrev2`/`kfPrev`. Rad 594-596 blir tre kommandon på samma plats och i samma ordning: `this.kicks?.reset()` (`lastKick`, `pendingKickMs`, `beatAnchorMs`), `ck.resetPhase()` och `this.sections?.sectionReset()` (b6, sista raden). Gridfasen och sektionen nollas alltså också med kicken av. Rad 901 och `hKick`/`hKickAt` tas bort. `kickAt` behåller startvärdet 0,5. `KICK_*` flyttar in i filen. `dbgRms` → `h.rms`, `beatSrc` → `ck.src`. | 3 filer | `setVirtualClock` med i provet (hint + nollning finns redan i `bevis.sh`) |
| 11 | Nivå. `intensityStep` skriver `o.intensity` i stället för `a.hIntensity`, och raderna 888 och 900 slutar skriva `hIntensity` (de skrev samma värde). `inZoneState` blir `o.inZone`, och `hInZone` tas bort. `this.a.localBpm = 0` (`analyserLevel.ts:78`) blir `clock.zeroBpm()`, och likaså F_SIL10 (:512). `flagSlow` kommer in som kommando. | 3 filer | – |
| 12 | Spektrum. `bigCounter` blir privat, och `bands.bigTick()` ersätter rad 472 och 871. Flaggorna blir räknare: bigStep gör `o.bigN++` där den i dag sätter `secSpecDirty = true` (:151), och toppen gör `o.bassOnPeaks++` där den i dag sätter `bassOnPeak = true` (:134). Sektionen läser `if (sp.bigN !== this.specSeen) { this.specSeen = sp.bigN; … }` med **startvärdet `specSeen = -1`** (dagens `secSpecDirty = true`, :256), och `if (sp.bassOnPeaks !== this.bpkSeen) { g.bpk++; this.bpkSeen = sp.bassOnPeaks; }` med startvärdet `bpkSeen = 0` (dagens `false`). Invarianten "smutsig ⇔ `bigN !== specSeen`" håller vid varje ordning, och flera toppar mellan två läsningar ger ett `bpk`, som i dag. `specN` får `bands.resume(st)`. | 3 filer | `bassOnPeak` räknas i båda profilerna (`bigOn`), så DMX-beviset och lotusgrinden täcker det; grenen utan `bigOn` får röktestet. Starten (hopp 1–2 före första `bigStep`) täcks av `bevis.sh`, som jämför från första rutan. |
| 13 | Sektion, se (g): `agg`, `wire`, `toRecord`, `fromRecord`, `bigAgg`, `resume`, `carry`, `pack`/`unpack`. Sektionsrattarna flyttar in. `stabiliseNumbers(secRank)` (`:743`) flyttar sist in i stenens konstruktor. | 3 filer | `omstart.mjs` (sektionens `resume`: `wire.drops = st[BS_CAND]`); röktestet för grenen utan `bigOn`. Efter steget ska `grep -n "secAgg\|secVDrops" src/analyser.ts` ge 0. Pi-bänk grupp 3 (steg 10–13). |
| 14 | Kedjan: `\| null`, `off()`, startloggen | `analyser.ts` | `grep -nE "this\.(kicks\|bass\|drop\|riser\|character\|sections)\.[A-Za-z]" src/analyser.ts` ger 0. **Avstängningsprovet**, som med flit inte är byte-identiskt: stäng av en sten i taget och kör en inspelning både odelad och `--split inline`, i DMX- och lotusprofilen, och `omstart.mjs` med stenen av. Varje ramfält som stenen äger ska ha sitt neutrala värde i varje ruta, i **alla** lägen (för sektionen: `f.section === ''` i varje ruta). Inget ramfält får ha NaN eller ändrad `typeof`, vilket fångar `undefined`. Inget undantag får kastas, inte heller i konstruktorn. Loggraden ska synas. För sektionen räknas också `[dropcalm]`-raderna med `DROP_TRACE`: de ska vara 0. |
| 15 | Egen backup-tagg. Slå ihop de två kopiorna av den långsamma delen, `process` 869-899 och `drainBig` 466-479, till `slowPart()`, så att en ny sten läggs till på ett ställe. Ordningen skiljer sig på en punkt: `zoneStep` före/efter `bigStep`. Det kommuterar, eftersom `bigStep` inte läser `levelCeil`/`inZone`, men det bevisas, inte antas. | `analyser.ts` | röktestet; Pi-bänk grupp 4 och hela flytten mot `dist-kedja0` (≤ +10 %) |
| 16 | Lotus: `analyser_shared.py --write` (14 filer), porta, lotus-paritet i lotus eget repo (`analyserParity.mjs --style lotus`, samma som lotusgrinden men med lotus riktiga filer), `piBench.mjs` på lotus-Pi:n. Sedan deploy till ladan, sedan till lotus. Lotus klockväg är redan provad i varje steg, så här provas bara själva porten. | manifestet | `latens-pi.sh`; `grep -l 'from "./analyser.js"' src/analyser?*.ts` ska bara ge `analyserClock.ts` (typen `Frame`, se g) |

Steg 1–13 är mekaniska. Det mesta är sök-och-ersätt plus att flytta fältdeklarationer. `tools/refaktor/brytut.mjs` och delbeskrivningarna i `tools/refaktor/delar/` kan återanvändas som mönster.

---

## (g) Hur sektion och klockan passar in

### Sektion (43 namn i greppet)

Av sektionens skrivningar i `Analyser` är 17 dess egna publicerade värden: `section`, `sectionStartMs`, `sectionIndex`, `sectionTier`, `repeat*` ×6, `expect*` ×2, `prevSection`, `levelVsHighDb`, `secBuildAt/Seen` och `boundaryNov`. De flyttar till `SectionOut` utan att någon rad i logiken ändras. Mekaniskt blir det `this.a.section` → `this.o.section`.

Resten är sektionens privata delar som i dag ligger på `Analyser`, och den ledning den har mellan trådarna. Allt det flyttar in i stenen:

| i dag | var | efter |
|---|---|---|
| `secAgg` (insamlarens summor) | `analyser.ts:249`; skrivs i `analyserSection.ts:345-353` och `bigAgg` :498-505; läses och nollas i `pushSlowRecord` :338-351 och `slowStep` :525-531 | `SectionTracker.agg`, privat |
| `bigAgg(…)` | `analyser.ts:498-505` | `sections?.bigAgg(…)`, metoden flyttar ordagrant |
| recordets `R_SEC_*` och `R_DROPS`/`R_ACTIVE`/`R_BUILD` | `pushSlowRecord` :340-346 + nollningen :351 | `sections?.toRecord(r, o)` |
| sektionsdelen av `slowStep` (`if (this.bigOn) {…}` och resten) | :524-541 | `sections?.fromRecord(r, o)` |
| `secVDrops`, och `drop.dropCand`/`activeMs`/`buildUp` som workern skriver ur recordet | `analyserSection.ts:64`, `analyser.ts:526, 536` | `wire = { drops, active, build }`, privat |
| `this.sections.secVDrops = this.drop.dropCand` i omstarten | `analyser.ts:651` | `sections?.resume(st)`: `wire.drops = st[BS_CAND]` |
| utvärdenas transport `S_SECTION` … `S_LVL_HIGH` | :367-369 (läs), :417-419 (skriv) | `sections?.unpack(s)` / `sections?.pack(s)`; `\|\| 'intro'` följer med ordagrant |
| SECTION_CARRY-blocket | `hintTrackChange` :565-574 (når in i 13 arrayer) | `sections?.carry(N)` |
| `secSpecHop`, `secDump`, `dbgSecBlock` | `analyser.ts:219, 220, 228` | privata, med getters i adaptern för verktygen |

Skissen för ledningen. Satserna är dagens, ordagrant, med `this.a.` bytt mot facket. Läsarna `dropsNow`, `activeNow` och `buildNow` ersätter dagens `secDropsNow()` (`analyserSection.ts:69`) och de direkta läsningarna `a.activeMs` (:107) och `a.buildUp` (:185):

```ts
private readonly agg = { n: 0, int: 0, kicks: 0, breaking: 0, rms2: 0, cent: 0, dt: 0, wall: 0, drops: 0, active: 0, build: 0,
                         spec: new Float64Array(8), bon: 0, bpk: 0, flux: 0, rms4: 0 };   // = dagens secAgg (analyser.ts:249)
private readonly wire = { drops: 0, active: 0, build: 0 };   // sektionens indata i workern; i dag secVDrops + tre fält i andra stenar

/** Huvudtråden: ett record per env-sampel (i dag pushSlowRecord :340-346 och :351). */
toRecord(r: Float64Array, o: number): void {
  const g = this.agg;
  r[o + R_SEC_N] = g.n; /* … R_SEC_INT … R_SEC_RMS4 som i dag … */
  if (SECTION_AGG_HOP) { r[o + R_DROPS] = g.drops; r[o + R_ACTIVE] = g.active; r[o + R_BUILD] = g.build; }
  else { r[o + R_DROPS] = this.dr.dropCand + this.dr.secBodyRet; r[o + R_ACTIVE] = this.lv.activeMs; r[o + R_BUILD] = this.ri.buildUp; }
  g.n = 0; /* … nollningen som i dag … */
}
/** Workern: sektionsdelen av slowStep (i dag :524-541). */
fromRecord(r: Float64Array, o: number): void {
  const g = this.agg, w = this.wire;
  if (this.h.bigOn) { if (g.n > 0) { w.drops = g.drops; /* … shIn ur g, sectionHop(g.spec), nollning, som :527-532 … */ } return; }
  const secN = r[o + R_SEC_N] > 0;
  if (!SECTION_AGG_HOP || secN) { w.drops = r[o + R_DROPS]; w.active = r[o + R_ACTIVE]; w.build = r[o + R_BUILD]; }
  if (secN) { /* … shIn ur recordet, sectionHop(r), som :537-541 … */ }
}
resume(st: Float64Array): void { this.wire.drops = st[BS_CAND]; }   // i dag :651, efter drop.dropCand = st[BS_CAND]

private dropsNow() { return this.h.role === 'slow' ? this.wire.drops : this.dr.dropCand + this.dr.secBodyRet; }
private activeNow() { return this.h.role === 'slow' && !this.h.bigOn ? this.wire.active : this.lv.activeMs; }
private buildNow()  { return this.h.role === 'slow' && !this.h.bigOn ? this.wire.build : this.ri.buildUp; }
```

Varför det är byte-identiskt:

- **Workern med `bigOn`, alltså DMX och lotus.** `dropsNow()` ger `wire.drops`, alltså samma värde som dagens `secVDrops`. `activeNow()` och `buildNow()` läser facken, precis som i dag. Där skriver hopptransporten `activeMs` (:468), och uppbyggnaden kör i workern. Den här grenen provas av DMX-beviset och lotusgrinden.
- **Workern utan `bigOn`** (`SECTION_AGG=env` eller `FAST_BANDS=0`, som ingen profil kör). I dag läser sektionen `a.drop.dropCand + a.drop.secBodyRet`, där `dropCand` bara skrivs ur `R_DROPS` (:536) och `secBodyRet` alltid är 0, eftersom drop aldrig kör i den workern. Summan är ett antal ≥ 0 och aldrig −0, så `x + 0` och `x` är lika med `Object.is`. `a.activeMs` och `a.buildUp` skrivs där bara av :536. Ingen annan i den workern läser de fälten (grep: varken `analyserClock.ts` eller tempodelen av `analyser.ts`). Grenen får röktestet.
- **Huvudtråden och odelat.** Det blir samma uttryck som i dag.

`activeNow()` och `buildNow()` behövs alltså bara för en gren som inget system kör. De flyttas med för att flytten ska vara ordagrann. Att radera den grenen är en egen ändring efter flytten, med egen backup-tagg, enligt ägarens städregel. Den ingår inte i flytten.

Med sektionen av är `sections` `null`. Ingen rad i kärnan rör `agg` längre, så inget undantag kan kastas. `R_SEC_N` skrivs aldrig och står kvar på 0 i det delade minnet, och workerns `sections?.fromRecord` körs inte.

**Efter flytten** läser sektionen ur 7 fack, fält för fält enligt tabell b7: hopp (9), nivå (2), kick (1), klocka (2), drop (2), uppbyggnad (1) och spektrum (6, med räknarna). Den skriver bara i sitt eget fack och sina privata fält. Sektionen tas sist bland stenarna (steg 13), eftersom den är störst och rör flest platser.

### Klockan

Klockan är redan en sten, och den är mönstret som resten kopierar:

- **Deklarerad indata:** `HopFrame` (`split.ts:155`) och `HopTarget` (`split.ts:159`: `trackBoundaries`, `quietMs`, `boundSure`, `bodyUnderDb`, plus fyra kommandon).
- **Neutrala värden** finns redan: `an.bodyUnderDb ?? 0`, `an.quietMs ?? 0` (`analyserClock.ts:554-556`).
- **Endera vägen:** `BEAT_FEED` inline eller slow (`analyser.ts:1058`).

**Vem matar klockan.** Det skiljer systemen, och det är lotus enda egna väg:

| | DMX (`BEAT_FEED='slow'`) | lotus (`BEAT_FEED` saknas) |
|---|---|---|
| vem anropar taktvägen | motorn, efter `process`: `index.ts:206`, `analyser.hopLane.feed(frame, cfg, analyser)` | analysatorn själv, sist i `fillFrame`: `this.hopLane!.feed(f, this.clockOut, this)` (`:963-965`), eftersom `hopSelf` är sant (`:1008`) |
| var fasen publiceras | motorns `cfg` | `publishPhase(f, …, this.extGrid, Date.now(), …)` i `fillFrame` (`:966`); `publishClock` ger motorn `clockOut` |
| vad kicken grindar mot (`clock.src`) | motorns `cfg` (`:668`, `cfgIn.detection` finns) | analysatorns eget `{ beat }`, som `setClockGrid` skriver i (`:632`, `:668`) |
| `HopTarget` | huvudtrådens `Analyser` | samma, `this` |
| var `BeatFeed` kör | workerns `HopLaneSlow` | samma |
| vem provar vägen | `bevis.sh` (`dmxDump` matar `hopLane`, `tools/dmxDump.mjs:36`) | lotusgrinden. `bevis.sh` ser den inte (förprovet) |

I facken ändrar det bara en sak: `ClockOut.src` pekar på olika objekt, och det är samma handtag som dagens `beatSrc`. `hopSelf`, `clockOut` och `extGrid` är kärnans klockledning och står kvar i `analyser.ts`. Flytten rör inte raderna 963-966 utöver att `f` och `this` förblir samma objekt. Därför är lotusgrinden det prov som bär här: den kör just de raderna, med `Date.now` bunden till ljudklockan.

**Ta bort klockan** kostar 3 rader i `createAnalyser` och 0 i `index.ts` (tabellen i d). Klockan är därför ingen `| null`-sten i kedjan.

Tre saker ändras:

1. Analysatorns kopia av tempot (`localBpm`, `localBpmConfidence`) och gridfasen (`beatPhaseMs`, `beatPhaseConf`) blir `ClockOut`. Tempot skrivs av `set()` (klockan), `resetTempo()` och `zeroBpm()`. Det blir **ett** tempo på analysatorsidan. `clockBpm` i `HopLaneFast`, `R_CLOCK` och `S_BPM` är transport av samma värde, inte egna kopior. `hop.bpm` och `hop.conf` är tidsoffset av samma värde (b1).
2. Rutnätet som kicken grindar mot (`beatSrc.beat`) nås som `clock.src.beat`. `src` är samma objekt som i dag, alltså motorns `cfg` eller det `{ beat }` som `setClockGrid` skriver i. Rutnätet har fortfarande en enda källa, och facket håller bara handtaget.
3. `analyserClock.ts` importerar `type Frame` ur `analyser.ts`. Den importen kan bytas mot `HopFrame`, som redan finns. Klockan räknas inte bland de 8 stenarna, och bytet görs bara om `bevis.sh` är grönt.

`split.ts`-importen av `trustStep` står kvar, och det är ärligt. Taktvägen (`HopLane`) är klockans egen transport, och tilliten är klockans formel. Klockan kan därför tas ur drift med tre rader, men `analyserClock.ts` kan inte raderas så länge taktvägen finns i `split.ts`.

Klockans beroende av drop (`bodyUnderDb`) går via gettern på `Analyser`, och greppet `f\.drop\b` hittar den (b2, rad 4).

---

## (h) Den största risken

**Ett fält som byter tråd utan att transporten följer med.**

I DMX och lotus skriver workern drop, uppbyggnad, karaktär, basgång och sektion, och huvudtråden får dem via `BS_`/`S_`-blocken. Workerns sektion får sina indata via `bigAgg` och `B_`-recordet. Glöms en rad i `pack`, `unpack`, `toRecord`, `fromRecord` eller `resume`, visar ramen fel värde bara i delat läge.

- `bevis.sh` fångar `pack`, `unpack`, `toRecord` och `fromRecord`, eftersom inline- och synk-workern jämförs fält för fält, i DMX:s profil och (lotusgrinden) i lotus.
- `resume` körs bara när workern startar om, och i dag finns inget prov som startar om den. `bevis.sh` kör `resume` bara vid första start, med ett nollställt `bigState`, och då är alla tal 0. Dropens `resume` är provad rad för rad mot dagens rad 651-652 (`transport.mjs`, 0 avvikelser). Hela omstartsvägen, med `bigState` mitt i en låt, får sitt prov först genom `omstart.mjs` (f, "Före start"). Provet byggs före steg 1, provas mot en avsiktligt trasig referens så att det bevisligen biter, och körs efter varje steg.
- Sektionens tre läsare `dropsNow`, `activeNow` och `buildNow` skiljer på roll och `bigOn`. Det är den enda nya logiken i flytten. `dropsNow` i workern med `bigOn` provas av DMX-beviset och lotusgrinden. `activeNow`/`buildNow` gör skillnad bara i grenen utan `bigOn`, som bara röktestet kör.
- **Lotus klockväg** (`hopSelf`, `analyser.ts:963-966`) körs inte av DMX-profilen alls. Förprovet visar att en ändring där fälls av lotusgrinden men inte syns i `bevis.sh`. Utan grinden skulle ett fel där upptäckas först i steg 16 eller i källaren. Grinden har en egen mätfälla: utan `fakenow.mjs` avviker redan A/A, eftersom vägen läser `Date.now()`, och då vore grinden alltid röd och oanvändbar.

Samma risk har en andra form, som bara gäller avstängda stenar: **en transport som översätter värdet.** `|| 'intro'` på rad 367 gör det neutrala `''` till `'intro'`. Det fångas inte av `bevis.sh`, eftersom alla stenar är på där. Därför ligger transporten i stenen och stängs av med den, och därför kräver avstängningsprovet i steg 14 neutrala värden i **alla** lägen.

Motåtgärderna:

- Transportraderna flyttas ordagrant med radhänvisning (`analyser.ts:338-351`, `367-369`, `417-419`, `443-444`, `487-488`, `524-541`, `651-652`).
- `omstart.mjs` efter varje steg, och det bär i steg 9 (drop) och 13 (sektion).
- Lotusgrinden efter varje steg. Grenarna utan `bigOn`, som ingen profil kör, får röktestet i steg 12, 13 och 15.
- Avstängningsprovet i steg 14 körs odelat, delat och med omstart, i båda profilerna.
- Byter en sten tråd senare, körs giftprovet (b5). Det fångar fält som saknar skrivare i måltråden, alltså felet som typen inte ser.

Två mindre risker:

- **Krock med pågående arbete.** Nattarenorna ändrar `analyserDrop.ts` och `analyserSection.ts`. Frys dem under flytten, som tar ungefär en dag.
- **V8-prestanda som inte syns i bytes.** Ett fält som tappar flyttalsformen ger samma värden men en deopt, så `bevis.sh` såg det inte förut. Nu har varje fack sin `stabilise`-lista med dagens namn (16 ur `analyser.ts:152-156`) och dagens startvärden ordagrant, också 0,5-knepet. `startvarden.mjs` fäller ett ändrat startvärde (som `kickAt = 0` mot dagens 0,5), och deopt-räkningen (ref + 1) och tidsgrinden fäller ett steg som ändå tappar formen.

---

## Bilaga: `analyserDrop.ts` efter flytten (hela filen)

Filen är genererad ur dagens `src/analyserDrop.ts` med bytena i tabellen under (c). Den kompilerar med `tsc --strict` mot facket i b1. Logiken (`dropStep`, `dropClassify`, `flankStep`, `liftStep`) gav 0 avvikelser mot dagens byggda `dist/analyserDrop.js` på 3 000 000 hopp. Transportmetoderna sist är raderna `analyser.ts:443-444`, `487-488` och dropens del av `651-652`, flyttade ordagrant. De gav 0 avvikelser mot dagens rader på 1 000 000 hopp.

```ts
/**  DROP-DETEKTORN. Anteckningar: docs/analysator/analyserDrop.md */
import { env, sysEnv, stabilise, BODY_CEIL_DB_S, BODY_HIGH_MS, BODY_HIGH_DB,
  type HopOut, type SpectrumOut, type LevelOut, type RiserOut, type DropOut } from './analyserFack.js';
import { BS_DROPS, BS_MINI, BS_BUILDSTART, BS_CAND, BS_UNDER, BS_DEMOTED, BS_SPACED, BS_DROPRISE,
  BS_NEAR, BS_NEARDIP, BS_LIFT, BS_STOPS, BS_STOPSEC } from './split.js';

const BODY_RISE_DB = Number(env('BODY_RISE_DB') ?? 17);   // flyttade hit ur analyser.ts:143-149 (bara drop läser dem)
const BODY_GONE_MIN_MS = Number(env('BODY_GONE_MIN_MS') ?? 2000);
const DROP_QUALITY_DB = Number(env('DROP_QUALITY_DB') ?? 3.5);
const DROP_RISE_LOW_DB = Number(env('DROP_RISE_LOW_DB') ?? 0);
const DROP_UNDERPEAK_MIN = Number(env('DROP_UNDERPEAK_MIN') ?? 0);
const MINI_SPACING_MS = Number(env('MINI_SPACING_MS') ?? 0);
const DROP_TRACE = !!sysEnv('DROP_TRACE');

const BODY_GONE_DB = 5;
const BODY_PEAK_DB = 10;   // BRED onset-grind
const DROP_ARM_MS = 300;   // ARMERAT FONSTER
const BODY_FAST_S = 0.06;   // FYR-LAGG
const DROP_RISE_LOW_Q = 3;
const DROP_CALM_DB = 6;   // STRIKT INTRO
const DROP_CALM_BUILD = 0.25;
const DROP_CALM_Q = 1.5;
const DROP_CALM_RISE_DB = 8;
const DROP_CALM_LAND_MS = 0;
const MINI_RISE_DB = 10;
const MINI_PEAK_DB = 10;
const MINI_TOPGONE_MS = 250;   // en minidrop per kick-lucka: flankens topp >= FLANK_GONE_DB under taket så länge
const HI_VETO_DB = 0;   // diskanten (band 6, 2 s) minst så här mot sitt 30 s-medel när flanken landar, annars minidrop
const DROP_SHORT_MS = 4000;   // minsta drop-avstand nar dropen ESKALERAR
const DROP_LONG_MS = 20000;   // annars maste sa har lang tid ga
const DROP_ESCALATE_DB = 3;   // tatare drops maste vara TYDLIGT starkare for att fyra
const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 1.5, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
const BUILD_SPACING_MS = 3000;   // UPPBYGGNADEN börjar när basen dras ur (kick-luckan), högst en gång per 3 s
const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'hiFast', 'hiNorm'] as const;   // de publicerade ligger nu i DropOut

/** DET DROP LÄSER. Inget annat går att nå. */
export interface DropReads {
  hop:      Readonly<Pick<HopOut, 'dtHop' | 'nowWall' | 'body' | 'lvlSmooth' | 'sec' | 'lvh' | 'wallNow'>>;
  spectrum: Readonly<Pick<SpectrumOut, 'bandDbRaw'>>;
  level:    Readonly<Pick<LevelOut, 'activeMs'>>;
  riser:    Readonly<Pick<RiserOut, 'buildUp'>>;
}

export class DropDetector {
  private readonly h: DropReads['hop']; private readonly sp: DropReads['spectrum']; private readonly lv: DropReads['level']; private readonly ri: DropReads['riser'];
  constructor(r: DropReads, private readonly o: DropOut) {
    this.h = r.hop; this.sp = r.spectrum; this.lv = r.level; this.ri = r.riser;
    stabilise(this, DOUBLE_FROM_START);
  }
  private secBodyArmMs = 0;
  private bodyEnv = -120;   // BASKROPPEN
  private bodyFast = -120;   // Snabb envelopp
  private bodyCeil = -300;
  private bodyPeak = -300;   // SEG topp
  private lastGoneSpanMs = 0;
  private lastDropRise = -0;   // 0 = HeapNumber
  private wasBodyOnset = false;
  private bodyHist = new Float32Array(200);   // ANSLAGSDETEKTION
  private bodyHistPos = 0;
  private bodyHistLen = 1;
  private bodyGoneMs = 0;   // Ihållande bas-FRÅNVARO
  private lastBodyGoneMs = -1e9;
  private lastMiniMs = -1e9; private miniGoneMs = 0; private lastMiniGoneMs = -1e9; private wasMiniOnset = false;
  private dropArmUntil = 0; private dropArmAt = 0; private dropArmGoneMs = -1.5;   // armerat drop-fonster
  private calmHoldStart = -0; private calmHoldRise = -0;   // DROP_CALM_LAND_MS

  private goneEpisodeMs = -1.5;
  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
  private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;
  private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
  private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
  private fdTop = -0; private miniEp = -1.5; private miniEpUsed = -2.5; private hiFast = -120.5; private hiNorm = -120.5;
  private lastEpAt = -1.5e12;

  /** Drop-detektionen. */
  dropStep(): void {
    const nowWallA = this.h.nowWall, bodyNow = this.h.body;
    const dtHop = this.h.dtHop;
    this.bodyEnv += (bodyNow - this.bodyEnv) * Math.min(1, dtHop / 0.35);
    this.bodyFast += (bodyNow - this.bodyFast) * Math.min(1, dtHop / BODY_FAST_S);
    const bodyPeek = this.bodyFast;
    this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
    this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);
    this.o.bodyUnderDb = this.bodyCeil - this.bodyEnv;
    { const x = this.sp.bandDbRaw[6]; if (this.hiNorm < -120) { this.hiFast = x; this.hiNorm = x; } this.hiFast += (x - this.hiFast) * Math.min(1, dtHop / 2); this.hiNorm += (this.hiFast - this.hiNorm) * Math.min(1, dtHop / 30); }
    const flank = this.flankStep(nowWallA, dtHop);
    this.liftStep(nowWallA, dtHop, bodyNow);

    if (this.bodyEnv < this.bodyCeil - BODY_GONE_DB) {
      this.bodyGoneMs += dtHop * 1000;
      if (this.bodyGoneMs >= BODY_GONE_MIN_MS) {
        if (this.bodyGoneMs - dtHop * 1000 < BODY_GONE_MIN_MS) this.goneEpisodeMs = nowWallA;
        this.lastBodyGoneMs = nowWallA;
      }
    } else {
      if (BODY_HIGH_MS > 0 && this.bodyGoneMs >= BODY_HIGH_MS) this.secBodyArmMs = nowWallA;
      if (this.bodyGoneMs > 0) this.lastGoneSpanMs = this.bodyGoneMs; this.bodyGoneMs = 0;
      if (this.secBodyArmMs > 0) { if (nowWallA - this.secBodyArmMs > 2000) this.secBodyArmMs = 0; else if (this.bodyEnv >= this.bodyPeak - BODY_HIGH_DB) { this.o.secBodyRet++; this.secBodyArmMs = 0; } }
    }
    const hist = this.bodyHist, HL = hist.length;
    const oldest = hist[(this.bodyHistPos + HL - this.bodyHistLen) % HL];
    let riseRef = oldest;
    { const pos = this.bodyHistPos, len = this.bodyHistLen; let mn = oldest;
      const n1 = len < pos ? len : pos;
      for (let j = pos - n1; j < pos; j++) { const v = hist[j]; if (v < mn) mn = v; }
      for (let j = HL - (len - n1); j < HL; j++) { const v = hist[j]; if (v < mn) mn = v; }
      riseRef = mn; }
    let bodyRise = bodyPeek - riseRef;
    hist[this.bodyHistPos] = this.bodyFast;
    this.bodyHistPos = (this.bodyHistPos + 1) % HL;
    const want = Math.min(HL - 1, Math.max(1, Math.round(0.5 / dtHop)));
    if (this.bodyHistLen < want) this.bodyHistLen++;
    const landsHigh = bodyPeek > this.bodyPeak - BODY_PEAK_DB;
    const riseOk = bodyRise > BODY_RISE_DB || (DROP_RISE_LOW_DB > 0 && bodyRise > DROP_RISE_LOW_DB && this.bodyPeak - bodyPeek < DROP_RISE_LOW_Q);
    const bodyOnset = riseOk && landsHigh && nowWallA - this.lastBodyGoneMs < 6000;

    const sinceDrop = nowWallA - this.o.lastDropMs;
    const stronger = bodyRise > this.lastDropRise + DROP_ESCALATE_DB;
    const dropSpacingOk = sinceDrop > DROP_LONG_MS || (sinceDrop > DROP_SHORT_MS && stronger);

    const bodyOnsetEdge = bodyOnset && !this.wasBodyOnset;
    this.wasBodyOnset = bodyOnset;
    if (bodyOnsetEdge && this.goneEpisodeMs !== this.dropArmGoneMs) { this.dropArmUntil = nowWallA + DROP_ARM_MS; this.dropArmAt = nowWallA; this.dropArmGoneMs = this.goneEpisodeMs; }
    const armed = bodyOnsetEdge || nowWallA < this.dropArmUntil;
    if (MINI_SPACING_MS > 0) {
      if (this.fdTop < this.bodyCeil - FLANK_GONE_DB) { this.miniGoneMs += dtHop * 1000; if (this.miniGoneMs >= MINI_TOPGONE_MS) { if (this.miniGoneMs - dtHop * 1000 < MINI_TOPGONE_MS) { this.miniEp = nowWallA; if (nowWallA - this.lastEpAt >= BUILD_SPACING_MS) this.o.buildStartCount++; this.lastEpAt = nowWallA; } this.lastMiniGoneMs = nowWallA; } }
      else this.miniGoneMs = 0;
      const nv = hist[(this.bodyHistPos + HL - 1) % HL]; const mnRef = nv < riseRef ? nv : riseRef;
      const miniOnset = (bodyPeek - mnRef) > MINI_RISE_DB && bodyPeek > this.bodyPeak - MINI_PEAK_DB && nowWallA - this.lastMiniGoneMs < 4000;
      const miniEdge = miniOnset && !this.wasMiniOnset; this.wasMiniOnset = miniOnset;
      if (miniEdge && this.miniEp !== this.miniEpUsed && this.lv.activeMs > 2000 && nowWallA - this.o.lastDropMs > MINI_SPACING_MS && nowWallA - this.lastMiniMs > MINI_SPACING_MS
          && (DROP_UNDERPEAK_MIN <= 0 || this.bodyPeak - bodyPeek >= DROP_UNDERPEAK_MIN)) {
        this.o.miniDropCount++; this.lastMiniMs = nowWallA; this.miniEpUsed = this.miniEp;
        if (DROP_TRACE) console.log(`[minidrop] wall ${this.h.wallNow()} rise ${(bodyPeek - mnRef).toFixed(1)} underPeak ${(this.bodyPeak - bodyPeek).toFixed(1)} goneAgo ${((nowWallA - this.lastMiniGoneMs)/1000).toFixed(1)}s`);
      }
    }
    const fullSlam = this.bodyPeak - bodyPeek < DROP_QUALITY_DB;
    if (DROP_TRACE && bodyOnsetEdge && !(dropSpacingOk && fullSlam)) console.log(`[dropedge] rise ${bodyRise.toFixed(1)} underPeak ${(this.bodyPeak - this.bodyFast).toFixed(1)} fast ${this.bodyFast.toFixed(1)} peak ${this.bodyPeak.toFixed(1)} goneAgo ${((nowWallA - this.lastBodyGoneMs)/1000).toFixed(1)}s spacingOk ${dropSpacingOk} sinceDrop ${(sinceDrop/1000).toFixed(1)}s`);
    const notAtCeil = DROP_UNDERPEAK_MIN <= 0 || this.bodyPeak - this.bodyFast >= DROP_UNDERPEAK_MIN;
    let fireNow = dropSpacingOk && armed && this.lv.activeMs > 2000 && fullSlam && notAtCeil;
    let fireTag = '';
    const underNow = this.bodyPeak - bodyPeek;
    if (fireNow) {
      const calm = (this.h.sec === 'low' || this.h.sec === 'intro') || this.h.lvh <= -DROP_CALM_DB;
      let strong = this.ri.buildUp >= DROP_CALM_BUILD || underNow < DROP_CALM_Q || bodyRise >= BODY_RISE_DB + DROP_CALM_RISE_DB;
      if (this.h.sec === 'intro') strong = this.ri.buildUp >= DROP_CALM_BUILD;
      if (calm && !strong) {
        fireNow = false;
        if (DROP_CALM_LAND_MS > 0 && this.calmHoldStart === 0) { this.calmHoldStart = nowWallA; this.calmHoldRise = bodyRise; }
        if (DROP_TRACE && bodyOnsetEdge) console.log(`[dropcalm] wall ${this.h.wallNow()} ${DROP_CALM_LAND_MS > 0 ? 'HALLS' : 'NEKAD'} sect ${this.h.sec} lvh ${this.h.lvh.toFixed(1)} build ${this.ri.buildUp.toFixed(2)} underPeak ${underNow.toFixed(1)} rise ${bodyRise.toFixed(1)}`);
      }
    }
    if (this.calmHoldStart > 0) {
      if (!fullSlam) { if (DROP_TRACE) console.log(`[dropcalm] wall ${this.h.wallNow()} SLAPPT efter ${(nowWallA - this.calmHoldStart).toFixed(0)} ms (underPeak ${underNow.toFixed(1)})`); this.calmHoldStart = 0; }
      else if (fireNow) this.calmHoldStart = 0;
      else if (nowWallA - this.calmHoldStart >= DROP_CALM_LAND_MS && dropSpacingOk) { fireNow = true; fireTag = ` CALMLAND +${(nowWallA - this.calmHoldStart).toFixed(0)}ms`; bodyRise = Math.max(bodyRise, this.calmHoldRise); this.calmHoldStart = 0; }
    }
    if (fireNow) {
      this.dropArmUntil = 0; this.calmHoldStart = 0;
      this.o.dropCand++; this.o.lastDropMs = nowWallA; this.lastDropRise = bodyRise;
      console.log(`[dropfire] wall ${this.h.wallNow()}${fireTag} rise ${bodyRise.toFixed(1)} fast ${this.bodyFast.toFixed(1)} peak ${this.bodyPeak.toFixed(1)} ceil ${this.bodyCeil.toFixed(1)} underPeak ${(this.bodyPeak - this.bodyFast).toFixed(1)} sinceDrop ${(sinceDrop/1000).toFixed(1)}s goneAgo ${((nowWallA - this.lastBodyGoneMs)/1000).toFixed(1)}s goneSpan ${(this.lastGoneSpanMs/1000).toFixed(1)}s edgeAgo ${(nowWallA - this.dropArmAt).toFixed(0)}ms`);
    }
    this.dropClassify(flank, fireNow, nowWallA);
  }

  /** EN DROPDETEKTOR. */
  private dropClassify(flank: boolean, cand: boolean, nowWallA: number): void {
    if (flank) {
      if (this.hiFast - this.hiNorm < HI_VETO_DB) { this.o.dropDemoted++; this.o.miniDropCount++; }
      else if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.o.dropSpaced++; this.o.miniDropCount++; }
      else { this.lastShowDropMs = nowWallA; this.o.dropCount++; }
    } else if (cand && nowWallA - this.fdAt > 2000) { this.o.dropDemoted++; this.o.miniDropCount++; }
  }

  /** FULL DROP PÅ FLANKEN. */
  private flankStep(now: number, dt: number): boolean {
    const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
    if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
    { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
    while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
    let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
    this.fdTop = top;
    if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
    const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
    const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
    if (this.h.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.o.dropRiseDb = f - low;
    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
    return true;
  }

  /** NÄSTAN-DROP, ENERGILYFT, STOPP. */
  private liftStep(now: number, dt: number, body: number): void {
    const x = Math.max(-90, body);
    if (!this.nearOn) { this.nearOn = true; this.nearB = x; this.nearNorm = x; }
    this.nearB += (x - this.nearB) * Math.min(1, dt / 0.12);
    this.nearNorm += (this.nearB - this.nearNorm) * Math.min(1, dt / 8);
    const h = this.liftHist;
    if (now - this.liftHistAt >= 25) {
      this.liftHistAt = now; h[this.liftW] = this.nearB; this.liftW = (this.liftW + 1) % 240; if (this.liftN < 240) this.liftN++;
      const n = this.liftN, o0 = this.liftW - n + 240;
      let fl = 1e9; for (let q = Math.max(0, n - 60), j = (o0 + q) % 240; q < n; q++) { const v = h[j]; if (v < fl) fl = v; if (++j === 240) j = 0; }
      this.nearFloor = fl;
      if (n >= 240) {
        let sum = 0; for (let q = 0, j = o0 % 240; q < 160; q++) { sum += h[j]; if (++j === 240) j = 0; }
        let now6 = 0; for (let q = n - 24, j = (o0 + q) % 240; q < n; q++) { now6 += h[j]; if (++j === 240) j = 0; }
        this.liftCalm = sum / 160; this.liftLift = now6 / 24 - this.liftCalm;
      }
    }
    const floor = this.nearFloor, rise = this.nearB - floor, dip = this.nearNorm - floor;
    const near = rise >= NEAR_RISE_DB && dip >= NEAR_DIP_DB && floor > -80 && this.nearB >= this.nearNorm - 1;
    this.o.nearDropDb = near ? rise : 0; this.o.nearDipDb = near ? dip : 0;
    this.o.liftDb = this.liftN >= 240 && this.liftCalm > -80 && this.liftLift >= LIFT_DB ? this.liftLift : 0;
    if (this.nearB < this.nearNorm - 12) this.stopRunS += dt;
    else if (this.nearB >= this.nearNorm - 1) {
      if (this.stopRunS >= STOP_MINI_S && this.stopRunS <= 3) { this.o.stopCount++; this.o.stopS = this.stopRunS; }
      this.stopRunS = 0;
    }
  }

  // TRANSPORTEN. Anropas som this.drop?.pack(s) osv., så den är av när stenen är av.
  /** långsamma tråden skriver (i dag analyser.ts:487-488, samma rader) */
  pack(s: Float64Array): void {
    const o = this.o;
    s[BS_DROPS] = o.dropCount; s[BS_MINI] = o.miniDropCount; s[BS_BUILDSTART] = o.buildStartCount; s[BS_CAND] = o.dropCand; s[BS_UNDER] = o.bodyUnderDb;
    s[BS_DEMOTED] = o.dropDemoted; s[BS_SPACED] = o.dropSpaced; s[BS_DROPRISE] = o.dropRiseDb; s[BS_NEAR] = o.nearDropDb; s[BS_NEARDIP] = o.nearDipDb;
    s[BS_LIFT] = o.liftDb; s[BS_STOPS] = o.stopCount; s[BS_STOPSEC] = o.stopS;
  }
  /** snabba tråden läser (i dag analyser.ts:443-444; dropCand saknas med flit, som i dag) */
  unpack(s: Float64Array): void {
    const o = this.o;
    o.dropCount = s[BS_DROPS]; o.miniDropCount = s[BS_MINI]; o.buildStartCount = s[BS_BUILDSTART]; o.bodyUnderDb = s[BS_UNDER];
    o.dropDemoted = s[BS_DEMOTED]; o.dropSpaced = s[BS_SPACED]; o.dropRiseDb = s[BS_DROPRISE]; o.nearDropDb = s[BS_NEAR]; o.nearDipDb = s[BS_NEARDIP];
    o.liftDb = s[BS_LIFT]; o.stopCount = s[BS_STOPS]; o.stopS = s[BS_STOPSEC];
  }
  /** workern startar om (i dag analyser.ts:651-652; fem fält saknas, som i dag) */
  resume(s: Float64Array): void {
    const o = this.o;
    o.dropCount = s[BS_DROPS]; o.miniDropCount = s[BS_MINI]; o.buildStartCount = s[BS_BUILDSTART]; o.dropCand = s[BS_CAND];
    o.dropDemoted = s[BS_DEMOTED]; o.dropSpaced = s[BS_SPACED]; o.stopCount = s[BS_STOPS];
  }
}
```


---

# ARENAN 2026-11-21 kedjan: resultat

16 agenter, 4 rundor (arena-skillen --quick, seed 984029). Vinnare a014 (ovan): 85-84,5 a009, 86-78,5 a006, 84-78,5 a004, final 73-56,5 a011 (a011:s drop-fil gick inte att kompilera).

# Ändringsprovet (ägarens förslag): ny insignal + nytt utvärde i sektionen, sedan bas bort
p1 = a011, p2 = a014 (blint). Domaren: OAVGJORT.

# Dom i ändringsprovet: p1 (a011, "utdata som överlever stenen") mot p2 (a014, "fack per sten")

## Kontroll mot dagens kod (`src/`)

Följande påståenden avgör domen. Alla stämmer i båda resultaten:

- `bassEnergyStep` körs bara i `fillFrame` (`analyser.ts:948`), alltså på huvudtråden.
- `pushBig` (`:889`) körs före `fillFrame` (`:902`) i `process()`. B-recorden kan därför bara bära förra hoppets energi. Båda såg det.
- I workern kör `drainBig` (`:457-482`) sektionens `bigAgg` (`:479`, `:498`). Där finns ingen skrivare av basenergin. En läsning i workern ger alltså 0 för alltid, och tsc godkänner den.
- I rollen 'all' körs `sectionAggStep` (`:955`) efter `bassEnergyStep` (`:948`) och ser därför samma hopps värde.
- `B_ENVBPM = 15`, `BIG_REC_LEN = 16`, `REC_LEN = 37` och `STATE_LEN = 26` stämmer.
- Dagens S-layout är **literaler** (`split.ts:50-53`, `S_PROCESSED = 13` … `S_BUILD_SEEN = 25`). p1:s antagande om att S-blocket är härlett, som gör att det kostar 0 rader, saknar alltså stöd i dagens kod. p1 skriver det själv öppet. Realistiskt kostar S-blocket där 8 rader.
- `livstecken.mjs` tar alla ramfält generiskt (`flat`, rad 12).
- `analyserParity.mjs:109` jämför bara den gamla ramens nycklar.
- Båda dirigentraderna har giltiga ankare i `effects.ts`: p1 vid `:999` (`SECTION_LOW_SNAP`), p2 vid `:1106` (`inBuild`, `liveSec` `:1063`).

## Tabell per punkt

| punkt | p1 | p2 | vinnare |
|---|---|---|---|
| **1. Filer och rader, totalt** | 5 filer, 53 rader. 61 rader med dagens S-literaler. | 6 filer, 55 rader | inom brus |
| 1. Utanför sektion och dirigent | 3 filer (`analyserOut`, `split`, `analyser`), 21 rader. 29 rader med S-literaler. | 4 filer (`analyserFack`, **`analyserBass`**, `split`, `analyser`), 16 rader | – |
| 1. Huvudfilen (`analyser.ts`) | 9 rader: Frame, startram, bygg-rad, `pushBig`, `drainBig`, `pushSlowRecord`, `fillFrame`, import | 5 rader: Frame, startram, `fillFrame`, `bass?.toHop`, `bass?.fromHop` | p2 |
| 1. `split.ts` och protokollet | 4 rader (12 med S). B 16→17, R 37→38, S 26→27. | 6 rader. B 16→17, R 37→38, S 26→27. | lika (båda ändrar alla tre layouterna) |
| 1. Rör stenen som bara ska läsas? | nej | **ja**: bas-stenen får `toHop`/`fromHop`, 3 rader | p1 |
| **Summa punkt 1** | färre filer och basstenen orörd, men huvudfilen bär transporten | huvudfilen rörs mindre, men den nya läsaren tvingar fram en ändring i producenten | **oavgjort** (avvägning, inte brus) |
| **2. Fångar kompilator/prov misstaget "0 i workern"?** | Nej. tsc godkänner `Pick<BassOut,'energy'>`. `outcheck.mjs` kontrollerar bara save/load. Inget prov fångar en glömd `B_BASSE`. | Nej. tsc godkänner `bass: Pick<BassOut,'energy'>`. `giftprov.mjs sektion` hade fångat det, men arkitekturen kör det bara vid trådbyte. | **oavgjort**. p2 har ett verktyg som *skulle* fånga felet, men inget tvingar fram körningen. |
| **3. Ta bort bas: rader och filer** | 8 rader i 1 fil + filen raderas. Sektion och dirigent: 0 rader. Ändringsfallet ökar borttagningen med **0** rader. | Prova utan: **1 rad**. För gott: filen + 9 rader i `analyser.ts` + 2 rader städning i `split.ts`. Sektion och dirigent: 0 rader. Ändringsfallet ökar borttagningen med **2–4** rader. | p1 på rader |
| 3. Vad sektionen får | `BassOut.energy` = 0, `sectionBassTrend` ≡ 0. Död transport körs vidare (`B_BASSE` skrivs som 0). | Samma 0. Transporten försvinner med stenen (`?.`). | p2 på renhet |
| 3. Syns det för ägaren? | Bara i `livstecken.mjs` (DÖTT). Ingen logg. | `[analysator] sten av: bas` vid prova-utan. Ingen logg vid för gott. `livstecken.mjs` (DÖD). | p2, knappt |
| **Summa punkt 3** | billigast | renast och mest synlig | **oavgjort** |
| **4. Luckor (d)** | 9 st. Allvarliga 3: trådblind In-typ (1), S-layouten okänd så kostnaden är obestämbar (3), inget bevis för tillägg (7). Dessutom en regelkrock (5) och en eftersläpning på ett hopp (6). | 8 st. Allvarliga 3: trådblind Reads (1), skrivkarta och ordning saknas så eftersläpningen blir ett hopp (2), neutralt 0 = "jämn" (3). Dessutom transportform som inte avgörs, två vägar (4), och bevis som är blinda för nya fält (6). | **oavgjort** (8 mot 9, lika tunga) |

## Helhet

Totalen (53–61 mot 55 rader) ligger inom brus. De verkliga skillnaderna är avvägningar som tar ut varandra:

- **p1** håller producenten orörd och gör borttagningen lika billig som före ändringen. I gengäld växer huvudfilen med transporten, och död transport blir kvar efter borttagningen.
- **p2** håller huvudfilen smalare, och transporten följer med stenen ut. Prova-utan kostar 1 rad med logg. I gengäld måste producenten (bas) ändras för att en *konsument* ska få läsa den. Det är precis "påverkar de andra" i ägarens mål. Dessutom avgör arkitekturen inte om transporten ska ligga i stenen eller gå som parameter.

Ingen av dem gör ändringen märkbart renare eller lättare. Dom: **oavgjort**.

## Det gemensamma hålet: båda proven visar samma sak

**Ett läsfält säger inte vilken tråd det skrivs i.** I båda arkitekturerna kompilerar en sten i workern som läser ett värde som bara skrivs på huvudtråden, och den läser 0 för alltid i DMX och lotus. Bara rollen 'all' blir rätt, alltså bänken. Utvecklaren måste själv:

- veta det,
- handskriva en B-plats, en R-plats och en S-plats i `split.ts`,
- lägga pack/unpack på rätt ställe,
- acceptera eftersläpningen på ett hopp som ordningen `pushBig` → `fillFrame` ger.

Inget stående prov fångar felet. Paritetsverktyget ser inte nya fält, och 0 går inte att skilja från "källan borttagen".

**Förslag på hur arkitekturen borde täppa hålet:**

1. **Tråd i typen.** Varje Out-fält deklarerar sin skrivartråd, till exempel `BassOut.writtenOn = { energy: 'fast' }`, eller med uppdelade typer `FastOut`/`SlowOut`. En sten med `runsOn: 'slow'` kan då bara `Pick` från slow-fält eller från en `Carried<…>`-typ. Läsningen av `energy` i workern blir då ett **kompileringsfel** i stället för en tyst nolla.
2. **En bärlista i stället för handskrivna platser.** `CARRY_TO_SLOW = [['bass','energy'], …]` i en fil. B-offseten, `BIG_REC_LEN` och en enda pack/unpack-slinga i kärnan härleds ur listan, och på samma sätt för S via `XOut.N`. En ny insignal över tråden blir **1 rad**. Producent och huvudfil rörs inte, och borttagning av stenen tar posten ur listan, så tsc pekar ut de kvarvarande läsarna.
3. **Transportpunkten efter producentens steg.** Listan anger efter vilket steg värdet bärs, eller så flyttas `pushBig` efter ramens stensteg. Då blir delad och odelad körning byte-lika även för nya fält.
4. **Ett stående prov.** `giftprov`/paritet körs i `bevis.sh` vid **varje** ändring av ett läsfält. Det jämför delad mot odelad körning för *alla* ramnycklar, även nya, med en uttrycklig lista över väntade nya fält. Därtill kommer ett krav att varje läsfält ska vara ≠ konstant i workern.
5. **"Källan saknas" ska synas.** En borttagen sten ger sina fält `NaN`, eller en flagga `bass.alive = 0` som läsarna ärver. Ett härlett utvärde som `sectionBassTrend` blir då "okänt" i stället för "basen jämn", och livstecken/startloggen säger vilken sten som saknas.

DOM oavgjort Totalen ligger inom brus och skillnaderna är avvägningar som tar ut varandra: p1 håller producenten orörd och borttagningen billig, p2 håller huvudfilen smal och tar transporten med stenen ut. Båda lämnar samma hål, där en läsare i workern av ett värde från huvudtråden kompilerar och tyst läser 0.


---

# TÄPP HÅLET (2026-11-21, ägaren "Täpp hålet"): tre tillägg till a014, ändringsprovet blint, en domare

Nyckel: q1 = h3 (färre korsningar + tagg per fält + skuggprov), q2 = h1 (transportlistan), q3 = h2 (tråden i typen).
Resultat ändringsprovet: q1 31 rader/5 filer, q2 45/5, q3 42/5 (a014 utan tillägg: 55/6, tyst 0 i workern).

## Domen

# Dom: hålet mellan trådarna (q1 / q2 / q3)

## Siffrorna först

| punkt (vikt) | q1 | q2 | q3 |
|---|---|---|---|
| A rader/filer för ny insignal (25) | **7** | 6 | 4 |
| B fel tråd stoppas (25) | **9** | 8 | 7 |
| C delat = odelat / deklarerat (15) | 8 | **9** | 6 |
| D ärlig borttagning (10) | **8** | 6 | 5 |
| Enkelhet, minst ny mekanism (15) | 5 | 6 | **7** |
| Cpu i huvudtråden + allokering (10) | 8 | 7 | **9** |
| **Viktad summa (av 100)** | **75,5** | 70,5 | 61,0 |
| Fatalt brott | nej | nej | nej |
| Nya luckor som provet hittade (verkliga / listade) | 6 / 10 | 6 / 10 | 7 / 11, varav 1 tyst fel och 1 regelkrock |

**Vinnare: q1.** Den bästa helheten är ändå en kombination: q1:s stomme med q2:s flytt av producenten i stället för q1:s dubbelräkning (`BÅDA`). Se sist.

## Det jag själv körde (kopior i `hal/domare/`, inget annat ändrat)

| prov | utfall |
|---|---|
| q1 `tsc --strict` + `visa-fel.mjs` | 0 fel med `@ts-expect-error`. Utan dem blir det 7 fel, plus 2 för hålets fall och 2 för dagens `a.section`. **Stämmer.** |
| q1 `alloc.mjs` | 0 GC på 2 M hopp, kontrollen ger 111. **Stämmer.** |
| q2 `kor.mjs` | tsc stoppar A, B och C, laddningen stoppar D och E. TAKT fäller hål 3 (19 999 hopp), GIFT fäller hål 1. Transporten kostar 132 ns för fack mot 31 ns för raka rader, 0 GC. Nycklar ger 986 GC. **Stämmer.** |
| q3 `tsc` efter/före/fel | efter ger 0 fel. Före ger TS2344 med texten "bass.energy skrivs inte i slow: bär det". fel ger 6 fel. `hopp.js`: rätt 0, sen 199 981, av ger NaN i 199 991. 0 GC. **Stämmer.** |
| Flytten av `bassEnergyStep` ovanför `pushBig` (q2 och q3) | Jag läste koden: `localBpm` skrivs vid :837 (`silenceStep`, före) och :964 (`setClock`, efter), och `section` vid :367 (före) och :955 (efter). Ingen läser `bass.*` mellan :873 och :948. Det betyder att flytten kommuterar. q2:s tillägg har mätt den på riktig `src` med 0 av 537 981 hopp. q3:s har bara argumenterat för den, men flytten är densamma. |

Alla tre förprov håller vad de lovar. Ingen deltagare överdrev tsc- eller GC-utfallen. Alla tre **underskattade däremot raderna** (se A).

## A. Rader och filer för en ny insignal (rättat ur proven)

| | totalt i fallet (profilernas vägar) | utanför sektionsfilen och dirigenten (hålets mått 16–29) | utanför läsare, producent och dirigent, utom de 3 ramraderna | nästa fält ur samma producent | tilläggets eget påstående |
|---|---|---|---|---|---|
| referens p2 | 46 (55 med grenen utan `bigOn`) | 14 (16) | 6 i 2 filer (`split.ts`, `analyser.ts`) | ≈4 | – |
| q1 | 31 enligt provet. **Rättat 33**: anropet i `drainBig` och basens `BÅDA`-tagg hör till fallet. Med engångsraderna från 15b (`bpmNu` 4, `lowAbsStep` 2) blir det 39 | 7, rättat 9 (15 med engångsraderna) | 2 (`drainBig`, skuggprovets rad) + 6 engångsrader, i 2–3 filer | **0–1** | "1 rad" |
| q2 | 37 (45 med grenen utan `bigOn`). Flytten i flyttplanen ger +1 | 12 (+1 för flytten) | **0–1** (+2 i `split.ts` för grenen utan `bigOn`) | 2 | "0 + 2 för ramen" |
| q3 | 42 (grenen utan `bigOn` är inte gjord, ≈+8) | **16**, alltså samma som referensen | 5 i `analyser.ts` (flytten 2, `A` 1, anropen 2) | 3 | "7" |

Domen för A: q1 har lägst kostnad per fält efter det första fältet och lägst total. Men q1:s "1 rad" gäller bara när producenten är billig och bara läser `IN`/`BÅDA`. Sex rader engångsarbete ligger dolda i flyttsteg 15b, och de är skrivna för just basen. q2 nästan når idealet utanför läsare och producent, men betalar 5 rader mallkod i `BassOut` första gången. q3 sparar `split.ts` men flyttar i stället arbetet till `analyser.ts`. Mätt med hålets eget mått är q3 inte bättre än referensen.

## B. Stoppas läsning från fel tråd?

- **q1 (9):** tsc stoppar alla 7 fall och hålets fall (verifierat). Skuggprovet går **i varje hopp, för varje taggat fält** (`IN`, `BÅDA`, `UT`), och för ramen med en deklarerad baslinje. Förprov F på **dagens riktiga kod**, 44 fält, är grönt. Provet kan alltså bli grind direkt. Svaghet: grenen utan `bigOn` ger tyst 0 (q1 d8).
- **q2 (8):** tsc stoppar (verifierat). Laddningskontrollen är unik: den fångar att pack och uppack gäller olika fält. TAKT och GIFT är provade **bara på en modell**. Svagheter: hemmet `'B'` går igenom tsc i grenen utan `bigOn`, där det inte finns någon B-ring (q2 d1). `'K'` får inget gift.
- **q3 (7):** tsc stoppar och har de tydligaste felmeddelandena. Den kräver också `on`. Bärprovet ser bara räknade fält, och `'MS'` kontrolleras bara som rapport. Grenarna utan `bigOn` ger **tyst fel**: `shIn.bassSum` står kvar på 0,5 med `on = true` (q3 d6). Det är just hål 1, i en gren.

## C. Delat mot odelat, och fyndet

**Fyndet: delat och odelat skiljer redan i dagens kod.** Tre agenter mätte det oberoende av varandra:

| mätt av | längd | hopp som skiljer |
|---|---|---|
| q2:s tillägg | 120 s | 44 999 av 45 000 |
| q3:s tillägg | 60 s | 22 499 av 22 500 |
| q1:s tillägg | 150 s | 56 249 av 56 250, i 14 ramfält (`sectionAgeMs` 100 %, `repeatSim` 87 %, `sectionIndex` 75 %, `miniDropCount` 73 % … `bassLevel` 1,5 %) |

**Vad det betyder för C:**
1. Mål C som det är skrivet ("delat = odelat för nya värden") går inte att uppfylla för ett värde som byggs på sektionen. `sectionBassTrend` ärver sektionens gränser, och de skiljer redan.
2. Målet måste formuleras om till: **transporten får inte lägga till någon skillnad.** Läsaren ska se exakt samma insignal i samma hopp i båda trådarna. Det som skiljer utöver det ska stå i en deklarerad baslinje.
3. `bevis.sh` jämför ref mot ny **i samma läge**. Byte-identitet gäller alltså per läge och har aldrig gällt mellan lägena. Ett prov som jämför delat mot odelat utan baslinje skulle bli rött på dagens kod.
4. Referensens recept (`B_BASSE` i `pushBig`) är värre än "ett hopp sent": energin skiljer i 98,5 % av hoppen (406 455 av 412 500, q1:s förprov D).

Poängen för C:
- **q2 (9):** flytten av `bassEnergyStep` är bevisad byte-identisk på riktig `src` (0 av 537 981, odelat och inline, plus lotusstil). TAKT jämför B- och K-fält i varje hopp. Skillnaden för S-kanalen är deklarerad i hemmet, och grenen utan `bigOn` är hanterad.
- **q1 (8):** insignalen är lika i 0 av 412 500 hopp på riktig `dist` och 3 inspelningar. Skuggprovet har en deklarerad baslinje för ramen. Två avdrag: (1) Efter en omstart av workern glider `BÅDA`-kopian i upp till 9,47 s (deklarerat, gräns 120 s). (2) Engångsflytten ändrar befintlig kod i den heta vägen: `lowAbsStep` bryts ut ur `fastBandStep`, och `h.sec`/`h.lvh` skrivs nu i alla roller. Bara `fbAbs[0..1]` och basfälten är jämförda, inte resten av `fastBandStep`. `bevis.sh` måste bära det.
- **q3 (6):** samma flytt som q2, men den är bara argumenterad och inte körd på riktig kod. Bärprovet finns bara i en modell. Grenarna utan `bigOn` blir tyst fel. Hur S-barriären i `pullSlowState` ska behandlas av bärprovet är ouppklarat (q3 d7).

## D. Ärlig borttagning

- **q1 (8):** `finns`, ramens `stenarAv` och en startrad som listar varje läsning utan källa (också i `/api/health`). Inget NaN. Luckor: taggen `'AV'` finns inte i `Tag`/`Synlig` (+2 rader första gången), det står inte var `finns = false` sätts, och `lowAbsStep` blir död räkning (≈3 µs per hopp) när basen är borta.
- **q2 (6):** `on` ('K') och `f.stones`, och `Wire` hoppar själv över avstängda fack. Men transporten bor i facket, så efter radering står `b()`, `energy: 'B'` och B-platsen kvar. Att städa bort dem kräver ≈15 rader i sektionen. Konstanterna för `f.stones` saknas, och ingen loggrad syns vid radering.
- **q3 (5):** NaN betyder "ingen bas-sten". Det **krockar med a014:s regel** "inget ramfält får ha NaN" (steg 14). I JSON blir det `null`, och första rutan är 0 innan värdet blir NaN. tsc **tvingar** den döda taggen `'M>B'` och platsen att stå kvar efter raderingen. Raden i `neutral()` som sätter `on` visas aldrig.

## Enkelhet och cpu

| | ny mekanism | huvudtråden per hopp | workern | GC |
|---|---|---|---|---|
| q1 | 5 taggar, `Läser`/`Ur`/`Vy`, `platser`, `falt`, `utanKalla`, `finns`, `stenarAv`, skuggprovet (≈60 rader), dubbelräkningsbegreppet `BÅDA` med en tröskel på 5 µs, och regeln att importerade tal binds om lokalt | ≈0,01 µs | **+3 µs** (tillåtet enligt "all cpu på Pi:n", men det växer med varje `BÅDA`-producent) | 0 |
| q2 | `HOME` per fack, radmetoder i facket, `layout()` med provinstans (reflektion vid laddning, ≈40 rader), `Wire` (megamorft), TAKT och GIFT. **Ersätter** ≈12 pack-metoder och ≈33 konstanter, och `analyser.ts` blir −15 rader | **+0,10–0,12 µs PC** (≈+0,2 % av 57,8 µs), uppskattat +0,4–0,5 µs på Pi:n | ±0 | 0 |
| q3 | tabellen `TRÅD` (en rad per fack), en typmall på 39 rader, `platser()` en gång, handskrivna rader på räknade platser, bärprovet (≈30 rader). Ersätter skrivkartan och giftprovet | ≈4 ns per fält, alltså samma maskinkod som handskrivet | ±0 | 0 |

q1 bryter mot ägarens "en källa per storhet": `BÅDA` ger två tillståndskopior av samma storhet. De är bevisat lika, men det är en kopia. Det är det största avdraget för enkelhet.

## Kombinationen (rekommendation)

Uppskattad summa ≈81. Den är inte provad som helhet.

| ta | ur | varför |
|---|---|---|
| tagg per fält bredvid fältet, `LÄSER … satisfies Läser<T>` → `Ur`/`Vy` (ersätter `XReads`) | q1 | bäst tsc-täckning, verifierad |
| `platser('IN'/'UT', …)` för B/BS/S, med handskrivna pack- och uppackrader på räknade platser i producenten | q1 = q3 | 0 rader i `split.ts`, samma maskinkod som i dag |
| skuggprovet: varje taggat fält i varje hopp, plus ramens union med deklarerad baslinje (de 14 fälten) | q1 | grönt på dagens kod, löser hål 4 och det omformulerade C |
| `finns`, `stenarAv`, startraden från `utanKalla` | q1 | bästa D, inget NaN |
| **flytten av `bassEnergyStep` ovanför `pushBig`** (`flytt.patch`) och regeln "ett IN-fält skrivs före `pushBig`" | q2 | bevisad 0 av 537 981. Gör `BÅDA` onödig för fallet |
| laddningskontrollen (pack och uppack gäller samma fält) | q2, som valfri del av skuggprovet | billig, fångar en felklass som tsc inte ser |
| allokeringsprovet och regeln att importerade tal binds om lokalt (boxningsfällan, 62 GC) | q1 | gäller a014 oavsett |
| **stryk:** `BÅDA`, utbrytningen av `lowAbsStep`, `bpmNu`, `Wire`/`layout()`, NaN-regeln, `'M>R'` | – | ersätt, lägg inte till lager. En källa per storhet. Ingen ändring av `fastBandStep` |
| **radera grenarna utan `bigOn`** (`SECTION_AGG=env`, `FAST_BANDS=0`) i första steget efter flytten | alla tre prov | alla tre fann tyst 0, tyst fel eller handskriven R-plats just där |

Fallet i kombinationen blir: taggen `energy: 'S'` → `'IN'` (1 rad), 2 rader i basen (pack och uppack på `B.bass.energy`), 2 anrop i `pushBig`/`drainBig` första gången, och 0 rader i `split.ts`. Nästa fält ur basen kostar 3 rader. Det är 2 rader mer än q1 per insignal, men i gengäld blir det ingen dubbelräkning, ingen glidning vid omstart och ingen ändring i spektrumets heta väg.

DOM q1 75,5 / 70,5 / 61,0: q1 vinner på tsc, skuggprov och ärlig borttagning, men det bästa är q1:s stomme med q2:s bevisade flytt i stället för dubbelräkningen BÅDA, och grenarna utan bigOn raderas.
