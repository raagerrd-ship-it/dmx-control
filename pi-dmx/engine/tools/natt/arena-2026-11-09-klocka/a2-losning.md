# a2 klocka – B-DELAR IN I A (analysatorns sökning blir den enda)

## IDÉN
EN klocka i båda profilerna = **A:s tempoval + B:s rutnät ovanpå**.
- Tempovalet är alltid analysatorns egen sökning (computeBpm/scoreEnv/alignScore/shiftDetect). Lotus LIVE-rattar är nu kod i båda: EVIDENCE, ENV_S 10, UP43, FIVE4, LAGMAX half, OCT_UP 24, SUBH av, GHOST av. DMX-profilens tempo-rader är borta.
- Klockan (analyserClock.ts BeatFeed) körs alltid, i lotus i process() och i DMX i taktvägen. Den läser A:s tempo ur ramen (frame.bpm före klockan) och lägger ovanpå: rise-rutnätet (onsetStep), taktmodellens etta (barStep), tilliten (repeatRate × tydlighet; tydligheten = A:s bpmConfidence i stället för tgClear), break/coast och relock vid låtgräns (H_BOUND).
- Klockans eget tempogram är borta: tgScore/tgStep, de två minnena, kronan och oktavkanten.
- Ramen publicerar klockans rutnät. frame.bpm/bpmConfidence = klockans. frame.beatPhaseMs = klockans publicerade ankare, och beatPhaseConf = 1 + tillit (lotus skala). Analysatorns gridfas (computeGridPhase) är av i båda. Det finns alltså ett rutnät och en fas.
- Med lås skannar klockan kring A:s tempo (±1,25 % i 0,25 %-steg). Det är v2, den levererade. v1 snappade bara när avståndet var > 3 % och skannade annars ±2,5 % kring sitt eget tempo (se tabellen).

## PER DEL
| del | A (lotus sökning) | B (klockan) | sammanslagning | mitt val | siffran |
|---|---|---|---|---|---|
| tempovalet (klipp/mix, oktav, 2:3/4:3/5:4) | lotus 396/503; DMX klipp 86,5 %, mix 89,9 % | lotus 441/503; DMX klipp 98,3 %, mix 97,2 % | – | **A** (kortet) | DMX klipp −11,8 p, mix −7,4 p. **B vinner tempovalet klart i DMX** |
| låsning/tempohopp | mix_las 7,34 s, hopp 0,88/min | 2,48 s, 0,05/min | – | A | B är klart bättre. A låser långsamt (lang1021: 24 s innan 156–160, B 3 s) |
| fasen (gridfel, grid40, lotus fas) | lotus gridfas 0,88 / motfas 33 / i fas 238 | B:s rutnät på A:s tempo | **B:s rutnät på A:s tempo** | sammanslagning | lotus fas **0,90 / 18 / 253** (A 0,88/33/238); DMX gridfel v2 88,1 ms, v1 20,6 ms (bas 21,4) |
| ettan | A:s barShift (kickvikt) | taktmodellen (barStep) | B | B | DMX ettan 100 (v2), 94,2 (v1) |
| tilliten | A:s peak-to-mean | repeatRate × tgClear | repeatRate × A-konf | sammanslagning | ljusdomaren −1,23 (v2). A-konfidensen ligger 0,8–1,0 i musik och tillför lite information |
| break/coast | A:s TEMPO_HOLD | klockans coast + dropens upptag | båda kvar (A håller tempot, klockan rullar) | B ovanpå A | drop_traff 100 = bas |
| omlåsning vid låtgräns | hintTrackChange | relock() (H_BOUND) | båda (A:s hint + klockans relock) | båda | gr_ratt 73,3 → 60,0, gr_falska 0 → 0,24 |

## SIFFRORNA
**DMX (tvavagar --mat, övning, mot bas = HEAD):**
| | mix_klocka | mix_las | mix_still | mix_hopp | klipp | ettan | grid40 | gridfel | upp_s | ned_s | korta | gr_ratt | gr_falska | latens | ljusdomaren |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bas | 97,24 | 2,48 | 2,73 | 0,05 | 98,28 | 100 | 52,9 | 21,4 | 1,35 | 3,00 | 30,3 | 73,3 | 0 | 80 | – |
| **v2 (levererad)** | 89,85 | 7,34 | 5,38 | 0,88 | 86,56 | 100 | 46,4 | 88,1 | **1,90** | −0,05 | 29,1 | 60,0 | 0,24 | 80 | −1,23 |
| v1 (snap 3 %) | 89,92 | 7,34 | 7,32 | 0,78 | 86,54 | 94,2 | 51,75 | 20,6 | **1,90** | 1,50 | 27,5 | 60,0 | 0,24 | 85 | −3,07 |

Poängen räknad med domarens formel: v2 = 0,6 × −25,38 + 0,4 × 0 = **−15,2**, och v1 = −15,6.
**DISK** på sektionsspärren: upp_s 1,90 > 1,45. Ljusdomaren −1,23 ligger dessutom under −0,5, så v2 är DISK även med −3,0-gränsen för EN KÄLLA om upp_s räknas. v1 når inte heller −3,0 (−3,07).

