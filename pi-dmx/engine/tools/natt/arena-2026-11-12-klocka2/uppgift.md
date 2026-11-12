# DMX-arena klocka2 – analysatorns klocka ska hålla EN tempotolkning genom en låt

Du är en av 5 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET längst ner i din brief.
Domaren är BÄNKEN, inte en människa eller en modell: din variant byggs, körs genom den riktiga analysatorn mot inspelningar och
poängsätts av `tools/arena/klockdom.py`. LÄS DOMARENS FILHUVUD – där står måtten, golven, spärrarna, json-formatet (per fil) och
hur du kör fria sonder exakt.

ENGINE = `C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine`.

## Ägarens ord (2026-11-12, ordagrant)

> "Det borde gå till en arena i natt. Hur förbättrar vi analysatorns klocka"

Bakgrund: EN delad analysator (TypeScript) går i två system – DMX-riggen i ladan (partylampor) och lotus (stämningsljus i en källare).
Båda läser tempo, rutnät och tillit ur analysatorns klocka. I lotus väljs sedan i dag fade in, lead och fall ur klockans tempo.
Mätt i källaren 11-12 ~13:30: på en låt växlade klockan 94 <-> 126 BPM (förhållandet 4:3) ungefär var 10:e sekund med låsningen
av/på -> leaden hoppade 128 <-> 96 ms och falltiden ~2200 <-> ~1540 ms. Tidigare samma dag: tempot hoppade 81–150 med låsning ~35 %
på en lugn låt. Tempovalen blir aldrig stadigare än tempot.

## UPPGIFTEN

Klockan i den delade analysatorn ska hålla EN tempotolkning genom en låt:
1. Färre växlingar mellan syskontempon (4:3, 3:4, 3:2, 2:3, dubbla, halva) inom en låt.
2. Rätt tolkning oftare (lotusbankens 4/3- och 3/2-fel).
3. Utan att låsningen efter låtbyte eller vid svaga låtstarter blir långsammare.

Analysatorn MÄTER bara: ingen utjämning som finns till för ljusets skull. En hållregel ska kunna motiveras som musikanalys
(takter/fraser ur klockan, bevis över tid).

## Vad som är känt (mätt, bas = engine/src i dag)

- lotusbank 463/503 rätt. De 40 felen: 4/3 = 16, annat = 14, 3/2 = 7, dubbla = 2, halva = 1. Syskontempon (4:3 och 3:2) är 23 av
  40 fel – samma familj som växlingen i källaren. Syntet 6/8 (2 dubbla).
- DMX: utflykter 1,00/min, tid i utflykt 2,93 % (127,6 min; tools/tempoHoppDiag.mjs + tempoHoppUtflykt.mjs, mängderna i
  tools/natt/flerhypotes-2026-11-10.md). Analysdomaren: mix_klocka 97,9 / 83,4 % (övning / kontroll), mix_hopp 0 / 0,67 per min,
  mix_las 2,78 / 3,02 s, mix_still 2,93 / 3,72 s, klipp_klocka 98,3 / 85,8 %.
- Förra försöket fh1 (139 hypoteser med bevissumma, `prov/flerhypotes-fh1-20261110.patch`, rapporten
  `tools/natt/flerhypotes-2026-11-10.md`): utflykter 1,00 -> 0,26/min, lotusbank 468, men FÖLL på svaga låtstarter (kallstart kontroll
  6,5 -> 10,8 s), mix_still kontroll 3,72 -> 8,51, ned_s sämre. Lärdom: flaskhalsen är BEVIS vid svaga låtstarter; varje regel som
  sänker ribban när regenten ser död ut släpper in utflykterna igen. (Patchen är gjord före dagens städning av analyser.ts –
  radnumren stämmer inte, applicera för hand.)
- Källarinspelningarna: `.arena/klocka2/kallaren/v-*.wav` (150 s, 48 kHz mono) + `.csv` med motorns tempo varje sekund live.
  Övningsklippen står i `.arena/klocka2/kallaren/urval.json`; kontrollklippen får du INTE spela.
- Korpusfiler där basens klocka spänner över ett syskontempo inom klippet: listan ligger i `.arena/klocka2/bas/` (se domarens huvud).

## KARTAN över levande tempokod – läs `tools/natt/arena-2026-11-12-klocka2/KARTA.md`

