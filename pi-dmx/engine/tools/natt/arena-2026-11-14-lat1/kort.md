# Strategikort lat1 (en MEKANISM per deltagare, aldrig olika värden på samma ratt)

Fyra kort på låtgränsen, fyra på klockan.

- **a1 FORMEN UTAN BASEN (låtgränsen)**: Ett break tar bort basen men det är samma låt; en ny låt byter också det som ligger ovanför.
  Låt formjämförelsen bygga på det som inte är baskroppen (och fråga dig vad som då skiljer en uppbyggnad från en ny låt), så att
  skarven hamnar rätt och uppbyggnaden inte blir en låtgräns.
- **a2 RYTMEN SOM VITTNE (låtgränsen)**: En ny låt har en ny puls. Mät rytmens egen period i låtgränsdetektorn ur det den får
  (spektrum per stor-FFT: anslagens avstånd, inte klockans utdata som släpar) och låt ett ihållande byte av period vara beviset –
  före eller i stället för formen.
- **a3 SNABBARE BESKED (låtgränsen)**: Formvägen väntar 9 s på att vara säker. Gör beslutet i två steg: en tidig misstanke
  (2–4 s efter skarven) och en bekräftelse eller ett återtagande, så att gränsen sägs tidigare utan fler falska.
- **a4 TONINGEN (låtgränsen)**: Låtar slutar och börjar: uttoning, kort glapp, intoning. Läs låtens egen nivåkurva relativt dess
  eget tak (inte bara 3 s under släckgränsen) och känn igen slut-och-början som en låtgräns – utan att ett break räknas.
- **a5 KLOCKAN HITTAR BYTET SJÄLV (klockan)**: Klockan ska inte behöva vänta på låtgränsen. När dess färska bevis länge och tydligt
  säger något annat än det hållna tempot är låten en annan – låt klockan själv släppa och välja om, och se till att break-hållet
  inte fryser den genom en ny låts baslösa intro.
- **a6 BREAKET ÄR SAMMA LÅT (klockan)**: I ett break är rytmen svag och klockan ska inte byta tempo på svagt bevis (131 -> 80 bpm en
  sekund före ett drop). Låt bevisets KVALITET avgöra om klockan får välja nytt tempo, inte ett fast djup i dB – utan att klockan
  blir senare vid riktiga låtbyten.
- **a7 FÖRSTA VALET (klockan)**: Efter start, tystnad eller låtgräns väljer klockan ibland en släkting till rätt tempo (105 i st f
  141, 85 i st f 97: 3:4 och 3:2) och står kvar i 10–30 s. Gör första valet mellan släktingar på bevis (var basens anslag faktiskt
  faller), så att rätt tempo vinner direkt.
- **a8 MINNET VID GRÄNSEN (klockan)**: När låtgränsen kommer är skarven redan flera sekunder gammal och klockans minnen är fulla av
  förra låten. Bestäm vad klockan gör I DET ÖGONBLICKET: vad som glöms, vad som behålls, och hur ljudet sedan skarven (inte sedan
  gränsen sades) blir det nya tempots bevis.

## Joker (efter runda 1)
**fusion**: läser ALLA deltagares mappar (även diskade), tar den del som vann varje mått och behåller basens del där ingen slog basen.
Samma domare, spärrar och tillåtna filer, högst 4 mätningar. Mapp `.arena/lat1/fusion` (delvarianter fusion-b, fusion-c).
