# k1f – riktad: kick->ljus på snabbt tempo, sektionsspärren orörd

**IDÉN.** Ljuset får en egen spärrregel på SAMMA kickdetektor. Det är samma anslag, samma grind (klockans rutnät) och samma flank. Från
130 BPM släpps ett anslag som ligger på klockans slag redan 170 ms efter förra ljuskicken, i stället för efter analysatorns spärr (0,6 slag,
tak 330 ms). Analysatorns kick är f0:s. Den driver sektionernas kicktäthet, ankaret/kickAtMs (tilliten och ettan), profilens punch,
basgången och drops. Därför är alla 17 mått bit-lika med f0 (mätt i alla tre --mat). Ingen andra tempokälla: slaget är klockans
rutnät, samma `beatSrc.beat` som grinden läser.

## KRAV EN KÄLLA (fil:rad i `.arena/entempo/k1f/src`, samma som f0 – D1/D2 rör ingen av dem)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1740/1767 setClock/trackBoundaries (computeBpm/scoreEnv borta som i f0); analyserClock.ts:108 KICK_PHASE_MS, kickgrind = klockans inre rutnät (null i coast). Ljusets släpp (analyser.ts:2423) läser samma rutnät (`gk = this.beatSrc.beat`) |
| 2 | en tillit | analyserClock.ts:359 (ramens bpm/bpmConfidence = klockan), split.ts:244. kickAtMs (tilliten) = analysatorns kick, orörd |
| 3 | en takträknare | effects.ts:2010–2027 (f0, orörd) |
| 4 | en pulskurva | effects.ts:1302 (f0, orörd) |
| 5 | låtgränsen | analyserClock.ts:349 -> relock() :332, split.ts:236 H_BOUND (f0, orörd) |
| A | klockan i analysatorn | som f0 |

## DELAR mot f0 (`mot-f0.diff`, 93 rader, bara analyser.ts)
| del | mekanism | var |
|---|---|---|
| **D1** | `drum.kick` (effekternas kick-envelope, t.ex. lab-lookens `hit`) = `kickHitL`, som drivs av ljusets kick `kl` med samma tau 150 ms. Analysatorns `kickHit` (profilens punch, basgången) är orörd | analyser.ts:337, :2274, :3077 |
| **D2** | `frame.kick` = `kl` (index.ts registerKick + kick-bypass = livevägen, rytm --live-kick) | analyser.ts:3083 |
| gemensam | `kl`: flanken och grinden är analysatorns. Egen spärrklocka `lastKickLight`. `cool` = 170 ms om cb >= 130 BPM och anslaget ligger inom grindens tolerans (max(30, 0,15 slag)) från klockans slag, annars f0:s spärr | analyser.ts:44 LIGHT_FAST_BPM, :2419–2426, :1822, :1863 |

D1 och D2 är oberoende. D2 under 130 BPM motsvarar a1f:s D1. a1f släppte på alla tempon, k1f bara på snabbt. Inga nya objekt per hop:
två skalärer (lastKickLight, kickHitL, båda Double från start) och en boolean. Kostnaden är en modulo och två jämförelser per
anslagsflank, på snabba sidan. Workern är orörd: 23,4 µs/hop (f0 23,2), p99 5 hop (bas 7).

## SIFFRORNA (övning, M3 = `tvavagar.json` = levererad kod)
- **k1f +7,69 OK** (f0 +7,69 utan bonus, alltså 0,00 mot f0 utan bonus; bonusen är inte mätt). Långsamma +8,90 %, latens 80 ms.
  Ljusdomaren +6,6 utan spärrar (f0 +5,6). upp_s/ned_s 1,35/2,15. Alla 17 mått är bit-lika med f0.
- **Domarens latens (ljusLag utan --live-kick) rörs inte på övningen** (10/50/20). På lang1021 (136–160 BPM) har ramens och
  drum.kicks kickar inget mätbart genomslag på ljusLag-kurvan.
