# Natt-agentens uppdrag

## Från kvällen 2026-10-08 — LEVANDE DYNAMIK UTAN FLADDER (går före kodoptimeringen nedan)
Ägaren i ladan, ordagrant: "jag vill att nattagenten kollar över detta med dynamiken så ljuset känns levande, börjar bli bra.
Men tror vi kan göra det bättre. Då utan att de fladdrar."

LÄGET (godkänt och live 10-08 kväll, läs pi-dmx/TRIMRATTAR.md och memory/pi-dmx.md sista avsnitten):
- Ingången: Aux −18 dB (klippte förut - ALLA gamla ladan-inspelningar är klippta, nivåspann ~5 dB; mät INTE dynamik mot dem).
- Energin: ingångens volym (levelVU) i dB i ett FÖLJANDE fönster (E_WIN_S 20, E_MIN_DB 4) → kurva E_CURVE 2 → avklingning 100 ms →
  EN dämpningsfaktor på effektens RGB (aldrig > 1). Ägaren: "mycket bättre nu".
- Minidrop: lyft 0,9 i MINI_BANG_MS 150, ingen spärr. Nästan-drop 0,5–0,85. Ägaren: "drop-lyftet hjälper dynamiken".
- Utgång: en mappning (färg 1 % → släck+1; DIM golv+1..0,95 × fullpunkt 255; bara full drop till 255).
- Puls: effekternas c.heart + energipulsen ("energi direkt") som fortfarande läser det GAMLA dB-fönstret (liveLevelSm/lightLoud) -
  samma sak mäts alltså på två ställen. Kandidat: låt pulsen läsa samma följande fönster (en signal).

GÖR:
1. INSTRUMENT FÖRST: skriv/utöka en bänk som mäter (a) LEVANDE: energifaktorns spann i STEG (log2(p90/p10) av md), ljusets
   1 s-envelopp mot ingångens dB (r), och lugnt-mot-högt-kontrast; (b) FLADDER: per lampa antal riktningsbyten i ljuset med
   amplitud > 5 % av fullt inom < 150 ms som INTE ligger på ett slag/kick (±60 ms) - det är fladder, slagpuls är inte fladder;
   rapportera fladder/min. Kontrollera instrumentet: en konstant ton ska ge ~0 fladder, en ren kickloop fladder ~0 och puls = kickar.
2. MÄT läget med de NYA inspelningarna om de finns (tools/ladan-2026-10-08*.wav, se nedan); annars frozen6 nivåanpassad - och skriv
   tydligt att klippta mixar inte räknas för dynamik.
3. EN idé, bevisad: mer levande (spann i steg upp, r upp) med fladder/min inte upp. Kandidater: pulsen på samma följande fönster;
   E_WIN_S/E_MIN_DB/E_CURVE; energins uppgång (attack) när volymen stiger; per-lampa-dynamik (inre/yttre). Fallhastighet får INTE
   ökas för lampan (DMX_FADE_MIN_S); energins egen avklingning ägs av ägaren (100 ms nu).
4. Allt som opt-in env, "redo för ladan" med exakt kommando. Ägarens princip: ersätt, lägg inte till lager.
5. STABILARE R/G/B (ägaren 10-08: "få lamporna att köra stabilare på r g b dioderna. nu kan tex R lysa och B fladdra till"):
   TROLIG ORSAK: en svag SIDOKANAL (t.ex. B i en rödaktig kulör) skalas med lampans ljusstyrka (energi/puls via colK i
   output.ts calibrate) och passerar diodens fysiska tändpunkt (~16) upp och ner -> B tänds/släcks i takt med LJUSSTYRKAN, inte
   med färgen. Förr fanns DISTINKTA FÄRGER (HUE_RATIO_ON 0,25 / OFF 0,15: sidokanal tänd/släckt efter sin ANDEL av starkaste
   kanalen, med hysteres) - den låg på !LOW_PURE-vägen och togs bort i steg 1 10-08 som död. Återinför DEN REGELN på den levande
   vägen i output.ts (färggrenen): sidokanalens andel avgör på/av med hysteres; tänd sidokanal hålls minst på sin tändpunkt+1 så
   den inte blinkar vid låg ljusstyrka; släckt = 0. Kulörens förhållande bevaras i övrigt. Mät med colorBench (per kanal) + ett
   nytt mått: antal på/av-växlingar per sidokanal och minut (ska ner mot 0 när färgen står still). Opt-in först, redo för ladan.
   FÖRSTAHANDSVAL (ägaren 10-08: "den skall ju kunna köra 50% blå och 30% röd") = PER-KANAL-MAPPNING: i output.ts färggren mappas
   VARJE färgkanal för sig: 0 = släckt, 1..255 -> den kanalens tändpunkt+1 (onR/onG/onB, annars on) .. tak - i stället för att
   alla kanaler skalas med den starkaste kanalens faktor (colK). Då kan ingen kanal som effekten säger är PÅ hamna under sin
   tändpunkt, och 50 % B + 30 % R lyser båda stabilt. Ägarens regel "1 % = släck+1" per diod. Ingen hysteres/andelsregel behövs.
   Bevaka: (a) avrundning - energi/puls kan skala en svag kanal till raw 0 (8 bitar) -> av/på nära botten; mät och räkna i
   flyttal hela vägen till mappningen om det fladdrar; (b) kulören blir något ljusare nära botten (ej proportionell) - acceptabelt.
   (Alternativ B, kvantiserad kulör, STRUKEN: klarar inte blandningar som 50/30.) Alternativ A (andelsregeln) bara om
   per-kanal-mappningen mäter sämre.

