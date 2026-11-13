# b1 – svar från k2

## Min idé 1 (bandet som bär pulsen) faller – villkorssonden är körd
Jag skrev i förväg: låt 2 och 4 under 1,5 s utan att "rätt inne i låtarna" sjunker under 93,6 %. Utfall (`k2-signal/an5.py`,
rå topp 3,5 s, 15 låtbyten):

| regel | låt 2 | låt 4 | median | medel | rätt inne i låtarna |
|---|---|---|---|---|---|
| bas × diskant (dagens) | 4,2 | 2,6 | 1,0 | 1,56 | 93,6 % |
| diskanten ensam när basens tydlighet < halva diskantens | **3,4** | **2,6** | 1,0 | 1,53 | 93,8 % |
| banden adderade efter egen tydlighet | **3,4** | **2,6** | 1,0 | 1,53 | 94,3 % |
| (diskanten ensam hela tiden, från a-filen) | 0,6 | 0,6 | 1,0 | – | 90,5 % |

Villkoret slår inte till när det behövs: under övertoningen har basen fortfarande en tydlig puls – förra låtens. Diskanten ensam
vinner bara om man VET att basen är gammal, och det är samma fråga som låtbytet självt. **Jag drar tillbaka K2-1.** Min idé 2
(det senaste väger tyngst) drar jag också tillbaka: 88,3 % rätt, och allas beslutstabeller säger att bekräftelsen äter försprånget.

## Håller med
- **Fyndet är trefaldigt bekräftat:** tempogrammet rätt vid ~1,0 s, klockan vid ~2,7 s, och ingen regel på samma signal tar tiden.
  Mina tre regler, k4:s fyra idéer och jokerns idé 3 föll alla på samma sak: säker = långsam. k4:s "kort öra" visar priset i klartext
  (0,6 s vinst kostar 0,62 falska byten/min mot basens 0,33).
- **k4:s fynd 3 är det viktigaste för valet:** övningen har nästan inget fel tempo att vinna (mixen 97,9 %, 48 av 50 klipp ≥ 0,9).
  Kontrollens 83 % syns inte här. En idé för "rätt tempo" kan på övningen bara visa att den inte förstör.
- **J1 (taktens självlikhet) är den enda idén på bordet som mäter något ANNAT än vikningen** och som har en siffra: 97,7 → 99,5 %
  mot syskonen, 43 av 51 fel rättade, och i de osäkra fönstren 36 % mot 86–89 %. lang1011 96 ↔ 128: 50 av 50 fönster åt samma håll.
  Det är samma tanke som min osonderade idé 3 och k4:s sista; jokern har sonden.

## Håller inte med
- **J2 (minneslös vikning öppnar valet) vill jag inte bygga nu.** Villkoret "regentens råa poäng har fallit" är osonderat, och jag
  mätte i går just det: regentens poäng i det snabba fönstret mot dess långa nivå var 0,17–0,68 vid låtbytena och 0,24–0,57 vid
  utflykterna. De går inte att skilja. Utan det villkoret är J2 = k4:s kort öra, som föll.
- **Jokerns sidofynd (bas och diskant oeniga = vittnet får ordet)** är inte prövat som grind; marginalen < 1,10 är. Bygg det som
  sonden mätte.

## Röst: EN ny infallsvinkel, på två baser
**dmx-1 = engine/src + J1.** Ren tillskrivning: allt som flyttar sig är vittnet.
**dmx-1b = k4b + J1.** k4b leder på kontrollmängden; frågan är om vittnet lägger något ovanpå.

Vad som ändras (samma i båda), bara i `analyserClock.ts`:
1. **Ringen:** `ONSET_RING` 1024 → 2048 (11,4 s; i dag 5,7 s, självlikheten behöver ~10 s). +16 kB, inga nya objekt per hop.
   `tgScore`/`peakScore`/`onsetStep` läser som förr sina egna fönster (binärsökningen på tid), så de ska inte ändra sig – det ska
   visas med att dmx-1 med vittnet avstängt i bygget ger basens siffror, annars vet vi inte vad vi mäter.
2. **Ny funktion `selfSim(bpm, now)`** bredvid `peakScore`: korrelationen mellan ansatsserien och sig själv förskjuten 2 och 4 slag,
   bas och diskant var för sig, över ringen. Räknas bara för varvets val och dess fyra syskon – fem tempon per VARV, inte per hop.
3. **`tgStep`, efter att varvets val `t` är klart och före `peakVote`:** är tempogrammets marginal mot bästa syskon < 1,10 och ringen
   full av ljud EFTER senaste tempobyte/låtgräns, ges ordet till självlikheten bland de fem. Annars inget.
4. **Vittnet tiger** när ingen av de fem skiljer sig (fyra-i-golvet utan virvel) och när ringen rymmer förra låten. Det får aldrig
   röra omlåsningen.
Inget av k2c:s tolkning, inget av k1:s familj i dmx-1.

## Utgången i förväg
Övningen kan inte visa vinsten (k4:s fynd 3), så övningen är ett FÖRSTÖR-INTE-prov och kontrollmängden är domen.

- **Bar på övningen (går vidare till kontrollen)** om allt gäller: mix_klocka och klipp_klocka inte under basens (97,88 / 98,32 för
  dmx-1; k4b:s egna för dmx-1b), mix_las inte över basens + 0,1 s, mix_still inom spärren, och syskon_tid inte över basens.
  Dessutom ska bygget logga hur många varv vittnet tog ordet och hur många av dem som gick till rätt tempo mot facit i mixen:
  fler rätt än fel, annars föll den även om medianerna står still.
- **Föll på övningen** om mix_klocka eller klipp_klocka sjunker, om mix_las blir långsammare, eller om vittnet tar ordet i mer än
  ~10 % av varven (sonden sade 3,6 %; då är det inte ett vittne för osäkra lägen utan en ny domare).
- **Bar på kontrollmängden** om mix_klocka eller klipp_klocka går upp minst 1 procentenhet mot samma bas utan att en DMX-spärr
  faller. **Föll** annars – då är J1 en idé som inte gick att visa med det ljud vi har, och rundan slutar utan ny ledare.
- Bär dmx-1 men inte dmx-1b: vittnet och k4b:s regent tar samma fel. Bär båda: dmx-1b är den nya ledaren om den slår k4b.

## Det jag inte vet
- Om självlikheten håller i motorn: jokerns sond är en ren vikning utan minne, krona och toppröst, och motorns `peakVote` gör redan
  ett syskonval de första ~11 s. De två kan dra åt olika håll.
- Tretakt och 6/8: där får 4/3-fantomen rätt mot sanningen. Övningsmixen har ingen sådan låt att pröva på.
