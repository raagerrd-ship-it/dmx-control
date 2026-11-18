# Strategikort, arenan etta3 (olika MEKANISMER, aldrig olika värden på samma ratt)

a1 MÄTFÖNSTRET: a6 flyttade fasens referens (sex band, lärd lead-kompensation). Ta reda på VAR i slaget taktminnets särdrag (K/R/L,
   backbeat) nu samplas jämfört med basen före a6, och gör så att de mäts mot det musikaliska anslaget igen (fönster runt det faktiska
   anslaget, inte rutnätets punkt). Orsaken först, sedan lagningen.

a2 TVÅ RUTNÄT, EN KLOCKA: Klockan som publiceras är a6:s. Men låt taktminnets särdrag samlas på ett eget, internt rutnät som följer
   basens gamla fas (den gav bättre etta), och översätt bara RESULTATET (vilket slag som är ettan) till den publicerade klockan.

a3 SLAG 1 MOT SLAG 3: Behåll {1,3}/{2,4}-beslutet (backbeat bär det). Bygg ett SEPARAT andra steg som bara väljer mellan 1 och 3,
   med särdrag som skiljer just de två: tvåtaktsperioden (det som upprepas var 8:e slag), det första anslaget efter en paus i basgången,
   att den starkaste kicken/basen i takten och ackordbytet oftare kommer på 1. Ett eget beslut med egen säkerhet.

a4 NYHET PÅ ETTAN: Loopbaserad musik byter innehåll (ny loop-varv, nytt ackord, ny trumfill-slut) på ettan. Räkna hur mycket ljudbilden
   ändras per slag (spektral nyhet slag mot slag, i worker) och lägg till en röst: ettan är det slag där nyheten oftast toppar
   med period 4 (eller 8).

a5 ASYMMETRISK TRÖGHET: Felet är nästan alltid 2 slag (trean). Gör det dyrare att flytta ettan 2 slag än 1 slag, och ge ett val som
   gjorts med starka bevis (t.ex. strax efter en drop/landning eller när kicken kommer tillbaka) ett längre minne, så att svaga
   bevis mitt i låten inte vänder ettan till trean. Beslutslagret, inte särdragen.

a6 TILLIT PER RÖST: Rösterna (K/R/L, backbeat, kickåterstart) stämmer olika bra i olika låtar. Lär dig online, per låt, hur ofta varje
   röst håller med den valda ettan över tid, och väg rösterna efter det (en röst som säger emot sig själv takt för takt tappar vikt).

a7 HÄNDELSER SOM ANKARE: Vissa händelser sker nästan alltid på ettan: drop-landningen, basens återkomst efter en lucka, sektionsbytet,
   första kicken efter tystnad. Låt sådana händelser (som analysatorn redan känner) sätta eller bekräfta ettan, och låt taktmodellen
   bara flytta den på starka bevis däremellan. (Arenan etta 11-16: a4 "drop som vittne" var svag på mellan - läs varför först.)

a8 EN ANDRA WORKER FÖR TAKTEN: Kör en egen nedslags-tracker i en andra worker-tråd (ny fil analyser*.ts): slag-synkrona särdrag
   (flera band, chroma/basnot, anslagsstyrka) och en sannolikhetsmodell över taktposition (stapelpekare/HMM som i madmom, med
   utsändningar från musikteori, inte skattade ur facit). Analysatorn väljer ettan ur den när den är säker. Använd den andra kärnan.

JOKER (efter runda 1, mapp j0): läser alla deltagares mappar, även diskade, och bygger ihop de delar som vann sina mått OCH höll på
flera filer. Behåller basens del där ingen är bättre. Högst 4 mätningar.
