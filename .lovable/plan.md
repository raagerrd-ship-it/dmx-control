# Manuell inlärning från mobilen (exakta gränser)

Din idé löser problemet där det faktiskt går att lösa. Heuristiken kan inte hitta ett crossfade-byte — men *du* vet exakt när låten börjar och slutar. Om mobilen får sätta gränsen blir facit exakt, och biblioteket byggs på rena segment i stället för smutsiga blobbar.

Efter det får igenkänningen (som mätts till 0,2 s fel) bära all realtidsdetektering, och klangskiftesheuristiken blir bara en reservplan för okänd musik.

## Så fungerar det

Ett nytt läge "Inlärning" i mobil-UI:t med tre knappar:

```text
[ Starta inlärning ]        -> segmentet börjar HÄR (exakt tidsstämpel)
[ Nästa låt ]               -> committa segmentet + starta nästa i samma tick
[ Avsluta inlärning ]       -> committa sista segmentet, tillbaka till normalläge
```

Medan läget är aktivt:
- All heuristisk gränsdetektering är avstängd (inga klangskiften, ingen nivådipp, ingen 110-sekundersspärr).
- Ingen igenkänningsdriven gräns — bara dina knapptryck.
- `MIN_SEG_MS` gäller inte; ett 40-sekunders spår kan läras in.
- UI:t visar löpande segmentlängd och "sparat: N låtar" så du ser att trycket gick fram.

Efter avslutad inlärning körs tvätten (`refineSong.mjs`) på varje segment som vanligt — men nu på material med korrekta start- och slutpunkter, vilket också gör `trimAt`-logiken onödig för dessa låtar.

## Latens och exakthet

Knapptrycket går över WiFi-AP:n till Pi:n på några millisekunder, men det är inte hela sanningen: din reaktionstid är den stora felkällan. Därför sätts gränsen med en liten justerbar offset (standard −300 ms) så att lite av föregående låt hellre hamnar i slutet av det gamla segmentet än i början av det nya. Fingeravtrycket är robust mot det; en avhuggen intro är värre.

## Tekniskt

- `pi-dmx/engine/src/songMemory.ts`: nya publika `beginManual()`, `boundaryManual()`, `endManual()` som committar segmentet på angiven tidsstämpel och startar ny tidslinje atomärt (samma väg som dagens bekräftade gräns, men utan bevisvillkor). En `manualMode`-flagga kortsluter heuristik och spärrar.
- `pi-dmx/engine/src/server.ts`: `POST /api/learn/start`, `/api/learn/next`, `/api/learn/stop`, samt `learn`-status i WebSocket-strömmen.
- `pi-dmx/engine/src/index.ts`: `LearnRecorder` styrs av manuellt läge när det är aktivt.
- UI: `index.html` på Pi:n ägs av dig — jag levererar den delen som en färdig diff att klistra in, inte som en direktändring.
- Verifiering: nytt test i `tools/testSongMemory.mjs` som spelar facit3-WAV:en och skickar manuella gränser vid 165 s och 317 s → biblioteket ska innehålla exakt 3 låtar med gränsfel 0 ms, och varv 2 ska känna igen alla tre.

Heuristiken tas inte bort — den behövs fortfarande när gäster spelar okänd musik.
