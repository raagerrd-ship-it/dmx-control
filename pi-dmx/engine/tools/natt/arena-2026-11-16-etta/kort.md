# Strategikort, arenan etta (olika MEKANISMER, aldrig olika värden på samma ratt)

a1 TIDEN: Felet sitter i NÄR särdragen mäts. Undersök om mätfönstret (BAR_WIN0..BAR_WIN1 runt rutnätets slag) ligger där anslaget faktiskt
   är (rutnätets fas mot ljudet, lead/latens, linjära ringen BAR_RISE_HOPS) och om ett slags anslag hamnar i grannslagets fönster. Rätta
   tidpunkten och fönstret, inte vikterna.

a2 KICKENS MÖNSTER: Ettan är inte det starkaste slaget utan där kickens/basens MÖNSTER börjar om. Räkna per slag och plats ett mönster
   över 4 och 8 slag (självlikhet, autokorrelation och fas i kickens energi per slag) och välj den plats där mönstret startar.

a3 BASTONEN: Basgången byter ton på ettan. Bygg ett särdrag för tonbytet i basbandet (spektral förändring eller chroma-flux i ungefär
   40-250 Hz, inte energins stigning) och låt det välja ettan.

a4 STRUKTURENS ANKARE: Drop, minidrop, sektionsgräns, uppbyggnadens landning och låtstart landar på ettan. Använd analysatorns egna
   händelser som sällsynta men tunga vittnen för vilken plats som är ettan, och låt dem rätta eller låsa valet.

a5 BACKBEATEN: Virveln eller clappen ligger på 2 och 4, hihatten på offbeat. Bygg ett eget, starkare backbeat-särdrag (eget band och
   egen transientdetektor, inte dagens highMid+treble-summa) och välj ettan som platsen FÖRE den starkaste backbeaten.

a6 BESLUTET: Ettan är låst men fel och väljs om. Ersätt beslutsregeln (andelar + marginal) med en sannolikhetsmodell över de fyra
   platserna (till exempel HMM/Bayes med övergångsstraff, eller ett tidigt val som sedan bara byts på starka bevis), och se över vad
   som händer vid låtgräns och relock. Samma särdrag som i dag, ny logik.

a7 FRASEN: Nya element kommer in på frasgränsen (8 eller 16 slag). Mät nyhet per slag (spektral nyhet, energiskifte, ett instrument
   som börjar) och välj ettan där nyheterna landar, på takt- och frasnivå.

a8 MALLARNA: Lyssna som en downbeat-modell. Jämför flera band TILLSAMMANS mot taktmallar (kick på 1 och 3, virvel på 2 och 4, hihat på
   offbeat, four-on-the-floor med offbeat-bas) och välj den plats som ger högst samlad sannolikhet (log-likelihood i stället för andelar).

JOKER (efter runda 1, mapp fusion): läser alla deltagares mappar, även diskade, och bygger ihop de delar som vann sina mått. Behåller
basens del där ingen är bättre. Högst 4 mätningar.
