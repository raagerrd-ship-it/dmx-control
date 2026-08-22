# Bedömning av motorn + två optimeringar

## Bedömning

Motorn är i mycket gott skick. Det som var rörigt är nu uppdelat med tydligt ägarskap: `beatClock` äger takten, `postprocess` äger slutkedjan i mätt ordning, `output` äger lampkunskapen, `effects` äger bara VAD som ska lysa. Besluten är dokumenterade med mätdatum och med "prova inte det här igen"-noteringar, vilket är ovanligt bra och gör att vi slutar gå i cirklar.

Latenskedjan är redan nära golvet för en Zero 2 W:

```text
arecord 1024/128 (~21 ms) → analys 375 Hz → render 100 Hz → DMX ≤200 Hz → sidecar
```

Skickliga detaljer som redan är gjorda: förallokerad wire-buffert med drop-guard i stället för sändkö (utgången bär alltid SENASTE ramen), zero-copy Int16-vy i ljudvägen, arecord pinnad till kärna 0, och försprång (lead) delat i konsumentens attacktid + global `showLeadMs`.

Jag hittar två saker kvar som är värda att göra. Resten av det jag tittade på är antingen redan optimalt eller skulle kosta mer i risk än det ger.

## 1. Riggen fryser om ljudinfångningen dör (viktigast)

Renderingen sker inuti chunk-hanteraren: ingen ljud-chunk ⇒ ingen `effects.render()` och ingen `dmx.send()`. Om `arecord` dör respawnas det efter 1 s, och under den tiden står lamporna kvar på exakt den färg och styrka de hade i sista ramen — mitt i en drop kan det vara full vit. Tystnadsgrinden och blackout-logiken kan inte heller köra, eftersom de bor i render.

Åtgärd: en fristående klocka som renderar när ljudet tystnat i utgången — inte som andra renderingsväg, utan samma `render()` med senaste framen, så vi inte får två sanningar.

- 50 Hz-timer som bara gör något om det gått > 40 ms sedan senaste render.
- Framens nivå/energi behandlas som fallande när chunkar saknas, så riggen tonar mjukt mot tystnadsläget i stället för att stå kvar.
- Ingen extra kostnad i normal drift: timern hittar alltid en färsk render och avslutar direkt.

## 2. Allokering per ljud-chunk

`toMonoFloat32` skapar en ny `Float32Array` per chunk, ~375 gånger i sekunden. Det är liten men konstant sopmängd på en maskin där en GC-paus syns som fladder.

Åtgärd: återanvänd en förallokerad buffert i `AudioCapture` — men bara efter att vi kontrollerat att ingen konsument sparar arrayen mellan chunkar (analysatorn kopierar in i sitt FFT-fönster, `recorder.write` skriver vidare direkt). Om någon av dem visar sig hålla referensen kvar hoppar vi över den här punkten helt; den är inte värd en tystnadsbugg.

## Sådant jag medvetet lämnar

- Justerbart försprång per effekt — avvisat tidigare, tas inte upp igen.
- Höjd render- eller DMX-frekvens: 100 Hz render mot 200 Hz DMX-tak är redan under sidecarns gräns, och mer ger ingen synlig vinst men mindre CPU-marginal.
- Ljudbuffertens storlek: 21 ms är nära det som ALSA klarar utan overruns på en Zero 2 W.

## Verifiering

1. Fallback-tick → stoppa `arecord` medan showen kör och kontrollera att riggen tonar ner i stället för att frysa.
2. Buffertåteranvändning → jämför nivå-/BPM-loggen före och efter; identisk kurva krävs, annars backas ändringen.
