# Strategikort, arenan grans (olika MEKANISMER, inte olika värden på samma ratt)

g1 SEKTIONEN INNE I REFRÄNGEN: detektorn delar i dag bara låg/hög energi. Låt SectionTracker se en ny del även när nivån står still
   (klang, täthet, basgång), som en egen sektionsgräns med samma etikett (high -> high), så att manuset/dirigenten byter look.

g2 BASGÅNGEN BYTER: en ny del byter ofta basgång (mönster, tonhöjd, rytm) utan lucka. Bygg ett vittne på basgångens mönster per takt
   (analysatorns basdel/kick) som jämför de senaste takterna mot fraserna före.

g3 TÄTHET OCH ANSLAG: verser och refränger skiljer sig i hur många anslag per takt och var i takten de ligger (hi-hat, virvel, synth).
   Mät anslagens mönster per takt och byt när mönstret byter fas, inte nivå.

g4 FRASSTRUKTUR ÖVER FLERA TAKTER: jämför den senaste 4- eller 8-taktsfrasen mot den förra (självlikhet på frasnivå). En ny del =
   en fras som inte liknar de föregående. Bara på frasgränser räknade från ettan.

g5 SÅNG OCH MELODI: mellanregistrets (sång/lead) närvaro och tonhöjd ändras mellan vers och refräng. Bygg vittnet på mellanbandets
   spektrala form (ej nivå), relativt låten.

g6 DROPEN SOM INTE BLEV DROP: 5 av 14 drops och 5 drop->refräng missas. Ta reda på varför (analysatorns drop/minidrop/riser-fält vid
   just de gränserna) och låt dirigenten byta på de signaler som redan finns, utan att röra analyserDrop.ts.

g7 SPEKTRAL TYNGDPUNKT OCH BREDD: ett långsamt vittne (centroid, spektral flathet, stereobredd om den finns) som mäter klangfärgens
   flytt över 2-4 takter; byt när flytten är stor relativt låtens egen spridning.

g8 DIRIGENTEN SOM LYSSNAR LÄNGRE: bara effects.ts. Använd analysatorns befintliga fält (intensity, sectionTier, profile, kickfält,
   bodyDb ...) i dirigenten: när en tydlig förändring syns över två takter på ettan, utan sektionsbyte, byt till nästa manus-look.
   (Obs regel 1: räkna inte en egen sektionsanalys - läs fält, kombinera dem enkelt.)
