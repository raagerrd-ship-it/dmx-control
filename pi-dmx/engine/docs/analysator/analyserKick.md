# analyserKick.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
 KICKDETEKTORN (utbruten ur analyser.ts 2026-11-14). Anslagen i snabba vägen per hopp: kick, virvel, hi-hat, och förfiningen av kickens tidpunkt. Läser snabba banden och nivån ur analysatorn (this.a).
```

## Toppnivå

### KICK_CAP_MS

```text
 Ratt MED systemprefix: <eget prefix><name>, sedan <andra prefixet><name> (alias), sedan profilens standard.
 KICKSPÄRRENS TAK (r0 entempo): spärren är 0,6 slag på klockans tempo men högst 330 ms (= 0,6 slag vid 109 BPM). Mätt (r0/verktyg/kick.mjs,
 lang1011 141-300 s): klockan står på 87 där analysatorns egen sökning stod på 110-131; utan tak tog 414 ms-spärren var tredje kick
 (44 kickar/20 s, platt = sektionernas kicktäthet utan kontrast, upp_s 1,35 -> 2,85 s), med taket 148 mot basens 140 per minut.
```

### DOUBLE_FROM_START

```text
 Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts).
```

## KickDetector

### a

```text
 analysatorn som äger den här delen (delade signaler läses via den)
```

### kickMed

På raden: robust glidande MEDIAN av kick-fluxen (sign-baserad)


### kickMad

På raden: robust MAD (median absolut avvikelse) → tröskel-spridning


### kickSeed

På raden: warmup-räknare: snabb EMA-seed av skalan innan sign-baserad tar över


### kickWasAbove

På raden: stigande-flank-detektion


### kickPrimed

På raden: false på första framen (skräp-flux) → ingen falsk kick


### KICK_K

```text
 KICKDETEKTOR-RATTAR (09-20, korbank banken (bench.mjs), BENCH_GRID=1, 107 latar med PC-basonsets/slag):
 troskelfaktor mot MAD (4,5), grinden mot eget grid (pa), cooldown (170 ms) och energigolv (0,06). Env for A/B.
 Svep 2026-09-20 (tempot orort i alla): baslinje kick-recall 0,48 / precision 0,84 / on-beat-recall 0,63;
 grind av 0,52/0,85/0,68; grind av + cooldown 120 -> 0,70/0,84/0,89; cooldown 100 -> 0,82/0,84/0,95 (LIVE sedan
 10:23 via tempo-variant.conf); cooldown 80 -> 0,89/0,83/0,96. Orsak: en baston strax fore slaget skuggade slagets
 kick i 170 ms, och grinden forkastade slagets kick nar gridet lag fel. K 3,0-3,5 gav inget (0,53/0,85).
```

### kickStep()

```text
 Kick-detektorn (median/MAD-troskel, taktgrind, flank + cooldown). Het varje hop; egen funktion sa att process() ar kompakt.
