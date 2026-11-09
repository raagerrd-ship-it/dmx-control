# m1f – manusets grenval med EN klockas tillit (riktad deltagare m1, från f0)

**IDÉN.** Bara dirigenten ändras. Klockan, analysatorn och ARKITEKTUREN är f0:s, ordagrant. Därför är alla 17 tempomått och latensen bit-lika med f0.

## Diagnosen (egna körningar)
- Grenarna "låst takt" och "tydlig basgång" i manuset väljer ur SAMMA pool, `TOGGLE_POOL`. Vilken gren som visas påverkar bara loggraden (`beatClear` används inte till något annat).
- Det som styr ljuset är `manusTog`. Den sätts en gång per låt, vid låtens första lookbyte, som `takt || bas`. Om den är sann blir hela låten en toggle-låt.
- Med EN klocka står tilliten på 1,00 vid nästan varje val. Exempel från lang-20261028T181533 (f0): alla 6 manusval har tillit 1,00 (i bas 0,90–1,00).
- Följden är att `takt` ensam gör varje låt med låst takt till en toggle-låt. Tröskeln 0,85 skiljer inte längre låtar åt.
- Den gamla klockans tillit låg under 0,85 strax efter en låtgräns och "valde" därmed låtar slumpvis. Den förmågan finns inte längre.

## DELAR mot f0
| del | mekanism | fil:rad (m1f/src) |
|---|---|---|
| **D1** | Toggle-låten kräver tydlig basgång: `manusTog = bas \|\| (takt && bassClear)` (förr `takt \|\| bas`). Hård basgång (≥ 0,85) räcker ensam som förr. Låst takt räcker bara om basgången också är tydlig (`bassClear`, ≥ CLEAR_BASS 0,78 med hysteresen). Ägarens ord 10-13: "tydlig basgång effekter med stegande lampor". | effects.ts:973–976 |
| D2 (bara logg) | Etiketten visar "tydlig basgang" när `bas` är sann, även om takten är låst. Ljuset påverkas inte, md5 är oberoende av D2. | effects.ts:986 |

Diffar: `losning.diff` (mot engine/src) och `mot-f0.diff` (23 rader, bara effects.ts). Inga nya fält, inga objekt per hop och ingen ny ratt. Raden körs bara vid ett lookbyte.

## SIFFRORNA
**--mat (1 av 3): m1f +7,69 OK** = f0 utan bonus (+8,69 − bonus 1, ingen bonus mätt här).
- Långsamma +8,90 och latens 80 ms (+5,88), identiska med f0. Worker p99 5 hop.
- md5 skiljer. **Ljusdomaren +6,4 utan spärrar** (f0 +5,6).

Ljusdomaren på övningsmängden (domare.py; raden "förbjudna filer" gäller analysatorn från f0 och inte här):
| | poäng | takt | dynamik | koreografi | lampspr lang1021/pop/mega | ljus % |
|---|---|---|---|---|---|---|
| f0 | +5,6 | +21,6 | −0,2 | +3,9 | +18,8 / +11,0 / −2,2 | +1,3 |
| **m1f** | **+6,4** | **+37,4** | −2,5 | −0,0 | **+2,0 / +20,5 / +15,5** | +12,2 |

Lägsta lampspr-kvot: m1f 1,02 (lang1021), f0 0,98 (megamix).

**Robusthet**, egna konsertReplay `--delad-cfg --trace`. Lampspr = medel av (ljusaste − mörkaste lampan) från 15 s, i steg på 25 ms, alltså inte bänkens 5 ms:
| inspelning | bas | f0 | m1f |
|---|---|---|---|
| lang-20261028T181533 (samma kväll som kontrollens 1028) | 0,198 | 0,239 | 0,239 (samma lookföljd som f0: basgången ≥ 0,9 vid låtarnas första byte) |
| lang-20261012T110658 (10 min) | 0,310 | – | 0,328 (+6 %) |
| lang1021 (hela 5 min) | – | – | 0,285; bänkens 300 s ger 0,309 mot bas 0,303 |

Lookval:
- lang1021: twin/gallop blir sokljus/kickregn, eftersom basgången är 0,17–0,53 vid låtens första byte.
- lang1012: eko 13 → 26 %, varannan 9 → 1 %.

Budget: 1 av 3 --mat och 8 av 8 konsertReplay (bas, f0 och m1f på 1021/1815, bas och m1f på 1012). Inget mättes på kontrollmängden (orkestratorns lang1028-filer i den delade scratchen öppnades inte).

## KRAV EN KÄLLA (oförändrade mot f0)
- Alla fem punkter och ARKITEKTUREN står som i f0/losning.md.
- Rader efter effects.ts:973 ligger +3 rader längre ned (t.ex. trust 1772 → 1775, takträknaren 2010–2027 → 2013–2030, frasräknaren 1672/1675 → 1675/1678).
- D1 läser samma tillit (`this.beatTrust`, ur klockans bpmConfidence) och lägger till analysatorns `profile.bassline` via `bassClear`. Ingen ny källa. **krav 5.**
- KRAV_EN_KALLA.txt är inte kopierad, den skriver orkestratorn. Ljusdomaren +6,4 klarar ändå den vanliga gränsen −0,5.

## WORKERN
Oförändrad mot f0 (23 µs/hop i f0:s mätning, inga nya objekt). D1 ligger i dirigentens kalla väg.

## RISKEN
- Lampspridningen styrs av lookföljden, som är kaotisk: pickLook tar den minst spelade looken, så ett ändrat val flyttar alla senare val.
- D1 minskar antalet toggle-låtar där basgången är svag vid låtens första byte. Den återställer alltså bas-liknande grenval utan att läsa tilliten som tröskel.
- Om kontrollens lang1028 förlorade vagbrytaren just för att låten blev toggle-låt med svag basgång, rättas det av D1. Har låten tydlig basgång vid första bytet blir den som f0.
- Dynamik −2,5 och koreografi −3,9 mot f0, men ljusdomaren totalt +0,8.
- Medelljuset +12 % mot bas (info, inget kriterium).

KLAR m1f poäng 7.69 OK krav 5
