# entempo – FINALEN (ägaren 11-09 03:20/03:25: alla finalister får SAMMA uppgift)

Starta från f0: `cp -r .arena/entempo/f0/src .arena/entempo/<id>f/src`. Uppgiften: gör f0 så bra som möjligt TOTALT med samma domare och
samma mål – poängen på KONTROLLMÄNGDEN, ljusdomaren, latensen, alla spärrar, KRAV EN KÄLLA (alla fem), ARKITEKTUREN och Pi-budgeten.
Du väljer själv vad som ger mest. Poängen räknas mot f0, spärrarna mot bas. Budget: 3 `tvavagar.py --mat .arena/entempo/<id>f` (övning).
Två identiska diffar räknas bara en gång. Läs f0/losning.md (delarna, dubblettjämförelsen för fasen, upp_s-skiftet vid ~145 s i lang1021).

## Vad kontrollmängden visade (orkestratorn, 11-09 05:15) – OBS: f0 och hela r0-familjen är DISK där
Mätt med `--holdout` (du mäter INTE på den själv). Bas mot f0 på kontrollmängden:
1. LAMPSPRIDNINGEN (ljusdomarens spärr: någon fil < 94 % av bas): på en av de långa inspelningarna faller lampspr 0,336 -> 0,295 (−12 %)
   för f0 (r0 −8 %, a2r −13 %, a8r −10 %), samtidigt som takten blir bättre (rAbest 0,23 -> 0,28) och medelljuset högre (0,21 -> 0,28).
   Fler lampor tänds lika. Trolig mekanism: högre/stabilare tillit ändrar dirigentens lookval mot looker med fler lampor, och/eller
   ctx.beatIdx på rutnätet synkar mönstereffekter. Det är ljussidan (effects.ts/dirigenten), inte tempot.
2. LATENSEN kick->ljus (ljusLag): 100 -> 135 ms för f0 (r0 155, a2r 160). Det är t90 (90 %-punkten av ljusets medelkurva efter basanslaget)
   som går 35 -> 65..85 ms på en inspelning i ~140 bpm; korskorr och vikning är nästan oförändrade. Ljuspulsen blir större (lyft 0,32 -> 0,38)
   men toppar senare. Med basens effects.ts kvar i r0 består felet -> det sitter i analysatorns kick (grind/spärr/KICK_PHASE vid snabbt tempo).
   Sex andra långinspelningar i tools/ladan-2026-10-11/ visar bara +0..+10 ms.
3. SEKTIONSSPÄRREN: upp_s −0,30 mot bas −0,65 s (f0, a8r) eller ned_s 2,80 mot 2,30 (r0, a2r, a1r) – medianer bland få skiften.
Kontrollmängdens poäng (f0 −13,5, a8r −4,2, r0 −22,1) avgör finalen. Pröva robusthet på ANDRA inspelningar än övningsmängden (t.ex. de
många lang-*.wav i tools/ladan-2026-10-11/, tools/ladan-2026-10-28/lang-20261028T181533.wav, lang-20261012T110658.wav) med egna körningar av
tools/ljusLag.py / tools/rytm.py (via DMX_DIST + NODE_OPTIONS som bank.py) – högst 6 sådana körningar, de räknas inte mot --mat-budgeten.
Aldrig lang-20261028T180531, lang-20261014T161434, lang-20261011T130600 eller lang-20261107T154200 (kontrollmängden).

Leverera .arena/entempo/<id>f/losning.md (KRAV fil:rad, DELAR mot f0 som D1..Dn – en mekanism per del, så orkestratorn kan mäta varje del
ensam i kombinationsgranskningen –, siffrorna, workerns µs/hop och allokering, risken) + losning.diff (mot engine/src) + mot-f0.diff +
tvavagar.json. Svara sist: KLAR <id>f poäng <x> <DISK|OK> krav <antal av 5>.
