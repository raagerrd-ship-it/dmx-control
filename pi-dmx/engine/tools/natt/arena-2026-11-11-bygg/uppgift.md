# DMX-arena bygg – analysatorn ska höra uppbyggnaden och följa sektionen

Du är en av 4 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET längst ner i din brief.
Domaren är BÄNKEN, inte en människa eller en modell: din variant byggs och mäts av `tools/arena/tvavagar.py` (analysatorns domare).
Läs dess filhuvud – där står måtten, poängen, mängderna och spärrarna exakt.

## Riggen och målet

Pi-DMX: 4 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Motor: TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Samma analysator (byte-identiska filer analyser.ts, split.ts,
slowWorker.ts, analyserClock.ts) kör också i "lotus" (en LED-remsa, mic). Ägarens ord, ordagrant:

> "mitt önskemål var att köra en analysator, för att på bästa sätt analysera låten (långsamt och snabbt). Den skall inte styra ljuset
>  enbart analysera. Sen skall effekten styra ljuset."
> "analysatorn skall ju enbart analysera inte styra hur lamporna lyser. Så att öka något 8 sekunder osv hör inte hemma i en analysator."
> (om en dal som återhämtar sig inom slaget och därmed formar ljuspulsen:) "Det är ju en ljusstyrning och inte låtanalys?"

UPPGIFTEN har två delar, båda i analysatorn:
1. UPPBYGGNADEN. `frame.buildUp` (0..1) ska leva: stiga under uppbyggnaden före en höjning (refräng/drop) och ligga lågt annars.
2. SEKTIONEN. Etiketten `frame.section` ska följa musiken: bli 'high' snabbt när musiken höjs, lämna 'high' när den faller, utan att
   fladdra.

## Vad som är känt (mätt 2026-11-11, basens rad i domaren)

- `bygg` 1,38: frame.buildUp x 100 är i snitt bara 1,4 enheter högre de 4 s före ljudets nivåskiften uppåt än i resten av musiken –
  fältet är i praktiken dött (max 0,17 på 115 min ladanmaterial). Koden: `src/analyser.ts` ca rad 3015–3036 (`inRiser`: momentana
  trösklar på nyhet/centroid/nivå -> buildUp rampar 3,5 s upp / 1 s ner).
- EFTERSOM FÄLTET ÄR DÖTT räknar effektsidan eget: `src/effects.ts` `buildProg` (ca rad 2020–2030: slag sedan sektionen blev 'build'
  delat med 32) och `ctx.buildUp = max(frame.buildUp, buildProg)`; dirigentens `inBuild` (ca rad 1129) läser `inRiser`,
  `buildUp > 0,35` eller `section === 'build'`. Det är musikmätning på fel sida.
- `upp_s` 15,35 s: etiketten blir 'high' i median 15 s efter ljudets nivåskifte uppåt (miss räknas 20 s) – den stora bristen.
  `ned_s` 2,65 s, `traff` 75 % (andel skiften etiketten följer inom 20 s), `korta` 34 % (andel sektionsdelar under 8 s).
  Koden: `src/analyser.ts` sektionssteget ca rad 1200–1310 (rangfönster, uppehållstider 4–8 s, hållregler) och `predictHigh`
  (`expectHighInMs`); sektionen räknas i den LÅNGSAMMA vägen (workern, slowWorker.ts/split.ts).
- I lotus mättes i dag 12 s 'high' genom ett tyst parti.
- NYTT I KVÄLL (finns i ramen, får användas): `bassEnergy`/`bassEnergyShort` (basens nivå under frasens/taktens tak),
  `bassLevel` (partiets bastak mot refrängens), `beatTrust`. Klockan: `bpm`, `bpmConfidence`, `beatPhaseMs`, `barShift` (ettan).
  Övrigt: `onset.*` och `drum.*` per band, `specAbs`, `centroid`, `intensity`, `levelVsHighDb`, `sectionBars`, `repeatSim`.

## Kraven (bryts de är du DISK, oavsett poäng)

1. ANALYSATORN MÄTER, EFFEKTEN STYR. Inget i analysatorn får finnas till för ljusets skull: inga ramper/uttoningar/hålltider valda
   för hur ljuset ska se ut, ingen kurva, inget som vet vad en lampa är. Testfrågan för varje tal du lägger in: "är det valt för hur
   ljuset ser ut?" – då hör det hemma på effektsidan. Tider som beskriver MUSIKEN (slag, takter, fraser ur klockan; hur länge ett
   mönster måste ha hållit för att räknas) är analys. `buildUp` ska vara en mätning (hur tydlig/hur långt gången uppbyggnaden är),
   inte en ljusramp. Orkestratorn granskar vinnarens kod mot detta.
