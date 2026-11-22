# analyserLevel.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
 NIVÅN (utbruten ur analyser.ts 2026-11-14). Förstärkningens envelope (AGC), tystnaden, intensiteten och låtens nivåtak med topp-zonen. Läser hoppets rms ur analysatorn (this.a).
```

## LevelTracker

### a

```text
 analysatorn som äger den här delen (delade signaler läses via den)
```

### silentMs

På raden: typstabilt (se lastDropRise)


### silenceArmed

```text
 true = tystnadssläppningen redan gjord för denna tystnad (flanktriggad).
```

### intensityEma

På raden: sektionsenergi: utjämnad nivå


### intensityFloor

På raden: dess robusta P50-baslinje (låtens snitt)


### intensitySpread

På raden: glidande medelabsolutavvikelse (EJ median-MAD) → sjalvkalibrerande skala


### inZoneState

På raden: hysteres för topp-zonen


### AGC_BLOCKS

```text
 PERCENTIL-AGC: 16 blockmaxima à 128 ms (~2 s historik) av RÅ rms. Envelopen är
 näst största blockmaximum ≈ 95:e percentilen — en enstaka transient kan alltså
 inte dra ner gainen, men en ihållande het ingång kan.
 MÄTT I LOTUS: momentan-nivå som AGC-mål pinnade level ≥0.95 i ~55 % av tiden
 med upp till 21 % klipp; uppbyggnader blev osynliga eftersom nivån redan låg i
 taket. Percentilen tar bort inbränningen — därför är målet ett TAK för topparna,
 aldrig ett medelvärde att sikta på.
```

### agcEnvelope()

```text
 Mata in rå rms; returnerar näst största av de senaste 16 blockmaxima (0 = ej varm).
```
Vid `if (this.agcBlocksFilled < 2) return 0;`:

```text
Näst största över de fyllda blocken (16 tal → linjär skanning är billigast).
```

### hopStep() och rates() (steg 22)

```text
 hopStep: hoppets enda anrop (bara huvudtråden). AGC (om olåst och över brusgolvet), tystnadsflanken, rå nivå
 level = min(1, rms * gain), utjämningen lvlSmooth (asymmetrisk EMA, aAtt/aRel), intensiteten, nivåtaket (zoneStep).
 rates: takterna ur hoppets längd, en gång i Analysers konstruktor: aAtt 15 ms, aRel 400 ms (utjämningen), aIUp 1,5 s, aIDown 3 s (intensiteten).
```
Historik: steg 20 hade två anrop (`rawStep`, `smoothStep`), steg 22 flyttade utjämningen in i stenen (se `analyserFack.md`).

### agcStep()

```text
 AGC (bara mic): utbruten ur process() 2026-09-27 — anropas nar gainen ar olast och signalen over golvet.
```

### silenceStep()

```text
 Tystnadsflanken (350 ms / 10 s). Sallan korda grenar: i egen funktion sa att en forsta korning inte deoptimerar hetslingan.
```
Vid `if (this.silentMs > 350 && !this.silenceArmed) {`:

```text
FLANKTRIGGAT: en gång på 350 ms-flanken (tempot rörs inte: de flesta tystnader är en paus i samma låt).
Full släppning först efter 10 s tystnad — då är det en ny låt/nytt set.
```

### intensityStep()

```text
 Sektionsenergi 0..1 (aktiv tid, EMA, sjalvkalibrerande golv och spann). Returnerar intensity.
```
Vid `if (this.a.hGated) this.a.activeMs += dtHop * 1000;`:

```text
SEKTIONSENERGI (0..1) — hur energiskt partiet är RELATIVT låtens eget snitt.
Ren analys av nivån över tid → hör hemma här, inte i show-orkestreringen.
En komprimerad signal ligger jämnt högt, så absolut nivå säger inget; jämför
mot en robust baslinje (P50-median, ej EMA-medel som pinnas upp av loud
sections). Mitten = snittet, tydligt över = drop/topp, under = breakdown.
Attack något snabbare än release så uppbyggnader syns. WARMUP: baslinjen
konvergerar snabbt (~3s) de första 8s aktiv musik, sen stabil ~25s.
Nollställs vid tystnad → snabb omkalibrering vid låtbyte.
```
Vid `const floorRate = iWarm ? dtHop / 3 : dtHop / 150;`:

```text
REFERENSEN MASTE VARA MYCKET LANGSAMMARE AN DET DEN MATER. Golvet gick
forut pa 25s (~0.022/s), men musikens sektioner andrar sig over tiotals
sekunder OCH auto-gainen plattar ut nivaskillnaderna — sa golvet hann
ikapp EMA:n och gapet oppnade sig aldrig.
  MATT: intensity p10=0.50 p50=0.50 p90=0.51 p99=0.63.
Tiern kraver <0.34 for lugn och >0.78 for full, sa BADA ytterlagena var
oatkomliga: full-tiern (11 effekter) spelades 1 gang av 13 pa en kvart.
150s referens = flera latar, alltsa ett aftonsnitt i stallet for ett
glidande just-nu-varde.
```
Vid `if (iWarm) this.intensityFloor += (this.intensityEma - this.intensityFloor) * floorRate;`:

```text
seed snabbt
```
Vid `const dev = this.intensityEma - this.intensityFloor;`:

```text
SJALVKALIBRERANDE SKALA: den fasta namnaren 0.30 var en GISSNING om hur
stor dynamiken ar. Mat den i stallet — ett glidande medelavvikelse-matt
(MAD) over avvikelsen fran golvet. Da nyttjar intensity hela 0..1 oavsett
om baren spelar dynamisk rock eller platt komprimerad house. +-2 MAD
spanner hela skalan; minsta 0.015 hindrar att tyst brus blir blaser upp.
```

### zoneStep()

```text
 NIVÅTAKET OCH TOPP-ZONEN (drop1 a6): låtens eget tak (sjunker 1,5 %/s, ~65 s) och zonen med hysteres (in vid 85 % av taket, ut vid
 70 %). Det ABSOLUTA golvet 0,65 är borta: ren musik i ladan når nivå 0,25 som mest, så zonen var falsk 100 % av tiden. EN formel,
 körd där nivån finns: snabba sidan i process(), långsamma tråden i drainBig på samma lvlSmooth-följd (riserns
 nivågrindar läser taket där).
```

