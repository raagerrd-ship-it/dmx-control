# Natt-agentens uppdrag

## Från kvällen 2026-10-07 — KODOPTIMERING AV LJUSVÄGEN

Ägarens mål (ordagrant): "allt jag vill med detta är att koden skall bli snabbare, tydligare och enklare att trimma till rätt"
och "vi skall inte lägga massa olika spärrar på ljuset, blir ju till slut omöjligt att styra".

ÄGARENS LJUSKONTRAKT (bestämt i ladan 10-07, går före allt äldre):
- Ända till output kör vi 0–100 %. Effekter/dirigent/energi vet INGET om hårdvaran (tändpunkt, golv, DIM-mättnad).
- 0 % = släckt, och det är dirigentens/effektens beslut. Effektens 1 % mappas till lampans SLÄCK+1.
- Mappningen är SISTA steget i output (`output.ts` LIN_MAP, standard sedan 10-07). Ingen annan modul känner till den.
- Effekt 100 % = 95 %; bara drop (dropEnv som tal till calibrate) öppnar de sista 5 %.
- Energilagret får bara MINSKA. Snabbare fade-down är fortfarande förbjudet.
- Ingångens lägsta: EN hård, justerbar gräns (Släckgräns i /setup) på analysatorns nivå, inga tider (prov DMX_HARD_GATE=1).

REGEL FÖR VARJE STEG: showen ska vara BIT-IDENTISK med kodens standard + ladans SHOW_ENV före och efter
(`python tools\natt.py --snabb` + korpus, jämför json, inte bara scoreboardraden). Ett steg = en commit. Faller identiteten:
revertera och skriv varför. Deploya aldrig (ägaren kör ladan.py). Rör aldrig analysatorn.

STEG I ORDNING (gör så många som hinns, ett i taget):
1. `output.ts`: ta bort de vägar som är döda med LIN_MAP som standard — CAL_V2 + dess 8 rattar (förkastat prov 10-06),
   klampningsgrenen (LIN_MAP=0), 10 %-regeln LOW_ON/OFF_CH, HUE_LIFT/HUE_RATIO (gäller bara utan LOW_PURE), MIN_DIM,
   LOW_PURE-flaggan om den nu alltid är på. Mål: ~3 rattar kvar (golv FLOOR_CH, MAP_TOP, DIM_MAX) och en calibrate
   som går att läsa på en skärm. Kolla att tools/ (calProbe m.fl.) inte bryts — gallra verktyg som bara mätte döda vägar.
2. ÄGARENS MODELL (10-07 kväll, ordagrant): "energilagret, följer det inte bara inputs energinivå med liten fade out?" - JA, så
   ska det vara. I dag: basens dB (LIVE_BASS_W 1 = bara bodyDb) -> 10 dB-fönster mot 120 s-ankare med särregler -> 3 utjämningar i
   rad (350 ms, 25/150 ms, log-release) -> TVÅ vägar (md på RGB golv 0,25 + uppbyggnad/drop/sektionsgas; vu på DIM golv 0,20, 0,45/1,2 s)
   -> sektionsdämpning. Bygg den enkla vägen: en energisignal, direkt upp, EN kort avklingning, ETT golv, applicerad EN gång (DIM).
   PROV LIVE 10-07: DMX_ENERGY_SRC=intensity (analysatorns frame.intensity 0,05..0,85 -> 0..1 i stället för dB-fönstret) gav i bänken
   pop r 0,20 -> 0,48, megamix 0,09 -> 0,45 - läs memory/pi-dmx.md om ägaren godkänt den; då är intensity energisignalen.
   Energin på ETT ställe med EN ratt: i dag multiplicerar energin både effektens RGB (md, golv LIGHT_FLOOR 0,25) och DIM
   (ceilMul, golv CEIL_FLOOR 0,20) — två golv som multipliceras. Effekterna äger RGB enligt kontraktet, så energin hör
   hemma på DIM. Kartlägg först (siffror), föreslå i rapporten, bygg som opt-in om det inte kan vara bit-identiskt.
   OBS ladans stegtest 10-01: DIM mättar vid ~85 (prov DMX_DIM_MAX=85 live 10-07 kväll, ägarens öga avgör).
3. Ingångsgränsen: om ägaren godkänt DMX_HARD_GATE (står det i memory/pi-dmx.md) — ta bort gamla tystnadsgrinden
   (SILENCE_MS, SILENCE_RELEASE_S, gain-skalning, START_FADE_MS, låtstartsflanken). Annars: lämna.
4. `effects.ts` (101 env-rattar, 2 114 rader): gallra rattar som aldrig blivit standard och vars standard gör grenen död.
   Lista först alla rattar med standardvärde + om grenen körs med SHOW_ENV; ta bort döda grenar några per natt.
5. Skriv/uppdatera EN tabell över trimrattarna som finns kvar på ljusvägen (fil, ratt, standard, vad den gör) i
   pi-dmx/ARKITEKTUR.md eller en egen TRIMRATTAR.md — det är ägarens trimyta.

Mät också: rader och env-rattar per fil före/efter, och process()/render-tid per ruta (snabbare = ett av målen).
HÄNG (ägaren i ladan 10-07 ~20:55: "känns som motorn hängde sig ett tag"): Pi-loggen visade 0 krascher/watchdog/OOM - bara
kvällens 5 deploy-omstarter (efter omstart 10-20 s utan taktlås/nivå). Mät ändå på PC:n i bänken: max och p99 för
render()-tid per ruta och för analyser.process per hop över hela mixarna, och vilka steg som kostar (effekter, dirigent,
postprocess, output). Ta bort onödiga beräkningar i ljusvägen (allokering per ruta, strängbyggen, döda grenar) - ägaren tror
att det är där hänget försvinner. Rapportera före/efter i ms.
Rapportera under egen rubrik. Markera detta avsnitt "KLART <datum>: <en rad>" när steg 1–5 är gjorda
(annars "PÅGÅR <datum>: steg X klart").
