# a1f – finalen: r0 utan topprösten, med a1:s svängprov (DMX bit-identisk), oktavzonen som separat del D3

## IDÉN
Efter TILLÄGG 13:00 (r0 DISK på kontrollmängden, sektionsspärren, orsak = a3:s toppröst) är målet en klocka för båda som **inte
rör DMX-ljuset** men behåller r0:s lotus-delar och lotus spärrar. Utgångspunkt r0. Ändringar:
- **D1 – topprösten bort** (a3:s peakVote/peakScore, HV_*, TG_OCT_LO). Tempovalet blir B:s tempogram igen = det som är DMX-bevisat.
- **D2 – svängprovet** (a1:s swingSig/hiWin + EMA/hysteres i tgStep): i vikningen på 2/3 av vinnaren ligger svängda åttondelar på 2/3
  (diskanten >= 0,5 av slagets) och 1/3 är tom (<= 0,1). Rättar syntetens swing (149,8 -> 100,0), så syntet 6/8 = A utan rösten.
- **Kvar ur r0 oförändrat:** a8 lotus klocka i workern (hopSelf, setBeatGrid = bara referens, setClockGrid), a4 fas/etta i ramen
  (publishPhase: beatPhaseMs = klockans ankare, beatPhaseConf = 1 + tillit, barShift = taktmodellens etta, FS_BARK), OWN_TEMPO-vägen borta.
- **D3 (INTE i losning.diff, separat `d3/d3.diff`)** – a1:s smalare övre oktavzon (TG_EDGE_HI 1,03 -> 1,01): lotus +20 korpus
  (441 -> 461, 'dubbla' 24 -> 2), DMX md5 lika på övningen men **ändrar DMX-ljuset på 2 av 3 andra lang-filer** (10-11, se robustheten).
  Lämnad utanför huvuddiffen just för TILLÄGG 13:00; orkestratorn kan mäta den ensam i kombinationsgranskningen.

## DELAR MOT r0
| del | mekanism | DMX | lotus | belägg |
|---|---|---|---|---|
| D1 | topprösten + TG_OCT_LO bort (B:s tempoval) | md5 = bas (övning + 3 extra lang) | 474 -> 441 (B:s tal) | p0 (r0 utan röst): md5 LIKA på lang-20261011T103310/105428 |
| D2 | svängprovet swingSig | md5 = bas (övning + 3 extra lang) | syntet 5/8 -> 6/8 (swing 100,0) | ps = D1+D2: md5 LIKA på 103310/105428/112342; lotusbank full 441/503, 6/8 |
| D3 (separat) | övre oktavzonen 1 % | md5 SKILJER på 103310 och 105428 (lika på 112342 + övningen) | 441 -> 461, dubbla 24 -> 2 | pe (D1+D3): md5 SKILJER; lotusbank full med D2+D3: 461/503, 6/8 |

## SIFFRORNA
**DMX** (tvavagar --mat, `tvavagar.json`): **md5 lika med bas** (lang1021 + megamix hela, sync och moment), så ljusdomaren körs inte. Alla 17 mått = bas: mix_klocka 97,24, mix_las 2,48, mix_still 2,73, mix_hopp 0,05, klipp 98,28, ettan 100, grid40 52,90, gridfel 21,40, upp_s 1,35, ned_s 3,00, träff 100, korta 30,34, drop 100/5,71/216, gr 73,33/0. Latens 80 ms, realtid p99 6 hop (X = 7). Poäng **+0,00, ingen DISK**. r0:s −0,99 (mix_still 3,24, gridfel 23,0) är borta.

**Robusthet utanför övningen** (tools/ladan-2026-10-11, DMX-md5 sync + moment, hela filerna, mot engine/dist):
| variant | 103310 | 105428 | 112342 |
|---|---|---|---|
| p0 = r0 − röst (D1) | lika | lika | – |
| a1f = D1 + D2 (huvuddiffen) | lika | lika | lika |
| D1 + D3 | skiljer | skiljer | – |
| D1 + D2 + D3 | skiljer | skiljer | lika |

