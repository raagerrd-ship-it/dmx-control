# klocka – FINALEN (samma brief för alla finalister; ägaren 11-09: "De tävlar då inte mot samma sak?")

Starta från r0: `cp -r .arena/klocka/r0/src .arena/klocka/<id>f/src`. r0 = a3:s tempoval (toppröst 11 s-fönster + oktav under kanten) + a8:s
lotus-klocka i workern med setBeatGrid av + a4:s fas/etta i ramen (läs r0/losning.md och idebank/). r0: DMX −0,99 OK (mix_still 2,73->3,24,
gridfel 21,4->23,0), lotus 474/503, syntet 6/8, fas parat 0,87 (motfas 33->11), följare 0,96/23 ms, spann inom låt 9->22 BPM.
UPPGIFTEN: gör r0 så bra som möjligt TOTALT – DMX-domaren (tvavagar.py, kontrollmängden avgör, ni mäter den inte) och lotus-domaren
(lotusbank.py) – med samma spärrar som uppgift.md (EN klocka, OWN_TEMPO borta, KRAV EN KÄLLA, Pi-budget, lotus inte sämre än A utom fasmedianens
urval). Du väljer själv vad som ger mest. Kända öppna punkter: DMX mix_still/gridfel efter rösten; lotus spann inom låt; ≥150 bpm; lotus
följarens skala (PHASE_FLIP_CONF); workerns kostnad.
BUDGET: 2 DMX --mat + 2 lotusbank (--snabb = halv). Två identiska diffar räknas en gång. LEVERANS: losning.md med DELAR mot r0 som D1..Dn (en
mekanism per del – orkestratorn mäter varje del ensam i kombinationsgranskningen), siffror, risk; losning.diff (mot engine/src), mot-r0.diff,
tvavagar.json, lotusbank.json. Svara sist: KLAR <id>f dmx <x> lotus <rätt>/503 <DISK|OK>.

## TILLÄGG 13:00 (orkestratorn, samma för alla) – kontrollmängden om r0
r0 är DISK på DMX-kontrollmängden: sektionsspärren (upp_s och ned_s sämre än bas – medianer på få skiften), poäng −5,22, ljusdomaren +1,7,
latens 90 (bas 90). Det som ändrar DMX-ljuset/sektionerna i r0 är a3:s toppröst (de delar som bara rör lotus väg – oktavzon ovanför DMX:s
tempon, lotus fas/etta, lotus i workern – lämnade DMX bit-identisk i runda 1, t.ex. a1 med lotus 461/503). Varianter vars DMX-md5 är
identisk med bas är säkra på DMX-kontrollmängden; ändrar ni DMX, pröva robustheten på andra lang-*.wav än övningen (tools/ladan-2026-10-11/).
(Kontamination: detta är kontrollmängdens felklass, redovisas i rapporten.)