2. EFFEKTSIDAN MÄTER INTE MUSIKEN. När `frame.buildUp` lever ska `buildProg` bort ur `effects.ts`; `ctx.buildUp` och dirigentens
   `inBuild` läser analysatorns fält. Hur ljuset ska bete sig under en uppbyggnad är effektens sak och får ligga kvar.
3. Befintliga fält får du ändra BARA där uppgiften kräver det: `buildUp`, `inRiser`, `section`, `sectionAgeMs`, `sectionIndex`,
   `sectionTier`, `prevSection`, `expectHighInMs`, `levelVsHighDb`, `sectionBars`. Tempo, klocka, etta, drops, kick, nivåer och
   låtgräns ska vara orörda (domarens övriga mått ska stå på +0,0). Nya fält får läggas till. Inga nya objekt per hop.
4. Domarens spärrar gäller som de står i filhuvudet: bl.a. upp_s/ned_s får inte bli sämre än bas (+0,1 s), ljusdomaren får inte gå
   under -0,5 när ljusets md5 ändras, workerns taktväg p99, CPU-budgeten.
5. Tillåtna filer i DIN KOPIA: `src/analyser.ts`, `src/split.ts`, `src/slowWorker.ts`, `src/analyserClock.ts`, `src/effects.ts`,
   `src/effects/*.ts`. Allt annat (output.ts, config, index.ts, beatFeed, profilen, tools/) är förbjudet.
6. Snabbare fade-down är förbjudet, strobe högst 3 blixtar/s, inget mot vitt. Din variant ska vara KODENS STANDARD (ingen
   env-flagga); ersätt, lägg inte till lager.
7. Rör aldrig engine/src, engine/dist, lotus-light-link eller något utanför `.arena/bygg/<ditt-id>/`. Läs inte andra deltagares
   mappar. Inga git-kommandon som ändrar något. Inga länkar/junctions. Döda aldrig processer brett (ingen `taskkill /IM ...`).
   Kör ALDRIG `--bas`-mätningar och rör inte `.arena/bygg/bas` eller `kopia`.

## Vad som avgör

`tools/arena/tvavagar.py`: poäng = 0,6 x medel av 18 kvalitetsmått (% mot bas) + 0,4 x latens. Dina mått är `bygg`, `upp_s`, `ned_s`,
`traff`, `korta`; de övriga 13 ska stå still. Finalen döms på en kontrollmängd du aldrig får mäta mot.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r src .arena/bygg/<id>/src                               (din kopia; första gången)
    2. ändra i .arena/bygg/<id>/src/ (bara de tillåtna filerna)
    3. python tools/arena/bygg.py .arena/bygg/<id>                  -> BYGGT / BYGGFEL
    4. python tools/arena/tvavagar.py --mat .arena/bygg/<id>        -> tvavagar.json (kö: en mätning åt gången, ~8 min + väntan)
    5. python tools/arena/tvavagar.py .arena/bygg                   -> rankingen mot bas

Budget: högst 3 mätningar (steg 4). Egna sonder som BARA kör analysatorn på övningsfilerna (lang1021, pop_ladan, megamix_ladan,
lang-20261011T191741 – se MÄNGDERNA i filhuvudet; t.ex. ett eget node-skript efter mönstret i `tools/arena/tvavagarKor.mjs` jobb
`lang`, eller `tools/arena/basenergi.mjs`) är fria och går utanför kön – använd dem för att välja vad som är värt en mätning.
Kontrollmängden (lang1014, lang1107 m.fl. under KONTROLLMÄNGDEN) får du ALDRIG köra mot. Bänken är deterministisk. Grep-verktyget
fungerar inte på maskinen (rg saknas): använd Bash med grep/sed. Kör mätningen med Bash-verktyget med timeout 600000 ms eller i
bakgrunden och vänta på den. TID: arenan ska vara klar inom ca två timmar – fastna inte; leverera din bästa mätta variant.

## Leverans

Skriv `.arena/bygg/<id>/losning.md` (svenska, högst ~500 ord):
- IDÉN i två meningar per del (uppbyggnaden, sektionen): vad som mäts och varför det är en bättre analys.
- VAR SNITTET GÅR: vilka tal som ligger i analysatorn och varför de beskriver musiken; vad som togs bort ur effects.ts.
- DIFFEN: `git diff --no-index src .arena/bygg/<id>/src` (hela, ska kunna appliceras).
- SIFFRORNA: din rad ur domaren (alla 18 mått), ljusdomaren om md5 skiljer, och vad som blev sämre.
- RISKEN: var varianten kan bete sig sämre i ladan än bänken visar.
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
