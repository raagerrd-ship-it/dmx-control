# DMX-arena drop2 – DROP: ägarens drop ska bli drop, i båda sorternas musik

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften; det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell: ditt bygge spelar tre inspelningar genom hela analysatorn och poängsätts av
`tools/arena/dropdom2.py` mot ägarens egna markeringar. Läs domarens filhuvud först – där står mått, poäng och spärrar exakt.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet på en Pi Zero 2 W. Motor: TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Arkitekturen är låst: ANALYSATORN ger all information om
låten, DIRIGENTEN väljer effekt, EFFEKTEN styr ljuset. Analysatorn säger "drop" genom att räkna upp `frame.dropCount`; ljuset svarar
med dropblixten och en ny look. Drop-detektorn är en egen del: `src/analyserDrop.ts` (klass `DropDetector`, 205 rader, når analysatorns
signaler via `this.a.<signal>`). Varför talen är som de är står i `docs/analysator/analyserDrop.md`; kartan över delarna i
`docs/analysator/README.md`.

Ägaren, 2026-11-14: "takt, låtbyte och drop är viktigare" (än uppbyggnad). Takten och låtbytet fick sin arena i går. Drop är det
motorn är sämst på i dag: av ägarens 31 markerade drop i fem inspelningar kallar motorn 10 för drop.

## Vad som är känt (mätt 2026-11-14, övningens tre filer)

- **Dagens kod på övningen** (domarens rader för `bas`):
  - `160345` (kväll 1): 1 av 9 drop, 10 motordrop (9 utan markering), 2 av 11 minidrop kallade drop, drop vid 3 av 3 "inte drop".
  - `151659` (kväll 1): 0 av 5 drop, 2 motordrop, 0 av 9 minidrop kallade drop.
  - `193818` (kväll 2, 29 min): 5 av 9 drop, 12 motordrop (7 utan markering), 1 av 5 minidrop kallad drop, 0 av 3 "inte drop".
- **Ägarens drop är av TVÅ SORTER.** I `160345` och `193818` hålls basen tillbaka länge före droppet (breakdown -> drop). I `151659`
  SPELAR BASEN VIDARE under uppbyggnaden: droppet är en insats efter ett kort fill (längsta baslucka i median 0,9 s, baslyftet bara
  7–29 dB; i breakdown-sorten 21–56 dB och luckor på flera sekunder). Kontrollen innehåller båda sorterna.
- **Inget enskilt mått skiljer drop från minidrop i alla filer.** 21 kausala mått ur sekunderna före varje markering, AUC drop mot
  mini + "inte drop" (1,0 = skiljer helt, 0,5 = slump), per övningsfil `160345` / `151659` / `193818`:

  | mått (8 s före om inget annat sägs) | 160345 | 151659 | 193818 |
  |---|---|---|---|
  | längsta baslucka | 0,79 | 0,47 | 0,78 |
  | basen 8 s före under sitt 60 s-tak (lägre = drop) | 0,26 | 0,60 | 0,24 |
  | arrangemanget före ≠ 10–20 s före | 0,71 | 0,49 | 0,65 |
  | arrangemanget efter ≠ 8 s före | 0,67 | 0,47 | 0,72 |
  | spektrats tyngdpunkt stiger (sista 2 s mot 8–6 s före) | 0,69 | 0,69 | 0,68 |
  | övre banden (500 Hz–16 kHz) sista 4 s mot 16–8 s före | 0,63 | 0,71 | 0,67 |
  | ny topp i hela nivån mot de 25 s före | 0,46 | 0,69 | 0,72 |
  | nivåsteg efter mot före | 0,46 | 0,44 | 0,74 |
  | paus före slaget, tätnande anslag, anslag per sekund | 0,31–0,44 | 0,38–0,46 | 0,19–0,38 |

  Måtten är orkestratorns (förra arenans `tools/natt/arena-2026-11-13-drop1/fore_drop.py`, läser kväll 1:s två filer – båda är
  övning nu; skriv gärna egna). De säger var det INTE räcker att leta, inte vad svaret är.
- **Hur detektorn gör i dag:** FULL DROP PÅ FLANKEN – baskroppens topp har legat minst `FLANK_GONE_DB` under sitt tak i minst
  `FLANK_BREAK_S` (eller kortare med större djup), och droppet fyrar när basen går upp till taket. Det är en ren breakdown-detektor:
  den kan inte se den andra sorten, och den skjuter på varje lång basåterkomst (ny låt som börjar, vers -> refräng). Slam-kandidaten
  utan flank blir minidrop (`miniDropCount`, som ljuset inte läser).
