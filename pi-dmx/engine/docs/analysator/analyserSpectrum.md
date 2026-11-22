# analyserSpectrum.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
 SPEKTRUM (utbruten ur analyser.ts 2026-11-14). Snabba banden per hopp (liten FFT) och stor-FFT:ns åtta band, spektralflöde, klang och bandens onsets. Läser ljudbufferten ur analysatorn (this.a).
```

## SpectrumBands

### a

```text
 analysatorn som äger den här delen (delade signaler läses via den)
```

### fftBig

```text
--- DUBBEL-FFT: en parallell 2048-FFT enbart för effekternas ljudbild.
    512:an ovan sköter RMS/kick/BPM/onset ORÖRT (all tightad timing intakt);
    denna ger 23 Hz/bin (4× uppl. i botten) → kick och bas kan äntligen skiljas. ---
```

### windowedBig

På raden: scratch (återanvänds, ingen alloc/frame)


### bufferBig

På raden: egen glidande buffert (matas samma hops) - RING (a7): äldsta sampel vid bigPos


### prevMagBig

På raden: för per-band flux


### magBig

På raden: scratch magnitud


### magBigMax

På raden: högsta bin någon läser (band 8-taket)


### magBigView

```text
 Cachade vyer (0..magBigMax) till specSink — subarray() per stor-FFT vore 125
 alloc/s. Vyerna växlas tillsammans med buffertarna, annars pekar de fel
 varannan frame.
```

### specBig

På raden: scratch complex (fft.js createComplexArray)


### bandLo

På raden: bin-start per band (förberäknat)


### bandHi

På raden: bin-slut per band


### bandPeak

På raden: per-band AGC-peak (själv-skalande nivå)


### onsetMed

På raden: robust glidande median av per-band-fluxen


### onsetMad

På raden: robust MAD -> troskelspridning per band


### ONSET_K

På raden: troskel = median + K*MAD


### FB_K

På raden: 2048-medel / snabbt medel, median över 4 ladan-inspelningar (+-2 dB mellan filerna)


### fbCoef

På raden: per lågband: HP-biquad + LP-biquad (b0 b1 b2 a1 a2)


### fbState

På raden: x1 x2 y1 y2 per biquad


### BASSON_DELTA

```text
 Basonset-toppplockning (snabba sidan, var BIG_EVERY:e hop = 8 ms): librosa onset_detect-lika parametrar i sampel a 8 ms:
 pre_max 4 (30 ms), pre/post_avg 12 (100 ms), wait 4 (30 ms), delta i dB (librosas 0,07 pa ett dB-envelope).
```

### onsetWarm

```text
 Stor-FFT-rutor med signal i rad. Onsets hålls tysta tills MAD hunnit byggas
 upp — se `ONSET_WARM` och kommentaren vid bandOn.
```

### ONSET_WARM

```text
 ~1,5 s vid 125 Hz. MAD startar i noll efter tystnad och byggs upp med
 `mad ← 1.006·mad + 6e-5`, vilket tar ≈183 rutor att nå ett användbart värde.
```

### bigRingPush()

```text
 2048-bufferten som RING (a7/a8): hoppet skrivs på den äldstas plats i stället för copyWithin (8 kB memmove per hop);
 bigStep läser ringen i tidsordning från bigPos -> samma sampel i samma ordning, bit-identiskt. Förutsätter hop <= 2048.
```

### fastBandStep()

```text
 SNABBA BANDEN (FAST_BANDS, se fältet): varje hop, till fb*-uppsättningen. Samma nivå/AGC/onset-räkning som 2048-vägens bandloop
 i bigStep, med tidskonstanterna per hop i stället för per stor-FFT (nivå 90 ms, peak-decay 0,9993, onset-steg 0,002, uppvärmning
 ONSET_WARM x BIG_EVERY hop).
