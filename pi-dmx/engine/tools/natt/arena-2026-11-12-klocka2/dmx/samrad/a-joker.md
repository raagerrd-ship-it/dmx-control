# a – jokern: tre infallsvinklar, sonderade

Sonderna: `.arena/klocka2dmx/joker-sond/` (`envDump.mjs` = tempoHoppDiag + klockans egna ansatsserier ur ringen, bas och diskant,
187,5 Hz; `analys.py` räknar offline). Bara övningsfiler: övningsmixen (16 låtar, 42 min, facit) och lang1011. Mitt offline-"tempogram"
är en ren vikning utan minne, krona och toppröst – det är INTE motorns, men träffar samma nivå (97,7 % rätt mot syskonen; motorns
mix_klocka 97,88).

## 1. TAKTENS SJÄLVLIKHET – ett andra vittne som mäter något annat än vikningen
**Mekanismen.** Tempogrammet frågar "ligger energin PÅ slaget?". Självlikheten frågar "upprepar sig MÖNSTRET när jag flyttar det
N slag?" – korrelationen mellan ansatsserien och sig själv förskjuten 2 och 4 slag av kandidatens tempo, över ~10 s, bas och diskant
var för sig. Rätt tempo upprepar sig på både 2 och 4 slag (virveln på 2 och 4, basgången per takt); 4/3-fantomens "2 slag" är 1,5 riktiga
slag och 3/2-fantomens "4 slag" är 2,67 – där upprepar sig ingenting. Vittnet får ordet bara när tempogrammets egen marginal är liten.

**Sonden (2230 fönster, rätt tempo mot sina fyra syskon 4/3, 3/4, 3/2, 2/3):**
| | rätt |
|---|---|
| vikningen (tempogram-likt) ensam | 97,7 % |
| självlikhet 4 slag ensam | 82,9 % (alla 381 fel går till 4/3: dess takt = 3 riktiga slag, och allt med jämna slag liknar sig självt där) |
| självlikhet 2 + 4 slag ensam | 97,6 % |
| **vikningen avgör, utom när dess marginal < 1,10 (3,6 % av tiden): då självlikheten** | **99,5 %** |
| i just de osäkra fönstren | vikningen 36 % rätt, självlikheten 86–89 % |
Vittnet rättar 43 av vikningens 51 fel. Samma bild vid marginal 1,20 (99,2–99,3 %) och 1,35 (98,7–99,1 %), så det hänger inte på talet.
lang1011, där klockan växlar 96 ↔ 128 (440–540 s): självlikheten säger 128 i 50 av 50 fönster (1,04 mot 0,07); 91 mot 121 (100–140 s):
91 i 20 av 20. Det är två tolkningsval som gårdagens håll bara kunde frysa, inte avgöra.

**Borde vinna:** mix_klocka och klipp_klocka (dubbel vikt), syskon_tid, utfl_tid. Störst på kontrollmängden, där 17 % av tiden är fel tempo.
**Kan falla:** tretakt och 6/8 (takten är 3 slag: 4/3-fantomen får då rätt mot sanningen); låtar utan mönster (ren fyra-i-golvet utan virvel
ger samma likhet för alla heltalsslag – då ska vittnet tiga, inte gissa); 10 s fönster rymmer gammal låt efter ett byte, så det får inte
röra omlåsningen. Sonden är mot syskonen, inte mot hela rutnätet, och övningsmixen har få fel att rätta (51 fönster).
**Nästa billiga sond:** samma räkning på klippen i KORPUS_OVNING med fel i dag, och i motorn: logga vittnets dom varje varv bredvid
`peakVote` utan att låta det styra.