- **Två försök som föll på att övningen bara hade EN sort:** arenan drop1 (90 poäng på `160345`, 0–1 av 5 på `151659`), och
  break-taket (basen borta ≥ 8 slag = ingen drop: 2 av 9 på kväll 1, men tog 3 av 4 drop på kväll 2 där breaken är 20–48 slag;
  inlagt och borttaget samma dag). Breakets LÄNGD skiljer inte drop från icke-drop.
- **Ägarens ord om facit:** "mina minidrop kan vara på fler ställen än vad jag hinner markera", "vi kan ha missat några" (drop). En
  omarkerad motordrop är alltså inte bevisat falsk – därför väger precisionen lätt (20 av 100) – men nio omarkerade av tio är det.
- **Fönstret:** en träff är motorns drop inom −0,5 .. +1,0 s från markeringens ljudtid. Droppet i `160345` vid 301,6 s ligger på
  kanten (finjusteringen satte tiden ~1 s före den hörbara landningen); räkna inte med det.

## Materialet

- ÖVNING (fritt att spela, mäta och titta på): `tools/ladan-2026-11-13/lang-20261113T160345.wav`, `tools/ladan-2026-11-13/lang-20261113T151659.wav`,
  `tools/ladan-2026-11-14/lang-20261114T193818.wav`, med `<namn>.marks-fin.json` bredvid (fineS = händelsen i ljudet, pressS =
  knapptrycket, skip = feltryck; sorter drop, mini, intedrop, uppbyggnad, latbyte).
- KONTROLL: två inspelningar från kväll 2 som bara orkestratorn kör i finalen. Du får varken spela, läsa, tappa eller lyssna på något
  som heter `lang-20261114T193040.*` eller `lang-20261114T200719.*`, inte heller gamla tappar eller mätfiler av dem
  (`.arena/tap/drop-193040.tap`, `.arena/inlagt/`, `.arena/ladan/`, `.arena/lat1/`) eller skript som läser dem
  (`tools/natt/arena-2026-11-14-drop2/`). Bryter du mot det är du DISK.
- Poängen är 0,5 × medel + 0,5 × SÄMSTA filen. En lösning som lyfter breakdown-filerna men lämnar `151659` på noll vinner inte.
  Bygg en mekanism med ett MUSIKALISKT skäl, inte en tabell: inga tidsstämplar, inga tal trimmade mot enstaka händelser, och varje
  ny gräns ska tåla ±25 % utan att domen på övningen faller ihop.

## Verktygen (drop-delen går att köra FÖR SIG)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. mkdir -p .arena/drop2/<id> && cp -r src .arena/drop2/<id>/src                (din kopia; första gången)
    2. ändra i din kopia (tillåtna filer: se regel 1)
    3. python tools/arena/bygg.py .arena/drop2/<id>                                 -> BYGGT / BYGGFEL
    4. FRIA PROV, sekunder per körning, ingen budget (tapparna i .arena/drop2/tap/, en per övningsfil):
       node tools/ensam.mjs kor .arena/drop2/tap/drop-160345.tap --dist .arena/drop2/<id>/dist --marks tools/ladan-2026-11-13/lang-20261113T160345.marks-fin.json
       (samma med drop-151659.tap och drop-193818.tap + deras marks-fin.json; `--set NAMN=värde` byter en konstant i den kompilerade
       drop-filen utan ombygge – bra för marginalprov)
       Tappen innehåller allt drop-delen läser via `this.a` i dag, plus de här signalerna som du får börja läsa:
       `bandDbRaw` (8 band, dB), `centSmooth` (spektrats tyngdpunkt), `levelCeil`, `hRms`, `kickHit`, `dBpm` (klockans tempo),
       `trackBoundaries` (låtgränsräknaren). Behöver du en signal som inte finns i tappen: gör en egen tapp
       (`node tools/ensam.mjs tappa drop dropStep <övningsfil> .arena/drop2/<id>/<namn>.tap --ut dropCount,miniDropCount --extra a,b,c`,
       en hel körning, 1–3 min) eller räkna den i drop-delen ur det som finns.
       Ensam-körningen SER INTE ÅTERKOPPLING genom andra delar, och ändrar du en ANNAN del än drop-delen gäller tappen inte längre.
       Då gäller bara steg 5.
    5. python tools/arena/dropdom2.py .arena/drop2/<id> --mat                       -> hela analysatorn, tre filer, skriver dropdom2.json (3–6 min, kö)
    6. python tools/arena/dropdom2.py .arena/drop2                                  -> rankingen mot bas

