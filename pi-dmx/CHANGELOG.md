# Ändringslogg

## v0.3.2 — musikalisk bandindelning (0 CPU)

- **`kickBins` 3 → 1**: BPM-envelopen (`kickFlux`, som även sätter `kickAtMs` och därmed beat-fasen) summerade bin 0–2 i 512-FFT:n ≈ 0–280 Hz. Bin 1–2 är basgång och lerighet, inte trumma: en rullande bas (techno/psy) smetade ut kick-pulsen och gjorde autokorrelationen och MAD-tröskeln otydligare. Nu läses ENBART bin 0 (~0–94 Hz), dvs bastrummans transient. Effekternas kick/bas-separation är oförändrad — den kommer från 2048-FFT:n.
- **Bandkanter `2000/5000` → `1200/3500`**: band 5 (`highMid`) blir en dedikerad snare/presence-kanal 1,2–3,5 kHz där backbeatets snärt faktiskt ligger, i stället för 2–5 kHz som domineras av sångkonsonanter och cymballäckage. `snareHit` (bandOn[5]) och punch-mixen extraherar därmed slag 2 och 4 renare ur mixen.
- Rå RMS för `level` behålls medvetet (ingen A-viktning/FFT-level): AGC-percentilen och centroid-kalibreringen är fittade mot den, och vinsten motiverar inte omkalibreringen.
- MÄTT (`testBpmHard.mjs`, 8 seeder): medianer identiska med v0.3.1 — testsignalerna saknar basgång, så ändringen är riskfri där och vinsten ligger i verklig musik. `testPulseHalve.mjs` OK.

## v0.3.1 — BPM-port från lotus-spegeln (riktad cherry-pick)

- **BPM-intervall 80..160 → 60..180** (`Analyser.BPM_MIN/MAX`). Inte längre en oktav (ratio 3) med flit: 60..180 rymmer BÅDA representanterna för allt mellan 60 och 90, så en lugn låt på 70 behåller sitt tempo i stället för att tvingas upp till 140 — och 165–180 (hardstyle, psy, dnb-halvtempo) viks inte ner till halvtempo. Vikningen garanterar därmed ingen unik representant; oktaven avgörs av off-beat-testet och oktavgrenarna. Terminering kräver bara `MAX >= 2*MIN`. Samma intervall i `tools/refineSong.mjs` (båda vikningsställena) — divergens där gav beat-grid på fel oktav eftersom `index.ts` laddar refinerns tempo med full tillit. Sökningen täcker redan 55..185, så bytet kostar ingen CPU. MÄTT (8 seeder): `kick 1&3 (90)` 0 % → 100 %.
- **Asymmetrisk oktavrättning**: `OCT_UP = 8` (~2 s bevis att DUBBLERA), `OCT_DOWN = 24` (~6 s att HALVERA). Ett halvtempo-lås är trögt fel men körbart, ett dubbeltempo-lås strular med varje effekt — och med det vidare intervallet är halvtempo representerbart och satt annars kvar: symmetriska 8/8 sänkte svag bas 132 till 75 % och breakdown 142 till 72 %, `OCT_DOWN = 24` tog tillbaka båda (100 % / 88 %). Grannrättningen är däremot SYMMETRISK — dubbla röster nedåt PROVAT och förkastat (brusigt rum 45 % → 31 %, shuffle 29 % → 16 %, ingen vinst).
- **Låg-BPM-spärren i `effects.ts`** räknad om mot det nya intervallet (95 → 100). Med 60..180 är ett tempo under 100 oftast en faktiskt lugn låt, så spärren är meningsfull igen.

- **Oktav-migration i låtminnet**: lagrade tempon kan ligga i det gamla intervallet. Lagret nollställs INTE — `foldBpm()` viker vid varje läsning och innan blandningen i `mergeInto`, så en gammal 85 aldrig blandas med en ny 170.
- **Oktav-commit 60 → 24 estimat**, och `committedNow` (låtbytesvakten) sänkt till SAMMA tal. Skilda trösklar gav ett dödläge: oktav- och grannrättning stängd medan `bpmStable` bara växer i glid-grenen ⇒ ett lås 33 % fel kunde inte lämnas förrän tystnad.
- **Konfidensbaserad låssläppning** (ny): `bpmConfidence < 0.3` i 8 s → mjuk `hintTrackChange(5000)` (tempot behålls som startgissning, historik/röster töms, sökningen vidgas). Ger `hintTrackChange()` sin första anropare i DMX.
- **Flanktriggad tystnads-släppning**: reseten körs en gång på flanken i stället för varje tyst hop (500 tempogram-skrivningar × 375 Hz). Tempot behålls (billig stride, snabb återinlåsning), tempogrammet halveras, full släppning först efter 10 s tystnad.
- **Inte portat** (medvetet): lotus sammanslagna `hintTrackChange(ms, keepBpm)` — DMX behåller `resetTempo()`/`hintTrackChange()`/`clearLockVotes()` eftersom `resetTempo()` anropas från `index.ts`. Inte heller `Frame.specAbs`/`bandAbs`, `maxGain`-ratten eller grannrättningens no-op-grind.