- ALL temposökning bor i `src/analyserClock.ts` (tgStep, tgScore, peakVote, peakScore, onsetStep). `analyser.ts` har ingen levande
  temposökning (död kod städades bort 16:42 i dag; kartans radnummer i analyser.ts är förskjutna, klockfilens stämmer).
- Tempovalet läser basens dB-stigning och diskantens onset, INTE kickarna. Kickarna styr tilliten, utrullningen och upptaget efter
  break; klockans rutnät styr i sin tur kickgrinden och kickspärren i analyser.ts.
- Båda systemen kör samma klocka i workern via taktvägen; det som skiljer är vem som matar (DMX index.ts, lotus analyser.ts +
  publishPhase). lotusbank.py mäter den ODELADE vägen (klockan i process()) – den koden får inte tas bort.
- SIL_CLEAR_PENDING står som 1 i båda profilerna men enda läsaren ligger i en onåbar gren – inte arenans sak att laga.

## Låsta regler (bryts de är du DISK, oavsett poäng)

1. Ändra BARA i DIN KOPIA: `src/analyserClock.ts`, `src/analyser.ts` (tempodelen: tempogram, kandidater, taktmatning),
   `src/split.ts`, `src/slowWorker.ts`. Inte effects.ts, inte output.ts, inte profilen (analyserProfile.ts), inte tools/.
2. Övriga fält i ramen ska vara orörda (sektion, drop, kick, nivåer). Finalisterna körs genom tvavagar.py: övriga mått ska stå på
   +0,0, upp_s/ned_s och andelen 'high' inom spärrarna, workerns taktväg p99 och kostnad inom budget.
3. Inga nya objekt per hop i heta loopar (granskas i finalen). Pi Zero 2 W: minnet är det trånga, inte cpu.
4. Kodens standard, inga flaggor, inga env-rattar, inga nya profilvärden.
5. Ingen utjämning för ljusets skull (se UPPGIFTEN). Ingen andra källa till tempo/tillit – EN klocka.
6. Rör aldrig engine/src, engine/dist, lotus-light-link (läses bara av verktygen) eller något utanför `.arena/klocka2/<ditt-id>/`.
   Läs inte andra deltagares mappar. Mät aldrig kontrollmängden (`--holdout`, `--final`). Inga git-kommandon som ändrar något
   (ingen commit, stash, checkout, add). Inga länkar/junctions.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. mkdir -p .arena/klocka2/<id> && cp -r src .arena/klocka2/<id>/src        (din kopia; första gången)
    2. ändra i .arena/klocka2/<id>/src/ (tillåtna filer ovan)
    3. python tools/arena/bygg.py .arena/klocka2/<id>                -> BYGGT / BYGGFEL
    4. python tools/arena/klockdom.py .arena/klocka2/<id> --mat      -> skriver klockdom.json (kö: en mätning åt gången)
    5. python tools/arena/klockdom.py .arena/klocka2                 -> rankingen mot bas

Budget: högst 3 mätningar (steg 4). Egna sonder som bara kör klockan på ÖVNINGSFILERNA (se domarens huvud: DMX_DIST=<din mapp>/dist
med tempoHoppDiag.mjs, kallarspel.mjs på övningsklippen m.m.) är fria – använd dem flitigt innan du bränner en mätning, men kör
högst EN sond åt gången (maskinen delas med fyra andra deltagare och domarens kö). Bänken är deterministisk (virtuell klocka):
samma kod = samma siffror. Mätningen körs med Bash-verktyget; tar den längre än 10 min, kör den i bakgrunden (run_in_background)
och vänta på notisen – polla inte.

## Leverans

Skriv `.arena/klocka2/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: vilken mekanism som håller tolkningen och varför den är musikanalys och inte utjämning.
- SIFFRORNA: din rad ur domaren (alla mått), och vad som blev sämre.
- VAD SOM INTE GICK och varför (förkastade försök med siffror).
- RISKEN: var varianten kan bete sig sämre live än bänken visar (svaga starter, låtbyten, break, tystnad, lotus-profilen).
Spara också diffen: `git diff --no-index src .arena/klocka2/<id>/src > .arena/klocka2/<id>/<id>.diff` (ska kunna appliceras).
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