Steg 5 står i KÖ bakom de andra deltagarna (en mätning åt gången) och kan ta 10–40 minuter med väntan: starta den i bakgrunden
(Bash med run_in_background) och arbeta vidare med fria prov tills den är klar; avbryt den inte och starta inte en till under tiden.

Budget: högst 3 domarmätningar (steg 5). Spara var och en direkt (`cp dropdom2.json dropdom2-m1.json`, `-m2`, `-m3`). Fria prov
(steg 4) är obegränsade men kör högst två åt gången. Att läsa och räkna på ÖVNINGENS ljud är fritt (python med numpy/scipy/soundfile:
`C:\Users\richa\Desktop\Claude\lotus-light-link\tools\tempo-facit-pc\.venv\Scripts\python.exe`). Skriv egna små skript i din mapp.

## Låsta regler (bryts de är du DISK, oavsett poäng)

1. Ändra BARA i DIN KOPIA och bara: `analyserDrop.ts` (i första hand), `analyser.ts`, `analyserSection.ts`, `analyserSpectrum.ts`,
   `analyserLevel.ts`, `analyserKick.ts`, `analyserRiser.ts`, `analyserBass.ts`, `analyserCharacter.ts`, `split.ts`, `slowWorker.ts`
   (kör `python tools/analyser_shared.py --write .arena/drop2/<id>/src` om du vill hålla manifestet rätt). Klockan
   (`analyserClock.ts`), låtgränsen (`boundaryDetector.ts`), effekterna, dirigenten och output är låsta. Ramens fält
   (`dropCount`, `miniDropCount` m.fl.) får inte byta betydelse: resten av motorn och lotus läser dem som i dag.
2. Tempot får inte röras: samma tempo som bas under minst 97 % av sekunderna i varje fil (spärren `tempo`).
3. Ägarens 12 s-regel mellan fulla drop (`SHOW_DROP_GAP_MS`) står kvar. Högst 2,0 drop per minut i någon fil (spärren `flod`).
4. Ljuset ska slå NÄR det händer: medianen av |motorns drop − markeringen| bland träffarna högst 0,5 s (spärren `tid`). Du kan
   alltså inte vänta flera sekunder på att se vad som kom efter.
5. Ingen förstärkning av ljudet eller nivån, inga nya absoluta nivågränser (relativt låtens egen nivå, bandets eget tak eller
   släckgränsen `frame.silent`). Inget tal valt för hur ljuset ser ut.
6. Din variant ska vara KODENS STANDARD i din kopia: inga env-rattar i slutlösningen. Konstanter får en kort etikett på raden;
   skälet och mätningen skriver du i `losning.md`, inte som långa kommentarer i koden.
7. Pi Zero 2 W: inga allokeringar per hopp i den snabba vägen (375 hopp/s), inga nya stora buffertar. Kostnaden per hopp får inte
   överstiga 1,5 × bas.
8. Rör aldrig engine/src, engine/dist, engine/tools eller något utanför `.arena/drop2/<ditt-id>/`. Läs inte andra deltagares mappar.
   Inga git-kommandon som ändrar något (ingen commit, stash, checkout, add). Inga länkar/junctions. Inga nätverksanrop.

## Jokern och idébanken

När runda 1 är dömd bygger en joker ihop de delar som vann sina mått – även ur diskade lösningar. Skriv därför i `losning.md` vilken
DEL av din ändring som bär vilket mått i vilken fil. Alla lösningar sparas i idébanken, även förlorarnas.

## Leverans

Skriv `.arena/drop2/<id>/losning.md` (svenska, högst ~500 ord + diffen):
- IDÉN i två meningar: vad som nu gör en landning till ett drop och varför det stämmer MUSIKALISKT i BÅDA sorterna.
- DELAR: en rad per del av ändringen och vilket mått den bär (drop, precision, mini, inte) i vilken fil.
- MARGINALER: varje ny eller ändrad gräns ±25 % – ändras domen på övningen? (tabell; använd `--set` i ensam-körningen)
- SIFFRORNA: din rad ur domaren för varje mätning (m1..m3), per fil, och vad som blev sämre.
- RISKEN: var mekanismen går fel på annan musik (pop utan break, långa taktmixade mixar, tal mellan låtar, låtar som börjar med
  full bas, mycket tyst eller mycket stark inspelning).
- DIFFEN: `git diff --no-index src .arena/drop2/<id>/src` (hela, den ska kunna appliceras).
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