## v0.3.0 — driftstabilitet (portat från Lotus-motorn)

- **Percentil-AGC på mic-vägen**: envelopen är 95:e percentilen (näst största av 16 blockmaxima à 128 ms) av RÅ rms i stället för en EMA av den gainade momentannivån. Långsam attack, snabb retreat. Mätt i ny bänk (`tools/testAgc.mjs`, 8 seeder): pinnad nivå 0 %, klipp 0 %, och uppbyggnaden syns (nivå intro/build/drop 0,15 / 0,30 / 0,35). Aux-vägen är oförändrad (gain låst 1×), så hela BPM-sviten ger identiska siffror.
- **Realtidshälsa** (`runtimeHealth.ts`): chunk-fps, render-fps, event-loop-lag, render-jitter, ALSA-overruns och långa anrop (>50 ms) exponeras i `GET /api/health-log` under `runtime`. Max-värden är peak sedan förra hämtningen.
- **Tyst stall-detektering**: arecord kan leva men sluta leverera (ALSA-enheten hänger) — då fyrar varken `exit` eller `error`. Vakten dödar processen efter 1500 ms utan data; befintlig respawn tar över.
- **Minneshärdning**: motorns heap-tak 200 → 112 MB (+ `--max-semi-space-size=8`), BLE-sidecarn 80 → 64 MB, och `vm.swappiness=10` från installern. Swap-in under GC var källan till flera hundra ms frysningar på Zero 2 W.
- **BLE anti-churn**: golv 2 s mellan anslutningsförsök per slinga, 5 misslyckade inom 30 s → 15 s paus, samt begränsad avstängning (800 ms tak) så en omstart inte fastnar i BlueZ.
- **Loggtak**: overrun-rader och BLE-anslutningsfel skrivs högst en gång per 10 s respektive 30 s — räkningen finns kvar exakt i hälsomåtten.


## v0.2.2 — grannrättning + reproducerbar bänk

- **Grannrättning av tidigt lås**: ett lås från 0,5 s-fönstret kunde hamna 10–20 % fel (t.ex. 122 mot 136) och satt kvar hela låten — glid-bandet slutar vid ±11 % och oktav-grenen börjar vid 1,4×, felet låg i ett dödområde. Nu räknas ~2 s bevis före commit, med samma tre skydd som låtbytesvägen: sammanhållen utmanare (±4 %), konfidensgolv 0,75 och tömd medianhistorik vid omlåsning. Committade lås rörs inte.
- **Bänken mäter över flera brus-seeder** (`SEEDS=8`, median + min–max) och markerar när låstiden träffar 500 ms-golvet (= första möjliga anrop, inte en mätning) samt seeder som aldrig låser.
- Mätning: brusigt rum 136 gick från 1/8 seeder helt fel (0 % rätt hela låten) till 8/8 rätt (den svåra seeden låser på 2,5 s). Övriga scenarier oförändrade; 19–24 µs/hop.

## v0.2.1 — analysator-städning

- **Grid-coasting**: beat-rutnätet frilöper i 4 s vid låg konfidens i stället för att glida/hoppa; auto-omlås därefter.
- **Crossfade-omlås**: tidsbaserad bevisföring (1,5 s vid dominant rival, 4 s vid stark, annars 25 s) + hälsogrind mot falska omlås i breakdowns.
- **Precision-PLL**: kick-tidsstämpel (sub-hop parabolisk fluxtopp) tar bort ALSA-batchningens ~8 ms jitter.
- **Taktfas (downbeat)**: `beatIdx = 0` landar på musikens etta.
- **Snabb omlåsning** vid låtgräns från låtminnet (~0,5 s).
- Död kod borta: `bodyZoneState`, `breakAtMs`/`breakHoldMs`, drop-debugglogg, `frame.mid`/`frame.treble`/`levelRaw` (effekter använder `spec.mid`/`spec.treble`).
- Prestanda: förberäknad `hopMs`/`dtHop`, parabolisk BPM-topp läser `acScratch` (−3 O(N)-loopar per anrop), `barShift` bara vid bokfört slag.
- Mätning: breakdown 142 BPM 82 % → 100 % rätt; lås 499–669 ms; 20–55 µs/hop.

## v0.2.0

- Låtminne, replay-ljusshow, Regi-flaggor, beat-synk-lägen, wizard, export/import, watchdog, typskylt.
