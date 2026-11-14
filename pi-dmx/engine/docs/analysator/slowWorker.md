# slowWorker.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
Den LANGSAMMA analysatortraden (se split.ts). Startas av createAnalyser() nar
<prefix>ANALYSER_SPLIT=worker: samma Analyser-klass, roll 'slow', matad ur SAB-ringen.
Loopen blockerar i Atomics.wait tills den snabba traden skrivit ett record (10 ms-takt),
dranerar allt som ligger, publicerar tillstandet och somnar igen. Ingen event-loop-
korning behovs; workern har egen V8-heap, sa dess GC ror aldrig ljusvagen.

MEDDELANDEN: loopen ar synkron och kor ALDRIG event-loopen, sa `parentPort.on('message')`
fyrar aldrig. Porten lases i stallet synkront med receiveMessageOnPort() varje varv (100/s).

OMSTART: dor traden (kastat fel, OOM) startar createAnalyser en ny med SAMMA buffertar och
resumeSeq = senast lasta record, sa den fortsatter i sekvensen (backloggen klipps till
RING_N-RING_MARGIN i drainRecords). `crash` finns bara bakom <prefix>SPLIT_TEST_CRASH=1.

TAKTVAGEN (split.ts, bara med profilens BEAT_FEED 'slow' = buffers.hop finns): samma trad kor aven systemets taktmatning
pa hop-recorden. Da vantar loopen pa C_WAKE (env- och hop-record) i stallet for C_WRITE.
```

## Toppnivå

### { cfg, buffers, resumeSeq, sync, part = 'all' }

```text
TVÅ TRÅDAR (a3, stora vägen): part 'lane' = bara taktvägen (systemets taktmatning, det motorn läser varje hop) - den väntar
aldrig bakom en 2048-FFT eller ett computeBpm; part 'slow' = analysatorns långsamma sida (env-recorden + stora vägens hop-record).
part 'all' (osatt) = båda i samma tråd som förr (utan stora vägen, t.ex. lotus).
```

### feedMk

På raden: analysatorns klocka (analyserClock.ts, statiskt i analyser.ts)


### IfStatement

På raden: en tråd: taktvägen mellan varje env-/hop-record (Analyser.bigYield)


### idleSlow

```text
Sov aldrig langre an 200 ms sa ett 'stop' hinner fram; i drift vacks vi av notify.
DEKKER-VAKNING: vantflaggan satts FORE wait-jamforelsen (mot skrivarens store->load): antingen ser skrivaren
flaggan och notify:ar, eller sa ser wait ett nytt C_WAKE och returnerar direkt.
C_WAKE okas av varje env-, hop- och stor-record; lases FORE tomhetskollen, sa ett record som skrivs efter kollen
andrar ordet och wait returnerar direkt. Varje tråd har egen väntflagga (lane: C_WAITING, slow: C_WAITING_B); skrivaren
väcker alla väntare på C_WAKE med ett anrop.
```

