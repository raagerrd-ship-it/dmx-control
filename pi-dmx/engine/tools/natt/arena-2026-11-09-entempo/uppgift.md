# DMX-arena entempo – EN TEMPO I HELA MOTORN

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET längst ner i din brief.
Domaren är BÄNKEN, inte en människa eller en modell. Din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och korpus, och poängsätts av `tools/arena/tvavagar.py`. Läs domarens filhuvud HELT: där står måtten (17 st), vikterna,
spärrarna, kontrollmängden och tidsåtgången exakt. Domaren är samma som i arenan tvavagar i går, med två tillägg (överst i filhuvudet):
(a) SPÄRR: sektionsmåtten upp_s/ned_s får inte bli sämre än bas (+0,1 s) -> DISK; (b) nytt mått mix_still (tid efter varje
låtskarv i mixen tills effektklockan står stilla inom 1 % i 5 s).

## Riggen och målet

Pi-DMX: 4 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet (aux) på en Raspberry Pi Zero 2 W. Motorn är TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Ägarens ord, ordagrant (i ladan 11-08):

> "Ja måste vara en och inte två! Är ju extremt svårt att trimma annars. Lägg det till nattagenten. Hur löser vi en optimal?"
> (om tilliten) "varför behöver vi en separat?"

## Läget (HEAD, live i ladan)

Motorn söker tempo på TVÅ ställen:
1. analysatorns eget skuggrutnät (`frame.bpm` / `frame.bpmConfidence`; `BeatFeed.analyserCfg`, kommentaren "TVÅ RUTNÄT" i
   src/beatFeed.ts:49, sedan 10-28; `createAnalyser(BeatFeed.analyserCfg(cfg))` i src/index.ts);
2. effektklockan (`cfg.beat`: taktvägens tempogram + rise-rutnätet + taktmodellen för ettan, src/beatFeed.ts, körs i workern som
   taktvägen sedan a9a411b, `analyser.hopLane.feed`).
- Skälet 10-28 var FASEN, inte tempot: rise-rutnätet flyttade analysatorns kickgrind, och sektionerna kom senare (upp_s 2,6 -> 4,1 s).
  Därför spärren (a).
- Effekterna läser båda: tilliten ur `frame.bpmConfidence` (src/effects.ts ~1774) och frasräknaren nollas på `frame.bpm === 0` (~1674).
  Ljuset styrs alltså delvis av ett tempo det inte följer.
- Live 10 min: låst och stabilt inne i låtarna (tillit 0,80-0,96), men vacklar 30-60 s vid övergångar.

Granskningen DUBBLA KÄLLOR 11-08 (läs `tools/natt/granskning-2026-11-08-dubbla/dubbel-analys.md` punkt 4-5 och `dubbel-ljus.md`
punkt 1-2) fann i samma klocka:
- `ctx.beatIdx` är en FRI räknare (`beatCounter`, effects.ts ~2013-2016), inte rutnätets index. 17 effekter läser `c.beatIdx % 4` som
  ettan, så taktmodellens etta (barOff) når inte fram till dem; bara hjärtslagets accent och SWITCH_ON läser rutnätet.
- Två hjärtslagskurvor (beatEnv -> kickEnv, 21 effekter; beatPulse/heartPulse, 18 effekter), olika etta och paritet.
  Bugg: beatEnv fryser på ett golv upp till 0,8 när tilliten är < 0,20 men bpm > 40 (~1303/~1367).
- Två halveringspariteter (pulseCount % 2 ~1365, halfTick ~2013).
- Lookbytenas taktgrind räknar sectionBars utan fas (analyser.ts ~3801, effects.ts ~1155); predictHigh har ett eget frasgitter.
- Låtgränsen når aldrig taktvägen (index.ts ~191) och klockan drar egna slutsatser om låtbyte (barReset vid > 3 % tempohopp).

## MÅLET (den optimala lösningen, ur todo.md)

- EN temposökning, i långsamma vägen (taktvägen/workern), som ger EN sanning: bpm, tillit och fasankare, publicerat i tillståndsblocket.
- Analysatorn och ljuset läser samma tempo och samma ankare. Fasen får ha EN fast, mätt offset per konsument (t.ex. kickfas för
  analysatorns grind/sektioner, rise-fas för ljuset), men ingen andra sökning.
- EN tillit: klockans tillit är den enda. `frame.bpm`/`frame.bpmConfidence` blir samma värden som `cfg.beat` (de måste finnas kvar som
  fält, domarens verktyg läser dem), så ingen läser ett eget tempo eller en egen tillit.
- Breaket och låtgränsen (boundaryDetector -> omlåsning) hanteras på ETT ställe.
- Klockans delar ovan (beatIdx, pulskurvan, halveringen, taktgrinden, låtgränsen till klockan) är en del av samma klocka.
Hur långt du går och i vilken ordning avgör ditt kort och bänken. Det är en mätning, inte en åsikt: om en del gör måtten sämre, mät
och välj.

## Låsta regler (bryts de är du DISK, oavsett poäng)