## 2. OMLÅSNINGEN SITTER I MINNET, INTE I LJUDET – låt en minneslös vikning öppna valet
**Mekanismen.** Motorns tempogram blir rätt 2,7 s efter övertoningens slut (median, 15 låtbyten) och klockan följer 0,1 s senare – hela
mix_las ligger alltså i tempovalet. En vikning över samma 3,5 s UTAN minne, krona och tvåvarvskrav har rätt topp redan efter 1,0 s.
Förslaget: en minneslös vikning går bredvid (cpu är fri) och när dess topp stått på ett ANNAT tempo än regenten i N slag, och regentens
egen råa poäng fallit, sås minnena om ur den – minnet ska hålla en tolkning, inte bromsa en ny takt.

**Sonden (s från övertoningens slut tills toppen är rätt och håller 2 s; 15 låtbyten):**
| | median | medel |
|---|---|---|
| motorn (klockan) | 2,8 | 2,72 |
| rå vikning 5 s | 1,75 | 2,20 |
| rå vikning 3,5 s | 1,00 | 1,78 |
| självlikhet 1 + 2 slag, 2,5 s | 0,75 | 1,22 |
| vikning × självlikhet, 3,5 s | 1,00 | 1,33 |
| färskt fönster (bara ljud efter övertoningens mitt) | 1,00 | 1,65 |
Ett färskt fönster ger nästan inget utöver ett kort glidande – det gamla ljudet är inte problemet, minnet är. De svåra bytena (låt 8:
7,5 s, låt 2: 3–6 s) löser ingen av dem; där finns takten inte i ljudet förrän sent.

**Borde vinna:** mix_las (dubbel vikt) 2,8 → kanske 1,5, och mix_klocka via kortare fel tid efter varje byte.
**Kan falla:** precis där gårdagen föll, från andra hållet. En rå kort vikning har rätt topp bara 94,5 % av tiden mot 97,5 % för 5 s
(hela rutnätet, 1122 fönster) – släpps den fram för lätt kommer utflykterna tillbaka (utfl_min, mix_hopp). Villkoret "regentens råa
poäng har fallit" är det som ska skilja ny takt från ett fill, och det är osonderat.
**Nästa billiga sond:** i motorn, logga per varv regentens råa poäng (fönstret, inte minnet) mot dess minne vid de 15 låtbytena och vid
de 71 utflykterna; skiljer kvoten dem åt är idén värd en mätning, annars inte.

## 3. KLOCKAN DÖMER SINA EGNA FÖRUTSÄGELSER – sonderad, faller (med det som finns i dag)
**Mekanismen.** Slår klockans förutsagda slag inte längre in ska den själv säga upp sig och öppna valet, i stället för att vänta på
tempogrammet. **Sonden** (motorns egna spalter i tempoHoppDiag, 15 låtbyten): tilliten halveras efter 7,1 s (median; fyra byten inte
inom 40 s), on-beat-andelen i praktiken aldrig. Av de 13 byten där tempot faktiskt ändras kommer tillitens fall FÖRE tempogrammets byte
i 5 (med 0,1–1,5 s) och efter i 8. De är för långsamma och ojämna mått (kickar över flera takter) för att vara en väckarklocka. Idén kräver ett nytt, snabbt mått på förutsägelsen
(ansatsenergin i ±30 ms kring nästa förutsagda slag mot mellanrummet, slag för slag) – det är i så fall samma signal som idé 2:s
"regentens råa poäng", och bör sonderas där.

## Sidofynd (två vittnen i stället för en produkt)
Vikningen på basen ensam har rätt i 90,2 % av fönstren, diskanten ensam 96,2 %, produkten 97,7 % – men MINST EN av dem har rätt i
99,2 %. När de två är oense vet tempogrammet det inte i dag, eftersom det bara ser produkten. Oenigheten kan vara tecknet som ger
självlikheten ordet (idé 1), i stället för en marginal.

## Min rangordning
1 är den jag tror mest på: ny information, mätt vinst i de fönster där tempogrammet har fel, och den rör inte låsningen. 2 har den
största möjliga vinsten på ett dubbelviktat mått men också gårdagens fälla. 3 är struken som egen idé.