```
Vid `if (this.kickSeed < 400) {`:

```text
KICK-DETEKTION v2: onset i kick-bandet (sub-bas ~0–280 Hz) mot en ADAPTIV
baslinje (långsam EMA av kick-fluxen). En kick = flux tydligt över
baslinjen; tröskeln skalar med signalen → fyrar pålitligt även på
komprimerat material där en fast tröskel missade nästan alla slag.
Stigande flank + cooldown = exakt ett slag per träff.
ROBUST kick-tröskel (Lovable/Gemini): sign-baserad glidande MEDIAN + MAD i
st.f. EMA-medel × fast faktor. En kick är en OUTLIER → flyttar medianen bara
ett litet steg, så tröskeln self-inflatear INTE (EMA-medlet drogs upp av
kickarna själva → missade efterföljande). Steget skalar med signalen. Tröskel
= median + 4.5·MAD → robust z-score, okänslig för outliers.
Warmup ~1s: snabb EMA för att hitta signalens SKALA direkt (annars klättrar
median från init i 20s med falska kickar). Sen sign-baserad = robust steady-state.
```
Vid `if (this.kickMed < 0) this.kickMed = 0;`:

```text
KLAMP MOT NOLL — UTAN DEN PARKERAR SPÅRAREN PÅ -0.01 OCH DÖR DÄR.
Steget skalas med (x + 0.01), så -0.01 är en ATTRAHERANDE fixpunkt: steget
kollapsar geometriskt och efter ~16 s digital tystnad är det under en halv
ulp. Återhämtningen går då från sekunder till ~10^5 s, dvs permanent tills
processen startas om. Följden är inte "sämre detektion" utan att kicken
TYSTNAR HELT: kickThresh = med + 4.5*mad blir negativ, `above` blir alltid
sann, och flankvillkoret (above && !kickWasAbove) kan då aldrig bli sant.
Utlösaren är exakta nollor — mutad codec, ALSA-loopback utan skrivare,
eller en WAV med digital tystnad i offline-bänken.
```
Vid `const dk = this.a.dbgKick;`:

```text
korbank-telemetri. Objektet skapas EN gang och skrivs sedan i stallet (skrapjakten 09-30: ett nytt objekt per hop
med boxade flyttal = ~220 B/hop = ~85 kB/s skrap i huvudtraden; ingen laser en gammal referens).
```
Vid `const gk = this.a.beatSrc.beat;`:

```text
ms → hindrar sub-beat-dubbelfyr. 0 i ratten = tempoanpassad (0,6 slag, minst 170 ms, nar tempot ar kant).
```
Vid `const gk = this.a.beatSrc.beat;`:

```text
EN KÄLLA (r0): klockans rutnät; null = klockan i coast -> öppen grind och 170 ms (som förr utan tempo)
```
Vid `const grid = this.a.beatSrc.beat;`:

```text
── TAKT-GRID-GRIND ──────────────────────────────────────────────────────
Morfologiska filter kan INTE skilja en synth-stot fran en bastrumma - matt
och forkastat tre ganger: SuperFlux (191->222 falska), relativ flux
(190->193) och stigtid (p50 = 2 hops, ingen svans att filtrera). De falska
kickarna ar ocksa skarpa transienter, bara inte fran trumman.
Kvar ar KRONOLOGIN: hor transienten hemma pa taktgridet?

VIKTIGT: referensen ar cfg.beat.anchorMs (PLL:ens stabila fas), INTE
this.beatAnchorMs - den senare sätts av varje detekterad kick och vore
cirkulär: en falsk kick skulle flytta gridet den doms mot.

TIDSBAS: anchorMs är VÄGGKLOCKA (PLL:en mäter mot frame.kickAtMs = wallNow()).
Här användes `now` = perfNow() (ms sedan processtart) — 1,7·10¹² ms fel, vilket
efter `% gridMs` blev en konstant men helt godtycklig fasförskjutning: grinden
släppte igenom transienter i fel fas och kastade äkta kickar.
```
Vid `const gridMs = beatMs / 2;`:

```text
attondelar: four-on-the-floor + upptakter
```
Vid `const tolerance = Math.max(30, beatMs * 0.15);`:

```text
60 ms vid 150 BPM (0.15*400)
```
Vid `if (distToGrid > tolerance && !Analyser.KICK_NOGATE) above = false;`:

```text
skarp transient, men felplacerad
```
Vid `let kick = false;`:

```text
─────────────────────────────────────────────────────────────────────────
```
Vid `if (above && !this.kickWasAbove && now - this.lastKick > KICK_COOLDOWN && this.kickPrim...`:

```text
Första framen: prevMag är noll → flux = hela spektrumet → falsk kick som
annars sätter beat-ankaret / triggar drop-blixt vid start-in-i-musik. Hoppa.
```

### kickRefine()

```text
 Forfinar forra kickens fas (parabel). Returnerar kickAtMs (i hKickAt).
```
Vid `if (denom < 0) {`:

```text
konkav → äkta topp
```
Vid `kickAtMs = this.a.beatAnchorMs;`:

```text
Slaget är färdigmätt → lämna över dess EXAKTA tid till PLL:en.
```
Vid `this.a.hKickAt = kickAtMs;`:

```text
(EN ETTA, klocka r0: analysatorns kick-taktfas (barAcc) är borta - frame.barShift = klockans taktmodell, se analyserClock publishPhase.)
```

