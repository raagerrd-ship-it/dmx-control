# fas1 strategikort (en mekanism per deltagare)

f1 UTHÅLLIGHET MED SÄKERHET: ett nekat hopp som står kvar ska tas efter en tid som beror på hur säkert det är (vikningens toppstyrka
   mot andra toppen, hur lika felen är från sökning till sökning), inte på ett fast antal. En kort falsk topp är svag eller vandrar;
   ett verkligt fashopp är starkt och står still.

f2 TVÅ HYPOTESER: klockan följer både nuvarande fas och den bästa alternativa fasen (en konkurrent), var och en med sin poäng
   ur anslagen (t.ex. löpande träff per slag). Byt när konkurrenten vunnit över N slag i rad med marginal. Det trötta låsets
   minne får gärna ersättas av konkurrentens poäng (en källa).

f3 FASHOPP SOM LÅTGRÄNS: när anslagen ihållande ligger fel mot rutnätet (t.ex. andel anslag nära slaget faller och en annan fas
   tar över) räknas det som en mjuk relock: freshTo sätts och minnet nollas, så att den färska vägen som redan finns följer.
   Detektorn ska vara billig och tåla uppbyggnader (offbeat-bas) - det är dem a3c skyddar mot.

f4 KEDJAN EFTER BESLUTET: redan före låset tog det 2-25 s att följa. Hitta var tiden går mellan att analysatorn ser rätt fas och att
   effektklockans tick ligger rätt (phLag/PH_LAG_A, rutnätets glidning, trust/GRID_ON_CONF, beatClock.ts:s utjämning, hur stort
   steg ankaret får ta) och korta den vägen. Låsets veto får finnas kvar.
