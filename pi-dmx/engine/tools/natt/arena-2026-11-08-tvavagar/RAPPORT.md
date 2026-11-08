# Arenan tvavagar 2026-11-08: analysatorns två vägar

**Ägarens fråga:** "slå ihop till en analysator, bara att i den så finns två olika vägar. Den snabba och sen den som ger dirigenten
information". "Snabba vägen ger högst poäng om den utför samma uppgift eller bättre. Snabbare."

**Domaren:** `tools/arena/tvavagar.py` (ny, a484732).
- **Poäng:** 0,6 × långsamma (16 mått: tempo, etta/rutnät, sektion, drop, låtgräns) + 0,4 × snabba (CPU i huvudtråden, latens kick→ljus).
- **Spärrar:**
  - DMX-md5 lika, annars ljusdomaren (domare.py v3) minst −0,5.
  - Workern p99 högst bas + 1 hop.
- **Basenv:** DMX_LABFX=1. Bas = 7d238cf + a9a411b (taktmatningen i workern).

**Regeländringar under körningen (ägaren, samma för alla):**
- Ljusmängden är inget kriterium: inget avdrag, ingen bonus och ingen spärr. Det mjuka lampspr-avdraget är borta.
- Varianter som tydligt förbättrar låtgränsen får ljusdomarens gräns −3,0.
- Ny runda 2 (REMIX): idébanken öppnas, alla börjar från r0 (den uppenbara kombinationen), och poängen räknas mot r0.

## Slutläget i ladan (LIVE 21:00, ägaren: "ettan sitter som den skall", "känns tightare")

| commit | vad |
|---|---|
| 4bd8666 | **f2** = r0 + a5r + a1r + a3r:s enda workertråd (kodens standard) |
| 56199a28 (lotus) | delade analysatorn synkad; lotus ramar bit-identiska med lotus profil |
| 360f232 | `/api/health-log` `split`: workerns eftersläpning, alltid levande |
| 5564abe | lamptrappan bort (motorn släckte ett lamppar i low/intro) |
| bc1ac2a | Eko och Minnet över hyrkitets 4 platser vid 8+ lampor (oförändrat vid 4) |
| ae16640 | labbets favoriter = kod (DMX_LABFX borta) |
| ea7bb71 | **g1**: a8r:s punkt 2 (ettan om vid tempobyte) + 3 (rutnätet 5 ms tidigare) |

Ladan-raden: `PYTHONIOENCODING=utf-8 PI_HOST=10.171.211.218 python tools/ladan.py`. Backup-taggar: `fore-tvavagar-2026-11-08`, `tvavagar-f2`, `tvavagar-g1`.

**Pi:n (ARM, kärnorna 1 2):** workern ligger 1 hop efter (1–3 efter g1), 0 tappade hop, ~150 µs/hop. f1 med två trådar och kärnan 0 behövdes inte.

## Ranking

**Runda 1** (övning, mot bas):

| deltagare | kort | poäng | anmärkning |
|---|---|---|---|
| a5 | ettan och rutnätet | +9,68 | ettan 23→88 %, gridfel 32→13 ms; hittade barShift-buggen |
| a3 | flytta allt som inte är ljus | +8,64 | huvudtråden −43 %, md5 lika |
| a8 | rätt takt per analys | +4,10 | samma barShift-bugg (oberoende) |
| a2 | smal FFT | +3,06 | −15 % CPU, md5 lika |
| a4 | snittet mellan vägarna | +2,89 | väckningsspin (inte för Pi) |
| a7 | samma svar, mindre arbete | +1,54 | −8 %, md5 lika |
| a1 / a1m2 | en temposökning | +0,20 / **+10,79** | a1m2: diskad för ljus +4,1 %, återställd efter regeländringen |
| a6 | låtens form | +3,16 DISK→OK | låtgränsen 13→60 % |

**Runda 2** (remix från r0 = +17,70):

| | poäng | mot r0 |
|---|---|---|
| a5r | +26,19 | +8,49 |
| a6r | +21,13 | +3,43 |
| a7r | +20,21 | +2,51 |
| a8r | +19,23 | +1,53 |
| a1r | +19,10 | +1,40 |
| a3r | +19,02 | +1,32 |
| a4r | +17,34 | −0,36 |
| a2r | +9,56 | −8,14 |

**Fusion:** f1 +27,76 och f2 +29,25 (samma analys; f2 har en workertråd).