1. Allt i `src/` i DIN KOPIA får ändras FRITT, även de delade filerna (analyser.ts, split.ts, slowWorker.ts, tempoTracker.ts,
   recorder/). Ägaren 11-08: "vi skall ju få ändra ... sen får vi ju bara porta till lotus". Domaren tittar inte på lotus.
   fft.js (node_modules) byts inte. API:t som verktygen läser (domarens filhuvud, TILLÅTNA FILER) måste finnas kvar.
2. Snabbare fade-down är förbjudet. Strobe högst 3 blixtar/s. Inget får dra mot vitt. Rör inte uttoningen (DMX_FADE_MIN_S) eller
   output.ts kalibrering. Ljusmängden är INGET kriterium.
3. Ändras riggens DMX-värden (md5 per lampa skiljer från bas – det kommer de att göra här) döms ljuset av ljusdomaren (domare.py v3:
   dynamik/koreografi/takt) och måste vara >= bas −0,5 utan domarens spärrar. Annars DISK.
4. Workern får inte ligga efter mer än domarens gräns i realtid (filhuvudet). Pi:n har 2 kärnor till motorn; ARM ~170 µs/hop i dag.
5. Din variant ska vara KODENS STANDARD i din kopia, alltså på utan env-flagga (ägaren: ingen opt-in).
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/entempo/<ditt-id>/`. Läs inte andra deltagares mappar.
   - Inga git-kommandon som ändrar något: ingen commit, stash, checkout eller add. Inga länkar eller junctions.
   - Skriv aldrig i lotus-light-link.
   - MÄTFÄLLA: kör aldrig `tsc --rootDir <annan> --outDir ...` mot huvud-tsconfig (emitterar ändå, .js hamnar i engine/src). Använd bygg.py.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r src .arena/entempo/<id>/src                        (din kopia; första gången)
    2. ändra i .arena/entempo/<id>/src/
    3. python tools/arena/bygg.py .arena/entempo/<id>             -> BYGGT / BYGGFEL
    4. python tools/arena/tvavagar.py --snabb .arena/entempo/<id> -> snabbkoll md5 (fri, ~15 s; här väntas SKILJER - den visar bara att det kör)
    5. python tools/arena/tvavagar.py --mat .arena/entempo/<id>   -> skriver tvavagar.json (kö: en mätning åt gången, ~7-9 min + väntan)
    6. python tools/arena/tvavagar.py .arena/entempo              -> rankingen mot bas

**Budget:** högst 3 mätningar (steg 5). Egna körningar av bänk- eller korpusverktyg (tempoMix, taktKorpus, sektionLag, rytm.py,
bank.py ...) på en NY variant räknas mot budgeten, utom `--snabb`. Egna små node-skript i din mapp som kör din dist på EN kort fil
(< 60 s ljud) för att felsöka är fria. Bänken är deterministisk (virtuell klocka). Kör långa kommandon med Bash-verktyget med
timeout 600000 ms, eller i bakgrunden och vänta på notisen. Mätningarna köar på ett globalt lås – räkna med väntan.

## Leverans

Skriv `.arena/entempo/<id>/losning.md` (svenska, högst ~500 ord):
- **IDÉN** i två meningar: var den enda tempokällan sitter nu, vilka konsumenter som läser den, och varför det är bättre.
- **DIFFEN:** kör `git diff --no-index src .arena/entempo/<id>/src > .arena/entempo/<id>/losning.diff` (klistra inte in den).
- **SIFFRORNA:** din rad ur domaren (långsamma, snabba, ljusdomaren, spärrar) och vad som blev sämre.
- **DUBBLETTER KVAR:** vilka av punkterna i MÅLET du INTE tog, och varför.
- **RISKEN:** var din variant kan bete sig annorlunda på Pi:n (ARM, Node 24) eller i realtid än bänken visar.

Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.

## REGELÄNDRING 11-09 00:05 (ägaren, gäller alla lika)
En variant som genomför KRAV EN KÄLLA får ljusdomarens gräns −3,0 i stället för −0,5 (domaren: SPARR_LJUS_ENKALLA). Orkestratorn
granskar koden (fil:rad) och skriver `<mapp>/KRAV_EN_KALLA.txt`. Runda 1: de punkter ditt kort angriper. Remix och final: alla fem:
(1) EN temposökning: analysatorns skuggrutnät och egen tempovikning borta, analysatorn läser klockans bpm/ankare + EN fast mätt fasoffset;
(2) EN tillit: frame.bpmConfidence, profile.beat, hasBeat, effects trust och frasräknaren läser klockans tillit;
(3) EN takträknare: ctx.beatIdx = rutnätets index (>> 1 vid halvering), ingen fri beatCounter, en halveringsparitet;
(4) EN pulskurva: beatEnv/kickEnv och beatPulse/heartPulse på samma klocka;
(5) låtgränsen: boundaryCount är enda låtbytessignalen, även i taktvägen.
Lista i losning.md vilka punkter du genomfört med fil:rad. Övriga spärrar (lampspr, upp_s/ned_s, worker p99) gäller oförändrat.
