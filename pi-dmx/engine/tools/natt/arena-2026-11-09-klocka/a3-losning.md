# a3 – SAMMANSLAGNING AV TEMPOVALET (klocka)

## IDÉN
EN klocka för båda: analyserClock.ts (B) körs i båda profilerna. Lotus profil saknar BEAT_FEED och får nu `'inline'` (klockan sist i process()),
DMX har kvar `'slow'` (taktvägen). Lotus egen sökning (A: computeBpm/scoreEnv/alignScore/shiftDetect/tempoGramStep/offBeatStep, envStepOwn,
OWN_TEMPO-grenarna och analysatorns egen gridfas) är BORTTAGEN, inte avstängd. Ingen env-flagga.

Tempovalet slås ihop i klockans tgStep: båda signalerna röstar på samma ring.
- **Rise-vikningen (B, tempogrammet)** dömer varje tempo på (topp + halvslag)/2, bas x diskant. Halvslaget fäller 4/3- och 3/2-fantomerna,
  men det GYNNAR 3/4-fantomen: på 3/4 av tempot landar slagen på fyra jämnt fördelade faser, så både toppen och halvslaget har slag.
  Det var B:s 4/3-klass på lotus (21 låtar, t.ex. Klaas Cambodia 130 -> 97,6).
- **Kickvikningen (A:s princip, slagets topp)**: TOPPRÖSTEN `peakVote`/`peakScore` = basens topp/medel x diskantens topp/medel, utan halvslaget.
  Kvotlogiken är uttalad: syskonen 4:3, 3:4, 3:2, 2:3, 5:4 och 4:5 (vikta in i [80, 160)) är icke-heltalskvoter. Där sprids de riktiga slagen
  över 3–8 faser, så toppen späds ut åt BÅDA hållen. Oktaven och undertonerna ingår inte, för där späds toppen inte ut.
  Ett syskon tar över om dess topp är minst `HV_K` = 1,25 x valets, `HV_N` = 3 varv i följd. Det regerande tempot får samma faktor (hysteres).
  Rösten är öppen bara i låsets första `HV_AGE` = 30 varv (~11 s: kallstart, efter relock/tystnad). Därefter står den valda tempoklassen
  kvar mot ett syskon tills syskonets topp är 1,25 x högre. Inne i låten gäller tempogrammet och kronan som förr: DMX-lång-filernas sektioner
  blev bit-identiska med bas (lang1021, pop, lang1011). Rösten utan fönster gav DISK, se nedan.
- **Oktaven under kanten**: ett halvslag under `TG_OCT_LO` = 79,6 BPM blir alltid dubbla (båda bänkarnas facit och lotus BPM_MIN/MAX ligger
  i [80, 160)). B föll här på 80,0 = klämd 78,x i lotus 20 "dubbla" (155–159). Fixen var DMX-neutral på alla lång-filer.
- **EN FAS**: med inline-klockan skriver process() klockans publicerade rutnät till `frame.beatPhaseMs`/`beatPhaseConf`
  (= 1 + tillit; analysatorns computeGridPhase körs inte längre). Lotus följare och BLE-tick läser alltså klockans fas.

## TABELLEN PER DEL
| del | A (lotus) | B (klockan) | sammanslagning (a3) | val | siffran som bär valet |
|---|---|---|---|---|---|
| tempovalet, lotus 503 | 396 | 441 | **474** | sammanslagning | 4/3-klassen 22 -> 7, dubbla 24 -> 2, 3/2 7 -> 6; syntet 6/8 (B 5/8: swingen 100 -> 149,8 rättad) |
| tempovalet, DMX klipp/mix | – | 98,28 / 97,24 | 98,61 / 97,31 | sammanslagning | klipp_klocka +0,3 %, mix_klocka +0,1 % |
| låsning/tempohopp | spann 9 BPM | spann 33, mix_hopp 0,05 | spann 22, mix_las 2,48, mix_hopp 0,05; **mix_still 2,73 -> 3,24** | B + röst | mix_still är kostnaden (röstfönstret efter varje skarv) |
| fasen | fas 0,88/33/238, raw 0,90 (36 ms) | gridfel 21,4, grid40 52,9 | lotus fas **0,84**/15/257, fasBt 0,85, raw **0,96 (23 ms)**; DMX gridfel 23,0, grid40 51,7 | B (klockans fas) | motfas 33 -> 15, i fas 238 -> 257, |offset| 36 -> 23 ms; medianen 0,88 -> 0,84 (se RISKEN) |
| ettan | – | 100 | 100 | B | ettan 100 |
| tillitens informationsvärde | lotus bpmConfidence | repeatRate x tgClear | B oförändrad, lotus beatPhaseConf = 1 + tillit | B | inget mått ändrat |
| break/coast | lotus coast | B:s coast/BREAK_RESTORE | B | B | upp_s 1,35 / ned_s 3,00 = bas |
| omlåsning vid låtgräns | hintTrackChange | H_BOUND -> relock | B (relock öppnar röstfönstret igen) | B | gr_ratt 73,3, gr_falska 0 = bas |

