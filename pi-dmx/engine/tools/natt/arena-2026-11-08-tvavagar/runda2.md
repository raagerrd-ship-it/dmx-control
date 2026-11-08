# Runda 2 – REMIX från r0 (tvavagar)

Ägaren: "efter första bedömningen av domaren [ska] deltagarna få göra sin version av de delar som de tror blir bästa slutprodukten
och fightas med den i nästa" och "alla de bästa förslagen ihop till ett nytt paket som agenterna får till runda 2, där de skall
försöka förbättra det ytterligare". Och: "vi vill ju inte förkasta saker som kan göra vår show bättre".

## Ändrat sedan runda 1 (gäller alla)
- **Ljusmängden är INGET kriterium längre** (ägaren: "mer ljus kan ju vara en bra sak"). Domaren har ingen spärr, inget avdrag
  och ingen bonus för medelljus. Det mjuka lampspr-avdraget under 98 % är också borttaget. Spärren under 94 % finns kvar.
  Dynamik, koreografi och takt avgör. Ljusdomarens gräns ≥ −0,5 gäller fortfarande när md5 skiljer.
- **Idébanken** (läs, skriv aldrig): `.arena/tvavagar/idebank/`. Där finns:
  - allas lösningar (`<id>.md`) och diffar mot src (`<id>.diff`)
  - r0 (`r0.md`, `r0.diff`)
  - `ranking-r1.md` med alla 16 mått per deltagare
  - `a1-mat2-bank.json`. a1:s mätning 2 hade långsamma +12,7 och latens 85 ms men diskades för ljus +4,1 %, vilket är tillåtet nu.
    Den återskapas som `a1m2` och läggs in här när den är mätt.

## r0 = STARTPUNKTEN (+17,70, ingen DISK)
r0 = a3:s snabba väg + småvinsterna ur a7/a2/a8 + a5:s etta. Huvudtråden ligger på 41 µs/hop (bas 72), latensen på 85 ms och ettan
på 88 %. **Workerns p99 är 5 hop, exakt på gränsen: marginalen är noll.** Allt du lägger i workern måste betalas där.

## Uppdraget
1. `cp -r .arena/tvavagar/r0/src .arena/tvavagar/<id>r/src` och förbättra r0 i ditt REMIXKORTS riktning (`remixkort.md`). Du kan
   - lägga till delar ur idébanken
   - BYTA en del i r0 mot en bättre
   - ta bort det som inte bär
   - göra egna förbättringar
2. Samma låsta regler som i uppgift.md (utom ljusmängden ovan). Samma domare och arbetsgång, med `<id>r` som mapp.
3. **Poängen räknas mot r0:** din poäng − 17,70. Spärrarna gäller fortfarande mot bas. Lämnar du r0 orört får du 0. Om två remixar
   har identisk diff räknas bara den som mättes först.
4. Budget: högst 3 `--mat`. `--snabb` är fri.
5. `losning.md` i `<id>r/` ska innehålla:
   - **DELAR:** en tabell med del, ursprung och vilket mått den bär (siffra ur ranking-r1 eller din egen mätning)
   - **BORTVALT:** vad du valde bort ur r0 eller idébanken, och varför
   - domarens rad och marginalen mot r0
   - risker på Pi:n
   - hela diffen mot engine/src
   Svara sist med raden `KLAR <id>r poäng <x> marginal <x−17,70> <DISK|OK>`.

## Ändring 18:50 (ägaren: "sänk för just låtgräns, då den är svår, så de inte blir diskade pga den")
Om din variant TYDLIGT förbättrar låtgränsen (gr_ratt ≥ +20 % mot bas OCH gr_falska inte sämre), är ljusdomarens gräns −3,0 i stället
för −0,5. Domarens övriga spärrar, t.ex. lampspr < 94 %, gäller oförändrat.
