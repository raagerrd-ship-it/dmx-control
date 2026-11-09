# a3f – finalen: r0 med en röst som inte rör DMX

## IDÉN
r0 blev DISK på DMX-kontrollmängden (sektionsspärren). Det enda i r0 som ändrar DMX är a3:s toppröst och oktav under kanten.
I DMX-övningsmixen bytte rösten **aldrig**: md5-skillnaden i r0 kom från dess *bieffekter*:
- Hysteresbonusen och "står kvar"-grenen höll det förra tempot när tempogrammet själv bytte till ett syskon.
- Klasslåset (hvKeep) höll förra låtens tempo mot nya låtens syskon tills relocken kom. Den här grenen gav mixlåt 14 still 2,16 -> 21,5 s.
- Enstaka varv med halvslaget under 79,6 dubblade tempot tillfälligt under övergångar.

På nya ladan-filer (tools/ladan-2026-10-11/lang-*, inte övning) fyrade rösten under övergångar där tempogrammet vandrade
(107,8 -> 86,2 -> 134,1 inom 3 s) och på kallstarter. a3f behåller rösten för lotus, men gör den tyst där inget tydligt syskon finns.
Mot r0 är det tre delar. Alla ligger i analyserClock.ts och är oberoende av a8/a4-delarna, som är oförändrade.

## DELARNA mot r0 (en mekanism per del)
- **D1 – bieffekterna bara efter ett riktigt röstbyte.** Hysteresbonusen (cur × HV_K), "redan bytt: står kvar" och klasslåset hvKeep gäller
  bara om rösten faktiskt har bytt sedan låset (`hvEver`, nollas i tgReset). Utan röstbyte gäller tempogrammet + kronan exakt som i bas.
  Effekt: DMX-övningsmixen blev bit-identisk med bas (mix_still 3,24 -> 2,73; låt 14 21,5 -> 2,16 s) och lang1021-md5 blev identisk.
  Cambodia behåller 130, eftersom rösten bytte där och klasslåset därför står kvar.
- **D2 – oktaven under kanten först efter 8 varv i följd** (`TG_OCT_LO_N` = 8, ~3 s, räknaren `octLoN`). r0 dubblade på ett enda varv
  med lo < 79,6. Det hände tillfälligt i DMX-övergångar (lang-20261011T105428: 77,7–79,6 under 1–2 varv på flera ställen). Stora tuttar och
  Cotton Eye Joe ligger kvar på 156–157 (sammanhängande).
- **D3 – rösten kräver samma tempogramval OCH samma syskon i alla HV_N varv, och HV_N 3 -> 5** (~1,9 s). Övergångarnas kedjeröster
  (107,8 -> 86,2, sedan 83,8 -> 134,1, kvot 1,7–1,9) och kallstartsrösten 95,7 -> 127,6 på de nya ladan-filerna försvinner. Det kostar på
  lotus: Cambodia (det ena klippet), Timmy Trumpet, Jamming och några till går tillbaka till 4/3 (korpus 474 -> 463, 4/3-klassen 7 -> 16).
  Swing-syntet står kvar på 100,2 (rösten där är stabil, kvot 2,7–3,5).
  D3 är den del som byter lotus-korpus mot DMX-robusthet. D1 och D2 är gratis för lotus i stickproven.

## SIFFRORNA
**DMX** (tvavagar --mat, övning): poäng **+0,00**. Långsamma och latens är 0,00, alla 17 mått lika med bas, och **md5 identisk** med bas
(sync + moment på lang1021 och megamix hela), så ljusdomaren körs inte. Ingen DISK. Latens 80 ms. Huvudtråd 54,2 µs/hop (kvot 0,99).
**Worker 39,3 µs/hop** (r0 44,8, gräns 130). Realtid p99 6 hop (X = 7). KRAV EN KÄLLA står kvar, och klockan är det enda tempot.
**Robusthet utanför övningen** (tvavagarKor lang på sex andra ladan-filer: 103310, 105428, 112342, 130600, 140616, 151414):
- a3f är **identisk med bas på alla 6** (sektioner, upp/ned, grid).
- r0 skilde på 5 av 6: -1/+1 skiften åt båda hållen, och lang-140616 tappade en ned-träff.
- Mellanstegen gick från 3/6 (D1 + D2) och 4/6 (D1 + D2 + D3 med HV_N 3) till 6/6 med HV_N 5.

Det är därför jag tror att kontrollmängden blir md5-nära bas. Den är inte mätt.

**Lotus** (lotusbank, hela 503 + 8):
| mått | A | r0 | a3f |
|---|---|---|---|
| korpus | 396 | 474 | **463** |
| klasser | 3/2 16, 4/3 14, 2/3 10, 3/4 24, halva 1, annat 42 | 3/2 6, 4/3 7, dubbla 2, annat 14 | 3/2 7, 4/3 16, dubbla 2, annat 15 |
| syntet | 6/8 | 6/8 | **6/8** |
| kick R/P | 0,80/0,86 | 0,80/0,86 | 0,80/0,86 |
| on-beat-recall | 0,84 | 0,84 | 0,84 |
| fas median / motfas / i fas (n) | 0,88 / 33 / 238 (399) | 0,84 / 15 / 257 (446) | 0,84 / **16** / **253** (447) |
| fas mot Beat This! | 0,89 | 0,85 | 0,84 |
| följare raw (\|offset\|) | 0,90 (36 ms) | 0,96 (23 ms) | **0,95 (22 ms)** |
| spann inom låt | 9 | 22 | 33 |

Mot spärren: a3f är lika med eller bättre än A på allt utom fasmedianen, som har samma urvalseffekt som i r0 (n 399 -> 447).
Den ska godkännas av ägaren på samma grund som r0.

## RISKEN
1. **D3 kostar lotus 11 korpuslåtar mot r0** (fortfarande +67 mot A). Väljer orkestratorn r0:s röst för lotus får DMX tillbaka r0:s
   kontrollmängd-DISK. Det går inte att ha båda med samma klocka, eftersom DMX-filernas falska röster (kvot 1,7–2,9) och lotus rätta (2,0–3,6)
   överlappar i poäng. Det som skiljer dem är stabiliteten (D3), inte styrkan.
2. **Spannet inom låt** är 33 BPM, alltså B:s värde. r0:s 22 kom från klasslåset, som nu bara gäller efter ett röstbyte.
3. **DMX-kontrollmängden är omätt.** Den bärande slutsatsen är 6/6 identiska okända ladan-filer + md5 = bas på övningen. Om rösten fyrar
   på kontrollmängden är det med 5 stabila varv mot ett syskon med 1,25 × topp.
4. Lotus Pi, följarens skala (PHASE_FLIP_CONF) och ettan är som i r0 (a8/a4 oförändrade). Se r0/losning.md risk 1–3.

## FILER
- losning.diff (mot engine/src)
- mot-r0.diff (bara analyserClock.ts, +11 −6)
- tvavagar.json
- lotusbank.json/.out
- lotusbank-snabb.json/.out (snabbkörning 118/126)
- mat1.log

Budget: DMX --mat 1/2, lotusbank 1,5/2.