**Kontrollmängden** (lang1014, lang1107, var 4:e korpuslåt, dropklipp 2/5/8; ingen deltagare har sett den):

| | kontroll | övning | ljusdomaren | latens |
|---|---|---|---|---|
| **f1/f2** | **+26,92** | +27,76 | +1,1 | 130 ms |
| g1 (f2 + punkt 2/3) | +23,11* | – | −1,3 | **100 ms** |
| a8r | +20,25 | +19,23 | **+6,9** | 85 ms |
| g0 (f2, lamptrappan bort) | +20,53* | – | +1,7 | 130 ms |
| a5r | +12,79 | +26,19 | −0,6 | 130 ms |
| a1r | +5,45 | +19,10 | +3,6 | 135 ms |

\* mätt efter att lamptrappan togs bort. Fusionen håller på kontrollmängden, medan a5r ensam föll.

## IDÉBANKEN (alla diffar mot fore-tvavagar i den här mappen: `<id>.diff`, `<id>.md`)

| idé | ursprung | måttet den vann | status |
|---|---|---|---|
| barShift-buggen: ettan mot effektklockans eget rutnät | a5, a8 (oberoende) | ettan 23→88–97 % | **KOD** (f2) |
| bara ljuset i huvudtråden, resten i workern | a3 | CPU −43 %, md5 lika | **KOD** |
| en workertråd, taktvägen först (bigYield) | a3r | Pi-säker, 1 hop på ARM | **KOD** |
| en temposökning, snäpp bara vid > 3 % fel | a1, a1r | tempohopp −92 %, klipp_klocka +11 % | **KOD** |
| låtgräns: 8 s mot 80 s (form, kroma, tempo) | a6 | gr_ratt 13→60 %, falska −83 % | **KOD** |
| SECTION_CARRY 40 efter låtgränsen | a5r | upp_s 3,8→1,35 s (a7r: 120 = DISK) | **KOD** |
| looken bärs över låtgränsen till nästa sektion | a6 | lookbyte inte mitt i frasen | **KOD** |
| ettan om vid tempobyte + rutnätet 5 ms tidigare | a8r | latens 130→100 ms | **KOD** (g1) |
| småvinster: dropStep-min en gång, 2048-ring, pow per bandDb, seqlock-hopp | a7, a2, a8 | md5 lika, några % CPU | **KOD** (via r0) |
| tre biquad-band i ett svep | a2r, a4r (oberoende) | ~2 % huvudtråd, bit-identiskt | PROVA ENSAM |
| lotus: stora vägens buffertar bara när den kan slås på | a4r | lotus −2,3 MB delat minne | PROVA ENSAM (lotus) |
| a8r:s fulla tempoföljning (alltid tempogrammets topp) | a8r | ljusdomaren +6,9 på kontroll, men gridfel −48 % | PROVA ENSAM: vad ger a8r:s ljus? |
| a1m2: tempogrammet helt, oktavkanten 148 | a1m2 | ljusdomaren +8,0 (övning) | PROVA ENSAM mot g1 |
| drop-kroppen som 10-bins DFT i huvudtråden | a2 | onödig sedan stora vägen ligger i workern | bortvald |
| spinnande väckning | a4, a2r | – | bortvald (Pi: ström och värme, oprövad) |
| väckning var 3:e hop | a7r | −1,35 | bortvald |

## Lärdomar

1. **Ögat slog ljusdomaren på timing.** g1 gav ljusdomaren −1,3 mot +1,7 men "känns tightare" (latens −30 ms). Ljusdomaren väger
   dynamik och koreografi, inte hur tidigt ljuset sitter. Den behöver ett tajthetsmått till nästa arena (t.ex. ljusLag med större vikt).
2. **Ljusdomaren straffar rätt låtgränser**, eftersom en ny look ger slumpvis annorlunda ljus mot bas. Därför den lägre gränsen −3,0.
   Lookvalet efter gränsen döms i ladan.
3. **Remix från r0 fungerade.** De bästa delarna satt på olika ställen (a3 snabba vägen, a5 ettan, a6 gränsen, a1 tempot), och
   fusionen var bäst även på kontrollmängden.
4. **Kön är flaskhalsen:** en mätning åt gången, 5–11 min. Runda 1 + 2 + final tog ~8 h.

**Tokenåtgång (uppskattning):** runda 1 8 × ~0,3 M, runda 2 8 × ~0,1 M (fortsatta agenter), r0 + fusion + domaren ~0,8 M,
totalt ~4–5 M.
