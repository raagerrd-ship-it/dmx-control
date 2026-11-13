# DMX-RUNDAN (ägarens beställning 2026-11-13 00:02) - körning .arena/klocka2dmx/

Ägarens ord, i ordning:
> "Så lås är det viktigaste. Den borde väl låsa om om den hör ny takt?"
> "Om vi struntar i lotus i bänken och bara kör mot ladan/dmx där signalen är renare mm. Lotus får ju ändå info från sonos."
> "Kan inte de tre agenterna få informationen att de enbart skall köra mot dmx. Och se om de kommer fram till något nytt.
>  Och de får gärna tänka helt nya infallsvinklar, lite outofthebox"

VARFÖR LÅS VÄGER TYNGST: i DMX-koden styr klockan STEGEN (62 av 91 effekter läser beatIdx/beatFrac/beatHit) och pulsen i 12 effekter när
takten är låst; utan lås går stegen på verkliga kickar. Fel tempo MED lås = steg i otakt; tappat lås är mildare. Därför väger tid med
RÄTT tempo och snabb omlåsning på ny takt tyngst.

DOMAREN (tools/arena/klockdom.py i DMX-läge, byggs om just nu - läs filhuvudet när orkestratorn säger att den är klar):
- Lotus UR: lotusbanken, källarklippen och alla lotus-spärrar räknas inte och körs inte.
- mix_still ROBUST: "tills klockan står still" med tröskeln för ett tempobyte (> 3 %) i stället för +-1 %, så fintempots grannsteg
  inte startar om räkningen (samrådets fynd i går). Gamla måttet redovisas bredvid.
- Vikter: mix_klocka, klipp_klocka (andel tid med rätt tempo) och mix_las (omlåsning) DUBBEL vikt; mix_hopp, mix_still, utfl_min,
  utfl_tid, syskon_tid enkel. Spärrar: mix_las, mix_still (ny), klipp_klocka; finalister även tvavagars analysspärrar och worker p99.
- Referenser som döms om: k2c, k4b, k2b, samrad-1 (övning), k4b och k2c (kontroll).

RAMAR (oförändrade): analysatorn bara analyserar; EN klocka ut; tillåtna filer som i .arena/klocka2/uppgift.md (analyserClock.ts,
analyser.ts tempodelen, split.ts, slowWorker.ts); kodens standard, inga flaggor; inga nya objekt per hop i heta loopar; cpu är FRI (två
kärnor tomma på Pi:n), minnet trångt; inget tal valt för ljusets utseende. Ingen mäter kontrollmängden; därifrån gäller bara rankingen.
Fria sonder på övningsfiler är tillåtna (en åt gången per agent; maskinen delas). Mätningar i domaren kör bara orkestratorn.
Inget skrivs utanför .arena/klocka2dmx/ (egna arbetsmappar där: <id>-<namn>/). Alla får läsa allt i .arena/klocka2/ och
tools/natt/arena-2026-11-12-klocka2/RAPPORT.md.

STEG A - FRITT (var för sig, INNAN ni läser varandras a-filer, så ni inte ankrar): skriv samrad/a-<id>.md med 2-3 HELT NYA
infallsvinklar på frågan "hur håller klockan RÄTT tempo en större del av tiden och låser om fortare när en ny takt hörs, på ren
DMX-signal". Out of the box: INTE fler varianter av håll/regent/syskonfamilj. Exempel på håll ni får gå (inte en lista att välja ur):
flera klockor som tävlar och den som förutsäger nästa slag bäst får ordet; låsa på slagens TIDPUNKTER i stället för tempogrammet;
använda basgångens/virvelns mönster för att välja tolkning; mäta om klockans egna förutsägelser slår in och låta det avgöra byte;
börja om från noll med frågan vad en DJ hör. Varje idé: mekanismen i tre meningar, vad den borde vinna i vilket mått, hur den kan
falla, och en billig sond som avgör om den är värd en mätning (kör gärna sonden redan nu och skriv siffrorna).

STEG B - SAMRÅD: alla läser alla (samrad/b<N>-svar-<id>.md), svarar med siffror, röstar fram högst TVÅ att bygga - minst en ska vara
en ny infallsvinkel, inte en kombination av k2c/k4b. Jokern bygger (.arena/klocka2dmx/dmx-<N>[b]/), de andra granskar diffen.
Mätning på övningen, resultat tillbaka (samrad/b<N>-resultat.md), ny omgång. Högst 3 omgångar; utgången bestäms i förväg per omgång.

STEG C - DOM: kontrollmängden högst en dom per omgång och bara på en variant som är godkänd på övningen. Vinner något över k4b på
kontrollmängden med nya domaren är det den nya ledaren. INGET läggs in i src/.
