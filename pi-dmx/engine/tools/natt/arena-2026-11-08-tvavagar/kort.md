# Strategikort – tvavagar (en MEKANISM per kort, inte värden på samma ratt)

a1 EN TEMPOSÖKNING: analysatorn och taktmatningen söker båda tempo. Slå ihop dem till en sökning i långsamma vägen som båda
   konsumenterna läser, och använd den frigjorda tiden till en bättre sökning (fler hypoteser, bättre poängfunktion).

a2 SNABBA VÄGEN SMAL I SPEKTRUM: FFT:n är den tyngsta posten. Ta reda på exakt vilka spektrala tal ljuset behöver varje hop.
   Räkna bara dem i huvudtråden (mindre eller glesare FFT, bandfilter i tidsdomänen, återanvänd en FFT till flera ändamål).
   Flytta resten av spektrumarbetet (stora FFT:er, spektrumkroken för låtgränsen) till workern.

a3 FLYTTA ALLT SOM INTE ÄR LJUS: gå igenom varje steg i huvudtrådens process() (bigStep, dropStep, sectionAggStep,
   boundaryDetector och fillFrame). Allt som dirigenten, inte ljuset, behöver flyttas till workern. Dropflanken får stanna
   om den måste. Mål: den minsta möjliga snabba vägen.

a4 SNITTET MELLAN VÄGARNA: gör vägen till och från workern billig och kort. Det gäller recordets storlek och layout, hur ofta
   workern väcks (Atomics), batchning och tillståndsblockets läsning. Räkna fram det ljuset behöver av takten (ankaret) i
   huvudtråden ur workerns senaste ankare och klockan, så att ett hops fördröjning inte spelar roll. Siktar på finalens bonus.

a5 ETTAN OCH RUTNÄTET: långsamma vägens kvalitet i takten, alltså rutnätets fas, ettan och tempot vid byten och breaks. Använd
   workerns lediga kärna till en rikare modell (basgångens mönster, flera hypoteser parallellt, längre minne).

a6 LÅTENS FORM: långsamma vägens kvalitet i struktur, alltså sektioner, build/drop och låtgräns. Bygg en bättre förståelse i
   workern (fler särdrag, upprepning, förväntan) mot domarens facit.

a7 SAMMA SVAR, MINDRE ARBETE: rör inte vad som räknas, bara hur. Inkrementella summor i stället för omräkning, förberäknade
   tabeller, inga allokeringar i heta loopar och typade arrayer. Hela varianten ska vara md5-identisk. Mål: snabba vägen
   maximal på spärrens säkra sida.

a8 RÄTT TAKT PER ANALYS: varje analys körs i dag i den takt den råkar köras, oftast varje hop. Ge varje analys den uppdateringstakt
   den faktiskt behöver (per hop, per block, per slag) i båda vägarna, och lägg den frigjorda tiden på det som höjer
   analyskvaliteten mest.
