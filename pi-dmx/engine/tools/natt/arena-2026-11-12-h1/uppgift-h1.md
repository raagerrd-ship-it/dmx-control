# h1 – uppföljningen efter arenan bygg (2026-11-12): lös uppgiften INOM andelen 'high'

Du är ensam deltagare `h1`. Arenan bygg (4 deltagare, i natt) gav INGEN vinnare. Uppgiften står kvar och ska lösas: ägaren 11-12
"Men vi måste väl lösa det som arena försökte lösa också?". Läs först, i den här ordningen:

1. `.arena/bygg/uppgift.md` – uppgiften, KRAVEN 1–7 (gäller dig ordagrant, med `h1` som id) och arbetsgången.
2. `tools/natt/arena-2026-11-11-bygg/RAPPORT.md` – vad som hände och varför ingen vann.
3. Filhuvudet i `tools/arena/tvavagar.py` – domaren. NYTT sedan arenan: SPÄRR på andelen 'high' per fil (högst bas + 10
   procentenheter, `HIGH_TOL`), och domarens tidsaxel är rättad (basens siffror nedan är de rätta).
4. Idébanken `tools/natt/arena-2026-11-11-bygg/`: `losning-b1..b4.md` (text + diff) och `b1..b4.patch`. Den FÅR du läsa och plocka ur –
   arenan är över. Deltagarnas sonder ligger kvar i `.arena/bygg/b1..b4/` (läs gärna, skriv aldrig där).

## Läget i siffror (rättad tidsaxel)

| | upp_s | ned_s | traff | korta | bygg | andel 'high' per fil | utfall |
|---|---|---|---|---|---|---|---|
| bas övning | 12,75 | 6,0 | 75,9 | 30,9 | 0,2 | 62 / 44 / 72 / 55 % (lang1021, pop, megamix, lang1011) | |
| b4 övning | 1,4 | 1,15 | 100 | 42,4 | 19,6 | 62 / 70 / 90 / 78 % | ljusdomaren -0,04, men DISK med nya spärren |
| b3 övning | 1,8 | 2,3 | 96,7 | 49,6 | 5,2 | 56 / 84 / 88 / 57 % | ljusdomaren +1,4, DISK med nya spärren |
| bas kontroll | 3,3 | 6,8 | 71,4 | 19,1 | -0,2 | 41 / 55 % | |
| b4 kontroll | 1,05 | 1,1 | 100 | 54,5 | 25,1 | 65 / 74 % | DISK lampspridning -20,6 % (en fil -38 %) |
| b3 kontroll | 1,65 | 2,1 | 100 | 63,1 | 1,1 | 72 / 65 % | DISK ljusdomaren -1,4, lampspridning -17,4 % |

Varför de föll: båda ersatte dagens rangbaserade etikett (vilka partier som är låtens starkaste) med nivå mot en referens. Då blir
det mesta av komprimerad partymusik 'high', dirigentens manus väljer refränglookar (alla lampor) oftare, och skillnaden mellan
lamporna försvinner. Etiketten ska alltså vara SNABB men fortfarande SELEKTIV.

## Uppgiften

Samma två delar som i `uppgift.md`, med ett tillägg:

1. SEKTIONEN: `frame.section` ska in i och ut ur 'high' på 1–2 takter i stället för 6–13 s, MEN andelen 'high' per fil ska ligga kvar
   vid basens (spärr: högst +10 procentenheter per fil; helst inom ±5), och `korta` ska inte bli sämre än bas (i arenan blev den
   30,9 -> 42–50; det är fladder). Viktigast är UT ur 'high' (bas 6,0–6,8 s; i lotus stod 'high' 12 s genom ett tyst parti) – ett snabbare
   utträde sänker dessutom andelen 'high'.
2. UPPBYGGNADEN: `frame.buildUp` ska leva (bas 0,2; b4 fick 20–25 på båda mängderna med neutral ljusdom) och `buildProg` ska bort ur
   `effects.ts` (krav 2 i uppgift.md).

En riktning värd att pröva först (du är inte bunden till den – bänken dömer): behåll det som i dag avgör VILKA partier som är
'high' (rangen/selektiviteten) och låt en snabb kant avgöra NÄR – t.ex. ut ur 'high' direkt när taktens nivå fallit tydligt under
referensen, in i 'high' direkt på en tydlig höjning som når referensen, utan uppehållstider i sekunder. Och b4:s buildUp (förloppet
genom sista frasen före den väntade höjningen) anpassad till den etiketten. Känd svaghet i b4:s buildUp: utan minne går den som
sågtand var 4:e takt genom långa lugna partier (förutsägelsen "nästa 4-taktsgräns" gäller alltid) – kan mätningen göras ärligare
(t.ex. bara när något faktiskt talar för en höjning) utan att `bygg` dör, är det bättre analys.

## Det som skiljer från uppgift.md

- Din mapp: `.arena/bygg/h1/`. Kopian `.arena/bygg/h1/src` FINNS REDAN (= engine/src i dag) – hoppa över steg 1 i arbetsgången.
- Budget: högst 4 mätningar (`python tools/arena/tvavagar.py --mat .arena/bygg/h1`, ~8 min + ljusdomaren när ljusets md5 skiljer; kör
  i bakgrunden eller med timeout 600000 ms). Egna sonder på övningsfilerna är fria (mönster: `.arena/bygg/b4/sond.mjs`,
  `tools/arena/tvavagarKor.mjs` jobb `lang`) – sonda andelen 'high' per fil, upp_s/ned_s/korta och bygg FÖRE varje mätning, så att
  ingen mätning går åt till något sonden kunde ha sagt.
- Kontrollmängden får du aldrig köra mot; orkestratorn dömer finalen där. Kör aldrig `--bas`. Rör inte engine/src, engine/dist,
  lotus-light-link eller andra deltagares mappar. Inga git-kommandon som ändrar något. Inga länkar/junctions. Döda aldrig processer
  brett (ingen `taskkill /IM`). Grep-verktyget fungerar inte: använd Bash med grep/sed. `export PYTHONIOENCODING=utf-8`.
- Ägarens regel gäller skarpt: inget i analysatorn får vara valt för hur ljuset ser ut. Tider i slag/takter/fraser ur klockan och
  dB-tal som beskriver musikens nivåskiften är analys; ramper, hålltider och kurvor för ljusets skull hör hemma på effektsidan.
- Blir det inte bra: säg det. Ett ärligt "etiketten kan inte bli snabb inom spärren, därför att ..." med siffror är ett godkänt
  resultat och bättre än en variant som klarar övningen genom att anpassa sig till dess fyra filer.

## Leverans

`.arena/bygg/h1/losning.md` enligt uppgift.md (idén, snittet, diffen `git diff --no-index src .arena/bygg/h1/src` i `diff.patch`
i stället för inklistrad, siffrorna inkl. andelen 'high' per fil och ljusdomaren, risken). Svara sist med en rad:
`KLAR h1 poäng <x> <DISK eller OK>` och tre meningar om vad som löste det eller varför det inte gick.
