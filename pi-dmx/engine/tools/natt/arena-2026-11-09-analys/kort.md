# Strategikort – analys (en MEKANISM/DUBBLETT per kort; METODEN: A, B och sammanslagning bänkas, bänken väljer)

a1 DROP A – EFFEKTERNAS FLANK: flankStep (det ljuset kör i dag) blir den enda dropdetektorn, flyttad in i analysatorn som dropCount/
   miniDropCount; analysatorns dropStep tas bort. Dropens längd/uttoning/lyftform stannar i effekterna.
a2 DROP B – ANALYSATORNS dropStep: analysatorns egen detektor blir den enda; effekternas flankStep tas bort och ljuset läser ramen.
a3 DROP SAMMANSLAGNING + LYFT/NÄSTAN-DROP: EN detektor i analysatorn med det bästa ur flank och dropStep, och lyft/nästan-drop som
   analysatorns signaler (VAD + styrka) i ramen; effekterna formar bara reaktionen.
a4 BASEN – EN KÄLLA: snabba banden, bodyDb och frame.energy slås till EN bas i analysatorn (bodyDb som transform av den); alla
   konsumenter (energi, drop/lyft, punch, registerKick) läser den.
a5 BASNOT-ANSLAG: EN anslagsräknare i analysatorn (stepBassline, effekternas bassNoteIdx, klockans basgångsstigning) publicerad i ramen;
   basgångens tydlighet = dess takt per slag.
a6 SEKTIONSENERGI: "lugnt"/energinivån EN gång i analysatorn (tierEma, subdivEnergy, section/sectionTier/secPct) – dirigenten läser
   ett kontinuerligt mått ur ramen.
a7 TYSTNAD: EN tröskel (cfg.silenceLevel) i analysatorn – brusgrinden på ett ställe, workerns cfg-kopia uppdaterad, INPUT_OFF och
   boundaryDetectors tystnad läser samma flagga i ramen.
a8 MINSTA DIFF HELA LISTAN: allt låtanalytiskt ut ur effects.ts med minsta möjliga ändring – varje rad ska bära ett mått eller ta bort
   en dubblett.
