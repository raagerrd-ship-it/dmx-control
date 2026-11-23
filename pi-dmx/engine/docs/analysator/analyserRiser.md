# analyserRiser.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden. Sedan steg 40 (sist i filen) är riser-koden nedan borta: avsnitten fram till "Nyckelknippan" är historik.

## Filhuvudet

```text
 UPPBYGGNADEN (utbruten ur analyser.ts 2026-11-14). Riser = spektral nyhet över baskroppen eller stigande klang och nivå; buildUp = dess envelope 0..1. Gränserna är relativa mot låtens eget tak och bandens egna toppar. Läser banden, nivån och senaste drop ur analysatorn (this.a).
```

## Toppnivå

### RISER_SPAN_DB

```text
RISERNS FÖNSTER: bandets nivå räknas 0..1 över så här många dB under bandets egen topp (förr absolut -70..-10 dB, samma spann).
```

### RISER_BAND0

```text
RISERN LYSSNAR OVANFÖR BASKROPPEN (band 3-7, >= 250 Hz; kroppen = band 0-2 är drop-detektorns signal). Med alla åtta band blev
basens ÅTERKOMST den största "nyheten": mätt (övningen, m1) låg 13 av 16 uppbyggnadsepisoder 0-4 s EFTER ett lyft, alltså efter
droppen. Ett svep eller en virvelrulle stiger ovanför basen; basens återkomst är droppen själv. (I det absoluta fönstret var
basbanden mättade och bidrog aldrig - så här var novelty-talen 0,15 / 0,45 en gång satta.)
```

### DOUBLE_FROM_START

```text
 Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts).
```

## RiserDetector

### a

```text
 analysatorn som äger den här delen (delade signaler läses via den)
```

### aNovSlow

På raden: RISER/UPPBYGGNAD (flyttad från effects)


### bandTop

```text
OBEHANDLAD LOGBANDNIVÅ — riserdetektorns egen ingång.

`bandLvl` går genom per-band-AGC:n, och den har NOLL attacktid: så fort
`avg > bandPeak` sätts taket till `avg`, och kvoten blir avg/avg ≈ 1. En
STIGANDE bandnivå är därmed per konstruktion konstant 1,0 — och en riser ÄR
definitionsmässigt en monoton stigning i flera band samtidigt. Alla band
pinnar på 1, tvåsekundersmedelvärdet hinner ikapp, och novelty går mot noll.
  DET är förklaringen till den uppmätta `buildUp` p50 = p90 = 0.00. Signalen
  var inte feljusterad, den var BORTKALIBRERAD av sin egen normalisering.
`bandLvl` lämnas orörd — hela effektlagret är kalibrerat mot den. Riser och
novelty läser i stället rå dB (`bandDbRaw`), där en ramp är en ramp oavsett nivå.
RELATIVT FÖNSTER (drop1 a6, 2026-11-13): förr låg dB-talet i ett ABSOLUT fönster (-70..-10 dB -> 0..1). Ladans rena ljud
ligger över -10 dB i sex av åtta band (mätt: mättat i 88-100 % av tiden) -> novelty var noll och risern död. Fönstret hänger
nu under BANDETS EGEN TOPP (`bandTop`, sjunker som bodyCeil): 1 = vid toppen, 0 = RISER_SPAN_DB under den. Se riserStep.
```

### novSlow

På raden: ihållande spektral novelty (~1.5s)


### novBaseline

På raden: ~8s baslinje → riser = novelty STIGER över den


### riserStep()

```text
 Uppbyggnad/riser (spektral novelty + klang/niva). Returnerar inRiser och uppdaterar buildUp.
```
Vid `let nov = 0; const sr = this.aSpecSlow;`:

```text
── UPPBYGGNAD / RISER (flyttad hit) ──
Spektral NOVELTY = summan av bandens POSITIVA avvikelse från en ~2s baslinje,
ihållande ~1.5s. Mätt validerad: ramsar 0.25→0.78 in i en drop. Relativt en
~8s baslinje → RISER = novelty STIGER över den (filter-sweep/snare-roll),
skilt från bara-busy (ihållande → baslinjen kommer ikapp). Gammal väg
(klang+nivå stiger) ligger kvar som OR. Inte direkt efter en drop.
```
Vid `for (let b = RISER_BAND0; b < 8; b++) {`:

```text
NOVELTY PÅ RÅ dB (`bandDbRaw`), INTE `bandLvl` — se `bandTop`. Med den
AGC-normaliserade nivån var det här uttrycket matematiskt tvunget att gå
mot noll under exakt de förlopp det skulle upptäcka.
Fönstret är RELATIVT bandets egen topp (0..1 över RISER_SPAN_DB under den), inte absoluta dB: oberoende av ingångsnivån.
BARA BANDEN OVANFÖR BASKROPPEN (RISER_BAND0..7): se RISER_BAND0.
```
Vid `const lc = this.a.levelCeil;`:

```text
NIVÅGRINDARNA ÄR ANDELAR AV LÅTENS EGET TAK (levelCeil), inte absoluta nivåer: 0,3 / 0,4 / +0,04 trimmades när taket låg vid 1
(sönderklippt ljud); rent ljud i ladan har taket vid 0,1-0,25 och nådde aldrig dit (inRiser 0 % av tiden). Samma tal, nu x taket.
```
Vid `const bRate = bTarget > this.a.buildUp ? dtHop / 3.5 : dtHop / 1.0;`:

```text
bygg ~3.5s, klinga ~1s
```


## Efter kontraktet (flytten steg 8, 2026-11-21)

Stenen läser bara det `RiserReads` nämner (`f.hop.nowWall`, `dtHop`, `centSmooth`, `lvlSmooth`, `f.spectrum.bandDbRaw`, `f.level.levelCeil`,
`f.level.activeMs`, `f.drop.lastDropMs`) via referenser som sparas i konstruktorn (`h`, `sp`, `lv`, `dp`), och skriver bara sitt eget fack
`f.riser` (`o`). Inget `this.a` kvar. `riserStep` returnerar inget utan skriver `f.riser.inRiser` sist (förr returvärdet, som kärnan
lade i en lokal `inRiser` och skrev i facket sist i `process`; den kopian är borta, ramen läser facket). `rates(dtHop)` sätter
`aSpecSlow`/`aNovSlow` (förr i Analysers konstruktor). `pack(s)`/`unpack(s)` är transporten av `buildUp` och `inRiser` i `BS_`-blocket
(`BS_BUILD`, `BS_RISER`), anropade på samma ställen i `drainBig` resp. `pushBig`. Satserna i `riserStep` är ordagranna.


## Nyckelknippan (flytten steg 40, 2026-11-23)

Uppbyggnaden var död på ladans material, i ALLA byggen som gick att mäta: `dist0` (före uppdelningen 11-14), `dist-kedja1` (före flytten)
och HEAD c7c4fbc8 ger bit för bit samma `buildUp`/`inRiser` på alla sju lang-inspelningar (sonden `.arena/uppbyggnad/probe.mjs`).
buildUp p50 = p90 = 0,00, max 0,15-0,57 per KLAR fil, > 0,35 i 0 av ägarens 29 uppbyggnader. inRiser var på 2-4 % av tiden i
100-650 flimmer per fil (median 0,07 s) och lika ofta utanför ägarens uppbyggnader som i dem (1,9-3,7 % mot 1,8-6,5 %).
Effekterna har vetat det sedan 10-11 (`effects.ts`: "analysatorns riser (frame.buildUp) är död").

Varför (ur koden):
- `buildUp` steg bara med dtHop/3,5 s men föll med dtHop/1 s: det krävdes 3,5 s OBRUTEN inRiser för att nå 1, och flimret (0,07 s på,
  längre av) höll den vid 0.
- `novRiser` (summan av bandens positiva avvikelse ovanför 250 Hz mot ett 2 s-medel, mot en 8 s-baslinje, > 0,45) och klangvägen
  (centroid + nivå stiger) är byggda för långa filtersvep. Ägarens uppbyggnader (markering till landning) är 1,5-15 s (median 3,6 s) och i nästan
  alla dras basen ur (kick-luckan, `fdGone > 0` i 28 av 29): det är luckan med något kvar ovanpå, inte en spektral ramp.
- Diskantens stigning över obruten bas (d1:s riser i SVACKA) träffar bara 2 av 21 i övningen.

Knippan (en rad per nyckel, ingen hålltid utöver drop-stenens egna):
- LUCKA      basen ur JUST NU: drop-stenens `miniGoneMs >= MINI_TOPGONE_MS` (`f.drop.gap`, nytt `L`-fält; drop-nyckeln LUCKA hålls 4 s och kan inte användas)
- AKTIV      drop-nyckeln AKTIV (musik i > 2 s, hålls 30 s)
- DISKANT    drop-nyckeln DISKANT (diskanten, 2 s, >= sitt 30 s-medel): något fortsätter ovanpå när basen är borta
- EFTER DROP > 1,5 s sedan förra drop (som förr)
`buildUp` = förloppet: stiger dtHop/3,5 s när knippan hålls, faller dtHop/1 s medan luckan varar, 0 när basen är tillbaka (landningen
avslutar uppbyggnaden; annars valde dirigenten build-looken efter landningen).
Bort: `bandTop`, `specSlow`, `novSlow`, `novBaseline`, `centSlow`, `lvlSlowR`, `rates()`, läsningarna av fft/spektrum/nivå.
Uppbyggnaden läser drop-stenen samma hopp (drop körs före i `slowPart`). Drop läser `buildUp` från förra hoppet (lugn-grinden), som förr.
Läsarna (ägaren 11-23, "v3b"): ingen läsare reagerar ännu på den nya signalen. Effekterna läste `frame.buildUp` (show-tidens fart, `ctx.buildUp`
-> phaseSpread och build-effekterna, andrum) och dirigentens build-inträde läste `inRiser || buildUp > 0,35`; de kopplingarna är borta
(effekterna går på `sectionBuildProg`, inträdet på sektionen 'build'). Uppbyggnaden är nyckeln för drop och dirigent framöver.
Mätt: v2 med läsarna kvar gav ljusdomaren -4,0 på övningen och spärrar på kontrollen (allt ur dirigentens build-inträde, effektkopplingarna
gjorde inget); utan läsare -1,3 / -0,2, ingen spärr, t90 5 -> 10 ms på övningen (godkänt av ägaren), lookbyten 244 -> 241.
