# a6 – LÅTGRÄNS OCH OMLÅSNING: en klocka (B) för båda, en omlåsningssignal

**IDÉN.** Båda profilerna kör analyserClock.ts (B). Lotus egna sökning (A) är borttagen: OWN_TEMPO, computeBpm, scoreEnv/alignScore/shiftDetect,
lotus egen gridfas (computeGridPhase) och A:s omlåsningar (tempogramnollning och reacq-fönster i hintTrackChange, låssläppningen efter
8 s låg tillit). Profil utan BEAT_FEED ger nu 'inline' (lotus), och DMX:s 'slow' är oförändrad.
- **EN OMLÅSNING.** Låtgränsen har en väg: hintTrackChange() räknar upp trackBoundaries, och klockan läser räknaren (H_BOUND i taktvägen,
  direkt i inline) och kör BeatFeed.relock(). Källan är systemets egen: DMX BoundaryDetector (index.ts), lotus Sonos-bytet (alsaMic.ts:516).
  Tystnad > 10 s släpper klockan som förut.
- **EN FAS.** Ramens beatPhaseMs/beatPhaseConf är klockans publicerade rutnät (ankare med ettan) i process(). Lotus fasföljare och
  bänkens fas läser alltså klockan. beatAnchorMs är fortfarande senaste kicken, en händelse och inget rutnät.
- DMX är **md5-identisk** mot bas (tvavagar --snabb IDENTISK; DMX läser varken beatPhaseMs eller de borttagna vägarna).

## PER DEL
| del | A (lotus) | B (klocka) | sammanslagning / prov | val | siffran som bär valet |
|---|---|---|---|---|---|
| tempovalet | 396/503, syntet 6/8 | 441/503, syntet 5/8 | – | B | korpus +45 (lotusbank) |
| låsning, tempohopp | spann 9 BPM | spann 33 BPM, mix_hopp 0,05 | **a6-prov: grind på snabba minnets byte** (se nedan) | B (utan grind) | grinden: DMX gridfel 21,4 -> 28,8, mix_still 2,73 -> 3,15–3,65, lampspr DISK |
| fasen | 0,88 / motfas 33 / i fas 238 (n 399) | gridfas på klockans tempo 0,81 / 24 / 237 | klockans rutnät som ramens fas: 0,82 / 21 / 248 (n 452) | klockans rutnät | motfas -12, i fas +10, följarens råa puls 0,90 -> 0,95 (|off| 36 -> 24 ms) |
| ettan | analysatorns barShift (oförändrad, lotus konsument) | taktmodellen, ettan 100 | – | B i klockan | ettan 100 (DMX) |
| tilliten | localBpmConfidence | repeatRate x tgClear | – | B | (oförändrad mot B-baslinjen) |
| break/coast | F_SIL350/F_SIL10 + egen coast | coast + takten genom breaket | – | B | DMX identisk |
| omlåsning vid låtgräns | hint -> tempogramnollning, reacq-fönster, låssläppning vid låg tillit | trackBoundaries -> relock() | en signal (hintTrackChange -> trackBoundaries -> relock) | B (en väg) | DMX gr_ratt 73,3, mix_las 2,48 (identisk) |

### Kortets prov: omlåsning inne i låten
Klockans andra omlåsning är byte till det snabba minnet (TG_SW: snabba minnets topp på ett annat tempo i 2 varv -> ersätter det långsamma).
Diagnos i lotus korpus: klockans tempospann inom klipp (33 BPM) kommer nästan bara från sådana byten med tydlighet 0,04–0,23, alltså två
nästan lika toppar. Exempel: statusdeltva går 138 -> 80 -> 99 i ett break. Prov: bytet kräver att det snabba minnet har en tydlig topp (fclr >= X).
| prov | lotus 101 klipp (var 5:e) rätt / spann | swing-syntet | DMX (--mat) |
|---|---|---|---|
| utan grind (B) | 90 / 32 | 149,8 (fel) | bas |
| fclr >= 0,5 | 91 / 10 | 149,8 | mix_hopp 0,05 -> 0,00, mix_still 2,73 -> 3,65, mix_las 2,48 -> 2,68, latens 85, **lampspr lang1021 -26 % DISK** (mat1) |
| fclr >= 0,3 | 91 / 11 | – | mix_hopp 0,00, mix_still 3,15, **gridfel 21,4 -> 28,8**, **lampspr -24 % DISK** (mat2) |
| fclr >= 0,15 (offline, 4 lang-filer) | 90 / 12 | – | gridfel 26,9 (offline-kedjan gav exakt mat-värdena 21,4/28,8) |
| + syskon aldrig via snabba minnet | 89 / 10 | 100,2 (rätt) | ej mätt |
| + grind bara när klockan är låst (tillit >= 0,5) | – | – | gridfel 32,0 offline |
Bänken valde bort grinden: lotus vinner tydligt (spann 32 -> 11), men DMX förlorar fas och sektionslåsning och lampspridningen fäller den.
Grinden är **inte** med i leveransen. Den är en öppen idé: lotus tempohopp och DMX gridfel drar åt olika håll i samma regel.

