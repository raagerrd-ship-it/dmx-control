# t1f – klockans tillit som ett mått (riktad: tilliten mättar på 1,00)

**IDÉN.** f0:s enda tillit (`cfg.beat.confidence`) var `repeatRate`: andelen kickar som landar inom ±0,25 slag ELLER upprepar en kick två slag
tidigare. Det täcker i praktiken halva fasrymden plus alla mönster, så den mättar. `trustRaw = (conf − 0,20)/0,37` i effects mättar dessutom
redan vid conf 0,57. t1f multiplicerar `repeatRate` med **tempots tydlighet** (`tgClear`): marginalen till NÄST BÄSTA tempohypotes i klockans
eget tempogram. Det blir ETT väldefinierat mått: kickarna förutsägs OCH det finns bara ett tempo. Ingen konsument ändras och ingen får en egen
tröskel. Dirigentens manus är orört. Tilliten räknas på ett ställe i analysatorn (analyserClock.ts) och når ramen, kickgrinden, profile.beat,
hasBeat, trust och frasräknaren på samma vägar som i f0.

## DELAR mot f0 (`mot-f0.diff`, 1 fil, ~12 rader kod)
| del | mekanism | var |
|---|---|---|
| **D1** tempots tydlighet | Sist i varje tempogramvarv (139 hyp, ~0,37 s): `sv` = högsta LOKALA topp > 2 steg från vinnaren (cirkulärt), `tgClear = min(1, 3·(1 − sv/bv))`. Om tvåan har 2/3 av vinnarens poäng eller mindre blir tydligheten full, och vid två lika starka tempon blir den 0. Inget nytt minne: tempogrammets EMA (0,4/varv) jämnar redan ut. | analyserClock.ts:152 (fält), :258–265 (tgStep, före KRONAN) |
| **D2** tilliten = förutsägelse × tydlighet | `live = repeatRate · tgClear`. Coast-golvet (MIN_BEAT_CONFIDENCE) och pllConf (onBeatRate, coasten) är orörda. | analyserClock.ts:436–438 |

D1 ensam ändrar ingenting (ingen läser `tgClear` utan D2). Båda måste mätas tillsammans.

**Bortvalt (mätt):**
- **Kickens fasprecision** (linjärt 1 → 0 över ±0,25 slag mot rutnätet + KICK_PHASE_MS, upprepningens precision). Den blev för hård: conf medel 0,26 på lang1021, lookvalet gick helt om. Proben visade orsaken. Kickarna ligger brett (lang1021 fasfel p25/p75 −114/+91 ms, en klump vid −60 ms mot det inre ankaret) och duger inte som precisionsmått.
- **M2** `5·(1 − r)` och **M3** `repeatRate·(1 + tgClear)/2`, se siffrorna.

## SIFFRORNA
**Proben** (f0, var 4:e s): tvåan/bästa ligger på 0,24–0,50 i tydliga partier (lang1021 150 bpm 180–246 s, lang1011 91 bpm). Vid låtskarvar, i intron och när tempot vandrar ligger den på 0,85–0,99 (lang1021 70–100 s 96/111/156, 160–178 s, 250–270 s; lang1011 430–590 s 96 <-> 128 = KRONAN-fallet). Under tiden stod f0:s tillit kvar på 0,6–1,0.

**Tillitens fördelning, konsertReplay `--delad-cfg`** (lang1021; bas/f0 = engine/dist / f0/dist):
| | conf medel | p10 | p50 | andel < 0,51 | trust medel |
|---|---|---|---|---|---|
| bas | 0,75 | 0,47 | 0,77 | 15 % | 0,93 |
| f0 | 0,78 | 0,47 | 0,84 | 13 % | 0,93 |
| t1f (2·(1−r), första versionen) | 0,57 | 0,06 | 0,55 | 47 % | 0,63 |
| t1f lang1011 | 0,57 | 0,08 | 0,62 | 43 % | 0,64 (f0 där: conf p10/50/90 0,51/0,86/1,00) |

Med `3·(1−r)` (slutkoden) ger offline-skattningen på probens punkter conf medel 0,65, p50 0,73 och 13 % under 0,2.

**Manusets grenval:** på lang1021 är de samma som i f0 utom en sektion (173 s: "sokljus" i stället för basgang-looken). På lang1011 tar manuset nu
båda grenarna, "last takt" 3 gånger och "tydlig basgang" 6 gånger (8 looker i rotation: dansparet, minnet, party, siren, duel, basgang, varannan, twin).
Tilliten vid valen varierar alltså igen.