## SIFFRORNA
- **DMX-domaren (andra --mat, slutvarianten):** poäng **-0,99** (långsamma -1,64 %, snabba 0), ingen DISK. Mått: mix_klocka 97,31,
  mix_las 2,48, mix_still 3,24 (-18,6 %), mix_hopp 0,05, klipp_klocka 98,61, ettan 100, grid40 51,66, gridfel 23,00 (-7,5 %), upp_s 1,35,
  ned_s 3,00, traff 100, korta 30,34, drop 100/5,71/216, gr 73,33/0. md5 skiljer -> ljusdomaren **+0,06** (inga spärrar).
  Latens 80 ms (= bas), huvudtråd 55,2 µs/hop (kvot 1,025, inom bruset), realtid p99 6 hop (X = 7).
  - Första --mat (röst utan fönster): **DISK**, upp_s 2,85 och ned_s 3,50, ljusdomaren -0,7. Rösten bytte mitt i lång-filerna
    (lang1011 96 <-> 128, lang1021 160 -> 107/128). Därför fönstret och klasslåset.
- **Lotusbank mot A (full körning, 503 + 8):** korpus **474/503** (A 396, B 441), syntet **6/8** (A 6/8), kick R/P 0,80/0,86 (=),
  on-beat-recall 0,84 (=), fas median **0,84** (A 0,88) / motfas **15** (A 33) / i fas **257** (A 238), n 446, fas mot Beat This! 0,85
  (A 0,89), följare raw 0,96 (A 0,90), |offset| 23 ms (A 36), spann 22 BPM (A 9). Utfall: lotusbank.out/json.
  Snabbkörning först (126 filer): A 98, B 113, a3 121.
- **Workerns µs/hop:** 43,4 (bas 46,2), under gränsen 130.

## VAR OWN_TEMPO/A TOGS BORT (.arena/klocka/a3/src)
- analyser.ts:49: `OWN_TEMPO` borttagen. Grenarna i envStep, pullSlowState, slowStep och kickspärren/grinden (förr 3127/3146/3273) går nu alltid klockans väg.
- analyser.ts:1107: scoreEnv/alignScore/asRing/shiftDetect borttagna (förr 1107–1297).
- analyser.ts: envStepOwn borttagen (förr 1656–1670), och computeBpm/tempoGramStep/bpmHistSort/offBeatStep borttagna (förr 1945–2488).
  Filen gick från 3961 till 3213 rader.
- analyser.ts:1463: envStep kör inte längre computeGridPhase (EN FAS). analyser.ts:3090: klockans rutnät går till ramen.
- analyser.ts:3213: `clockMode()` ger aldrig null; osatt BEAT_FEED = 'inline'.
- analyserClock.ts:121: HV_*/TG_OCT_LO. tgStep: oktaven under kanten + `peakVote`. Nya metoder: peakVote/peakScore. tgReset nollar röstens tillstånd.
- Diff: losning.diff (git diff --no-index src .arena/klocka/a3/src).

## RISKEN
- **Lotus fas-median 0,88 -> 0,84** bryter lotusbank-spärren om inte ägaren godkänner. Mot det står +78 korpus, motfas 33 -> 15 och
  i fas +19 med följaren tätare (36 -> 23 ms). Medianen mäts dessutom på en annan mängd: n 399 -> 446, alltså fler låtar i rätt oktav.
  Spannet inom låt 9 -> 22 BPM: klockans tempo vandrar mer än A:s gjorde.
- **Lotus live på Pi:n:** klockan körs nu i lotus SNABBA tråd (inline, sist i process()), inte i workern. Lotus har ingen taktvägs-konsument (hopLane).
  Kostnaden per hop ligger i huvudtråden: tgStep med två tgScore per hop, plus röstens 7 vikningar per varv (~0,37 s) under de första
  ~11 s efter varje låtgräns. Det är inte mätt på Pi Zero 2 W. Kontrollera /api/perf (process() µs) före och efter. Om det inte räcker ska
  lotus få 'slow' + en hopLane.feed-konsument i piEngine (utanför arenan: lotus-light-link rördes inte).
- Lotus konsumenter: `beatPhaseConf` har nu skalan 1..2 (1 + tillit), inte analysatorns kvot 1..9. Följarens flipgrind (PHASE_FLIP_CONF 2,0)
  nås alltså aldrig, så halvslagsflippar sker inte. Det är avsiktligt, eftersom klockans fas redan är rätt (motfas 15), men lotus LOTUS_PHASE_FOLLOW-vägen ska ses över.
  frame.beatAnchorMs är fortfarande analysatorns senaste kick, som lotus använder vid nytt grid.
- DMX: mix_still -18,6 % (2,73 -> 3,24 s). Röstfönstret efter varje skarv kan flytta tempoklassen en gång. Det ger ingen DISK, men det är totalens minus.
- Kontrollmängden har jag inte mätt. Rösten (HV_K 1,25, HV_N 3, HV_AGE 30) är satt på några få lotusfiler (Cambodia, Jamming, Stora tuttar,
  Timmy Trumpet, Mike Mana, 3 Doors Down) och kontrollerad för bit-identitet på DMX-lång-filerna. Den är inte finjusterad på bänkens totaler.
