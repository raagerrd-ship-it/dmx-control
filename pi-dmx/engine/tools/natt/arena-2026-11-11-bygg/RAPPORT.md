# Arenan bygg (uppbyggnad + sektion), 2026-11-11 23:25 -> 11-12 02:05 - INGEN VINNARE, inget inlagt

Ägaren: "Fortsätt med nästa del" (punkt 4 i inventeringen: analysatorns buildUp är död; sektionen följer musiken sent).
4 deltagare, domare tools/arena/tvavagar.py (18 mått, nytt mått `bygg`), tom basenv, bas = engine/dist 50e0f4a. ~1,8 M tokens.

## Resultat
ÖVNING, rättad tidsaxel (bas -> b3 / b4):  upp_s 12,75 -> 1,8 / 1,4   ned_s 6,0 -> 2,3 / 1,15   traff 75,9 -> 96,7 / 100
  bygg 0,2 -> 5,2 / 19,6   korta 30,9 -> 49,6 / 42,4 (sämre)   ljusdomaren +1,4 / -0,04   poäng +5,46 / +8,81.
  b1 (klangens rörelse) +7,80 och b2 (rytmen) +7,72 på skev axel men DISK i alla tre mätningarna: ljusdomaren -4,5 / -6,5.
KONTROLLMÄNGDEN (bas -> b3 / b4):  upp_s 3,3 -> 1,65 / 1,05   ned_s 6,8 -> 2,1 / 1,1   traff 71,4 -> 100 / 100
  bygg -0,2 -> 1,1 / 25,1   korta 19,1 -> 63,1 / 54,5   poäng +9,07 / +15,29, MEN BÅDA DISK I LJUSDOMAREN:
  b4 lampspridning medel -20,6 % (lang1011 -38,1 %), b3 ljusdomaren -1,4 och lampspridning -17,4 % (lang1011 -28,8 %).
  Andel av tiden i 'high': bas 41 / 55 %, b3 72 / 65 %, b4 65 / 74 % (övning: pop 45 -> 84 / 70 %, megamix 72 -> 88 / 90 %).

## Slutsats
Etiketten går att få snabb (in 13 -> 1,4 s, ut 6 -> 1,2 s) och buildUp går att väcka (b4: 0,2 -> 20), men båda godkända deltagarna
gör det genom att kalla mycket mer av musiken 'high'. Dirigentens manus väljer då refränglookar (alla lampor) oftare och
lampspridningen faller under spärren på kontrollmängden. Det är överanpassning mot sektionsmåtten: de belönar att etiketten följer
nivåskiften men straffar inte att 'high' blir normalläget. Inget läggs in.

## Fynd
- DOMARENS TIDSAXEL VAR SKEV (b1, b2, b3 oberoende): etiketten provtogs var 101,33 ms men räknades som 100 ms, nivåblocken 501,33 som
  500 -> etiketten lästes 1,07 % x t för sent. Rättat i tools/arena/tvavagarKor.mjs OCH tools/sektionLag.mjs (nattens baslinje för
  upp_s/ned_s/korta flyttar sig: bas övning 15,35/2,65 -> 12,75/6,0). Äldre arenors sektionsmått (tvavagar, entempo m.fl.) är påverkade.
- Materialet har få riktiga uppbyggnader: de flesta höjningar är hopp (ny låt efter paus, basen in); det som syns före är centroiden (b1).
- b2: buildUp > 0,35 i grunda basbortfall tänder build-lookar medan basen går (samma fälla som preDrop 10-11) - hypotes, ej bevisad.
- b3: buildUp = 1 i takten efter smällen la build-looken på refrängens första takt; noll när nivån är framme gav ljusdomaren -0,06 -> +1,36.

## Idébank (prova ensam, en i taget; diffar i denna mapp)
- b4 buildUp = förloppet genom sista frasen före väntad höjning (minne av förra partiets längd, annars nästa 4-taktsgräns): bygg 20-25
  på båda mängderna, ljusdomaren ±0. PROVA MED DAGENS SEKTIONSETIKETT ORÖRD (då ändras inte andelen 'high'). Sågtandar i långa lugna partier.
- b3/b4 snabb etikett: behöver ett mått och en spärr på andelen 'high' (t.ex. inte över bas + 10 procentenheter per fil) innan den prövas igen.
- b3 sektion per slag ur bassEnergy/bassLevel (in 3 slag, ut en takt); b1 Theil-Sen-lutning över 8 slag; b2 bortfall/förtätning/stigning.
- Domaren bör få andelen 'high' och lampspridningen som egna rader i sektionsgruppen.