```
Vid `if (b < 3) {`:

```text
biquad HP + LP i följd, effekten per hop, utjämnad; amplitud = rot ur effekten, skalad till ett bandmedel
```
Vid `const a0 = C[o1], a1 = C[o1 + 1], a2 = C[o1 + 2], a3 = C[o1 + 3], a4 = C[o1 + 4];`:

```text
Koefficienterna i lokala konstanter (a7): tio typade läsningar per sampel bort, samma tal i samma uttryck.
```
Vid `} else {`:

```text
512-FFT:ns binnar (fbMag fylls i process()), flux mot förra hoppet
```
Vid `if (b >= 3) this.fbDbRaw[b] = 20 * Math.log10(avg + 1e-7);`:

```text
bara band 3-7 läses (midHiDb)
```

### bigStep()

```text
 Decimerad stor-FFT (var BIG_EVERY:e hop): 2048-magnitud, latminnets spec-sink, basonset-envelope, 8 band (niva/AGC/onset) + swap.
```
Vid `const specBig = this.specBig, magBig = this.magBig, magMax = this.magBigMax;`:

```text
Bara upp till högsta bin som någon läser (band 8 slutar vid 16 kHz ≈ bin 683,
låtminnet slutar vid 5 kHz ≈ bin 218). Resterande ~340 sqrt per stor-FFT hade
ingen läsare.
Hissade referenser: JIT:en slipper verifiera this-formen per varv och kan
hålla pekarna i register. Samma aritmetik, samma utfall.
```
Vid `if (this.a.bigOn) { const k = ++this.specN, R = this.specRing!, o = (k % SPEC_SLOTS) * ...`:

```text
LÅTMINNET får samma magnitud (ingen extra FFT). Anropas före swap:en nedan,
så bufferten faktiskt innehåller DENNA frames spektrum. Skickas som cachad vy
(0..magBigMax) — svansen räknas inte, så ingen läsare kan tyst få nollor.
```
Vid `const gated = this.a.activeMs > 0;`:

```text
brusgrinden ur snabba sidan (B_ACTIVE) - workerns cfg-kopia läses inte
```
Vid `if (gated) this.onsetWarm++; else this.onsetWarm = 0;`:

```text
Signal i rad? Räknaren driver ONSET_WARM ovan.
```
Vid `const bandLo = this.bandLo, bandHi = this.bandHi;`:

```text
Samma hissning som magnitud-loopen: pekarna ut ur this före det inre varvet.
```
Vid `if (!SECTION_AGG_HOP) {`:

```text
a3r: bara SECTION_AGG 'env' laser basonset-ringen (g.bon/g.bpk); i 'hop' (DMX) var den dod - 11 log10 per stor-FFT
BASONSET-ENVELOPE (09-23, sektionssardrag): som librosa onset_strength(fmax 220): medel over basbinen (20-250 Hz) av
halvvagslikriktad dB-skillnad mot forra stor-FFT:n. Toppplockning som onset_detect (pre_max/avg/post_avg/wait/delta) pa
8 ms-raster med 100 ms fordrojning (post_avg) - toppen raknas i det block som pagar, sa fordrojningen ar harmlos.
```
Vid `if (n >= 2 * A) {`:

```text
kandidat c = n - A (100 ms bakat): lokalt max over [c - pre_max, c], >= medel over [c - A, c + A] + delta, wait sedan forra toppen
```
Vid `this.a.bandAbs[b] = avg;`:

```text
Lotus-adaptern använder rå bandmagnitud som spektral andel för ljuset.
Den får inte ersättas av bandLvl, som är per-band AGC-normaliserad.
```
Vid `const db = 20 * Math.log10(avg + 1e-7);`:

```text
Obehandlad nivå i dB. Ingen AGC → en stigning syns som stigning (riserns fönster: se riserStep).
```
Vid `this.a.bandDbRaw[b] = db;`:

```text
RA dB (drop-kropp, riser)
```
Vid `const minPeak = this.a.lvlSmooth * 0.15;`:

```text
Per-band AGC: skala mot egen långsamt sjunkande peak → varje band nyttjar
full range oavsett mix (bas dominerar annars alltid rå-magnituden).
GOLV (~0.15·lvlSmooth): peaken nollställs INTE i tystnad → när ett tidigare
tyst band (t.ex. diskant i ett intro) smäller till blir det en balanserad
respons, inte en överstyrd ljus-chock/pump. (Gemini.)
```
Vid `if (gated && avg > this.bandPeak[b]) this.bandPeak[b] = Math.max(avg, minPeak);`:

```text
DECAYEN SKALAS MED BIG_EVERY: blocket körs 125/s, inte 375/s. Rå 0.9993 gav
τ ≈ 11 s i stället för kalibrerade ~3.8 s (ett hett band höll sin peak in i
nästa parti → konstlat låg diskant efter en drop). PEAK_DECAY = 0.9993^BIG_EVERY.
```
Vid `const lvlRawB = gated ? Math.min(1, avg / (this.bandPeak[b] + 1e-6)) : 0;`:

```text
Nivån smoothas ~90ms PÅ HOP-TAKT → nivå-drivna/lugna effekter (som läser
spec via ctx.band) flimrar inte av det råa per-hop-AGC-bruset. onset lämnas
skarp (nedan) så transient-drivna effekter behåller sin punch.
```
Vid `this.a.bandLvl[b] += (lvlRawB - this.a.bandLvl[b]) * this.aBandLvl;`:

```text
EN array, inte tva. `bandLvlSm` hade exakt en lasare — kopieringen till
`bandLvl` — sa tva Float32Array(8) bar identiska varden hela tiden.
```
Vid `const fluxN = fl / nb;`:

```text
Per-band onset: halvvågs-flux mot adaptiv baslinje (som kick-detektorn) →
rena anslag oberoende av bandets absoluta energi.
```
Vid `const oStep = 0.002 * Analyser.BIG_EVERY;`:

```text
ROBUST PROMINENS-GRIND (samma som kick-detektorn anvander, banden fick den
aldrig). Den gamla grinden var "1.3x en EMA-baslinje x6", vilket slapper
igenom varje transient i bandet i stallet for verkliga trumslag.
  MATT vid BPM 134: kick 1116 slag/min (borde ~134, 8x for manga),
  virvel 429/min (borde ~67, 6x). Darfor kandes trum-envelopen alltid pa
  och gav ingen musikalisk accent - den var inte matttad, den overtriggade.
Sign-baserad median + MAD ar okanslig for outliers (ett slag ar en outlier
och far darfor INTE dra upp sin egen troskel, till skillnad fran en EMA).
Steget skalas med BIG_EVERY sa tidskonstanten blir samma som kickens trots
att banden uppdateras var tredje hop.
```
Vid `if (this.onsetMed[b] < 0) this.onsetMed[b] = 0;`:

```text
Samma klamp som kick-spåraren ovan, av samma skäl: -0.01 är en dödsfälla.
Här blir följden att ALLA åtta band låser på bandOn = 1 konstant.
```
Vid `this.a.bandOn[b] = (gated && this.onsetWarm >= SpectrumBands.ONSET_WARM)`:

```text
Skala mot MAD i stallet for en fast faktor -> sjalvskalande per band.
UPPVÄRMNING — ANNARS BLIXTRAR ALLA ÅTTA BAND TILL 1,0 EFTER VARJE TYSTNAD.
Nämnaren är MAD, och MAD sjunker mot noll under tystnad (τ ≈ 1,3 s). När
musiken kommer tillbaka slår `gated` om i samma ögonblick, nämnaren står
på golvet 1e-6, och varje positivt flux klampar till 1 — i ~1,5 s, i alla
band samtidigt. Alltså en fullskalig ljussmäll vid varje låtgräns med paus.
Vi väntar in MAD i stället för att gissa en amplitudtröskel: räknaren mäter
exakt den uppbyggnadstid nämnaren behöver.
```


## Trumkittet: hi-hat och virvel (steg 25, 2026-11-22)

`hatHit` och `snareHit` (spektrumets fack, tagg `S`) räknas sist i `fastBandStep`, ur hoppets egna `fbOn`: hi-hat = max(treble, air) = `fbOn[6]`/`fbOn[7]`,
virvel = highMid = `fbOn[5]`. Peak-hold: `max(förra × d, onset)`, `d = exp(-dtHop / tau)`, tau hat 60 ms, virvel 110 ms (`rates(dtHop)`, där också
stor-FFT:ns bandnivåtakt `aBandLvl` sätts). Ramen läser `drum.hat`/`drum.snare` ur facket. Förr stod raderna i `analyser.ts` direkt efter
`fastBandStep`, samma satser; anteckningarna som stod i koden:

```text
TRUM-KIT peak-hold-envelopes PÅ HOP-TAKT (var 2.7ms) → fångar varje anslag,
aldrig missat mellan två render-frames (100Hz). tau bevarade från effects.ts:
hat 60ms (treble+air-onset O[6]/O[7]) / snare 110ms (highMid-onset O[5]) / kick 150ms
(ENBART diskret kick — se nedan). bass = spec.bass-NIVÅ (L[2], ingen envelope).
Hi-hats/sizzle i modern EDM/trap ligger ofta >10 kHz, så hat får lyssna på både
treble (3,5–10 kHz) och air (10–16 kHz) och ta den starkaste transienten.
```

`drum.kick` (`hop.kickHit`, tau 150 ms) står kvar i kärnan: den drivs av kicken och går till workern (karaktärens punch, basen).
