# Strategikort, arenan takt (olika MEKANISMER, aldrig olika värden på samma ratt)

a1 FLERA HYPOTESER: Klockan följer i dag en tempo/fas-hypotes. Håll en bank av kandidater (tempo x fas, t.ex. 8-32 st) i workern som
   alla poängsätts löpande mot anslagen, och byt till en annan kandidat bara när den varit tydligt bättre en stund. Använd workerns utrymme.

a2 FASVAKTEN (PLL): Mät fasfelet slag för slag mot de anslag som faktiskt kommer (bas, kick), och styr fasen och tempot med en
   återkoppling vars förstärkning anpassas efter hur säkert anslaget är. Målet är att glidning rättas inom några slag, utan ryck.

a3 MOTSLAGSVAKTEN: En egen detektor för att klockan sitter en halv takt fel: jämför över de senaste N slagen energin/anslagen på
   gridets slag mot mitt emellan, i flera band. Vänder bilden tydligt: flytta fasen ett halvt slag (framåt, barOff får bara öka).

a4 FINT TEMPO: Små tempofel (1-4 %) får fasen att glida. Skatta tempot med högre upplösning (bråkdelslagg i autokorrelation/kamfilter,
   längre fönster, interpolerad topp) i workern, så att klockan går i exakt låtens takt i stället för att rättas i efterhand.

a5 ÅTERLÅSNINGEN: Felen klumpar sig efter låtbyten, breaks och tempobyten. Gör en snabb ny låsning efter en gräns (ny hypotes på kort
   fönster, högre förstärkning en stund) men behåll ett tröttare, stabilt lås resten av tiden.

a6 BANDEN: Dansmusikens hihat och offbeat-bas kan dra fasen till motslaget. Härled fasen ur flera band (sub/kick, snare, hihat) var för
   sig, väg dem efter hur regelbundna de är, och låt det band som bär slaget styra.

a7 DYNAMISK PROGRAMMERING: Kör en riktig beat-tracker (onset-envelope + dynamisk programmering à la Ellis, eller Viterbi över tempo x fas)
   på ett rullande fönster (8-12 s) i workern, ny lösning varje ~0,5-1 s, och rätta klockans fas/tempo mot dess senaste slag. Tungt men
   workern har utrymme.

a8 TVÅ KLOCKOR, EN KÄLLA: En andra worker-tråd (ny fil analyser*.ts) kör en oberoende tempo/fas-skattning; analysatorn jämför den med
   sin egen och väljer/blandar, så att utdata fortfarande är EN klocka. Använd den andra kärnan.

JOKER (efter runda 1, mapp j0): läser alla deltagares mappar, även diskade, och bygger ihop de delar som vann sina mått OCH höll på
flera filer. Behåller basens del där ingen är bättre. Högst 4 mätningar.
