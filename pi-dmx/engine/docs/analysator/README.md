# Analysatorn - karta

Uppdelad 2026-11-14 (ägaren: "bryt ut del för del, flytta ut alla kommentarer"). Samma beteende som före uppdelningen, bevisat
ruta för ruta. Koden har bara korta etiketter; allt som stod i kommentarerna ligger ordagrant i `<fil>.md` här bredvid.

## Delarna

| fil | klass, fält på analysatorn | vad den gör | steg | rader |
|---|---|---|---|---|
| `analyser.ts` | `Analyser` | ordningen: vilka steg som körs, i vilken tråd, ramen ut, delningen snabb/långsam | `process`, `fillFrame` | 1 057 |
| `analyserFack.ts` | | facken: rattarna, de delade konstanterna, `stabilise`, typerna och facken (`HopOut`; flytten 2026-11-21) | | 53 |
| `analyserClock.ts` | `BeatFeed` | TAKT: tempo, rutnät, etta, tillit | `update` | 493 |
| `boundaryDetector.ts` | `BoundaryDetector` | LÅTBYTE: tystnad och låtens form (bara DMX) | `tick`, `pushSpectrum` | 276 |
| `analyserDrop.ts` | `DropDetector`, `drop` | DROP: flanken, slam-kandidaten, minidrop, lyft/nästan-drop/stopp | `dropStep` | 208 |
| `analyserSection.ts` | `SectionTracker`, `sections` | sektioner: block, rang, upprepning, förutsägelse | `sectionHop`, `sectionAggStep` | 357 |
| `analyserSpectrum.ts` | `SpectrumBands`, `bands` | snabba banden per hopp, stor-FFT:ns band, flöde, onsets | `fastBandStep`, `bigStep` | 174 |
| `analyserLevel.ts` | `LevelTracker`, `levels` | nivå: AGC, tystnad, intensitet, nivåtak och topp-zon | `hopStep`, `rates` | 137 |
| `analyserKick.ts` | `KickDetector`, `kicks` | anslag i snabba vägen och kickens förfining | `hopStep` | 106 |
| `analyserRiser.ts` | `RiserDetector`, `riser` | uppbyggnad: riser och buildUp (låg prio, ägaren 11-14) | `riserStep` | 48 |
| `analyserBass.ts` | `BassTracker`, `bass` | basenergin per slag, basgången | `bassEnergyStep`, `stepBassline` | 49 |
| `analyserCharacter.ts` | `CharacterProfile`, `character` | låtens långsamma karaktärsprofil | `profileStep` | 37 |
| `split.ts`, `slowWorker.ts` | | rörledningen mellan snabba tråden och arbetstråden | | 330 |

En del når analysatorns delade signaler via `this.a` (t.ex. `this.a.lvlSmooth`); analysatorn och de andra delarna når delen via
dess fält (t.ex. `this.drop.dropCount`). Det en del läser via `this.a` ÄR dess insignaler.

## Gå igenom en analys för sig

1. Läs filen (kort, utan historik) och `docs/analysator/<fil>.md` för varför talen är som de är.
2. Kör den ensam på en inspelning - en tappning av insignalerna, sedan uppspelning på en dryg sekund:

       node tools/ensam.mjs tappa drop dropStep tools/ladan-2026-11-13/lang-20261113T160345.wav .arena/tap/drop-160345.tap --ut dropCount,miniDropCount
       node tools/ensam.mjs kor .arena/tap/drop-160345.tap --marks tools/ladan-2026-11-13/lang-20261113T160345.marks-fin.json
       node tools/ensam.mjs kor .arena/tap/drop-160345.tap --set FLANK_ROOF_BEATS=12 --marks ...

   Utan `--set` ska uppspelningen säga IDENTISK med hela analysatorn. `--set` byter en konstant i en tillfällig kopia (src och dist
   rörs inte). Återkoppling genom andra delar följer inte med: bekräfta ett valt värde med en hel körning.
3. Livstecken för alla signaler i ramen (död signal = aldrig ändrad efter insvängningen):

       node tools/livstecken.mjs tools/ladan-2026-11-13/lang-20261113T160345.wav [...]

## Ändra

- Beteendeändringar görs som förr (en i taget, mätt mot samma baslinje). Skriv varför i `docs/analysator/<fil>.md`, inte i koden.
- Ren omflyttning ska bevisas: `bash tools/refaktor/bevis.sh` jämför varje fält i varje ruta mot ett fryst bygge
  (`.arena/ref/dist0`, taggen `backup/fore-uppdelning-20261114`) och DMX-utgångens md5; `bash tools/refaktor/kommentarbevis.sh`
  visar att bara kommentarer/blanktecken ändrats. Bryta ut mer: `tools/refaktor/brytut.mjs` med en fil i `tools/refaktor/delar/`.
- Filerna är gemensamma med lotus-light-link (`pi/src/audio-analyser/`, samma byte, 13 filer i `ANALYSER_SHARED.md5`).
  DMX är källan; lotus portas efteråt. Anteckningarna finns bara här.

## Mätt vid uppdelningen

- 537 981 hopp på tre inspelningar: varje fält i varje ruta lika, odelad och delad analysator; DMX-md5 lika; lotus-bygget lika (odelad).
- Tid per hopp på PC:n oförändrad (66-95 us beroende på last, samma före och efter i varje parvis mätning). EJ mätt på Pi:n.
