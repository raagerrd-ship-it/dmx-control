# Manuell inlärning på Pi:n (exakta gränser)

Du har rätt. För Spotify/Apple Music blir mobil-app-idén inte smartare än en knapp på Pi:n — båda kräver att du som lyssnare trycker vid varje spårbyte. Det enda undantaget är om musiken spelas i webbläsaren på samma sida, men då är det fortfarande en knapp/touch i gränssnittet, bara på en annan skärm.

Därför förenklar vi: lägg knapparna direkt på Pi:s UI. Det är färre rörliga delar, samma exakthet, och det kräver ingen ny app eller kommunikationskanal.

## Så fungerar det

Ett nytt läge "Inlärning" i Pi-UI:t med två knappar:

```text
[ Starta inlärning ]        -> inlärningsläge på, första segmentet börjar HÄR
[ Nästa låt ]               -> committa segmentet + starta nästa i samma tick
[ Stoppa inlärning ]        -> committa sista segmentet, tillbaka till normalläge
```

När du trycker `Nästa låt` skickas en exakt tidsstämpel till motorn. Du som lyssnare hör bytet och trycker inom en halv sekund — vilket fortfarande är betydligt bättre än dagens heuristik (9–10 s fel).

Medan läget är aktivt:
- All heuristisk gränsdetektering är avstängd (inga klangskiften, ingen nivådipp, ingen 110-sekundersspärr).
- Ingen igenkänningsdriven gräns — bara knapptrycken.
- `MIN_SEG_MS` gäller inte; ett 40-sekunders spår kan läras in.
- UI:t visar löpande segmentlängd och "sparat: N låtar" så du ser att trycket gick fram.

Efter avslutad inlärning körs tvätten (`refineSong.mjs`) på varje segment som vanligt — men nu på material med korrekta start- och slutpunkter, vilket också gör `trimAt`-logiken onödig för dessa låtar.

## Latens och exakthet

Knapptrycket går lokalt inuti Pi:n (ingen nätverksresa), men din reaktionstid är den stora felkällan. Därför sätts gränsen med en liten justerbar offset (standard −300 ms) så att lite av föregående låt hellre hamnar i slutet av det gamla segmentet än i början av det nya. Fingeravtrycket är robust mot det; en avhuggen intro är värre.

## Tekniskt

- `pi-dmx/engine/src/songMemory.ts`: nya publika `beginManual()`, `boundaryManual()`, `endManual()` som committar segmentet på angiven tidsstämpel och startar ny tidslinje atomärt (samma väg som dagens bekräftade gräns, men utan bevisvillkor). En `manualMode`-flagga kortsluter heuristik och spärrar.
- `pi-dmx/engine/src/server.ts`: `POST /api/learn/start`, `/api/learn/next`, `/api/learn/stop`, samt `learn`-status i WebSocket-strömmen.
- `pi-dmx/engine/src/index.ts`: `LearnRecorder` styrs av manuellt läge när det är aktivt.
- UI: `index.html` på Pi:n ägs av dig — jag levererar den delen som en färdig diff att klistra in, inte som en direktändring.
- Verifiering: nytt test i `tools/testSongMemory.mjs` som spelar facit3-WAV:en och skickar manuella gränser vid 165 s och 317 s → biblioteket ska innehålla exakt 3 låtar med gränsfel 0 ms, och varv 2 ska känna igen alla tre.

Heuristiken tas inte bort — den behövs fortfarande när gäster spelar okänd musik.