**Lotus** (lotusbank full, 503 + 8):
| mått | A | r0 | **a1f** | a1f + D3 |
|---|---|---|---|---|
| korpus | 396 | 474 | **441** | 461 |
| klasser | 3/2 16, 4/3 14, 2/3 10, 3/4 24, annat 42 | 3/2 6, 4/3 7, dubbla 2, annat 14 | 3/2 7, 4/3 22, dubbla 24, annat 9 | 3/2 6, 4/3 22, dubbla 2, annat 12 |
| syntet | 6/8 | 6/8 | **6/8** | 6/8 |
| kick R/P | 0,80/0,86 | 0,80/0,86 | 0,80/0,86 | 0,80/0,86 |
| on-beat | 0,84 | 0,84 | 0,84 | 0,84 |
| fas median/motfas/i fas (n) | 0,88/33/238 (399) | 0,84/15/257 (446) | 0,83/21/249 (451) | 0,84/17/252 (438) |
| fas parat med A | – | 0,87 (397) | **0,88 = A** (388) | 0,87 (391) |
| fas mot Beat This! | 0,89 | 0,85 | 0,83 | 0,85 |
| följare raw (\|offset\|) | 0,90 (36 ms) | 0,96 (23 ms) | 0,95 (23 ms) | 0,95 (22 ms) |
| spann inom låt | 9 | 22 | 34 | 36 |
Mot spärren: korpus, syntet, on-beat, motfas och i fas är bättre än eller lika med A. Fasens median 0,83 ligger under A:s 0,88, men det
beror på urvalet: på samma 388 klipp är den 0,88 = 0,88. De 63 klipp som bara a1f har i rätt oktav har median 0,48. Ägaren godkänner.

**Workerns µs/hop:** 44,8 µs/hop PC (bas samtidigt 46,6; gräns 130).

## PROVAT OCH FÖRKASTAT I FINALEN (ingen budget)
- Oktaven hålls över skarven (en klocka på >= 150 tar 2t när t hamnar på 80–84): ingen effekt på Give It To Me/Stora tuttar. De låga
  värdena kommer från tidiga felval (83–94), inte från oktavkanten.
- Symmetrisk hysteres i rösten (tillbakabyte också HV_N varv): 16 klipp, hopp 178 -> 179, en median ändrad. Ingen effekt.
- Kortare röstfönster (HV_AGE 15): 25 klipp, 2 sena byten borta, hopp 224 -> 220. Rösten är bort helt i a1f, så mätningen gäller inte längre.
- Fasen per tempoband (r0 mot A, parat): 80–100 BPM 0,59 mot 0,85 (35 klipp, ofta motfas på långsam rock), 150–160 0,90 mot 0,81.
  Fasreferensen är basens stigning, och DMX döms mot basansatser (grid40). Det öppna lotus-felet ligger därför i klockans fas för
  långsamma låtar, inte i ≥ 150.

## RISK
1. **Lotus tappar r0:s +33 korpus** (474 -> 441), för rösten är borttagen. Det är priset för ett DMX-ljus som är bit-identiskt med bas.
   Med D3 blir det 461, men då ändras DMX-ljuset på lang-filer utanför övningen, och kontrollmängden är inte mätt.
2. **Lotus live på Pi:n** (från r0): klockan körs i workern, bit-identiskt bevisat i sync-läget men omätt på ARM. computeBpm är borta,
   klockan ~45 µs/hop PC är tillagd, och svängprovet gör en extra vikning per varv (bara när vinnaren ≥ 120). Mät /api/perf före och efter.
3. **Svängprovet** bygger på syntetens ideala sväng. Riktig shuffle med fantomen 1,5T är omätt, och kravet 1/3 <= 0,1 är strängt med flit
   (lang1021 gav 0,27 i ett varv).
4. **Följaren** (r0): beatPhaseConf = 1 + tillit (1–2). Lotus PHASE_FLIP_CONF 2,0 nås inte, så den bör sättas till ~1,5 i porten (konsumentens ratt).
5. Lotus spann inom låt 34 BPM (A 9). Det är B:s vandring och är oförändrat.

Budget: DMX --mat 1 av 2, lotusbank 2 av 2 (full a1f+D3, full a1f).
