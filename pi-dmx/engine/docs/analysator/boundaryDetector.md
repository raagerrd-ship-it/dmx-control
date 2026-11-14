# boundaryDetector.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
LATGRANS UR LJUDET — utbruten ur songMemory.ts 2026-09-23 nar latminnet togs bort fran driften.

Det har ar det ENDA av latminnet som realtidsshowen faktiskt hangde pa: `boundaryCount` (index.ts) driver
dynamikens omkalibrering (effects.softenRange) och tempots latbytes-hint (analyser.hintTrackChange /
resetTempo). Allt annat i songMemory - fingeravtryck, igenkanning, replay, inlarning - var offline-arbete
som ska ske pa PC:n, och kostade i drift synkron disk-I/O + en BigInt-indexombyggnad (matt 196 ms pa PC,
dvs sekunder pa Pi:n) vid varje latcommit.

Grenarna for igenkand lat / manuell inlarning / karantan ar borta - de kunde aldrig sla till utan bibliotek.

Signalen (2026-11-08, arena tvavagar a6): LATENS FORM - 80 s fore mot 8 s efter i spektralform, tonart (kroma) och
tempo, se F_*. Ersatte klangskiftet 8 s mot 8 s + nivadipp/temposkifte (2/15 ratt i mixen). Klangskiftet
(pushNovelty) lever kvar bara for karaktarsskiftet. Allt grindas av min/max-langd pa segmentet.
```

## Toppnivå

### SILENCE_END_MS

På raden: tystnad sa lange = laten ar slut


### START_HOLD_MS

På raden: ett segment startar nar musiken hallit sig over slackgransen sa lange (se tick)


### MIN_SEG_MS

På raden: MATT: 75 s triggade direkt (tva segment exakt 75 s) -> hojt


### MAX_SEG_MS

På raden: 10 min utan grans -> tvinga fram en


### NOV_WIN_MS

På raden: klangprofil per 1,5 s


### NOV_LAG_MS

På raden: jamfor mot profilen sa langt bakat (facitmatningens fonster)


### CHAR_D

```text
(NOV_WEAK + novAt/novPeak - skrevs men lastes aldrig - borttagna 11-09.)
```
På raden: 10-01 i koden ('mer variation pa effekterna nu');             // karaktarsskifte for dirigenten: 0 = av


### CHAR_REFRACT_MS

På raden: ...racker om nivadipp eller temposkifte ocksa fyrar


### NOV_Q

På raden: skiftet maste ligga i toppen av de senaste minuterna


### NOV_TAU_S

På raden: glomska pa fordelningen (~90 s effektivt fonster)


### NOV_DIST_MIN_S

På raden: innan sa mycket data samlats galler bara absoluta kravet


### NOV_DIST_BUCKETS

På raden: d ar ett L1-avstand i 0..2


### TEMPO_SHIFT_PCT

```text
TEMPOVAXLING UPPAT (agaren i ladan 2026-10-06: "nar laten okar tempo sa kanske dirigenten direkt skall byta
effekt. nu syns det knappt nar latar kor som mini drop/tempovaxling"). Egen raknare, skild fran latgransen:
gransen kraver 7 % i 4 s OCH anvands bara som evidens; det har ar ett BYTESSKAL och maste ga snabbt.
Bara UPPAT - en tempookning ar ett energilyft; att sakta ner ar nagot annat och ska inte byta look.
Octav-vaktet ar viktigt: analysatorn kan hoppa 2x eller 1,5x (halv-/dubbeltakt) utan att musiken andrats,
sa bara okningar i intervallet [PCT, MAX] raknas - 2x (100 %) och 1,5x (50 %) faller utanfor.
```
På raden: minst sa mycket snabbare


### TEMPO_SHIFT_MAX

På raden: mer = troligen oktavhopp, inte musik


### TEMPO_SHIFT_HOLD_MS

På raden: sa lange maste okningen sta


### TEMPO_REF_S

På raden: latens etablerade tempo: langsamt medel


### F_NB, F_BLO, F_BHI

```text
LATENS FORM (arena tvavagar a6, 2026-11-08) - ERSATTER klangskiftet som gransbeslut. Gammal regel: 8 s-profil mot 8 s-profil +
nivadipp/temposkifte -> traffade 2 av 15 skarvar i ovningsmixen (6 falska). En lat ar ett LANGT stycke med samma tonart, klang och
tempo; en vers->refrang byter klang en stund men inte tonart och ateranvander latens egna klanger. Beslutet jamfor darfor de
SENASTE 8 s mot hela 80 s INNAN (inte 8 s): spektralform (24 log-band, volymfri), kromagram (12 tonklasser 250-5000 Hz = tonarten)
och tempo (oktav-/1,5x-vikt). Poang = form + 4 x kroma + tempo >= troskel -> grans, bakdaterad till skarven (9 s).
MATT offline (a6/sim*.py, egen inspelning av motorns spektrum): ovningsmixen 2/15 -> 11-12/15 ratt, 6 -> 0 falska; extra mix
(de 8 oanvanda + omkastade klipp) 12-13/17, 0 falska. Kostnad: ~500 bin-adderingar per stor-FFT (var 3:e hop) + 1 beslut per 0,5 s.
```
På raden: spektralformens log-band (Hz)


### F_CLO, F_CHI

På raden: kromagrammets omfang (Hz; 23 Hz/bin racker for halvtoner hit)


### F_BLK_MS

På raden: ett sarlagsblock


### F_LB, F_LA, F_G

På raden: block: 80 s fore, 8 s efter, 1 s glapp runt skarven


### F_WC, F_WB

På raden: vikter kroma, tempo (formen vikt 1)


### F_THR

På raden: MATT (med F_TMIN): 0 falska i bada mixarna (platan 1,2-1,3), 10/15 + 10/17 ratt; snalt med flit -


### F_TMIN

```text
en falsk grans nollar tempolaset och byter manus, en missad kostar bara omkalibreringen
```
På raden: formen maste ocksa ha andrats: ensam tonartsglidning (lang1021 245 s) ar ingen ny lat


### F_RING

På raden: >= F_LB + F_LA + 2 F_G + 1


### median()

```text
 Median (sorterar arbetsarrayen pa plats); jamnt antal = medel av de tva mittersta.
```

### foldBpm()

```text
 Tempoavstand i oktaver med oktav- och 1,5x-fel bortvikta (analysatorn kan hoppa dit utan att laten bytts). 0 = okant.
```

## BoundaryDetector

### boundaryCount

```text
 Stiger vid varje passerad latgrans. Det ar den har motorn laser.
```

### lastBoundary

```text
 Varfor senaste gransen sattes (diagnostik).
```

### tempoShiftCount

```text
 Stiger vid varje tempoVAXLING uppat (se TEMPO_SHIFT_*). Lases av index.ts som bytesskal.
```

### tempoShiftFrom

```text
 Tempot vaxlingen gick fran -> till (diagnostik).
```

### lastEvidence

```text
 Gransignalen vid senaste beslutet (diagnostik; forr klang/tempo/nivadipp, nu latens form).
```

### playStart

På raden: vaggklocka da segmentet borjade


### novIdx

På raden: nasta slot i ringen


### novFilled

På raden: antal skrivna profiler


### charShiftAt

På raden: KARAKTARSSKIFTE (se nedan)


### novDist

På raden: fordelning over ALLA d


### active

```text
 Ett segment (en lat) ar igang.
```

### segmentMs

```text
 Sa lange nuvarande segment varat (ms), 0 utanfor segment.
```

### pushSpectrum()

```text
 Matas fran analysatorns spektrum-sink (2048-magnitud, var 3:e hop). Ingen extra FFT.
```

### fBand

```text
── LATENS FORM (se F_*) ──
```

### pushForm()

Vid `const k = this.fCount % F_RING, o = k * F_NB, oc = k * 12, n = this.fN;`:

```text
blocket: log-form minus medel (volymfri), kroma normerad till summa 1
```

### formDecide()

```text
 Skarven provas F_G + F_LA block bakat: 80 s fore mot 8 s efter.
```

### tick()

```text
 Matas varje hop med ramens niva/tempo.
```
Vid `const loud = !(o.silent ?? silentLevel(o.level));`:

```text
tystnaden = analysatorns (frame.silent, EN tröskel cfg.silenceLevel)
```
Vid `if (loud) {`:

```text
STARTGRINDEN = SLÄCKGRÄNSEN (2026-11-14): musik som hållit en sekund, aldrig tystnad. Förr en egen absolut nivå (0,15): ladans
rena ljud ligger på nivå 0,07-0,15 i median och höll sig aldrig över den i en sekund - inget segment startade, alltså ingen
låtgräns alls (0 av 6 låtbyten på tre inspelningar 11-13), klockan fick aldrig veta att låten bytts och manuset glömdes aldrig.
```

### pushNovelty()

```text
 KLANGSKIFTE. Energin samlas i oktavband, normaliseras (form, inte volym) och jamfors var 1,5 s med
 profilen NOV_LAG_MS bakat - exakt mattet som mattes mot facit (percentil 88 och 92 vid de verkliga
 granserna). Troskeln ar ABSOLUT: den adaptiva varianten drog upp ribban i just de partier dar en gaplos
 overgang sker, och missade bada facitgranserna.
```
Vid `const past = this.novHist[this.novIdx];`:

```text
efter framflyttningen pekar idx pa aldsta = lag fonster bakat
```
Vid `const dt = NOV_WIN_MS / 1000;`:

```text
Fordelningen matas med VARJE d - aven de sma. Det ar dem som avgor vad "ovanligt" betyder i just den har laten.
```
Vid `if (CHAR_D > 0 && d >= CHAR_D && d >= this.novRelThreshold() && now - this.charShiftAt ...`:

```text
KARAKTARSSKIFTE (ladan 2026-09-29: 'dirigenten ska vaxla om den kanner att laten forandras'): samma klangavstand, men utan
krav pa nivadipp/temposkifte - bara att skiftet ar ovanligt for LATEN (>= dess egen NOV_Q-percentil) och >= CHAR_D. Raknaren
lases av index.ts -> effects.noteCharShift(). Spärr CHAR_REFRACT_MS mellan skiften. Paverkar inte latgransen.
```

### novRelThreshold()

```text
 Troskeln som laten sjalv satter: NOV_Q-percentilen av de senaste minuternas klangskiften.
 Returnerar 0 innan tillrackligt med data samlats - da galler bara det absoluta kravet.
```

### boundary()

```text
 LATGRANS I EN GAPLOS STROM. Returnerar true om vi delade.
```
Vid `if (o.bpmConfidence > 0.5 && o.bpm > 40) {`:

```text
TEMPOVAXLING UPPAT (se TEMPO_SHIFT_*). EGEN LANGSAM REFERENS, inte det forna segBpm: det jagade tempot med
tidskonstant ~50 ms (0,95/0,05 per HOP) och var till for gransens 7 %-grind. Mot det matte jag bara
"bpm 6 % over ett ogonblickligt medel av sig sjalv", dvs brus - MATT pa megamix_ladan: 563 s och 575 s
fyrade tva ganger pa samma 92->110, och ett 1,5x-oktavhopp (87->130) smog igenom som 33 %.
tempoRef ar ett langsamt medel (TEMPO_REF_S) sa en akta vaxling star ut mot latens etablerade tempo.
```
Vid `const octave = Math.abs(trueUp - 0.5) < 0.07 || trueUp > TEMPO_SHIFT_MAX;`:

```text
Oktavvakt: 1,5x (halv-/dubbeltakt) och allt over MAX ar analysatorns hopp, inte musikens tempo.
```
Vid `this.tempoRef = o.bpm; this.tempoRefAt = now;`:

```text
nya tempot ar nu det etablerade
```
Vid `this.tempoRef += (o.bpm - this.tempoRef) * a;`:

```text
glider bara nar tempot INTE sticker upp
```
Vid `let why = "";`:

```text
GRANSBESLUTET = LATENS FORM (formDecide, se F_*): skarven har redan provats i pushSpectrum, bakdaterad till sin tid.
```
Vid `else if (tLive > MAX_SEG_MS) why = "maxlängd";`:

```text
aldrig en 22-minuters grot igen
```
Vid `this.playStart = bAt;`:

```text
Starta nasta sekvens direkt - strommen tystnar aldrig.
```

### commit()

```text
 Segmentet ar slut: rakna gransen och nollstall for nasta. Samma aterstallningar som songMemory.commit.
```
Vid `this.boundaryCount++;`:

```text
grans passerad -> motorns auto-range far kalibrera om
```


## Arenan lat1: RYTMEN SOM VITTNE (inlagd 2026-11-14 kväll)

Jokerns låtgränsdel (a2, filen orörd från a2), inlagd efter ägarens ögonprov i ladan. Rapport: `tools/natt/arena-2026-11-14-lat1.md`.

### P_N, P_ML, P_RING, P_LO, P_HI, P_CLEAR, P_SAME, P_GONE, P_EST, P_HOLD, P_FINE, P_FOLLOW

```text
En ny låt har en ny puls. Detektorn mäter pulsens period SJÄLV ur spektrum (pushPulse: summan av bandens positiva logökning per
stor-FFT = anslagsstyrka; löpande självlikhet över P_N spektrum, avstånd upp till P_ML) - inte ur klockans tempo, som släpar och
är det gränsen ska rätta. pulseDecide per formblock: starkaste perioden inom en oktav (P_LO..P_HI bpm, kammen pComb = perioden och
dess 2, 3, 4 slag). P_CLEAR = så stark självlikhet räknas som en puls. P_EST block i rad på samma period (inom P_SAME) etablerar
låtens puls (pRef); den följer låtens egen drift (P_FOLLOW). Hörs en ANNAN tydlig period medan den gamla är svagare än P_GONE av
den nya, i P_HOLD block i rad -> låtgräns ("ny puls a->b" i lastEvidence). P_FINE: punkterad puls - hörs även den 1,5 gånger
snabbare perioden är DET pulsen.
FORMEN TIGER medan låten har en puls (`!this.pRef` i formDecide): formvägen gav den falska gränsen i uppbyggnaden vid 200 s
(formpoäng 1,47 mot riktiga skarvars 1,12-1,44) och på ny musik 11-14 två falska mitt i låtar (145 och 312 s). Formen är kvar som
väg bara innan en puls är etablerad. Tystnadsvägen (3 s under släckgränsen) är orörd.
```

Mätt (medel av fem starter): övning 4 av 4 låtbyten och 0 falska (förr 3 av 4 och 1 falsk), kontroll 2 av 2 och 0 falska (förr 1
av 2), ny inspelning 11-14 (193040) 2 av 2 (förr 0 av 2 med gårdagens kod, 2 falska med startgrinden 8ab0778). Marginaler ±25 % på
alla sju talen: 4/4 och 0 falska i alla fjorton. Gränsen 1 s tidigare/senare (P_HOLD 4/8): 96,94 / 96,91.

Gränser som mekanismen INTE ser: låtbyte utan tempobyte (under 1 % ändring 0 av 4, 1-4 % 6 av 8, över 5 % 11 av 12 i tolv
konstgjorda skarvar) - en taktmixad mix får inga gränser, klockan behöver ingen men manuset byts inte. 2:1 syns inte (viks till
samma oktav). Tempobyte mitt i en låt, eller en sektion som lämnar rutnätet i över 3 s, blir en gräns.
