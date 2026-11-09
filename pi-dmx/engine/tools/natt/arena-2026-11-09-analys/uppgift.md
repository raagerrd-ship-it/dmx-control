# DMX-arena analys – ANALYS UT UR MOTORN

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften; det enda som skiljer er åt är STRATEGIKORTET längst ner i din brief.
Domaren är BÄNKEN: `tools/arena/tvavagar.py` (läs filhuvudet HELT – måtten, spärrarna, tilläggen (a)-(d), Pi-budgeten, kontrollmängden)
med ljusdomaren `tools/arena/domare.py` v3 (lampspridningen döms på MEDLET över filerna sedan 11-09).

## Riggen och målet
Pi-DMX: 4 RGB-parlampor i en lada, allt i realtid ur aux-ljudet på en Raspberry Pi Zero 2 W. Motorn: TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Ägarens ord, ordagrant:
> "Analysatorn skall ju ge all information om låten till dirigent/effekt. Dirigent skall ju välja rätt effekt och effekten skall enbart
>  styra ljuset såsom den effekten vill."
> "alla dubletter måste det ju analysera vilken är bäst eller är en ihopslagning bäst. För att sen bara köra en"
> "Bättre att den drar mer cpu om latens kan hållas nere och analysen är bättre" / "Vi har ju denna pi zero 2w enbart till denna app."

UPPDRAGET (todo.md): allt LÅTANALYTISKT i src/effects.ts flyttas in i analysatorn och publiceras i ramen:
- drop (flankStep i effects.ts ~811 är en andra dropdetektor bredvid analysatorns dropStep ~3485 – EN detektor; bänkens drop-mått läser
  frame.dropCount/miniDropCount, så den enda detektorn ska publiceras där)
- lyft och nästan-drop
- basen (en källa: i dag snabba banden till energin, bodyDb till drop/lyft, frame.energy till punch/registerKick)
- basnot-anslag (stepBassline i analysatorn, bassNoteIdx i effekterna, basgångsstigningen i klockan)
- sektionsenergi ("lugnt" definieras tre gånger: tierEma, subdivEnergy, section/sectionTier)
- tystnad (EN tröskel = cfg.silenceLevel; INPUT_OFF_LEVEL 0,02 hårdkodad, brusgrinden på fyra ställen, workerns cfg-kopia uppdateras aldrig)
GRÄNSEN ANALYS/REAKTION: analysatorn säger VAD som händer (drop nu, styrka, break, lugnt, basnot). Dirigenten/effekten bestämmer HUR ljuset
reagerar (dropens längd, uttoning, lyftets form) – det flyttas INTE. Läs granskningen: tools/natt/granskning-2026-11-08-dubbla/dubbel-analys.md
punkt 1-3, 6-7 och dubbel-ljus.md (drop-tillståndets lyftled och klockor).

## Utgångsläget
Bas = HEAD (e451800 + död kod) = arenan entempos vinnare: EN klocka i analysatorn (analyserClock.ts), KRAV EN KÄLLA uppfyllt.
Det ska stå kvar (en temposökning, en tillit, en takträknare, en pulskurva, låtgränsen som enda låtbytessignal).
Läs tools/natt/arena-2026-11-09-entempo/RAPPORT.md – särskilt fynden: sektionsmedianerna är en knivsegg (14/10 skiften), dirigentens lookval
är kaotiskt (ett ändrat tidigt val flyttar alla senare), lampspridning per fil var brus.

## Låsta regler (bryts de är du DISK)
1. Allt i src/ i DIN KOPIA får ändras fritt, även de delade filerna (analyser.ts, split.ts, slowWorker.ts, analyserClock.ts). fft.js byts
   inte. API:t verktygen läser (tvavagar.py-filhuvudet, TILLÅTNA FILER) ska finnas kvar.
2. Snabbare fade-down är förbjudet. Strobe högst 3 blixtar/s. Inget får dra mot vitt. Rör inte uttoningen (DMX_FADE_MIN_S) eller output.ts
   kalibrering. Ljusmängden är inget kriterium.
3. md5 skiljer -> ljusdomaren måste vara >= bas −0,5 utan spärrar (annars DISK).
4. Pi-budgeten: worker p99 <= X, workerns kostnad <= 130 µs/hop PC, inga nya objekt per hop i heta loopar.
5. Varianten är KODENS STANDARD i din kopia (ingen env-flagga). KRAV EN KÄLLA ska stå kvar.
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/analys/<ditt-id>/`. Läs inte andra deltagares mappar. Inga git-kommandon
   som ändrar något, inga länkar. Skriv aldrig i lotus-light-link. Kör aldrig tsc --rootDir mot huvud-tsconfig – använd bygg.py.
7. FINALSPÄRR: orkestratorn granskar i koden att det din variant flyttat inte längre räknas i effects.ts (fil:rad i losning.md).

## Arbetsgång
    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine ; export PYTHONIOENCODING=utf-8
    1. cp -r src .arena/analys/<id>/src
    2. ändra i .arena/analys/<id>/src/
    3. python tools/arena/bygg.py .arena/analys/<id>
    4. python tools/arena/tvavagar.py --snabb .arena/analys/<id>      (fri, ~1 min)
    5. python tools/arena/tvavagar.py --mat .arena/analys/<id>        (kö, ~8-10 min + väntan)
    6. python tools/arena/tvavagar.py .arena/analys                   (rankingen)
Budget: högst 3 mätningar (steg 5) + högst 6 egna körningar av rytm.py/konsertReplay.mjs/dropFacit.mjs på andra inspelningar än
kontrollmängden (aldrig lang-20261028T180531, lang-20261014T161434, lang-20261011T130600, lang-20261107T154200). Egna korta skript (< 60 s ljud) fria.

## Leverans
`.arena/analys/<id>/losning.md` (svenska, ~500 ord): IDÉN i två meningar; tabellen FLYTTAT (vad, från effects.ts fil:rad, till analysatorn
fil:rad, ramens fält); DUBBLETTEN (A / B / sammanslagning – vad du valde och siffrorna); SIFFRORNA (domarens rad, ljusdomaren, spärrar);
workerns µs/hop och allokering; RISKEN. Diffen: `git diff --no-index src .arena/analys/<id>/src > .arena/analys/<id>/losning.diff`.
Svara sist: `KLAR <id> poäng <x> <DISK eller OK>`.