- **M1 (släppet på alla tempon, och analysatorns kickHit = ljusets):** ljusdomaren +7,7 men **DISK lampspr megamix −8,5 %**.
  - **M2 (bara drum.kick, kickHit orörd):** samma DISK, samma lampspr 0,2966 mot bas 0,3242. Egen rytm-körning med basgången
    tillbaka på analysatorns kick: 0,297. Orsaken är alltså **fler drum.kick-anslag på långsamt tempo** (megamix ~90 BPM), inte
    profilen och inte basgången.
  - **M3 (tempogränsen 130 BPM):** megamix lampspr 0,317 (= f0), pop 0,365, lang1021 0,370, inga spärrar.
- **Egna ljusLag-körningar (8 av 8):**
  - **lang-20261012T110658** (126–155 BPM, de första 300 s): bas 5/55/40, f0 5/50/35. Felet syns inte.
  - **Snabbmix 145–152 BPM** (frozen6: 12 klipp snart-tystnar 152 + 2 rivstart 145, −17 dBFS, 560 s): bas, f0 och k1f (M1)
    gav alla 5/50/10. Lyftet var 0,69/0,68/0,68. **Felet syns inte heller här.**
  - **lang-20261028T181533** (126 BPM, systerfil till kontrollens lang1028):
    - k1f bara drum.kick/frame.kick: 10/50/35, alltså som f0 (a1f: f0 t90 35, a1f M1 15, bas 15).
    - Med kickHit = ljusets (M1-varianten): 10/50/**25**.
  - **rytm --live-kick megamix:** se lampspr ovan.
- **Kickfördröjningen** (eget diagnosverktyg `k.mjs`/`dk.mjs`, räknas inte som körning). Där syns släppet:
  - 110658@270 (150 BPM): f0 42,7, k1f 34,7, bas 24 ms (median, första kick efter basansatsen).
  - Snabbmixen@120: p75 69 -> 59 ms.
  - Täckningen: andelen ansatser som har en kick inom 120 ms går upp, 80 -> 106 av 120.
  - Kickarna blir fler: 201 -> 227 och 222 -> 255 per min, mot basens ~210.

## SLUTSATS OM ROTORSAKEN
Kontrollmängdens t90 35 -> 65..85 ms **sitter inte i ljusets kickväg** (drum.kick/frame.kick). Det syns i domarens ljusLag, som inte
läser frame.kick, och drum.kick ensam flyttar inte t90 på 181533. Däremot flyttade analysatorns kickHit (profilens punch) t90 35 -> 25,
och a1f M1 (hela analysatorns kick) 35 -> 15. Mekanismen går alltså via **dirigentens lookval** (profilen och/eller sektionerna). Det
stämmer med orkestratorns lampspr-diagnos (lookval mot looker med fler lampor). Det är inte kickens timing i sig. Att låta sektionerna och
profilen följa ljusets kick kostar spärrar: upp_s DISK för a1f M1, lampspr DISK för M1 här. k1f levererar den säkra halvan:
- livevägen (D2) och effekternas kick-envelope (D1) slipper spärrens andra puckel på snabbt tempo;
- analysatorn är bit-lik f0.

Nästa steg, inte gjort: dela profilens punch på tempo, så att den följer ljusets kick bara ≥ 130 BPM. Det gav t90 25 på 181533, men det
är inte mätt mot lampspr.

## RISKEN
- Domarens latenspoäng på kontrollmängden ändras troligen inte (samma mekanism som ovan). Det är en ljus- och liveförbättring.
- Från 130 BPM blir det fler ljuskickar (+12–15 %). Effekter som blinkar per kick blinkar oftare (strobe-taket ligger i effekten).
  Fladderspärren slog inte till.
- Kontrollmängdens lampspr-fall (f0 −12 % på lang1028) ärvs från f0. D1 kan förvärra det på en snabb fil: M2 visade att fler
  drum.kick sänker lampspridningen.

KLAR k1f poäng 7.69 OK krav 5   (mot f0: 0,00 utan bonus; övningen bit-lik f0 i 17 mått, ljusdomaren +6,6 mot f0 +5,6)