## SIFFRORNA (leveransen)
- **DMX-domaren:** md5 IDENTISK mot bas -> +0,00, OK (samma värden som bas/tvavagar.json: mix_klocka 97,24, mix_las 2,48, mix_hopp 0,05, ettan 100,
  gridfel 21,4, upp_s 1,35, ned_s 3,00, latens 80). Ljusdomaren behövs inte (md5 lika). KRAV EN KÄLLA står kvar (klockan är enda tempokällan i båda).
- **Lotusbank (full, 503 + 8):** korpus **441/503** (A 396), syntet **5/8** (A 6/8, swing 100 -> 149,8), kick 0,80/0,86 (=), on-beat 0,84 (=),
  fas median **0,82** (A 0,88), motfas **21** (A 33), i fas **248** (A 238), n 452 (A 399), följare raw 0,95 (A 0,90). = B --fas klocka, tal för tal.
- **Mot lotus spärr:** korpus +45 och motfas/i fas bättre, men syntet -1 och fas-medianen -0,06 (på 53 fler låtar i samma oktav). Enligt
  lotusbank.py krävs ägarens godkännande ("tydligt uppvägt"), därför DISK enligt bokstaven.
- **Workerns µs/hop (DMX):** oförändrad mot bas, feedRealtid workerUs 46,2 (bas 43,7 i samma par), p99 6 hop, alltså under 130.
- Mätningar: DMX --mat 2 av 3 (båda var grindproven), lotusbank 1 av 3. Lotus- och lang-proven körde jag själv med egna skript
  (verktyg/spann.mjs, spar.mjs, tvavagarKor lang på 4 filer). De är längre än 60 s ljud men korta i tid. Jag redovisar dem som diagnos.

## VAR (fil:rad i .arena/klocka/a6/src)
- analyser.ts:49 OWN_TEMPO borttagen; :3137 clockMode() ger aldrig null (osatt = 'inline').
- analyser.ts:1107 scoreEnv/alignScore/shiftDetect, :1397 computeGridPhase, :1400 envStep (tom), :1676 computeBpm/tempoGramStep/bpmHistSort/offBeatStep, alla borta.
- analyser.ts:1708–1715 hintTrackChange = räknaren + sektionerna (A:s tempoackumulatorer borta); :3013 EN FAS (beatPhaseMs = klockans rutnät).
- analyserClock.ts: orörd (= engine/src).
- Diff: losning.diff (844 rader bort, 20 till).

## RISKEN
- **Lotus live på Pi:n:** klockan körs 'inline' i process() på analysatorns snabba tråd. Med LOTUS_ANALYSER_SPLIT=worker får den långsamma
  sidan i stället mindre att göra (computeBpm och gridfasen är borta). tgScore x 2 per hop över ~900 ringvärden är omätt på Zero 2 W
  (PC ~45 µs/hop i DMX:s worker). Budgeten är 2,67 ms/hop. Mät /api/perf före och efter. Faller den: BEAT_FEED 'slow' kräver en taktväg i lotus.
- Lotus konsumenter: piEngine matar fortfarande setAnalyserBeatGrid med sitt PLL-rutnät. Det skriver över klockans kickgrind (anaGrid)
  varje hop, och bänken gör samma sak (BENCH_GRID). Med EN klocka bör lotus sluta mata tillbaka (konsumentändring, inte gjord, inte mätt).
- Lotus barShift (ettans accent, cal.barAccent) räknas fortfarande av analysatorn mot lotus PLL-rutnät, så det finns en andra etta i
  analysatorn, som konsument. Klockans etta finns i beatPhaseMs-ankaret.
- Lotus tempospann inom låt är 9 -> 33 BPM (klockans byten i break). Det syns live som kortare tempohopp i lotus. Grinden ovan löser det
  för lotus men inte för DMX.
- Sonos-hinten kommer vid låtbytet, ofta FÖRE ljudet har bytt. relock() nollar tempogrammet medan ringen fortfarande har förra låten, så
  nya låten tas av det snabba minnet. Det är omätt (ingen bänk har lotus hint-tider).
- ANALYSER_SHARED.md5 (deployspärren) måste räknas om när analyser.ts portas. Lotus kopia av analyser.ts ska ersättas samtidigt.
- Döda fält efter A (tempoGram, barAcc-taktfasen i silenceStep m.fl.) finns kvar. Kod som läser dem påverkar inte md5, men de kan städas.