**LOTUS (lotusbank, 503 + 8, fas = ramens fas = klockans), v2:**
| | korpus | syntet | kick R/P | on-beat | fas med / motfas / i fas (n) | fasBt | följare raw (\|off\|) | spann |
|---|---|---|---|---|---|---|---|---|
| A nu | 396/503 | 6/8 | 0,80/0,86 | 0,84 | 0,88 / 33 / 238 (399) | 0,89 | 0,90 (36 ms) | 9 |
| **a2 v2** | **397/503** | **6/8** | 0,80/0,86 | **0,84** | **0,90 / 18 / 253** | 0,90 | 1,00 (21 ms), n 181 | 11 |

Lotus-spärren är **OK**: ingenting är sämre än A, och fasen är klart bättre.

Snabbmängden (126 filer) som valde vägen: A 98, fas 0,87/9/60. A-tempo med A:s gridfas gav 97, fas 0,90/10/62. A-tempo med klockfas (v1) gav 97, fas 0,90/6/67. v2 gav 98, fas 0,90/5/67.
Följarens raw-n sjönk från 87 till 38 på snabbmängden. Orsaken är att bench.mjs nollar följaren när g.bpm ändras, och klockans fintempo rör sig. Det är inget spärrmått.

**Workern:** v2 40,2 µs/hop och v1 33 µs/hop (bas 43,6) i feedRealtid. p99 6 hop, bas 6.
cpu-kvoten är 0,91 för v2 och 0,89 för v1. Pi-budgeten håller.

## VAR VÄGEN TOGS BORT (a2/src mot engine/src)
- analyser.ts:49 `OWN_TEMPO` borttagen, liksom alla grenar: envStep:1651 (envStepOwn = enda env-steget), pullSlowState:1743, slowStep:1920 (R_CLOCK), pushSlowRecord:1723, process:2805 och setClock:2522 (borttagen). Kickspärren:3127 och grinden:3146/3273 har en väg (klockans rutnät).
- analyser.ts:3961 `clockMode()`: osatt ger 'inline', så klockan finns alltid. createAnalyser skapar alltid en klocka.
- Rattarna är kod: analyser.ts:63, 273, 275, 289, 404, 408 (GRID_PHASE av), 706, 719, 723 och 811 (rader i engine/src).
- analyserClock.ts: tgScore:227 och tgStep:255 med konstanterna TG_HOLD/TG_SIB/…:103–120 är borta. update() läser A:s tempo och skriver beatPhaseMs/beatPhaseConf. an.setClock är borta.
- split.ts: HopLaneFast.feed skriver beatPhaseMs/beatPhaseConf, clockBpm/clockConf är borta och R_CLOCK/R_CLOCK_CONF används inte längre.
- analyserProfile.ts (DMX): TEMPO_LAGMAX, GHOST_WAIT, SUBH_GUARD, OCT_UP och SUBH_MULT är borta.
- Diffen ligger i `losning.diff` (v2). v1 är `v1-mot-v2.diff` (snap-raden), och mätningarna ligger i tvavagar-v1/v2.json och lotusbank-*.json.

## RISKEN
- **DMX blir sämre.** Kortets tes håller inte för tempovalet. A låser långsamt (ENV_S 10 s, röstning), byter tempo 0,88 gånger/min i mixen mot 0,05 och missar klippens första 5 s. upp_s blir 1,90 och fäller sektionsspärren. Bänken säger att B ska välja tempot i DMX. Från A är bara fasen, när den läggs på klockans rutnät, värd att ta med.
- **Fasdelen är ett äkta fynd för lotus.** Klockans rise-rutnät på A:s tempo ger lotus fas 0,88 → 0,90 och motfas 33 → 18 med samma korpus rätt. Den biten ska med oavsett vilken sökning som vinner.
- **Kniveggen v1/v2:** att alltid skanna kring A:s heltalstempo (v2) håller lotus korpus (+1 låt) men förstör DMX gridfel (21 → 88 ms). Snap-varianten (v1) ger DMX gridfel 20,6 men tappade 1 av 126 i lotus snabbmängd. Lotus full för v1 är inte mätt (budgeten är slut).
- **Lotus live på Pi:n:**
  - lotus konsumenter (alsaMic.ts:512 setBeatGrid med motorns PLL-grid) skriver över klockans setBeatGrid varje hop, så kickgrinden och A:s barShift ser lotus grid. Grind-konfidensen är nu grid.confidence, och om lotus grid saknar den blir barShift-taktfasen död (heartbeat accent). Ettan bör tas ur klockan (barOff i ankaret) vid porten.
  - beatPhaseMs ändras nu var 250 ms (klockans fixar) i stället för 4 Hz-gridfasen, och beatPhaseConf ligger i 1–2. PHASE_FOLLOW (opt-in) och fasflipp-trösklarna i piEngine.ts:1960–1980 måste ses över.
  - Klockan körs i lotus process()-tråd: + ~en vikning per hop. Det är billigare än tempogrammet och mätt på PC, inte på Pi.
  - Inga env-flaggor finns kvar för tempot. LOTUS_TEMPO_* i Pi:ns env saknar nu verkan (koden har samma värden).
