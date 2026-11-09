# Arenan analys 2026-11-09: ANALYS UT UR MOTORN (första steget)

**Ägaren:** "Analysatorn skall ju ge all information om låten till dirigent/effekt. Dirigent skall ju välja rätt effekt och effekten skall
enbart styra ljuset såsom den effekten vill."

**Domaren:** tvavagar.py (övning + kontroll) med ljusdomaren (lampspr på medlet). Finalspärren: det som flyttats räknas inte i effects.ts.

**Körningen:** runda 1 med 8 deltagare, pausad 09:00 för EN KLOCKA FÖR BÅDA. r0 byggdes på den nya basen e047c6f. Final med två finalister, sedan kombinationsgranskning.

**Vinnaren är r0 = a3 + a7, nu KOD.** Backup-tagg `backup/fore-analys-20261109`. Motorns DMX-md5 är densamma som r0:s (hela megamix 9bf54cd187…).
- **EN dropdetektor (a3):**
  - Effekternas flankStep ligger nu i analysatorns dropStep (analyser.ts ~2906/2914), med 12 s-spärren.
  - Den gamla dropen blir kandidat. Om ingen flank kommer inom 2 s blir den minidrop.
  - Nästan-drop, energilyft och basstopp mäts i analysatorn (liftStep ~2932) och publiceras i ramen: nearDropDb/nearDipDb, liftDb, stopCount/stopS.
  - effects.ts läser bara ramen. Dropens längd, uttoning och efterkontroll stannar i effekterna.
- **EN tystnad (a7):**
  - frame.silent = level ≤ cfg.silenceLevel (analyser.ts ~3058). INPUT_OFF_LEVEL 0,02 och de fyra fönstergrindarna är borta.
  - Brusgrinden räknas en gång (~2152). Workern läser activeMs > 0 i stället för sin gamla cfg-kopia.

| | övning | kontroll |
|---|---|---|
| r0 | +4,32 (drop_falska 5,71→0, ned_s 3,00→1,90, ljus +0,02) | +0,15 utan DISK, ljus +4,3 |
| d-tyst (a7 ensam) | – | +0,15, ljus +4,3 |
| d-drop (a3 ensam) | (a3 runda 1: +3,53) | +0,00, ljus −0,0 |

**Kombinationen:** d-tyst ensam ger hela kontrollpoängen. d-drop är neutral på kontrollmängden men bär övningen (drop_falska 5,71→0) och är arkitekturmålet (en detektor). Oavgjort på kontrollmängden avgjordes därför av övningen: båda behålls.

**Förkastat:**
- a2: dropStep ensam gav ljus −4,7.
- a4: basen ur de snabba banden gav upp_s 3,80.
- a6: sektionsenergin gav lampspr −30 %.
- a5: basnotsräknaren gav latens +5 ms på r0.
- a3f D1: sektionen läser klassade drops gav ljus −0,83.
- a7f D1: flankens tystnad = brusgrinden gav lampspr −6,5 %.
- Omätta: a1 och a8 (pausade).

**Fynd:**
- Sektionen tål ingen ändring av dropräknaren åt något håll. Vägen in i refrängen måste kopplas loss från dropCount som en egen mekanism.
- drop_ms 216 beror på facit, inte på detektorn.
- a7f D2 (ingången av = quietMs > 2 s) är neutral på övningen men tar bort risken för mörker före släcktiden. Den bör provas ensam på kontrollmängden.

**Lotus:**
- lotusbank ger 463/503, alltså oförändrat (tempot påverkas inte).
- analyserParity --style lotus mot e047c6f: bara dropCount och miniDropCount avviker (33 317 av 45 000 hop på lang1021 120 s). Lotus bänk avgör (fynd DELAD FIL ÄNDRAD).

**Kvar till nästa arena:** basen som en källa, basnot-anslag, sektionsenergin och sektionens drop-väg.

**Redo för ladan:** `PYTHONIOENCODING=utf-8 PI_HOST=10.171.211.218 python tools/ladan.py`. DMX-ljuset ändras: dropen, nästan-dropen och tystnaden (släckgränsen 0,05 i stället för 0,02).
