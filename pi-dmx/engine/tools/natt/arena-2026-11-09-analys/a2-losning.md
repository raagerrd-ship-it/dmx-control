# a2 – DROP B: analysatorns dropStep blir den enda detektorn

Arenan pausades av orkestratorn efter mätning 2 av 3. Det här är den bästa uppmätta varianten, och den är **DISK**.

## Idén
Effekternas flankStep (en andra dropdetektor på frame.bodyDb) tas bort, och ljuset läser bara frame.dropCount från analysatorns dropStep.
För att den enda detektorn ska vara lika strikt som flanken fick dropStep flankens break-krav ("HELT BREAK") och dess låtstartsspärr.

## FLYTTAT
| vad | från effects.ts (HEAD src) | till analysatorn (a2/src/analyser.ts) | ramens fält |
|---|---|---|---|
| dropdetektorn (flankStep + fd*-tillståndet + ringbufferten) | effects.ts:780-807 (flankStep 785) | borttagen; dropStep 3523ff är den enda | frame.dropCount |
| beslutet "drop nu" i stepDrop (`dropHitRaw = this.flankStep(frame)`, gapMini på analysatorns drop utan flank) | effects.ts:1590-1594 | a2 effects.ts:1537-1538 läser bara `frame.dropCount !== lastDropCount` | frame.dropCount |
| flankens trösklar FLANK_GONE/BREAK/LAND/RISE/HOLD/GRACE/SHORT/SILENT | effects.ts:352-371 | breakkravet: analyser.ts:233 (DROP_BREAK_MS 4000, DROP_SHORT_RISE_DB 26) och 3692-3697 (breakOk: break >= 4 s, eller >= 2 s med stigning >= 26 dB, och `activeMs > span + 500` = inte tyst i breaket, alltså flankens låtstartsregel) | frame.dropCount |
| anaDropAt / dropEntry ("refrängen direkt efter minidrop-drop") | effects.ts:597, 1119-1122, lookvillkoret | borttaget: analysatorns drop är nu full drop och går via dropSwitch | – |

Reaktionen (SHOW_DROP_GAP_MS-spärren, efterkontrollen, dropLift, dropBang 700 ms och uttoningen) ligger kvar orörd i effects.ts.
Efter ändringen räknas ingen dropdetektion längre i effects.ts. Inga fd*/FLANK_*-referenser finns kvar, vilket jag kontrollerade med grep.

## DUBBLETTEN – valt B (analysatorns)
- Mätning 1 tog bort flanken men lät dropStep vara orörd. Slow-måtten var identiska med bas, ljusdomaren −4,9 och resultatet DISK. Analysatorns dropStep släpper igenom fler och sämre placerade full drops än flanken.
- Mätning 2 lade till breakkravet i dropStep. På de 7 dropklippen i övningsmängden försvann båda falska full drops (21,5 s i bcma9 och 20,28 s i bmmyg; den senare var ett sent pumpslag 5 s efter breaket). Minidroppen tar fortfarande dropen vid 15 s i 7 av 7 klipp.

## SIFFRORNA (mätning 2, a2/tvavagar.json)
- Domarens rad: **+2,32** (långsamma +3,86 %, snabba ±0). drop_falska 5,71 → 0,00 (+100 %), korta 30,3 → 28,4 (+6,4 %), **upp_s 1,35 → 1,90 s (−40,7 %)**, övriga mått oförändrade.
- md5 skiljer. Ljusdomaren ger **−4,7** (takt −3,8, koreografi −7,7, kontrast −2,7; lampspridning megamix −14 %, men medlet klarar spärren).
- DISK av två skäl: sektionsspärren (upp_s > bas + 0,1 s) och ljusdomaren (−4,7 < −0,5).

## Worker och allokering
Huvudtrådens CPU 48,6 µs/hop mot bas 48,9 (kvot 0,99). Worker-p99 är 6 hop (X = 7), väckningen 35 µs/hop och latensen 80 ms (oförändrad).
breakOk är några jämförelser per hop och skapar inga nya objekt. flankStep försvann från render, så huvudtråden gör mindre arbete.

## RISKEN och lärdomen till idébanken
1. Sektionen läser dropCount (`dropped → 'high'`, secDropsNow). Ett striktare dropStep gör att refrängen kommer senare (upp_s +0,55 s). Med kort B måste sektionens high-ingång frikopplas från full drop, till exempel genom att läsa en egen "nästan-drop"-kandidat. Annars måste breakkravet ligga bara på ljusets drop, och då finns det två signaler igen.
2. Ljuset är inställt på flankens tajming: flanken fyrar när den 60 ms-kroppen korsar taket − 6 dB, medan dropStep fyrar med 300 ms arm och fullSlam inom 3,5 dB från toppen. Samma antal drops lander då på andra rutor. Det förklarar varför koreografi och takt tappar även med färre falska drops.
3. Måttvinnare som bör provas ensam: **breakOk i dropStep** (drop_falska −100 %). Utan att röra ljuset bör det kombineras med att sektionen inte läser dropCount.

Diffen ligger i `losning.diff`.