**--mat (3 av 3):**
| mätning | koden | långsamma | gridfel | grid40 | korta | latens | ljusdomaren | poäng |
|---|---|---|---|---|---|---|---|---|
| f0 | – | +8,90 | 19,40 | 53,7 | 32,18 | 80 | +5,6 | +7,69 (+1 bonus) |
| **M1 = slutkoden** | rr·min(1, 3(1−r)) | **+12,33** | **12,00** (bas 15,10) | **60,28** | 32,97 | 80 | +5,9 **DISK lampspr pop −13,7 %** | **+9,75** |
| M2 | rr·min(1, 5(1−r)) | – | 13,20 | 59,41 | 31,18 | 80 | +5,8 DISK pop −13,2 % | – |
| M3 | rr·(1 + min(1, 3(1−r)))/2 | – | 15,60 | 56,02 | 32,58 | 80 | +3,0 DISK pop −13,0 % | – |

Övriga 14 mått är identiska med f0 i alla tre (mix_*, klipp, ettan 100, upp_s/ned_s 1,35/2,15, traff, drop, låtgräns 11/15 och 0 falska).
Gridfelet blir bättre eftersom kickgrinden (`grid.confidence > 0,5`) nu öppnar när tempot är tvetydigt. Då dras rutnätet inte efter fel tempo. För första gången ligger gridfel under bas.
Pop i bank.json (f0 -> M1):
- lampspr 0,367 -> 0,285 (bas 0,331)
- ljus 0,285 -> 0,44
- rAbest 0,372 -> 0,464
- betoning 0,239 -> 0,304
- jitter 22 -> 37 ms

Det är mönstret "fler lampor tänds lika". Lägre tillit stänger av effekternas spatiala takt-delar (beatOk, `trust > 0,5`) och lookvalet. Spärren ligger kvar oavsett hur mjuk faktorn är (M2, M3), så den beror på att tilliten alls varierar i pop, inte på faktorns form.

## KRAV EN KÄLLA (alla fem, fil:rad i `.arena/entempo/t1f/src`)
Allt utom tillitens formel är f0:s, se f0/losning.md. Radnumren i analyserClock.ts flyttas +10 efter :255.
1. **En temposökning** är orörd. `tgClear` läser samma `tgAcc` som klockans tempo (:258–265).
2. **En tillit:** :438 `live = repeatRate · tgClear` -> `cfg.beat.confidence` (:439) -> `frame.bpmConfidence` och `setClock` (:369–370). Därifrån går den till profile.beat (analyser.ts dConf), hasBeat (beatClock.ts:46), trust (effects.ts:1772), frasräknaren (effects.ts:1675) och kickgrinden (analyser.ts:2391 via anaGrid). Inget annat tillitsmått finns.
3. **En takträknare**, 4. **en pulskurva**, 5. **låtgränsen:** orörda (f0).
- **ARKITEKTUREN:** klockan står kvar i analysatorns långsamma väg (analyserClock.ts). Inga nya filer, flaggor eller env.

## WORKERN
- **µs/hop:** D1 är en slinga över 139 värden en gång per varv (139 hop), alltså < 1 µs/hop i snitt.
- **Allokering:** inga nya objekt, bara ett skalärt fält.
- **Mätt:** cpu 45,8 us/hop (kvot 1,056, ingen poäng). Realtid p99 5 hop (gräns 22), väckning 19,6 us/hop.

## BUDGET
3 av 3 --mat (M1–M3; tvavagar-mat1/2/3.json och bank-mat1/2/3.json). `tvavagar.json` och `bank.json` är M1, och koden är återställd till M1 och ombyggd.
8 egna körningar:
- konsertReplay: bas, f0 och t1f(precision) på lang1021, t1f(2(1−r)) på lang1021 och lang1011.
- 3 prober (scratchpad, analysator + BeatFeed utan effekter): fasfelets fördelning, fold-poängen och tempogrammets marginal på lang1021 och lang1011.

Ingen kontrollmängd användes.

## RISKEN
- **DISK på övningen:** ljusdomarens lampspr i pop −13,7 %. Det är samma typ av spärr som f0 har på kontrollmängden (åt andra hållet: där sjönk lampspr för att tilliten var för hög). Ska tilliten bära information utan att lampspridningen faller måste ljussidan (beatOk/lookval) tåla en tillit som varierar. Det ligger utanför uppgiften: konsumenterna och manuset rörs inte.
- 13 % av tiden under hasBeat-grinden (0,20) på lang1021, främst i skarvar och intron.
- `tgClear` sätts först efter ett varv. Efter relock bär den förra låtens värde i ~0,37 s.
- Harmoniska syskon (4:3, 3:2) räknas som konkurrenter. Det är avsiktligt (96 <-> 128 är en verklig tvetydighet), men i pop med stark 3:2-hihat sänks tilliten även när takten känns tydlig.

KLAR t1f poäng 9.75 DISK krav 5
