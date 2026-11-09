# DMX-arena klocka – EN KLOCKA FÖR BÅDA (DMX och lotus)

Ni är 8 deltagare med exakt samma uppgift. Det enda som skiljer er åt är STRATEGIKORTET längst ner i briefen.

Två bänkar dömer:
1. **DMX-domaren** `tools/arena/tvavagar.py`. Läs filhuvudet helt: tilläggen (a)–(d), Pi-budgeten och lampspridningen på medlet.
2. **LOTUS-domaren** `tools/arena/lotusbank.py`. Läs filhuvudet: lotus tempobänk på 503 fryst korpus, syntet och on-beat/fas.

## Ägarens ord (09:00), ordagrant
> "Kan vi inte samma där. Jämför delarna, och kolla vad som fungerar bäst. Skapa sedan en enda. Känns jättedumt som vi sagt hela kvällen
>  att köra två olika funktioner för samma sak som vi försöker förbättra och vet inte vilken som blivit förbättrad."
> "alla dubletter måste det ju analysera vilken är bäst eller är en ihopslagning bäst. För att sen bara köra en"

## Läget (HEAD i dmx-control, se git log)
Den delade analysatorn (analyser.ts, split.ts, slowWorker.ts, analyserClock.ts) har i dag TVÅ tempovägar. Valet görs av `OWN_TEMPO`
(analyser.ts:49 = `clockMode() === null`, alltså profilens sys.BEAT_FEED):

**A = lotus väg**, BEAT_FEED saknas:
- analysatorns egen sökning (computeBpm, scoreEnv/alignScore/shiftDetect, tempoGramStep, offBeatStep, evidens, UP43/FIVE4/SHIFT/HOLD i lotus
  LIVE, se lotus-light-link/tools/tempo-facit-pc/nightly.py:12);
- skuggrutnätet och lotus gridfas;
- lotus läser `frame.bpm`/`beatAnchorMs` och matar `setBeatGrid`.

**B = DMX-klockan** analyserClock.ts, BEAT_FEED 'slow'/'inline':
- tempogram med två minnen, rise-rutnät, taktmodellens etta;
- tillit = repeatRate × tgClear;
- låtgränsen via H_BOUND → relock().
Det är arenan entempos vinnare. Läs tools/natt/arena-2026-11-09-entempo/RAPPORT.md.

Uppmätt av huvudchatten med tvavagarKor klipp/mix:
| | lotus (A) | DMX (B) |
|---|---|---|
| övning, klipp | 97,7 % | 98,3 % |
| övning, mix | 96,4 % | 97,2 % |
| kontroll, klipp | 84,9 % | 84,3 % |
| kontroll, mix | 83,2 % | 82,4 % |
Båda får 0 % på hannes-aitman-hopeless-nights, möjligen fel i facit.

Lotus-domarens baslinje för A och för B (lotus profil + BEAT_FEED inline) står i `.arena/klocka/baslinje.md`.

## MÅLET
EN klocka i den delade analysatorn som BÅDA profilerna kör.
- OWN_TEMPO-vägen eller lotus egen sökning tas bort, eller klockan tas bort om A vinner del för del. Det får inte finnas två tempovägar kvar.
- Profilerna får skilja sig BARA i konsumenterna (lotus BLE-tick/beatLeadMs/setBeatGrid-användning, DMX:s effekter), aldrig i klockan.
- Delarna att jämföra:
  - tempovalet (klipp/mix %, oktav, 2:3, 4:3, 5:4)
  - låsning och tempohopp
  - fasen (gridfel, grid40, lotus on-beat/fas)
  - ettan
  - tillitens informationsvärde
  - break/coast
  - omlåsning vid låtgräns
- METODEN per del: A, B eller sammanslagning, och bänken väljer.

## Spärrar (DISK)
- **DMX:** alla domarens spärrar som i entempo: sektionsspärren, ljusdomaren ≥ −0,5 (−3,0 med granskad EN KÄLLA), lampspr på medlet, Pi-budgeten.
  KRAV EN KÄLLA ska stå kvar. Ingen annan tempokälla.
- **Lotus:** inget av korpus rätt / syntet / on-beat / fas får bli sämre än lotus nuvarande (A), om inte förbättringen klart väger upp.
  Det står i lotusbank.py:s filhuvud.
- Låsta regler som i entempo: inget efter effekten lyfter ljuset, fade-down aldrig snabbare, strobe ≤ 3/s, inget mot vitt.
- Ingen env-flagga: varianten är kodens standard i båda profilerna.
- Rör aldrig engine/src, engine/dist eller lotus-light-link. Arbeta i `.arena/klocka/<id>/`. Läs inte andra deltagares mappar.
  Ingen git som ändrar något, inga länkar, aldrig tsc --rootDir mot huvud-tsconfig.

## Arbetsgång
    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine ; export PYTHONIOENCODING=utf-8
    1. cp -r src .arena/klocka/<id>/src     (lotus profil: lotus-light-link/pi/src/audio-analyser/analyserProfile.ts, läs den)
    2. ändra; python tools/arena/bygg.py .arena/klocka/<id>
    3. python tools/arena/tvavagar.py --snabb .arena/klocka/<id>
    4. python tools/arena/tvavagar.py --mat .arena/klocka/<id>       (DMX, kö)
    5. python tools/arena/lotusbank.py .arena/klocka/<id> [--snabb]  (lotus, se filhuvudet)
**Budget:** högst 3 DMX --mat och högst 3 lotusbank-körningar (--snabb räknas som en halv). Egna korta skript under 60 s ljud är fria.
Kontrollmängden mäts aldrig av er. Den avgör finalen.

## Leverans
`.arena/klocka/<id>/losning.md` ska innehålla:
- **IDÉN:** vilken klocka båda kör.
- **Tabellen PER DEL:** del, A, B, sammanslagning, ditt val och siffran som bär valet.
- **Siffrorna:** DMX-domarens rad, ljusdomaren och lotusbank mot A.
- Workerns µs/hop.
- Var OWN_TEMPO eller klockan togs bort (fil:rad).
- **RISKEN:** särskilt lotus live på Pi:n.

Lägg diffen i `losning.diff` (`git diff --no-index src .arena/klocka/<id>/src`).

Svara sist: `KLAR <id> dmx <x> lotus <rätt>/503 <DISK eller OK>`.

## TILLÄGG (orkestratorn 09:50)
- Lotus-domaren har inget lås: kör högst EN lotusbank åt gången själv, och inte samtidigt som din egen DMX --mat (CPU:n delas med 7 andra).
- Med BEAT_FEED inline ger klockan frame.bpm/bpmConfidence, men frame.beatAnchorMs/beatPhaseMs är fortfarande analysatorns egna (lotus konsumenter
  läser dem). Klockans rutnät ligger i an.clockOut.beat. En klocka för båda betyder att lotus konsumenter läser KLOCKANS rutnät och fas
  (lotusbank --fas klocka mäter det), eller att klockan själv publicerar sitt rutnät i ramen – det är en del av uppgiften.