## Från kvällen 2026-10-07 — KODOPTIMERING AV LJUSVÄGEN

PÅGÅR 2026-10-08 (körd i dagsessionen, datorn sov i natt): steg 1 klart (output.ts 19→3 rattar, 467→335 rader), steg 2 klart
(gamla energins döda delar + DIM-taket/LiveRange bort; dB-fönstret KVAR - det matar pulsens 'energi direkt' och drop-landningen),
steg 3 väntar på ägarens beslut om HARD_GATE, steg 4 ej påbörjat, steg 5 klart (pi-dmx/TRIMRATTAR.md). Alla steg json-identiska
mot baslinjen 10-08 (mixar + 222 klipp). Render 62→55 µs/ruta (timeProbe.mjs). Nästa: steg 4 (effects.ts 98 env-rattar).

Ägarens mål (ordagrant): "allt jag vill med detta är att koden skall bli snabbare, tydligare och enklare att trimma till rätt"
och "vi skall inte lägga massa olika spärrar på ljuset, blir ju till slut omöjligt att styra".

GRUNDKRAV (ägaren 10-07): "så simpelt och snabbt som möjligt, men få ut effekten". Ersätt vägar, lägg aldrig till lager.
Kvällens opt-in-prov (HARD_GATE, DIM_MAX, PULSE_GAP_BEAT, MINI_FULL, ENERGY_SRC, ENERGY_GAMMA, ALSA_BUFFER, FAST_RECOVER, NEAR_*) ska
antingen bli standard med gamla vägen BORTTAGEN, eller tas bort helt - de får inte bli kvar som parallella rattar.

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
   GODKÄNT 10-07 ~20:20 ("mycket bättre energiföljning nu"): ENERGY_SIMPLE är STANDARD. Steg 2 = TA BORT den gamla energikedjan
   som nu är död: LIVE_LEVEL-fönstret/ankaret (LIVE_WIN_DB, LIVE_OFFSET_DB, LIVE_ANCHOR_*, LIVE_RELEASE_MS, LIVE_BASS_W, LIVE_CEIL),
   lightShapeSm/lightLoud/log-release/soft-snap, md0 med LIGHT_FLOOR/buildUp/dropEnv-påslag, sektionsgas (secGain/dynGain/RANK/
   EXPECT_LIFT), vu/range/CEIL_FLOOR/ceilMul-vägen, ENERGY_GAMMA, ENERGY_SRC - allt som bara matade md/ceilMul. Kolla vad ANNAT
   som läser samma fält (lightLoud används t.ex. av dirigent/tier? tierEma?) innan något tas bort; bevisa med natt.py att showen
   är bit-identisk med ENERGY_SIMPLE före och efter borttagningen.
   (Historik) Energin på ETT ställe med EN ratt: i dag multiplicerar energin både effektens RGB (md, golv LIGHT_FLOOR 0,25) och DIM
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

## Från kvällen 2026-10-07 (sent) — INGÅNGEN VAR ÖVERSTYRD
Ladans inspelningar pop_ladan.wav/megamix_ladan.wav är tagna med en ÖVERSTYRD ingång (22–29 % klippta sampel, 97–99 % av
sekunderna i 0 dBFS, nivåspann 5 dB). Ingången är sänkt 13,5 dB som standard (server.ts: Aux 49, Mixin PGA 3) och ägaren:
"mycket bättre nu". Konsekvens för bänken: mixarna motsvarar inte längre riggen för energi/nivå/tystnad — skriv det i
rapporten, jämför inte energimått mot gamla rader, och be ägaren spela in nya ladan-mixar (DMX_RECORDER=1) nästa gång.
Simulera inte nivåsänkningen på de klippta filerna (klippningen går inte att ta bort i efterhand).
