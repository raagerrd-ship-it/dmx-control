# Strategikort – entempo (en MEKANISM per kort)

a1 TEMPOGRAMMET SOM ENDA KÄLLA: effektklockans sökning (taktvägen, beatFeed) blir den enda. Analysatorns skuggrutnät tas bort;
   analysatorn (kickgrind, sektioner, sectionBars, boundaryDetector) läser klockans bpm/ankare med EN mätt fast fasoffset.

a2 ANALYSATORNS SÖKNING SOM ENDA KÄLLA: analysatorns egen temposökning (scoreEnv/alignScore, skuggrutnätet) blir den enda;
   effektklockans tempogram tas bort och klockan byggs som en fas-/ettan-modell ovanpå analysatorns tempo, med EN fast offset för ljuset.

a3 NY SÖKNING MED FLERA HYPOTESER: ersätt båda med EN sökning som håller flera tempohypoteser samtidigt (inkl. oktav- och
   2/3-släktingar) med uttalad oktavlogik, och publicerar den vinnande som enda sanning till alla konsumenter.

a4 SNABB OMLÅSNING VID LÅTGRÄNS: gör en källa av klockan där låtgränsen (boundaryDetector/boundaryCount) är den ENDA signalen om
   låtbyte – den går in i taktvägen som flagga i hop-recordet och styr omlåsningen; klockans egna låtbytesslutsatser tas bort.

a5 BREAKET SOM TILLSTÅND I KLOCKAN: en källa där klockan själv bär tillstånden låst / break (coast) / tappad / omlåsning, och alla
   konsumenter (effekter, frasräknare, sektioner, tillit) läser tillståndet i stället för egna trösklar på bpm=0 eller tillit.

a6 TILLITEN SOM ETT MÅTT: börja i tilliten – EN tillit (klockans) som alla läser (effects.ts trust/frasräknaren, hasBeat, profile.beat,
   analysatorn); gör den till ett väldefinierat mått och bygg den enda tempokällan runt det.

a7 MINSTA DIFF: den minsta ändringen som tar bort dubbelarbetet – en sökning, en tillit, ctx.beatIdx = rutnätets index – och inget
   annat. Varje rad ska bära ett mått.

a8 PI-BUDGET: en källa som får plats i EN workertråd på Pi:n (ARM ~170 µs/hop i dag, 2 kärnor). Sikta på att den sammanslagna
   sökningen kostar mindre än de två gjorde, och lägg det sparade på kvaliteten där domaren ser det.
