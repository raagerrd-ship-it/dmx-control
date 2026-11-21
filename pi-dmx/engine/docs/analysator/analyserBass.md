# analyserBass.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
 BASEN (utbruten ur analyser.ts 2026-11-14). Basenergin i slagets skala och basgångens anslag per slag. Läser banden och klockans tempo ur analysatorn (this.a).
```

## Toppnivå

### DOUBLE_FROM_START

```text
 Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts).
```

## BassTracker

### a

```text
 analysatorn som äger den här delen (delade signaler läses via den)
```

### BE_TOP_BEATS

```text
 BASENERGIN MED SLAGET SOM TIDSENHET (frame.bassEnergy / bassEnergyShort). Alla tider räknas i SLAG ur klockans tempo (60000 / bpm,
 hållet inom BE_BEAT_MIN_MS..BE_BEAT_MAX_MS så ett halv-/dubbeltempo inte flyttar skalan långt; utan klocka BE_FALLBACK_MS):
 TAKET följer basen direkt upp och glöms mot den på BE_TOP_BEATS slag (frasens skala) resp. BE_FAST_BEATS slag (taktens skala) -
 hur fort skalan hinner ikapp ett nivåbyte följer musikens tempo i stället för en klocka i sekunder. Fältet = basens läge i ett
 FAST spann BE_SPAN_DB under taket. Bara dB-SKILLNADER: ingen tystnadsgrind och ingen absolut nivå i mätningen (oberoende av
 ingångsnivån). Fyra tal i tillstånd (beRef = låtens referens för frame.bassLevel), inga objekt per hop. INGEN DAL HÄR (ägaren 11-11: en dal som återhämtar sig inom slaget
 bestämmer pulsens bredd = ljusstyrning) - den ligger i effects.ts stepEnergy och följer fältet, inte ljudet.
 (Provat och förkastat i arenan: toppen som kvantil/median av de 32 senaste slagtopparna - plattare ljus, sämre takt i bänken.)
```

### bassEnergyStep()

```text
 Stegar skalorna ett hop; returnerar frasens värde, taktens ligger i beShort.
```
Vid `const x = 5 * Math.log10(sub + 1e-7) + 15 * Math.log10(kick + 1e-7), hopMs = this.a.dtH...`:

```text
0,25 x sub dB + 0,75 x kick dB
```
Vid `let per = this.a.localBpm > 40 ? 60000 / this.a.localBpm : Analyser.BE_FALLBACK_MS;`:

```text
slagets längd ur klockan
```
Vid `this.beRef = this.a.section === 'high' || !(this.beHi <= this.beRef) ? this.beHi : this...`:

```text
låtens referens = refrängens tak
```

### stepBassline()

```text
 TYDLIG BASGANG (env-rastret, 100 Hz): se blAccum.
```


## Efter kontraktet (flytten steg 7, 2026-11-21)

Stenen läser bara det `BassReads` nämner (`f.hop.dtHop`, `f.hop.bpm`, `f.hop.kickHit`, `f.clock.bpm`, `f.section.section`, `f.spectrum.bandLvl`)
via referenser som sparas i konstruktorn (`hop`, `clock`, `sec`, `sp`), och skriver bara sitt eget fack `f.bass` (`o`). Inget `this.a` kvar.
Ackumulatorn `blAccum`/`blKickSeq` (förr på `Analyser`) och `envSeq` är stenens egna privata fält; `blAccum` står i stenens `DOUBLE_FROM_START`.
`accumulate()` ersätter de två likadana raderna i `analyser.ts` (`drainBig` och grenen `!big` i `process`), på samma platser: i workern läses
alltså fortfarande förra hoppets `kickHit` (anropet står före transporten av `B_KICKHIT`). `bassEnergyStep` returnerar inget utan skriver
`f.bass.energy`, som ramen läser (`frame.bassEnergy`). Rattarna `BE_TOP_BEATS` … är modulkonstanter; `BE_FALLBACK_MS`, `BE_MEM_BEATS`
och `BASS_SPAN_DB` kommer ur `analyserFack.ts` (samma värden som `Analyser.BE_*`). Satserna i `stepBassline` är ordagranna.
