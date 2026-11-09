# a5r – r-robust: sektionerna frikopplade från tempot? Mätt tre gånger, förkastat. Levererat = r0

**IDÉN.** Sektionerna rangordnar kicktätheten. I r0 är kicken grindad mot klockans rutnät och spärrad 0,6 slag (högst 330 ms). Varje tempofel ändrar därför tätheten och flyttar sektionsetiketterna: ett 4:3-syskon, ett fel tidigt lås eller en ballad utan klocka (kronan 1,3/1,4 -> ned_s 2,80). Det robusta borde vara att sektionerna räknar sina kickar oberoende av tempot (ljusets kick orörd). Hypotesen höll inte. Tre mätningar gav alla DISK på upp_s/ned_s, så levererad kod är **r0 oförändrad** (`a5r/src` = `r0/src`, diff -r tom).

## Mätningarna (övningen, --mat; sparade som tvavagar-M1..M3.json, koden i prov-sec-kick-analyser.ts.txt)
| | sektionskick | upp_s | ned_s | korta | segment (1021/pop/mega/1011) | ljus | dom |
|---|---|---|---|---|---|---|---|
| r0 | grindad, 0,6 slag ≤ 330 ms | 1,35 | 1,90 | 32,6 | 14/21/30/24 | +5,2 | OK |
| M1 | utan grind, fast 170 ms | **2,85** | 0,85 | 34,1 | 14/19/31/27 | +6,8 | DISK |
| M2 | utan grind, fast 280 ms | **1,50** | 1,90 | 32,1 | 14/26/38/31 | +5,9 | DISK |
| M3 | grindad, fast 280 ms | **2,85** | **4,00** | 29,6 | 15/17/30/26 | +4,5 | DISK |

**Fyndet (det robusta svaret är negativt).** Medianerna bygger på 14 uppåt- och 10 nedåtskiften. Varje ändring i kickströmmen flyttar enstaka skiften med 10–15 s. M1 flyttade lang1011 upp #3 från −1 till 15,9 s. M3 flyttade lang1011 ned #5 från 4,7 till 16,6 s och lang1021 ned #3 från −1 till 5,2 s. Det skiftet räcker för att medianen ska passera spärren. M1 gav ned_s 0,85, men den vinsten hänger på ett par skiften, alltså precis den sorts vinst kortet förbjuder. Ingen av de tre ändringarna förbättrade skiften brett. Felet r0 delar med alla varianter är megamix upp #1, som ligger på 17,9 s i r0 och alla tre proven (bas 8,9). Det sitter alltså inte i kickströmmen, utan troligen i sektionernas långsamma sida på klockans tempo (sectionBars/R_CLOCK). Slutsats: den fasta spärren och den ogrindade kicken är förkastade. Nästa robusta steg är fler skiften i måttet (fler lang-filer), inte en ratt till.

## KRAV (fil:rad i `.arena/entempo/a5r/src`, = r0, granskat i r0/KRAV_EN_KALLA.txt)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1102/1734 (sökningen borta), :1768 `setClock`, :1511/1707 R_CLOCK, :2371 spärren, :2389/2516 grinden på klockans rutnät; beatFeed.ts:335 (KICK_PHASE_MS 45, null i coast), :391, :241–248 |
| 2 | en tillit | beatFeed.ts:338, split.ts:242; effects.ts:1772 trust, :1672/1675 frasräknaren, hasBeat |
| 3 | en takträknare | effects.ts:2010–2019 (rutnätets index, `>> 1`, en paritet, monoton spärr), :1359/1363 |
| 4 | en pulskurva | effects.ts:1302 |
| 5 | låtgränsen | analyser.ts:1770, split.ts:234 (H_BOUND), beatFeed.ts:328 `relock()` |

## DELAR
| del | från | mått |
|---|---|---|
| allt (oförändrat) | r0 (a4 relock, a6 tillit/pulsgrind, a7 beatIdx, a5 tillstånd/coast, r0 spärrtak + krona) | r0: långsamma +1,27 %, ljus +5,2 |
| sektionskick utan tempo (M1–M3) | egen | **bortvald**: DISK i alla tre |

## SIFFRORNA
- Levererat = r0, och tvavagar.json är r0:s mätning (identisk kod, bänken deterministisk). Poäng mot r0 **0,00**. Med CPU borttagen ur poängen (regeländringen 02:45) står r0 på +0,76 i rankingen. Spärrarna mot bas hålls: upp_s/ned_s 1,35/1,90, ljus +5,2 utan domarens spärrar, p99 5 hop.
- **Workerns kostnad:** M3 (r0 + fyra skalära rader) gav feedRealtid workerUs **28,9 µs/hop** mot bas 48,4. r0:s egen json saknar fältet, men skillnaden är försumbar. **Allokering:** inga nya objekt per hop (r0 oförändrad).

## RISKEN
Knivseggen från r0 finns kvar och är nu dokumenterad: ett enda skifte avgör spärren, så kontrollmängden kan falla åt endera hållet för r0 och för alla remixar som rör kickströmmen. Ljusdomaren låg på +4,5 till +6,8 i alla prov, så ljuset är inte risken; sektionsmedianen är det.
