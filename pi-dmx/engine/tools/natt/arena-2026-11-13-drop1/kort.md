# Strategikort drop1 (en MEKANISM per deltagare, aldrig olika värden på samma ratt)

- **a1 BASENS FRÅNVARO I TID**: En uppbyggnad är att basen hålls tillbaka LÄNGE. Mät hur länge och hur djupt basen (kroppen) legat under
  låtens eget tak i ett långt fönster (flera takter, relativt taket) före återkomsten - drop = återkomst efter lång tillbakahållen bas,
  minidrop = kort lucka. Låt samma mått driva uppbyggnaden (buildUp/inRiser) medan basen hålls tillbaka.
- **a2 STIGANDE DISKANT (svepet)**: En uppbyggnad hörs som ett svep: diskant/brus som stiger stadigt i flera sekunder. Följ lutningen i
  de övre banden (eller spektrats tyngdpunkt) över 4-16 s, relativt låtens eget; uppbyggnad = ihållande stigning, drop = basens
  återkomst medan eller strax efter att svepet pågått.
- **a3 TÄTNANDE SLAG (virvelrullen)**: En uppbyggnad hörs som slag som tätnar: fjärdedelar -> åttondelar -> sextondelar. Mät anslagstätheten
  i mellan/diskant (onset per slag) och dess acceleration över några takter; uppbyggnad = tätnande anslag utan bas, drop = återkomsten
  efter en rulle.
- **a4 SPÄNNINGSKONTOT**: Ingen ensam ledtråd räcker - bygg ETT konto som fylls av flera svaga tecken samtidigt (bas saknas, diskant
  stiger, anslagen tätnar, nivån hålls uppe trots att basen är borta) och läcker långsamt. Kontot ÄR uppbyggnaden (buildUp 0..1);
  basens återkomst med fullt konto = drop, med tomt konto = minidrop. Allt normerat mot låtens egna nivåer.
- **a5 FÖRE MOT EFTER**: Avgör i ögonblicket genom att jämföra LÅNGA fönster: spektrum och energi de senaste ~8 s mot låtens tak och mot
  det som kommer direkt efter återkomsten. Drop = arrangemanget byter (tunt -> fullt över hela spektrat), minidrop = samma arrangemang
  som före luckan kommer tillbaka. Uppbyggnad = tiden då arrangemanget är tunt och stigande.
- **a6 RELATIVA GRÄNSER (minsta ingreppet)**: Den befintliga uppbyggnadslogiken (inRiser, buildUp, inZone) är redan skriven men död för att
  gränserna är absoluta nivåer. Gör dem relativa mot låtens egen nivå så logiken vaknar som den var tänkt, och låt den befintliga
  kedjan uppbyggnad -> drop avgöra sorten. Minsta möjliga diff; ändra inget som inte behövs.
- **a7 FRASEN OCH TAKTEN**: Musik byggs i fraser om 8/16 takter: uppbyggnader varar hela fraser och drop landar på frasgränser, minidrop
  är en lucka på ett par slag inne i frasen. Använd klockans slag (bara läsa, klockan är låst) och räkna hur många slag basen/energin
  varit tillbakahållen och var i frasen återkomsten landar.
- **a8 MINIDROPENS SIGNATUR (uteslutning)**: Definiera MINIDROP positivt: en kort lucka i basen där resten av musiken (mellan, diskant,
  sång) fortsätter oförändrad. Allt annat vid en stark återkomst - där även det övriga förändrats under luckan - är drop. Mät hur stilla
  de övre banden stått under basens frånvaro; uppbyggnad = tiden då de övre banden rör sig medan basen är borta.

## Joker (efter runda 1)
**fusion**: läser ALLA deltagares mappar (även diskade), tar den del som vann varje mått och behåller basens del där ingen slog basen.
Samma domare, spärrar och tillåtna filer, högst 4 mätningar. Mapp `.arena/drop1/fusion` (delvarianter fusion-b, fusion-c).
