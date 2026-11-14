# Natt-agentens uppdrag

NATTEN 2026-11-14 03:20 (schemalagda körningen, ingen motorkod ändrad): MÄTFÄLLA 55 - BÄNKARNA KÖRDE INTE LADANS CONFIG. defaultConfig =
4 lampor, släckgräns 0,05, lead 50 ms; ladan = 8 lampor, 0,015, 90 ms. På det rena ljudet (nivå-median 0,16) släckte bänken riggen 22-27 % av
tiden (längst 21 s) där ladan lyser. RÄTTAT: tools/ladanCfg.json (bild av Pi:ns config 11-13, bara nycklar som skiljer) + tools/benchCfg.mjs
(ladanCfg(defaultConfig)); showTight, concertBench, konsertReplay läser den. DMX_BENCH_CFG=standard = gamla läget (json-identiskt bevisat på
alla tre filerna). EJ BYTTA: dmxDump (md5-bevis), arena/dropdomKor.mjs, lampCount, dynBench, bank.py-kedjan - byt när fillistorna byggs om.
UPPDATERA tools/ladanCfg.json efter varje besök där /setup ändrats (.arena/natt1114/mkcfg.mjs gör den ur system/config.json).
BASLINJE PÅ RENT LJUD (HEAD abe69c3, ladans config, tools/natt/ren-2026-11-14/; 151659 / 160345 / 171840): släckt 0,5 / 1,6 / 0,2 %,
kick->ljus 136 / 141 / 85 ms på 32 / 34 / 31 % av kickarna, ljus mot nivå r 0,50 / 0,63 / 0,31, lookbyten 1,7 / 3,2 / 2,8 per min,
längsta stund i en look 175 s (gallop) / 151 s (kickregn) / 47 s, byte på frasgräns 24 / 19 / 13 %, vers mot refräng 0,30 / 0,20 / 0,27,
lampspridning 63 / 64 / 56. natt.py går inte (arkiverat ljud); samma kommandon nästa natt = bit-jämförbart.
BRISTER (ej åtgärdade, ingen ljusdomare på nytt ljud): (1) en look i 2,5-3 min - manuset ger samma look vid varje refräng och ingen låtgräns
bryter; (2) lookbyten på frasgräns 13-24 %; (3) kvarvarande mörker 4-6,5 s = kickregn/sökljus när basen är borta.
NÄSTA FÖR NATTAGENTEN: bygg om ljusdomarens fillistor (bank.py WAVS/HOLDOUT, domare.py) på de tre 11-13-filerna med benchCfg och mät bas;
mät om dropdom-basen med ladans config (analysatorn får släckgränsen: kickar 1525 -> 1532 i 151659) innan nästa drop-arena.

ARENAN DROP1 KLAR 2026-11-14 03:30: INGEN VINNARE, inget inlagt. Rapport tools/natt/arena-2026-11-13-drop1.md, idébank i mappen bredvid.
Övningen: jokern 90,7 poäng (8/9 drop), a1 82,6. KONTROLLEN: alla 0 av 5 drop i finalen; efter runda 2 (allmängiltighet) bäst a4r 1 av 5.
Orsak: i övningen hålls basen tillbaka före drop (66 % av 8 s), i kontrollen spelar basen vidare (33 %, längsta lucka 1,1 s) - de två
inspelningarna innehåller olika sorters uppbyggnad och 14 drop räcker inte. Kontrollen (151659) är använd 2 gånger och inte längre osedd.
NÄSTA ARENA om drop: båda 11-13-filerna som övning, NYA markerade inspelningar som kontroll; fråga ägaren vad han hör som uppbyggnad när
basen spelar vidare. Domaren dropdom.py kör nu med klockan (705e515) och har kö.
IDÉBANK drop1: a6 relativa nivågränser (inRiser/inZone mot levelCeil, riserns fönster relativt bandets topp) - prova ensam, ägarens ja krävs.
IDÉBANK drop1: a4r lokalt tak (30 s) i stället för tak som glömmer på minuter - tål nivåbyten ±8-12 dB; a7 break-taket (tog 7 av basens 9
falska drop); a1r tempot fryses medan basen hålls (klockan visade 80 i st f 130 bpm före ett drop); a5r ny-topp-måttet.
NATTAGENTEN: ingen ny arena utan ARENA-uppdrag; bänkarna på det nya ljudet är fria (.arena/.droplas).

NYTT RENT MATERIAL + GRUNDMÄTNING 2026-11-13 kväll (ladan, ägaren på plats) - LÄS tools/natt/grund-2026-11-13.md FÖRST.
tools/ladan-2026-11-13/: tre rena inspelningar (24 min) + en lång som startades 18:24; två har ägarens markeringar (14 drop, 20 mini,
11 uppbyggnad, 4 "inte drop"; .marks-fin.json, skip = feltryck). Bänkar som går på det nya ljudet: tools/natt/bygg-facit/dropMotFacit.mjs,
finjustera.py, konsertReplay.mjs, liveMotBank.py, dmxDump.mjs (DUMP_MODE=<effekt>), inspelningskoll.py, lab6Prov/linjalenProv/inputProv.
De GAMLA domarnas fillistor (bank.py, tvavagar, klockdom, kontroll2.json) pekar på arkiverat ljud och får inte köras förrän de byggts om.
Det arkiverade hämtas ALDRIG tillbaka. Raderna nedan om "inga bänkar" gäller alltså de gamla listorna, inte det nya materialet.
Fynd: motorn kallar 1 av 14 markerade drop för drop (12 blir minidrop) - alla ägarens drop har uppbyggnad före; buildUp/inRiser/inZone är 0 %
vid ren nivå (absoluta nivågränser 0,3/0,4/0,65 mot level-median 0,16); analysatorn är densamma live och offline (drop inom 0,1 s).
Ladans Pi kör 4c84b1b: åtta lampor, rök 64, linjalen (första effekten som äger ljuset, EffectDef.own), "svart = släckt" för stunder/own.
ARENA I NATT: ägaren vill starta en dmx-arena i natt - frågan bestäms i huvudchatten; ingen arena utan ARENA-uppdrag här.

ÄVEN LOTUS INSPELNINGAR ARKIVERADE 2026-11-13 17:10 (ägaren: "arkivera även lotus inspelningar"): tools/frozen* (alla nio, frozen6 = klockdomarens
och tvavagars korpus), lotus korpus (corpus + corpus-mix) och källarklippen ligger i Desktop/Claude/lotus-arkiv/lotus-inspelningar-fore-20261113/.
FÖLJD: INGEN ljud-bänk i dmx-control går längre (klockdom, tvavagar, bank, lotusbank, taktKorpus, kontroll 2). Bara syntetiska prov (testDownbeat,
tools/inputProv.mjs) och bygget går. NATTAGENTEN: ingen bänk, ingen arena, en rad i rapporten. Ägarens riktning: ETT material för båda systemen =
ladans nya rena inspelningar; lotus skillnad läggs i ingångsmodulen (mic -> analysator), inte i en egen mic-korpus.

LADANS INSPELNINGAR ARKIVERADE 2026-11-13 16:45 (ägaren: "arkivera/ta bort dom som finns idag så vi inte råkar använda dom") - LÄS FÖRST.
Allt i tools/ladan-2026-*/ och tools/*.wav (pop_ladan, megamix_ladan m.fl.) ligger nu i Desktop/Claude/dmx-arkiv/ladan-inspelningar-fore-20261113/
(LASMIG.md där). HÄMTA DEM INTE TILLBAKA. Följd: bank.py, domare.py, tvavagar.py, klockdom.py (övningens långa filer + kontroll 2:s tre långa),
natt.py:s baslinje, dynSet, dropFacit, konsertReplay på lang-filer GÅR INTE förrän nya inspelningar finns. NATTAGENTEN: KÖR INGA BÄNKAR OCH INGEN
ARENA; skriv en rad i nattrapporten och avsluta (hälsokontroll av det som går utan ljud är tillåten). frozen6 och lotus korpus (källarens mic)
är orörda - klockdomarens mix och klipp på dem går, men inte hela --mat.
VARFÖR: pop_ladan och megamix_ladan är klippta i 98-100 % av sekunderna (tools/inspelningskoll.py: toppfaktor 2,9 / 4,0 dB) - två av ljusdomarens
tre filer. Alla ljusdomar på dem (rA, rK, jitter, lampspridning sedan oktober) är mätta på sönderklippt ljud. De långa inspelningarna klipper inte
(brusgolv -88 dBFS, mp3-kontroll 40-53 dB SNR) men ägaren hör att de låter illa; diskanten är ovanligt stark i starka partier. Orsak ej funnen.
NYTT I KODEN (fd48b96, ej utlagt): /setup > Mer > INGÅNGSNIVÅ (mät topp/medel/toppfaktor/ljushet, lyssna 4 s på det Pi:n hör, lås nivån + ägarens
anteckning om mixern -> cfg.inputCal) och INSPELNING tills stopp (tak 60 min, skrivs löpande, 2 MB minne) med knapparna Låtbyte / Uppbyggnad /
Minidrop / Drop, provinspelning 1 min och "Lyssna på senaste". Prov: node tools/inputProv.mjs.
NÄSTA BESÖK I LADAN (huvudchatten med ägaren på plats, i den här ordningen):
  1. `python tools/ladan.py --bara-deploy` (HEAD: break-hållet, låtens minne, nya /setup).
  2. Flytta Pi:ns gamla fångster undan (/var/lib/audio-dmx-engine/snippets -> snippets-fore-20261113) så hämtaren inte tar hem dem igen.
  3. Ingångsnivå: en låt med fart, börja lågt på mixern, öka sakta, lyssna på klippet vid varje steg, lås + skriv av mixern.
  4. Provinspelning 1 min -> Lyssna på senaste. Låter den ren? Annars felsök kedjan (kabel, mixerns utgång, Codec Zero) innan något spelas in.
  5. Inspelningar tills stopp, med markeringar. Hämta hem, kör tools/inspelningskoll.py på varje fil INNAN den används.
  6. Bygg om domarnas fillistor (bank.py WAVS/HOLDOUT, tvavagar MANGD, klockdom LANG, kontroll2.json lang) på de nya filerna; mät nya baslinjer.
  7. Markeringarna kommer ~0,5-1 s efter händelsen (reaktionstid): justera i efterhand mot ljudet (drop/mini -> basens återkomst närmast före,
     låtbyte -> spektrumskiftet) innan de används som facit (ägaren 11-13).
Väntar på nytt ljud: ögonprovet av kicken (k6), uppbyggnadens facit och arena (märksidan med 98 klipp är överspelad - klippen var ur de arkiverade),
ny baslinje för ljusdomaren.

FACIT FÖR UPPBYGGNADEN SAMLAS IN (huvudchatten 11-13 16:10): ägaren märker 98 ljudklipp (22 s, -15..+7 s kring kandidaten) på en privat sida:
drop / drop utan uppbyggnad / minidrop / inget + valfritt "uppbyggnaden börjar nu". Kandidaterna: tools/natt/bygg-facit/kandidater-20261113.json
(56 av analysatorns hela drops i ladans 23 inspelningar 10-11, 30 baslyft >= 8 dB utan drop, ägarens 12 gamla markeringar i lang1014 för ommärkning;
id k001..k098 i slumpordning, källan visas inte för ägaren). Skript: tools/natt/bygg-facit/klipp.py (lotus-venv:ens python, soundfile med mp3).
Märkningen läses av huvudchatten ur sidans databas (collection marks, fält v och b = uppbyggnadens start i s relativt kandidaten). RÖR INTE.
När märkningen finns: bygg domaren (drop/mini/inget mot facit, uppbyggnadens start) och skriv ARENA-uppdraget. Ingen arena före det.

INGEN ARENA I NATT 2026-11-13 -> 11-14 (huvudchatten 15:30): uppbyggnaden är INTE redo för arena - det saknas facit. Kör natten som vanligt
(baslinje på HEAD c08e1cb + egna fynd), ingen arena förrän ett ARENA-uppdrag med facit står här.
VARFÖR: ägarens regel 11-13 är "ingen uppbyggnad = troligen bara minidrop". Ägarens egna markeringar i lang1014 (tools/ladan-2026-10-14/marks.jsonl:
8 drop + 5 mini) är det enda facit som skiljer de två. Mätt mot dem (.arena/bygg2/l1014.json, konsertReplay HEAD): basens lyft skiljer INTE ensamt -
två drops har bara 6-7 dB lyft (172,6 s och 209,0 s: etiketten build före) och en mini har 17 dB lyft efter 15 s break (303,7 s). 13 markeringar räcker
inte till både övning och kontroll (arenan bygg 11-11 föll just på överanpassning mot ett ersättningsmått). NÄSTA STEG = FLER MARKERINGAR AV ÄGAREN
(drop / mini / uppbyggnad börjar) på ladans inspelningar; därefter domare + arena.

KICKEN = BASANSLAGET: BYGGD OCH MÄTT 2026-11-13 15:00, INTE INLAGD - VÄNTAR PÅ ÄGARENS ÖGA I LADAN (huvudchatten, triagens fynd 2).
Prov: prov/kick-basanslag-20261113.patch (bara analyser.ts, ovanpå c08e1cb), fryst bygge .arena/kick1/k6/dist. frame.kick fyrar när basens
snabba nivå (fbAbs sub + kick, samma storhet som klockan viker) stiger >= 6 dB på 6 hop, återarmeras under 3 dB, minst 100 ms emellan.
De snabba banden räknas före kicken (flytten ensam är bank-identisk). Gamla detektorn (flux-median/MAD, 0,6-slags kylning, åttondelsgrind) ligger
kvar död bakom provflaggan i patchen - städas bort om den läggs in.
MÄTT (pop / megamix / lang1021, tools-prov .arena/kick1/kickprov.mjs): kickar/s 3,25/3,03/3,69 -> 1,38/2,28/1,93; på åttondelsrutnätet +-40 ms
35/42/37 -> 73/65/82 %; på slaget 23/22/25 -> 52/26/61 %; intervall = kylningens kant 74/29/67 -> 6/4/3 %; R mot rutnätet 0,04/0,02/0,02 -> 0,25/0,09/0,37.
LJUSDOMAREN MED FAST LOOK (.arena/kick1/look-*): svall +1,0, kickregn +3,9 (jitter pop 33 -> 19 ms), minnet -6,0 och DISK t90 80 -> 100 ms
(minnet läser max(drum.kick, bassBody): färre kickar = långsammare stigning). KLOCKDOMAREN övning (.arena/klocka4, bas = c08e1cb): -0,07, neutral.
LOTUS 126: rätt 117 = 117, kickprecision 0,87 -> 1,00, recall 0,32 -> 0,29, slag med kick 0,40 -> 0,50, fas 0,89 -> 0,88.
DELAD DOM = ÖGONPROV: i ladan, efter att HEAD lagts ut och setts: `python tools/ladan.py --bara-deploy --fran .arena/kick1/k6/dist` (kicken ovanpå),
titta på kickregn/svall (ska bli tajtare) och minnet (kan bli segare). Godkänt -> lägg in patchen städad + porta lotus. Nekat -> ta bort patchen.
PRÖVAT: fast gräns 3/4/5/8 dB och följsam gräns (0,5-0,8 x senaste toppstigningen): ingen ger "en kick per slag" - basgångens toner stiger också;
recall begränsas av att en kick ovanpå ihållande bas inte lyfter bandnivån 6 dB. En riktig trumdetektor (klick + sub) är en egen arenafråga.
klocka4/bas (c08e1cb, övning): mix 98,26 klipp 98,64 lås 2,78 still 3,15 utfl 0,27/1,23 syskon 0,89 ettan 98,55 grid40 50,25 = BAS FÖR NÄSTA KLOCKARENA.

BREAK-HÅLLET INLAGT 2026-11-13 14:10 (huvudchatten, ägaren "KÖR"): c08e1cb, klockan väljer inget nytt tempo medan baskroppen ligger >= 24 dB
under sitt tak och 5 s efteråt, högst 30 s (analyserClock TG_BRK_DB / TG_BRK_MAX_MS; analyser bodyUnderDb; split H_UNDER, BS_UNDER; manifestet skrivet).
Mätt: 36 drops i ladans 21 inspelningar: klockan fel >= 2 s 13 -> 3, tid på fel tempo runt dropen 10,8 -> 2,7 %; övningsmixen identisk; megamix i
ljusbänken rAbest 0,32 -> 0,43, jitter 63 -> 33 ms. KONTROLL 2: allt bättre utom mix_still 4,65 -> 5,98 s (DISK enligt regeln) - ÄGAREN BESLÖT ATT
LÄGGA IN ÄNDÅ. ANVÄNDNINGAR AV KONTROLL 2: 1 variant (brk). Lotus portad (e0d14b74) och utlagd 14:12. LADAN EJ utlagd: nästa besök `ladan.py --bara-deploy`.
BAS FÖR NÄSTA KLOCKARENA = HEAD c08e1cb: mät om bas i en NY körning (dmx.json {"v": 2}); .arena/klocka3/bas är FÖRE break-hållet.
PRÖVAT OCH FÖRKASTAT I DAG: låtens minne i ladan med gränsdetektorn som låtgräns (.arena/klocka3/lm: utflykter 0,24 -> 0,09/min men mixens lås
2,78 -> 9,70 s, upp till 97 s per missad gräns) - väntar på en säkrare låtgräns. Break-håll på dropdetektorns 5 dB-frånvaro (fryser vid låtbyten).
KVAR UR TRIAGEN I ÄGARENS ORDNING: (2) frame.kick på kickbandets anslagstopp i stället för första transienten efter kylningen; (5) uppbyggnaden:
känn igen den, och ingen uppbyggnad = minidrop (ägaren 11-13) - nattens arena. (4) sektionsfladdret lämnas tills vidare. MÄTFÄLLA: gridfel
(medianen) tippar 30 <-> 330 ms på en enda ansats i låtar med bas på både slag och mellanslag - läs grid40, inte gridfel.

MÄTNINGEN LAGAD 2026-11-13 12:00 (huvudchatten, ägaren: "kör nu"): tre saker klara inför nästa arena.
(1) KONTROLLMÄNGD 2: tools/arena/kontroll2.json (mk_kontroll2.py; 20 låtar/50 min mix + 60 klipp ur lotus korpus med dubbelt bekräftat facit,
    tre oanvända ladinspelningar). Slås på med <körning>/dmx.json = {"v": 2}; mätningen heter klockdom-k2.json. Den gamla kontrollmängden är PENSIONERAD
    för klockan (16 domar). ANVÄNDNINGAR AV KONTROLL 2 HITTILLS: 0 varianter (bara basen). Räkna varje --holdout på en variant här.
    BAS (HEAD c56ade9) på kontroll 2: rätt tempo mix 91,10 % / klipp 84,05 %, lås 3,04 s, still 4,65 s, hopp 1,07/min, utflykter 0,89/min 6,00 %,
    syskontid 6,74 %, ettan 100 %, grid40 54,95 %, gridfel 18,9 ms. Felen sprids: 2 av 20 låtar under 75 % (förr EN låt = 12,5 % av mixen).
    Ge ALDRIG deltagare per-låt-tal ur kontroll 2 (bas/klockdom-k2.json mixLatar/klipp) - bara totalerna.
(2) RUTNÄTETS FAS I KLOCKDOMAREN (DMX-läge 2): ettan < bas - 10 pe eller grid40 < bas - 5 pe = DISK. Kontrollen före start: nattens dmx-2 (parabeln)
    fälls på övningen (ettan 98,6 -> 62,3, grid40 49,6 -> 22,6) fast klockpoängen är -0,17. Körning: .arena/klocka3 (bas + dmx-2 mätta).
(3) FYNDLISTAN GENOMGÅNGEN: tools/natt/fynd-triage-2026-11-13.md. Av 14 ÖPPET (oktober): LÖST 3, INAKTUELLT 2, KVAR 9. Störst kvar: tempot runt
    drops (klockan fel >= 2 s vid 40 % av dropsen), frame.kick fyrar på kylningens kant (3,2/s i slumpfas), tempohopp inom låt (0,67/min på ladans
    23 inspelningar), sektionsfladdret (delar < 8 s 23 -> 34 % efter snabba kanterna), ingen build före drop (12 av 55).
    NYTT ATT VAKTA: analysatorn allokerar 428 kB/s mot 79 för bygget 11-08 (tgScore, onsetStep, updateInner, tgStep) - mest i workerns heap.
    Lotus-Pi:n 11-13 11:53 efter 2 h: bara de planerade låtbytes-GC:erna (96-145 ms), minor max 32 ms, inga omstarter - inte akut, men mät i ladan.
NÄSTA ARENA (ägarens ordning): UPPBYGGNADEN före drop. Därefter klockans sammanslagning (åtta mekanismer -> en bevismodell), dömd på kontroll 2.

LÅTENS MINNE INLAGT 2026-11-13 10:55 (huvudchatten, ägaren: "lös källarväxlingen med Sonos låtgräns"): c56ade9, delade filer analyserClock.ts +
analyser.ts (boundSure) + split.ts (H_SURE, HOP_REC_LEN 17), manifestet skrivet. DMX SÄTTER ALDRIG FLAGGAN = oförändrat beteende (bank.py rytm + dyn
identiska före/efter). Lotus (4cbb2e3b) sätter den för Sonos-spår <= 10 min och är utlagd 09:45: live 22 låtar, stora tempobyten 2,75 -> 0,62 /min.
Provbänk: .arena/sonos1/ (sonosspel.mjs = kallarspel med låtbyten, kor.py, lotus.py --sure). IDÉ FÖR DMX: ladan har ingen säker låtgräns, men
samma minne kunde slås på av gränsdetektorn om den blir säker (i dag 11 av 15 byten) - ingen uppgift, bara noterat.

KLOCKAN dmx-1b INLAGD 2026-11-13 03:35 (huvudchatten, ägarens ja): src/analyserClock.ts = arenans dmx-1b (4770389, bygget byte-identiskt
med .arena/klocka2dmx/dmx-1b/dist), manifestet skrivet, tagg backup/fore-dmx-1b-20261113. LOTUS: portad (lotus e3f9d6b4) och UTLAGD på
lotus-Pi:n 03:34 (bara analyserClock.js, md5 lika, ingen musik vid utläggningen = inte sedd live än). LADAN: EJ utlagd - nästa besök
med ägaren på plats: `ladan.py --bara-deploy`. Valet nedan är alltså avgjort; baslinjen i natt (36a7a97) är FÖRE dmx-1b - nästa natt
gör en ny baslinje på HEAD. Kör inte arenan om klockan igen utan ny, orörd kontrollmängd (den gamla är använd 16 gånger).

NATTEN 2026-11-13 03:45 (schemalagda körningen, ingen kod ändrad, rapport tools/natt/rapport-2026-11-13.md): BASLINJE på HEAD
(första efter 11-12): sektion upp 7,6 -> 2,3 s / ned 11,5 -> 2,1 s; lookbyten över kvällen 2,53 -> 3,25/min (sektionsorsak 309 -> 400),
hör ihop 77 -> 72 %; megamix lugn 0,29 -> 0,40 mot fart 0,44, lampspr 77 -> 70. LJUSDOMAREN MED FAST LOOK på klockkandidaterna
(kravet före utläggning): dmx-1b svall -2,1 / kickregn -0,2 / minnet +2,1, k4b -2,0 / +0,1 / +2,0, ingen DISK = neutrala för ljuset,
går inte att skilja; fria +5,4 och lampspr -6,4 % är lookföljden (.arena/natt1113/). Kvar före utläggning: manifestet + lotusporten.
FYND: kickregn sidoblink 0 -> 1,1/min på ladans 20 klipp sedan pulshalveringen togs bort (5d680ff; frysta byggen: halvering på 0, av 1,1;
ett klipp 17,6 -> 37,9/min; ofrivillig blink 0 = effektens eget byte på varje slag) - ögonpunkt i ladan, inget ändrat.

ARENAN KLOCKA2-DMX KLAR 2026-11-13 01:40: INGET INLAGT I src/. DMX-domaren (klockdom.py med <körning>/dmx.json: lotus ur, dubbel vikt
på rätt tempo och omlåsning). Ledare efter alla spärrar: dmx-1b = k4b + taktens självlikhet som vittne, +8,44 på kontrollmängden
(k4b +7,59; fel tempo/min 1,39 -> 0,76, tempobyten 0,67 -> 0,36, omlåsning 3,02 = bas), ren i tvavagar. dmx-2 (+ parabel i fintempot)
fick +10,99 men är DISK i tvavagar: rutnätet förstört (ettan 100 -> 62 %). Rapport: tools/natt/arena-2026-11-12-klocka2/RAPPORT-DMX.md,
idébank i dmx/. Bänken är fri igen.
LOTUS-KÖRNINGEN KLAR 02:10: dmx-1b mot lotus (bara redovisat, sist i RAPPORT-DMX.md): 469/503 rätt (bas 463, k4b 468), syskonfel 21
(k4b 22), låtar som växlar 80 (k4b 84), källaren 2,23 / 3,83 = exakt k4b (vittnet lägger inget på källarens växling), fas 0,88 / 23 / 270.
- VAL FÖR ÄGAREN: dmx-1b (dmx/dmx-1b.diff mot 97ac0bf) eller k4b ensam, eller inget. Före utläggning: ljusdomaren med fast look,
  analyser_shared.py --write src, lotusbanken som vakt (vittnet omätt mot lotus).
- OMLÅSNINGEN GÅR INTE ATT KÖPA I KLOCKANS BESLUT (7 regler + 3 signaler prövade): tempogrammet behöver ~2,7 s, rå vikning 1,9 s i
  motorn, 0,8 s vinst kostar 1,0 falska byten/min. Nästa fråga = en signal utifrån (låtgränsen tidigare/säkrare).
- IDÉBANK klocka2dmx: LÄGG RUTNÄTETS FAS I KLOCKDOMAREN (ettan, grid40, gridfel) - domaren såg inte att parabeln förstörde rutnätet.
- IDÉBANK klocka2dmx: parabeln i fintempot gav fel tempo/min 0,76 -> 0,59 och tid 4,77 -> 4,00 % på kontrollen - prova en form där
  rutnätets fas flyttas med tempot. k2:s riktade krona = reserv.
- IDÉBANK klocka2dmx: kontrollmixens stora fel är troligen EN låt som står stadigt fel hela låten (12,5 % av mixen) - lyssna/peka ut
  med facit (tretakt/6-8 eller ren 2/3-läsning?). Bygg en svår övningsmängd (låtar där basen står stadigt fel).
- IDÉBANK klocka2dmx: robust mix_still (+-3 %) föll (fäller inte en klocka som står kvar på förra låtens tempo) - kräv RÄTT tempo i fönstret.

## ARENA I NATT 2026-11-12 -> 11-13: KLOCKAN HÅLLER EN TOLKNING (ägaren 11-12 em: "Det borde gå till en arena i natt. Hur förbättrar vi analysatorns klocka") - GÅR FÖRE ALLT UTOM HÄLSAN
Kör skillen dmx-arena (körning `.arena/klocka2`). EN arena, inget annat tungt i natt. Ingen deploy, ingen push, inget skrivs i lotus-light-link.
STARTAD I FÖRVÄG AV ÄGAREN 2026-11-12 ~16:50 ('Kör igång nattagenten nu'). Två körningar kan alltså läsa detta:
- Körningen som startas nu: kör arenan enligt nedan. Skriv 'ARENAN KLOCKA2 PÅGÅR sedan <tid>' på raden under denna punktlista när du
  börjar och byt till 'ARENAN KLOCKA2 KLAR <tid>: <utfall på en rad>' när rapporten är skriven (commit med pathspec).
- Den schemalagda körningen 02:38: står här PÅGÅR eller finns låsfilen .arena/.banklas -> kör INGA bänkar och ingen arena, vänta inte,
  skriv bara en rad i nattrapporten och avsluta. Står här KLAR -> kör INTE arenan igen; gör bara en ny baslinje på HEAD om arenan lade
  in en vinnare (annars ingenting tungt) och sammanfatta arenans rapport i nattrapporten.
ARENAN KLOCKA2 KLAR 2026-11-12 23:40: INGEN VARIANT INLAGD I src/ (ägarens/huvudchattens val). Två klarar alla spärrar på båda
mängderna: k4b +8,25 och k2c +7,72 på kontrollmängden (övning +8,51 / +9,24) - men via lagningsomgångar där kontrollmängden använts som
återkoppling, och med lotus-marginalerna som ändrades under körningen (ägaren 22:12/22:16/22:22). Rapport + idébank (alla diffar,
samrådets förslag/svar): tools/natt/arena-2026-11-12-klocka2/RAPPORT.md. Domaren: tools/arena/klockdom.py.
- VAL FÖR ÄGAREN: k4b (DMX-måtten kontroll +10,2 i medel: fel tempo/min -44 %, tempobyten i mixen -46 %, lotusbanken 463 -> 468; kostar
  tid i utflykt +8 %, lotus motfas 20 -> 23) eller k2c (DMX +6,8: tid i utflykt -17 %, källarens byten -25 %, mix_still bättre än bas,
  inget mått klart under bas). `git apply` k4b.diff / k2c.diff mot 97ac0bf; sedan ljusdomaren med fast look (KR_MODE; lampspridningen
  -6 % i tvavagar är lookföljden), `analyser_shared.py --write src`, och huvudchatten portar till lotus.
- IDÉBANK klocka2: samrad-1 (k2c + k4b:s två ändringar i onsetStep: blippspärr + fintempots hysteres) - utfl_min 0,82 -> 0,24,
  utfl_tid 2,11 -> 1,21, syskon_tid 2,67 -> 1,01 på övningen, DISK bara på mix_still 3,95 - prova ensam NÄR MIX_STILL MÄTS ROBUST.
- IDÉBANK klocka2: MIX_STILL ÄR ETT LOTTERI VID GRÄNSEN (samrådets fynd): tempoBpm identiskt med bas, men klockans fintempo går mellan
  0,5 %-grannar (93,4/93,9/94,4 = 1,06 % isär) och kravet +-1 % i 5 s spricker på ETT prov; basen klarar övningen med exakt 9 av 16
  låtar. Gör måttet robust (andel låtar under gränsen, eller tåla en grannstegsväxling) FÖRE nästa klockarena.
- IDÉBANK klocka2: k3 slagens passform som veto - lotusbanken 116 -> 121, syskonfel 5 -> 3 (övning), föll på mix_still + lotus i fas -
  prova ensam mot lotusbanken. k2:s riktade krona (k2s1/src, en rad i onsetStep): låt 9 8,3 -> 2,5 s - prova med nytt mått.
- KÄLLARFELET ÄR INTE LÖST MED MARGINAL: källarens växlingar är inte exakta syskon och går till ohörda tempon = ser ut som en svag
  låtstart; samma håll som ger källarvinsten (k2/k2b/fusion 3,97 -> 1,56) fördröjer låtbytet (mix_still 8,20 / 4,22). Behöver
  låtgränsen eller en annan signal än klockans egen.
- Den schemalagda 02:38-körningen: kör INTE arenan igen, ingen ny baslinje behövs (src orörd = 97ac0bf).


FÖRE BASMÄTNINGEN: bygg om engine/dist (`npx tsc -p tsconfig.json`) och kontrollera `git status --short src` = tomt. Ägaren var i
ladan 11-12 kväll och huvudchatten lade ut frysta kopior med `ladan.py --fran` (stegen i .arena/ladan1112/ + .arena/tempohopp/),
och --fran SKRIVER ÖVER engine/dist med den frysta kopian. Bas = dagens src, inget annat. Läs också raden LADAN 11-12 nedan
om den finns (vad ägaren godkände/underkände i ögat).

LADAN 2026-11-12 14:54-15:25 (ägaren på plats, huvudchatten lade ut ett steg i taget med `ladan.py --bara-deploy [--fran <fryst dist>]`,
env orörd): 1 tempohoppen, 2 basenergin + tilliten, 3 snabba kanterna, 4 dagens bygge (fade-reglagen i /setup, toningen i effekterna,
frame.buildProg) - ägaren sa 'nästa' efter vart och ett (inga invändningar, inget uttalat godkännande). 5 pulshalveringen: ägaren
'jag vet inte om halveringen passar på dmx' -> jämförde med halveringen helt av -> 'av, kan nog köra samma i lotus sen'.
PULSHALVERINGEN ÄR BORTTAGEN UR DMX (5d680ff, -64 rader, md5 identiskt med varianten han såg). Inget frame.pulseDiv i analysatorn
(ingen läser det). LADAN KÖR NU HEAD 5d680ff (md5 analyser 3cc1a7a3, effects 32700d6a). Övertoning m.fl. reglage: standardvärden.
Fällor: ladan.py hittar inte alltid Pi:n -> PI_HOST=<adressen ssh når>; spärren nekar fryst kopia som är äldre än src -> `touch` på
kopians .js före `--fran`; `--fran` skriver över engine/dist -> `npx tsc` efteråt (gjort, dist = HEAD).

KODEN ÄNDRAD 11-12 EM (efter att uppdraget skrevs, ingår i bas): 4d8e9d7 uttoningen ligger i effekterna (src/effects/toning.ts), output
har bara golvet mot strobe (LampGuard) - DMX-md5 identiskt; 0fd4d75 uppbyggnadens förlopp mäts i analysatorn (frame.buildProg,
tillståndsblocket STATE_LEN 26) - ljusdomaren -0,0. Pulshalveringen jämförs av en agent (.arena/pulshalv/RAPPORT.md): läggs den in
före natten står det i git-loggen. Bas = HEAD.

VARFÖR NU: i lotus väljs sedan i dag fade in, lead och fall ur klockans tempo (onsetRiseK, effektFallMs). Mätt i källaren 11-12 ~13:30:
på en låt växlade klockan 94 <-> 126 BPM (förhållandet 4:3) ungefär var 10:e sekund med låsningen av/på -> leaden hoppade 128 <-> 96 ms och
falltiden ~2200 <-> ~1540 ms. Tidigare samma dag: tempot hoppade 81-150 med låsning ~35 % på en lugn låt. Tempovalen blir aldrig
stadigare än tempot.

VAD SOM ÄR MÄTT (bas = engine/src i dag, 4d45a07 + todo):
- lotusbank 463/503 rätt. De 40 felen: 4/3 = 16, annat = 14, 3/2 = 7, dubbla = 2, halva = 1. Syskontempon (4:3 och 3:2) är alltså
  23 av 40 fel - samma familj som växlingen i källaren. Syntet 6/8 (2 dubbla).
- DMX: utflykter 1,00/min, tid i utflykt 2,93 % (127,6 min, tools/tempoHoppDiag.mjs + tempoHoppUtflykt.mjs, mängderna i
  tools/natt/flerhypotes-2026-11-10.md). Analysdomaren: mix_klocka 97,9 / 83,4 % (övning / kontroll), mix_hopp 0 / 0,67 per min,
  mix_las 2,78 / 3,02 s, mix_still 2,93 / 3,72 s, klipp_klocka 98,3 / 85,8 %.
- Förra försöket fh1 (139 hypoteser med bevissumma, prov/flerhypotes-fh1-20261110.patch, rapporten ovan): utflykter 1,00 -> 0,26/min,
  lotusbank 468, men FÖLL på svaga låtstarter (kallstart kontroll 6,5 -> 10,8 s), mix_still kontroll 3,72 -> 8,51, ned_s sämre.
  Lärdom: flaskhalsen är BEVIS vid svaga låtstarter; varje regel som sänker ribban när regenten ser död ut släpper in utflykterna igen.
- KÄLLARINSPELNINGARNA (ägaren 11-12 em: 'kör så vi ger bra underlag till arenan'): en vakt på lotus-Pi:n spelar under kvällen in
  150 s i full takt (48 kHz mono) varje gång klockan växlar tempo (>= 3 hopp > 12 % inom 60 s), högst 12 klipp, och loggar
  motorns tempo varje sekund bredvid (v-<HHMMSS>.wav + .csv, loggen vakt.log). Vakten slutar 01:45 och inspelaren stängs av 01:50.
  HÄMTA DEM FÖRST (läs bara, rör inget på Pi:n):
    mkdir -p .arena/klocka2/kallaren && scp -i ~/.ssh/id_pidmx 'pi@192.168.1.174:/home/pi/vaxling/*' .arena/klocka2/kallaren/
  Spela dem med `node tools/arena/kallarspel.mjs <lotusbygge>/dist/audio-analyser/index.js <wav> [ut.csv]` (matar som lotus bench.mjs:
  hop 128, bänkklockan; skriver tempobyten/min och tid per tempo; lotusbygget = det lotusbank.py bygger i <mapp>/lotus/dist).
  Jämför basens uppspelning mot klippets .csv: växlar bas på samma sätt som motorn gjorde live? Bara de klipp som återskapar
  växlingen räknas. Finns inga klipp (ingen växling fångad, eller Pi:n onåbar): fallet utgår, skriv det i rapporten.
- KORPUSEN har samma fel: lotus bench.mjs ger per fil klockans tempo (min/max/q25/q75 över klippet). Filer där spannet rymmer ett
  syskontempo är källarfelet på inspelat material - lista dem ur basens körning innan arenan startar.

STÄDAT FÖRE ARENAN 11-12 16:45 (ägaren: 'Är det bättre att rensa först och sen starta arenan?'): död tempokod bort ur analysatorn
(dmx 97ac0bf, lotus b65b8105 + utlagt på lotus-Pi:n md5 analyser.js 0b057e87): analyser.ts 3295 -> 2971 rader (163 kod, 147 kommentar),
frame.kickRise borta, sex olästa profilflaggor borta i båda profilerna (TEMPO_LAGMAX, GHOST_WAIT, SUBH_GUARD, SECTION_HINT_LOWCONF,
OCT_UP, SUBH_MULT). analyserClock.ts ORÖRD. Bevis: DMX-md5 identiskt hela filer (sync/inline/moments), tvavagar --snabb IDENTISK,
lotusbank 463/503 alla fält lika (agentens körning + min egen på slutläget). KARTANS RADNUMMER I analyser.ts ÄR FÖRSKJUTNA efter
städningen (klockfilens stämmer). Kvar efter arenan: kartans 4.5-4.9 (verktygslästa fält, resetTempo/resetBar, env-ringarna,
trådkoden, F_SIL-kedjan). FYND: SIL_CLEAR_PENDING saknar läsare (nollning av väntande kickar vid tystnad gäller inte) - ägarbeslut.
LADAN ligger en commit efter HEAD (städningen, identiskt beteende); nästa besök: `ladan.py --bara-deploy`.

KARTAN ÖVER LEVANDE TEMPOKOD (läs den och ge den till deltagarna i uppgift.md): tools/natt/arena-2026-11-12-klocka2/KARTA.md (11-12 em).
- ALL temposökning bor i analyserClock.ts (tgStep, tgScore, peakVote, peakScore, onsetStep, ca rad 219-405). analyser.ts har INGEN levande
  temposökning: det som där heter tempoGram, bpmHist, octaveVote, cand, evidence, shift, OCT_UP, SUBH, GHOST, UP43, FIVE4 är dött
  (städas ev. bort före natten - se git-loggen). Flaggorna TEMPO_UP43, TEMPO_FIVE4, TEMPO_EVIDENCE, TEMPO_LAGMAX, GHOST_WAIT, SUBH_GUARD,
  SUBH_MULT, OCT_UP läses aldrig, fast profilerna sätter fem av dem.
- Tempovalet läser basens dB-stigning och diskantens onset, INTE kickarna. Kickarna styr tilliten, utrullningen och upptaget efter break;
  klockans rutnät styr i sin tur kickgrinden och kickspärren i analyser.ts (ca rad 2430, 2449).
- Båda systemen kör samma klocka i workern via taktvägen; det som skiljer är vem som matar (DMX index.ts, lotus analyser.ts + publishPhase).
  lotusbank.py mäter den ODELADE vägen (klockan i process()) - den koden får inte tas bort.
- Fynd att känna till (inte arenans sak att laga): SIL_CLEAR_PENDING står som 1 i båda profilerna men enda läsaren ligger i en onåbar gren.

UPPGIFTEN (uppgift.md, ägarens ord överst ordagrant): klockan i den delade analysatorn ska hålla EN tempotolkning genom en låt.
(1) Färre växlingar mellan syskontempon (4:3, 3:4, 3:2, 2:3, dubbla, halva) inom en låt. (2) Rätt tolkning oftare (lotusbankens
4/3- och 3/2-fel). (3) Utan att låsningen efter låtbyte eller vid svaga låtstarter blir långsammare. Analysatorn MÄTER bara: ingen
utjämning som finns till för ljusets skull; en hållregel ska kunna motiveras som musikanalys (takter/fraser ur klockan, bevis över tid).

DOMAREN (bygg FÖRE körningen som `tools/arena/klockdom.py`, analysmått enbart - ägarens regel 11-10; ljusmått diskar inte):
- Sätt ihop den av det som finns, bygg inga nya mätmetoder där en finns: tvavagar.py:s tempojobb (mix_klocka, mix_las, mix_hopp,
  mix_still, klipp_klocka via tvavagarKor.mjs), tempoHoppDiag.mjs + tempoHoppUtflykt.mjs på de långa inspelningarna (utfl_min,
  utfl_tid), lotusbank.py (lotus_ratt = korpus ok; lotus_syskon = antal i klasserna 4/3 + 3/2 + dubbla + halva).
- NYTT MÅTT syskon_tid: andel av tiden (långa inspelningar + mixen) då klockan står på ett syskontempo till filens facit/dominerande
  tempo (±4 %). Fångar både växling och att sitta fel.
- NYTT FALL kallaren: tempobyten/min (> 12 %) på de källarklipp som återskapar växlingen hos bas (kallarspel.mjs mot deltagarens
  lotusbygge). Hälften av klippen (varannat i tidsordning) är övning, resten kontroll som ingen deltagare får se.
- NYTT MÅTT lotus_vaxling: antal korpusfiler (lotusbankens körning, per fil ur bench.mjs) där klockans tempo inom klippet
  spänner över ett syskontempo (q25..q75 eller min..max efter uppvärmningen, välj det som skiljer bäst hos bas och skriv vilket).
  Det är källarfelet mätt på inspelat material. lotus-light-link LÄSES bara.
- Poäng: varje mått i % mot bas (riktningen inräknad, golv som i tvavagar.py), lika vikt. Rundornas lotusbank körs med --snabb
  (126 filer); finalen med hela 503 + kontrollmängden.
- SPÄRRAR (DISK): lotus_ratt < bas; syntet < bas; lotusbanks egen spärr (on-beat-recall, fas); mix_las eller mix_still sämre än
  bas + 0,3 s; klipp_klocka sämre än bas - 1 procentenhet; upp_s/ned_s sämre än bas + 0,1 s och andelen 'high' > bas + 10 pe
  (tvavagar.py, körs på finalisterna); workerns taktväg p99 och kostnad som i tvavagar.py; nya objekt per hop i heta loopar.
- Kontrollera före start: kopia = bas +0,0 på alla mått, och att bas mot bas är stabilt (kör basen två gånger).
- Säg domarens sammansättning på en rad i rapporten. Ändra den inte under körningen.

TILLÅTNA FILER i deltagarens kopia: src/analyserClock.ts, src/analyser.ts (tempodelen: tempogram, kandidater, taktmatning),
src/split.ts, src/slowWorker.ts. Inte effects.ts, inte output.ts, inte profilen, inte tools/. Övriga fält i ramen orörda
(sektion, drop, kick, nivåer: tvavagar.py:s övriga mått ska stå på +0,0 hos finalisterna). Kodens standard, inga flaggor.

DELTAGARE: 5 (k1..k5), högst 3 mätningar var (klockdom.py --mat; egna sonder som bara kör klockan på övningsfilerna är fria).
Kontrollmängden får ingen mäta mot. STRATEGIKORTEN (olika MEKANISMER, inte olika värden):
- k1 SYSKONFAMILJEN SOM EN HYPOTES: tempon i förhållandena 4:3, 3:2 och 2:1 behandlas som EN familj. Familjen följs som i dag;
  vilken medlem som regerar avgörs för sig, med bevis över takter (inte sekunder), och byts bara när en annan medlem vunnit en hel fras.
- k2 TVÅ TIDSSKALOR: ett långt fönster (8-16 s) väljer TOLKNING, det korta följer tempot inom ±3 % av den. Låtgränsen
  (hintTrackChange) öppnar valet på nytt; annars ligger tolkningen fast.
- k3 SLAGENS PASSFORM: tolkningen väljs av hur basanslagen faller mot rutnätet. Med fel 4:3-tolkning hamnar anslagen i ett
  återkommande mönster mellan slagen; mät andelen anslag på slaget och mönstrets period för varje syskon och välj den som bär slagen.
- k4 FH1 MED LÅTSTARTEN LÖST: utgå från prov/flerhypotes-fh1-20261110.patch. Före första säkra låsningen i en låt gäller dagens
  snabba väg; flerhypotesläget styr bara BYTEN efter låsning. Målet är fh1:s utflykter utan fh1:s långsamma starter.
- k5 UNDERDELNINGEN: 4:3 och 3:2 uppstår vid trioler och punkterade rytmer. Mät var anslagen faller INOM slaget (tredjedelar mot
  fjärdedelar) och använd det för att avgöra vilket syskon som är taktens puls.
Runda 2 = fusion av topp 3 om de angriper olika delar (skillens steg 4b), annars attackrundan. Final på kontrollmängden.

EFTER FINALEN: vinnaren läggs i src/ BARA om den klarar alla spärrar på båda mängderna. Annars: ingen vinnare, patchar + mått i
idébanken (tools/natt/arena-2026-11-12-klocka2/, ALLA deltagares diff + vunna mått), "prova ensam" för måttvinnare. Vid vinnare:
commit med pathspec, manifestet (python tools/analyser_shared.py --write src), bygg dist, skriv "redo för huvudchatten att porta
till lotus" - huvudchatten portar och lägger ut i källaren. Rapport: tools/natt/arena-2026-11-12-klocka2/RAPPORT.md, siffror före ord,
tokenåtgång och tid. Skriv också vad som INTE gick och varför.

## LÄGET 2026-11-12 (huvudchatten, ägaren: 'vi måste väl lösa det som arenan försökte lösa också?' + fade-planen) - LÄS FÖRST
- INLAGT I DAG, INGET DEPLOYAT I LADAN (kodens standard, inga flaggor):
  (1) SEKTIONENS SNABBA KANTER i analysatorn (272aac7): rangen väljer VILKA partier som är 'high', en nivåkant på SEC_EDGE_DB = 4 dB
      mot referensen (lastHighDb) avgör NÄR. upp_s 12,75 -> 1,7 (kontroll 3,3 -> 1,2), ned_s 6,0 -> 2,1 (6,8 -> 1,7), traff 76 -> 93
      (71 -> 87), korta 31 -> 34 (19 -> 40, sämre), andel 'high' inom spärren. Uppbyggnaden (frame.buildUp) är INTE löst: h1:s
      frasförlopp gav bygg 13,7 på övningen men -1,3 på kontrollmängden - buildProg ligger kvar i effects.ts.
  (2) FADE-PLANEN steg 1 (15d2d99): uttoningen + minsta på-tiden = output.ts LampFade, konfigfält fadeMinS / minOnMs / chMinOnMs.
  (3) FADE-PLANEN steg 4 (4d45a07): övertoning mellan effekter i dirigenten, cfg.lookFadeMs (0 = direkt byte = standard). Reglage i /setup.
- NY BASLINJE: engine/dist = 4d45a07. `.arena/bygg/bas` och `.arena/fade/bas` är mätta mot 50e0f4a och gäller INTE längre - mät en ny
  bas (bank.py + tvavagar.py --mat ... --bas, även --holdout) innan något jämförs. Sektionsmåttens nya baslinje står i (1).
- LJUSDOMAREN OCH SEKTIONSETIKETTEN (mätfälla, läs innan du dömer en etikettändring): en ändrad etikett kastar om dirigentens hela
  lookföljd, och lookerna skiljer mer i ljusdomarens mått än etiketten (samma ljud: svall rAbest 0,37-0,52, kickregn 0,31-0,45,
  minnet 0,17-0,29; lampspridningen ±40 % mellan looker). Snabba kanterna fick -18,6 i ljusdomaren men är lika eller bättre med EN
  FAST LOOK (sex jämförelser). Döm etikettändringar med `KR_MODE=<look>` (fast look) + lookbyten/min ur konsertReplay, inte med
  bank.py rakt av. Rattar i tools/konsertReplay.mjs: KR_MODE, KR_SEED (annan lookdragning), KR_TOG (lås toggle-låt-beslutet).
  Analysdomaren har ny spärr: andelen 'high' per fil högst bas + 10 procentenheter (tvavagar.py HIGH_TOL).
- ÖGONPROV I LADAN (ägaren, i den här ordningen, en i taget): tempohoppen f757d7d; basenergin (spann 24 mot DMX_B_SPAN_DB=36,
  B_PART_DIM 0,7); snabba kanterna (kommer refrängen direkt, släpper den när musiken faller, byter dirigenten för ofta?);
  Övertoning 300 ms i /setup; Uttoning/Minsta på-tid vid behov.
- ÖPPET FÖR NATTEN (bänk, ingen deploy): (a) UPPBYGGNADEN - en mätning som håller på BÅDA mängderna (b1: det som syns före en
  höjning i ladans material är centroiden; de flesta höjningar är hopp). (b) LOOKERNAS EGEN TAKTFÖLJNING: 'minnet' följer basen
  hälften så bra som 'svall' med fast look (rAbest 0,17-0,29 mot 0,37-0,52) - mät alla looker med KR_MODE och lista de svagaste.
  (c) toggle-låt-beslutet tas vid låtens FÖRSTA lookval, ofta i introt innan basgången hörs (lang1021 144,7 s: basgång 0,00 ->
  inte toggle; 6 s senare 0,99) - ett känsligt val, värt en egen fråga till ägaren.
  (d) ETIKETTEN EFTER LÅTGRÄNS (mätt i lotus 11-12 12:20 med musik, analysatorn 272aac7): efter ett låtbyte stod etiketten 'low' i
  20 s fast levelVsHighDb låg på +0,7..+2,2 (nya låten gick in på full nivå; uppkanten kräver 4 dB höjning mot förra frasen
  och den kom före gränsen). Mät på inspelade låtbyten (megamix) hur länge 'low' står vid nivå >= referensen efter
  hintTrackChange, och pröva: buren referens + nivå på referensen i en hel fras = 'high' utan kant. Döm med tvavagar.py.


## LÄGET 2026-11-11 KVÄLL (huvudchatten, ägaren: "klockan, basenergin och tilliten ... i analysatorn" + arenan basenergi) - LÄS FÖRST
- KODEN ÄNDRAD I KVÄLL, INGET DEPLOYAT I LADAN: (1) TILLITEN i analysatorn (frame.beatTrust, trustStep i analyserClock.ts; 5b2c6de + 17e9760).
  (2) BASENERGIN i analysatorn (frame.bassEnergy / bassEnergyShort = basens nivå under frasens / taktens tak över 36 dB, taket i SLAG ur
  klockan; frame.bassLevel = partiets bastak mot refrängens). effects.ts mäter inte längre basen: pulsens dal (B_LO_S 0,25 s), ljusets spann
  (B_SPAN_DB 24, provratt DMX_B_SPAN_DB), versens dämpning (B_PART_DIM 0,7) och dropläget ligger på effektsidan.
- ÄGARENS REGEL (11-11): analysatorn ANALYSERAR bara. Inget som formar ljuset (dal som återhämtar sig inom slaget, kurva, topp, uttoning,
  "lyft i 8 s efter drop") får ligga i analysatorn - det är effekt. Gäller alla kommande arenor och nattprov.
- NY BASLINJE: engine/dist = denna kod. Arenan basenergi (tools/natt/arena-2026-11-11-basenergi/, .arena/basenergi): mot koden före
  (backup/fore-basenergi-i-analysatorn-20261111) +3,4 i bänken och +3,3 på kontrollmängden (takt -0,6, dynamik +5,8, koreografi +2,3).
  Kör ALDRIG bank.py --bas i .arena/basenergi (bas där = gamla koden, redan bänkad).
- VÄNTAR PÅ ÄGARENS ÖGA I LADAN (i denna ordning): tempohoppen f757d7d; basenergin (spann 24 mot DMX_B_SPAN_DB=36 om riggen mörknar i
  baslösa partier: megamix släckt +1,6 pe; versen på ~65 % vid 6 dB under refrängen = B_PART_DIM).
- IDÉBANK basenergi (prova ensam, en i taget): a2 percentiltak (takt +4,4: rA 0,349, t90 10 ms - men jitter 33 ms, plattare ljus);
  a3 snabb dal på ett kvarts slag SOM EFFEKTVAL (slagK +3,7 % - men bryter mot fade-down om den går under 250 ms: får inte);
  a4 dropläget läser taktens skala (bassNow). Kvar utanför analysatorn: volymfönstret eHi/eLo/eSm i effects.ts (bara dropens
  efterkontroll) - flytta efterkontrollen till analysatorns dropdom. Verktyg: tools/arena/basenergi.mjs (nivåoberoende + orörda ramfält).
- ARENAN BYGG KLAR 02:05 (tools/natt/arena-2026-11-11-bygg/RAPPORT.md): INGEN VINNARE, inget inlagt. b4/b3 gjorde etiketten snabb (upp_s 12,75 -> 1,4,
  ned_s 6,0 -> 1,15) och väckte buildUp (0,2 -> 20) men kallar mycket mer 'high' (kontrollmängden 41/55 % -> 65/74 %) -> lampspridningen
  -20 % = DISK i ljusdomaren. Idébank i rapporten (b4:s buildUp med dagens etikett orörd = första provet).
- DOMARENS TIDSAXEL RÄTTAD (tvavagarKor.mjs + sektionLag.mjs: etiketten 101,33 ms räknades som 100): NY BASLINJE för sektionsmåtten -
  upp_s 12,75 / ned_s 6,0 / traff 75,9 / korta 30,9 / bygg 0,2 på övningen (förr 15,35 / 2,65 / 75 / 34). Jämför aldrig med äldre siffror.
- MÄTFÄLLA: domarens kedja (konsertReplay) matar klockan med BeatFeed.update, inte hopLane.feed - det som ska stegas per hop för ramen
  måste ligga i BeatFeed.update (tillitens första bänk mätte med tillit 0).

## LÄGET 2026-11-11 (nattagenten)
- LIVE i ladan: f01fed9 (11-09 18:30). I koden men EJ deployat i ladan: TEMPOHOPPEN f757d7d (live i lotus 11-10 21:47). Inga env-rattar.
- Väntar på ägaren: fintempot (prov/fintempo-parabel-20261110.patch), flerhypotes fh1 (prov/flerhypotes-fh1-20261110.patch) - båda ändrar delade klockan.
- Natten 11-11 (tools/natt/rapport-2026-11-11.md): lampspridningsfrågan besvarad (lookvalet efter låtgränsen, inte effekterna);
  sökljusets radblink en gång per takt FÖRKASTAD av domaren (-0,8 / -0,5, tools/natt/prov/sokljus-takt-20261111.patch), src orörd.
- NÄSTA FÖR NATTAGENTEN: (a) sökljuset väljs i 157 bpm 'low' där virveln slår 3-5 ggr/s och strålen inte syns (5 % av rutorna) -
  pröva att dirigenten inte väljer det där (FIT/tempo) och se vad som väljs i stället; (b) backbeat i refräng: spridning 0,18 med
  alla fyra tända - läs effekten, mät per slag; (c) natt.py: måtträttningen r energi mot rå WAV-RMS (renergi-matt-2026-11-10.md avsnitt 7).

## HÖGSTA PRIO NATTEN 2026-11-09 -> 10: FINTEMPOT (ägaren i ladan 18:50: "Ja, lägg in fintempot till nattagenten")
LÄGET: LIVE i ladan sedan 18:30 = HEAD f01fed9 (8f89cf1 + DUBBLA 6/7). Lotus LIVE 17:37 på samma delade analysator (lotus 1f4b357e, nyckel id_pidmx).
Ladan-mätning 10 min (websocket, beatErr = kickarnas fasfel mot rutnätet): tillit >= 0,35 91 %, tempohopp bara kring låtbyten, men
FAST FASFEL PER LÅT 40-60 ms som byter tecken mellan låtarna (-55/-60 ms i en 82 bpm-låt, +28..+51 ms i en 94-96 bpm-låt) =
tempot ligger lite fel i varje låt -> rutnätet driver. Det är vad p2:s fintempo rättar.
1. RÄTTA DOMAREN FÖRST (fynd fasjobbet 11-09, verifierat): tools/arena/tvavagarKor.mjs:113 och tools/sektionLag.mjs:91 startar `let hit = -1`,
   så ett skifte som etiketten aldrig följer inom 20 s räknas som träff på -1 s (bästa möjliga) - `traff` alltid 100 %. HEAD missar 6/14 upp och
   4/11 ned på kontrollmängden. Räkna missen som miss (traff < 100 %) och dess lag som 20 s i upp_s/ned_s. Bänka om bas, säg det i rapporten.
2. MÄT gridfel PÅ SAMMA FÖNSTER FÖR ALLA: i dag räknas bara fönster där variantens EGEN tillit >= 0,35, så en variant vinner gridfel genom att
   sänka tilliten där rutnätet är fel (p2:s tydlighetsdel: megamix 128 ms, lang1011 165 ms föll ur). Använd basens fönster (eller alla låsta
   fönster) för alla varianter; behåll den gamla siffran bredvid.
3. FINTEMPOT ENSAM: .arena/fas/p2/losning.diff har två delar - (a) FINTEMPOT: parabel genom skanningens tre bästa tempon (scanS/bestC) + slaget
   i fönstrets mitt (scanRef), (b) TYDLIGHETEN ur snabba minnet (tgAccF). Bänka (a) ensam på HEAD med den rättade domaren: övning + --holdout +
   lotusbank (krav >= 463/503, syntet >= 6/8; p2 gav 462 - KISS Love Gun 147,4 på toleranskanten, enligt fasjobbet sitter lotuskostnaden i
   fintempodelen - undersök den låten). Mål: gridfel <= ladans 15,1 / 7,2 ms, ettan inte sämre, inga sektionsspärrar. Prova också (a)+(b) och (b)
   ensam mot samma fönster (METODEN: A / B / sammanslagning).
4. Vinner fintempot: gör det till KOD (ingen flagga, backup-tagg), DMX-md5-skillnad redovisad, skriv "REDO FÖR LADAN" + ladan-raden, och
   "KLAR FÖR SYNK" (delade analysatorn ändras -> huvudchatten synkar lotus och deployar efter ägarens ja). Ingen deploy, inget i lotus-light-link.
5. NYTT 22:00 (lotus i källaren, ägaren: "känns som den hänger sig då och så"): motorn fryser INTE (loop max ≤ 83 ms, BLE 53/s), men i en
   128 bpm-klubbmix ("NEW CLUB MIX 2025", Sonos) hoppar analyser.bpm till 80–87 (~2/3) i stretcher om 0,5–5 s, ~10 % av tiden. Lotus fade-tau
   = fadeIntervalK × slagintervall, så ljuset hänger kvar ~60 % längre i de stretcherna (lindrat i kväll med fadeTauMax 0,8). Ta med 2/3-hoppen
   inne i en låt som mått i fintempobänken (andel tid med tempo ≈ 2/3 eller 3/2 av facit), och pröva om fintempot/tydligheten tar bort dem.
Rapport: tools/natt/rapport-2026-11-10.md. Fasjobbets underlag: .arena/fas/p2/losning.md, .arena/fas/bas/.
KLART 2026-11-10 (nattagenten, 7b0724b): 1 domaren miss = miss (bas upp_s 15,35/14,90, traff 75/60 %); 2 gridfel i BASENS fönster (gamla =
gridfel_egen); 3 fintempot ensam = riktig fasvinst 22,9->21,45 / 8,25->6,40 ms men DISK ned_s (ett skifte/mängd), ljusdomaren övning -0,98,
lotus 462 -> EJ KOD (prov/fintempo-parabel-20261110.patch); tydligheten 0 ms i samma fönster = bara fönsterurval, stängd; 5 mix_23: kontroll
13,5 % av tiden på 2/3|3/2 (övning 0,26), fintempot ändrar inget. ÄGARENS VAL: prova fintempot i ladan på ögat (delad klocka -> lotus följer).
NÄSTA FÖR NATTAGENTEN: (a) vilka kontrollåtar står på 2/3 (mix_23) och varför; (b) r energi föll sedan e03663c (megamix 0,16 -> -0,04,
korpus från 15 s -0,06) - hitta commiten med natt.py --snabb per src-commit.
KLART 2026-11-10: (a) EN låt - Hannes Aitman Hopeless Nights står på ~100 (3/4 av 130) hela låten, låser aldrig i någon variant
(tempohopp-2026-11-10.md); (b) måttfel, inte ljuset: energiR korrelerar mot frame.intensity, mot rå WAV-RMS oförändrat (36a5bb6, d9fec01).

## HÖGSTA PRIO 2026-11-09 09:00: ARENA: EN KLOCKA FÖR BÅDA (lotus + DMX) - ägaren
"Kan vi inte samma där. Jämför delarna, och kolla vad som fungerar bäst. Skapa sedan en enda. Känns jättedumt som vi sagt hela
kvällen att köra två olika funktioner för samma sak som vi försöker förbättra och vet inte vilken som blivit förbättrad."
- I dag: lotus kör analysatorns egna sökning (OWN_TEMPO bakom sys.BEAT_FEED, 3c5b643), DMX kör analyserClock.ts. Det är två tempovägar
  i den delade analysatorn.
- Tempovalet är i stort sett lika (tools/arena/klockjmf.py):
  - övning klipp 97,7 / 98,3 %, mix 96,4 / 97,2 %
  - kontroll klipp 84,9 / 84,3 %, mix 83,2 / 82,4 % (lotus / DMX)
  - båda 0 % på hannes-aitman-hopeless-nights
- Metoden per dubblett, DEL FÖR DEL (tempoval, låsning/hopp, fas, etta, tillit, break, omlåsning): A / B / sammanslagning.
  Döms på DMX-bänken (tvavagar.py) OCH på lotus bänk (tempo-facit-pc, bench-manifestet; körs i kopia under .arena,
  skriv aldrig i lotus-light-link).
- Vinnaren = EN klocka som båda profilerna kör. Profilerna skiljer sig bara i konsumenterna.
- SYNK TILL LOTUS NÄR ARENAN ÄR KLAR (ägaren 09:10: 'När vi är färdiga så skall vi ju synka till lotus'), inte tidigare:
  huvudchatten kopierar de delade filerna och manifestet till lotus kopia, kör tsc och committar, men deployar inget. Lotus kollas i källaren.
  Fram till dess stoppar deployspärren DMX-deployer. Skriv "KLAR FÖR SYNK" + commit-id i rapporten när vinnaren är kod.

## DAGKÖRNING 2026-11-08 21:45 -> 2026-11-09 ca 19:00 (ägaren: "Starta redan nu, så har vi många timmar att köra klart. Till imorgon kväll vid 19 tiden")
- Startad för hand från huvudchatten. ÄGAREN 11-08 23:55: "Och det är detta jag vill arenan skall lösa" = ARKITEKTUREN nedan
  (analysatorn ger ALL låtinfo -> dirigenten väljer effekt -> effekten styr ljuset; motorn analyserar inget själv). Kör ARENOR i tur
  och ordning tills ca 18:30 den 9:e, och skriv sedan rapporten:
  1. ARENA: EN TEMPO I HELA MOTORN (pågår): klockan in i analysatorn, KRAV EN KÄLLA.
     KLART 2026-11-09 08:20: vinnaren mta = KOD e451800 (backup/fore-entempo-20261109, tagg entempo-mta): f0 + a2f två tempominnen +
     t1f tillit repeatRate*tgClear + m1f manusTog kräver tydlig basgång; kontrollmängden +8,90 utan DISK (latens 100->90, mix_las 4,28->2,82,
     ned_s 2,30->0,30); övningen DISK ned_s 3,00. Rapport tools/natt/arena-2026-11-09-entempo/RAPPORT.md. REDO FÖR LADAN:
     `PYTHONIOENCODING=utf-8 PI_HOST=10.171.211.218 python tools/ladan.py` (OBS deployspärren mot lotus-kopian tills lotus portat).
     Domaren under körningen: lampspr på MEDLET (domare.py 1cf4d1d), CPU ingen poäng/Pi-budget 130 us/hop, KRAV EN KÄLLA -3,0.
  2. Död kod (DUBBLA KÄLLOR 9): md5-identiskt, en commit. Ingen arena.
     KLART 2026-11-09: 177b98c (10 poster, DMX-md5 identisk); före det LOTUSPARITET 0 3c5b643 (deployspärren); MÄTFÄLLA dmxDump strömskrivna
     WAV 0365872. HÖGSTA PRIO 09:00 ARENA EN KLOCKA FÖR BÅDA KLART 13:55: e047c6f (tagg enklocka-vin, backup/fore-enklocka-20261109) -
     lotus egen sökning bort, lotus-bänk 396->463/503 syntet 6/8, DMX md5 oförändrad; KLAR FÖR SYNK skickad till huvudchatten. Rapport
     tools/natt/arena-2026-11-09-klocka/RAPPORT.md; sammanfattning tools/natt/rapport-2026-11-09.md.
  3. ARENA: ANALYS UT UR MOTORN. Allt låtanalytiskt i effects.ts flyttas in i analysatorn och publiceras i ramen:
     STEG 1 KLART 2026-11-09 15:15: 8f89cf1 (tagg analys-r0, backup/fore-analys-20261109) = EN dropdetektor + EN tystnad; övning +4,32, kontroll +0,15;
     REDO FÖR LADAN på 8f89cf1. Kvar: basen, basnot, sektionsenergin, sektionens drop-väg (tools/natt/arena-2026-11-09-analys/RAPPORT.md).
     - drop (flankStep -> en detektor; bänkens drop-mått pekar på den)
     - lyft och nästan-drop
     - basen (en källa)
     - basnot-anslag
     - sektionsenergi ("lugnt" en gång)
     - tystnad (en tröskel = cfg.silenceLevel)
     Gränsen ANALYS/REAKTION: analysatorn säger VAD som händer (drop nu, styrka, break, lugnt). Dirigenten/effekten bestämmer HUR
     ljuset reagerar (dropens längd, uttoning, lyftets form), och det flyttas INTE. Spärr: i finalen granskar orkestratorn i koden
     att effects.ts inte räknar låtinformation (fil:rad). Basen = vinnaren ur 1. a8:s basgång är godkänd i ladan, kontrollmängden avgör.
  4. Hinns det: DUBBLA KÄLLOR 5-8 (slagdjupet en ratt, minsta på-tid till output.ts, ctx-hjälpare, 2048-banden) som en sista arena
     eller som rena commits.
  Varje arenas vinnare: kod + backup-tagg + "redo för ladan" med ladan-raden. Ingen opt-in-flagga.
- Om ytterligare en nattagentkörning startar (schemat 02:38) medan den här pågår: avsluta direkt utan att röra något.
  Känns igen på en pågående arena i .arena/ eller på .arena/.banklas.
- Aldrig deploy, aldrig push, aldrig skriva i lotus-light-link (bara "DELAD FIL ÄNDRAD"-fynd).
- Basen är HEAD som den är när körningen startar (g1 + lamptrappan bort + labbets favoriter, live i ladan).
- Rapport: tools/natt/rapport-2026-11-09.md, med en rad per punkt (klart / bänkat / redo för ladan / förkastat + siffror).

## PRIORITET I NATT 2026-11-08 -> 11-09: ARENA: EN TEMPO I HELA MOTORN (ägaren i ladan 11-08 21:20) - GÅR FÖRE ALLT
Ägaren: "Ja måste vara en och inte två! Är ju extremt svårt att trimma annars. Lägg det till nattagenten. Hur löser vi en optimal?"

LÄGET (HEAD ea7bb71, live i ladan):
- Motorn söker tempo på TVÅ ställen:
  (1) analysatorns eget skuggrutnät (`frame.bpm`/`bpmConfidence`; BeatFeed.analyserCfg, "TVÅ RUTNÄT" beatFeed.ts:49 sedan 10-28);
  (2) effektklockan (`cfg.beat`: taktvägens tempogram a1r + rise-rutnätet + a5:s taktmodell för ettan).
- Skälet 10-28 var FASEN, inte tempot: rise-rutnätet flyttade analysatorns kickgrind, och sektionerna kom senare (upp 2,6 -> 4,1 s).
- Effekterna läser båda: tilliten ur `frame.bpmConfidence` (effects.ts ~1774) och frasräknaren nollas på `frame.bpm === 0` (~1674).
  Ljuset styrs alltså delvis av ett tempo det inte följer.
- Live 10 min (ws, analysatorns bpm): låst och stabilt inne i låtarna (tillit 0,80-0,96), men vacklar 30-60 s vid övergångar
  (97/101/106/148 runt minut 4, 109/113/117 tillit 0,26 runt minut 7).

MÅL (den optimala lösningen):
- EN temposökning, i långsamma vägen (taktvägen), som ger EN sanning: bpm, tillit och fasankare, publicerat i tillståndsblocket.
- Analysatorn och ljuset läser samma tempo och samma ankare.
- Fasen får ha EN fast, mätt offset per konsument (kickfas för analysatorns grind/sektioner, rise-fas för ljuset), men ingen andra sökning.
- EN tillit också (ägaren: 'varför behöver vi en separat?'): klockans tillit är den enda. `frame.bpm`/`bpmConfidence` blir samma
  värden som `cfg.beat` (eller tas bort), så ingen läser ett eget tempo eller en egen tillit (effects.ts ~1674/~1774, boundaryDetector).
- Breaket (BREAK_HOLD) och låtgränsen (boundaryDetector -> snabb omlåsning) hanteras på ETT ställe.

HUR (arena enligt dmx-arena-skillen; ägaren vill ha den optimala, så arena och inte en ensam agent):
- Domaren: tools/arena/tvavagar.py som den är, med två tillägg FÖRE körningen:
  (a) spärr: upp_s/ned_s inte sämre än bas (10-28-fällan);
  (b) mått: omlåsning efter låtgräns. mix_las finns redan; lägg till tid tills klockan står stilla inom 1 % efter varje skarv i mixen.
  Kontrollmängden och basenv som i tvavagar (basenv tom: DMX_LABFX är kod sedan ae16640).
- Bas = HEAD ea7bb71 (f2 + g1).
- Remix-rundan (dmx-arena steg 4c): r0 byggs av orkestratorn efter runda 1.
- Kort (en mekanism per kort):
  - tempogrammet som enda källa + mätt offset;
  - analysatorns sökning som enda källa;
  - ny sökning med flera hypoteser + oktavlogik;
  - snabb omlåsning vid låtgräns;
  - breaket som tillstånd i klockan;
  - tilliten som ett mått;
  - minsta diff som tar bort dubbelarbetet;
  - Pi-budget (en workertråd räcker, ARM ~170 us/hop i dag).
- Ingen deploy. Skriv "redo för ladan" med ladan-raden (`PYTHONIOENCODING=utf-8 PI_HOST=10.171.211.218 python tools/ladan.py`, eller `--fran <dist>`).
  Lotus: DELAD FIL ÄNDRAD-fynd för morgonagenten (4e).
- Kostnad ~4-5 M tokens (som tvavagar). Rapport: tools/natt/arena-2026-11-09-entempo/ med idébank (alla diffar).

### KRAV EN KÄLLA (ägaren 11-08 23:40: "Men alla får väl bara köra med en källa?") - SPÄRR i remix och final, DISK annars
I runda 1 får ett kort angripa en del. Remixarna och vinnaren MÅSTE uppfylla alla fem punkterna, och orkestratorn kontrollerar
i koden (fil:rad i losning.md) före finalen:
1. EN temposökning: analysatorns skuggrutnät (BeatFeed.analyserCfg/kickFold-skuggan, egen scoreEnv/alignScore-sökning för
   tempo) är borta. Analysatorn läser klockans bpm och ankare + en fast, mätt fasoffset.
2. EN tillit: frame.bpmConfidence (om det finns kvar) = klockans tillit. profile.beat, hasBeat, effects trust och frasräknaren
   läser samma.
3. EN takträknare: ctx.beatIdx = rutnätets index (>> 1 vid halvering); ingen fri beatCounter, en halveringsparitet.
4. EN pulskurva (beatEnv/kickEnv och beatPulse/heartPulse på samma klocka).
5. Låtgränsen = boundaryCount som enda låtbytessignal, även i taktvägen. Inga egna låtbytesslutsatser i klockan.

### ARKITEKTUREN (ägaren 11-08 23:50) - styr EN TEMPO och alla DUBBLA KÄLLOR-punkter
"Analysatorn skall ju ge all information om låten till dirigent/effekt. Dirigent skall ju välja rätt effekt och effekten skall
enbart styra ljuset såsom den effekten vill."
- EN KÄLLA = ANALYSATORN. Klockan, rutnätet, ettan och tilliten flyttas IN i analysatorns långsamma väg (beatFeed slås ihop med
  analysatorn) och publiceras i ramen och tillståndsblocket. Skuggtempot försvinner därmed. Lotus: bakom profilen, på ett ställe.
- effects.ts analyserar inget själv. Detta flyttas till analysatorn:
  - flankStep (drop-detektorn)
  - lyft och nästan-drop
  - basnot-anslag (bassNoteIdx)
  - tystnadsgränsen INPUT_OFF
  - kick/punch-envelopperna där de räknas om
  Dirigenten läser ramen; effekten styr ljuset.

### METODEN FÖR VARJE DUBBLETT (ägaren 11-09 00:35: "alla dubletter måste det ju analysera vilken är bäst eller är en ihopslagning bäst. För att sen bara köra en")
Varje DUBBLA KÄLLOR-punkt (och EN TEMPO) avgörs så här:
1. A ENSAM, B ENSAM och en SAMMANSLAGNING (det bästa ur båda i EN källa) bänkas mot samma bas och facit (tvavagar.py + kontrollmängden).
2. Vinnaren väljs av bänken, och av ägarens öga där bänken inte ser.
3. De andra TAS BORT ur koden. Ingen kvarvarande skugga och ingen flagga.
I rapporten står en tabell per dubblett: A / B / sammanslagning, med mått, val och skäl. I en arena motsvarar korten A, B och sammanslagningen.

### TILLÄGG TILL ARENAN EN TEMPO (granskningen DUBBLA KÄLLOR 11-08, tools/natt/granskning-2026-11-08-dubbla/) - ingår i samma klocka
- `ctx.beatIdx` är en FRI räknare (beatCounter, effects.ts:2013-2016), inte rutnätets index. 17 effekter läser `c.beatIdx % 4` som
  ettan, så barOff/a5:s etta når inte fram till dem; bara hjärtslagets accent (1400) och SWITCH_ON läser rutnätet.
  En klocka: ctx.beatIdx = rutnätets index (>> 1 vid halvering), med monoton spärr mot PLL-hopp bakåt.
- Två hjärtslagskurvor (beatEnv -> kickEnv, 21 effekter; beatPulse/heartPulse, 18 effekter), olika etta och paritet.
  Bugg: beatEnv fryser på ett golv upp till 0,8 när tilliten är < 0,20 men bpm > 40 (1303/1367). En pulskurva på den enda klockan.
- Två halveringspariteter (pulseCount % 2 vid 1365, halfTick vid 2013).
- Lookbytenas taktgrind räknar sectionBars utan fas (analyser.ts:3801, effects.ts:1155); predictHigh har ett eget frasgitter.
  Ska räkna på cfg.beat + barOff.
- Låtgränsen når aldrig taktvägen (index.ts:191) och klockan drar egna slutsatser om låtbyte (barReset vid > 3 % tempohopp).
  boundaryCount blir enda källan, som en flagga i hop-recordet.

## DUBBLA KÄLLOR - NÄSTA NÄTTER (efter EN TEMPO, en i taget, bänka varje; se granskningen)
1. DROP: två detektorer på samma baskropp. Ljuset kör flankStep (effects.ts:811); sektionen och BÄNKENS drop-mått kör analysatorns
   dropStep (analyser.ts:3485). En detektor (flank) i analysatorn som dropCount; peka om drop_*-måtten i tvavagar.py först.
   Drop-tillståndet har fyra lyftled + sju klockor -> två kurvor (lyft, färg). Efterkontrollen ska läsa eBass, inte eSm.
2. BASEN: tre källor (snabba banden till energin, bodyDb till drop/lyft, frame.energy till punch/registerKick) och fem följare
   med egna normalnivåer. En bas (snabba banden).
   OBS: eBass läggs på i tre led (steg 2, SPREAD, ctx.bassBody i sex effekter) och c.audio är kvar som nivå i åtta effekter.
   a8:s basgång är GODKÄND i ladan - bänka om på kontrollmängden innan något slås ihop.
3. SEKTIONSENERGI: tierEma matas av intensity men snäpps mot sectionTier; "lugnt" definieras tre gånger (tierEma, subdivEnergy, section).
4. TYSTNAD: INPUT_OFF_LEVEL 0,02 hårdkodad över Släckgränsen i /setup (0,01) och fryser energifönstren. Brusgrinden finns på fyra
   ställen; workerns cfg-kopia uppdateras aldrig (split.ts:99). En källa: cfg.silenceLevel.
5. SLAGDJUPET: FX_FLOOR lyfter nivån mellan slagen, EFFECT_HEART och SPREAD_D sänker den, med olika undantag. En ratt.
6. Minsta på-tid (MIN_ON_MS, CH_MIN_ON_MS i effects.ts; HOLD_MS i output.ts) -> output.ts (lampfysik).
7. ctx-hjälpare: ctx.beatMs (tio effekter räknar periodens längd själva förbi hasBeat/halvering), ctx.dt (fem egna), ctx.voice (fyra kopior).
8. 2048-banden för 8 band (median/MAD) läses bara av profilen och basgången -> profilen på de snabba banden.
9. DÖD KOD (md5-identiskt, kan tas direkt):
   - analyser: frame.kickRise, pushNovelty, tempoShiftCount/charShiftCount, oanvänd BeatFeed (index.ts:115), linK/riseDb (samma ring)
   - effects: upgradeHit, nearLevel, DROP_LIFT_FLOOR-raden, miniSector, mem*
   - PROV-flaggor: DMX_FX_BASS*, DMX_FX_FLOOR, DMX_E_NORM_S, DMX_FX_REN
   - moment.ts SHOW_TOP (ett andra tak)
   - dynBench.mjs räknar eSimple^10 mot motorns eBass^3

## IDÉBANK tvavagar (2026-11-08, se tools/natt/arena-2026-11-08-tvavagar/RAPPORT.md) - prova ensam, en i taget
- IDÉBANK tvavagar: a8r full tempoföljning - vad ger a8r:s ljusdomare +6,9 / latens 85 ms på kontrollmängden (g1 = -1,3 / 100 ms)?
- IDÉBANK tvavagar: a1m2 tempogrammet helt (ljusdomaren +8,0 i övningen) mot g1.
- IDÉBANK tvavagar: a2r/a4r tre biquad-band i ett svep (bit-identiskt, ~2 % huvudtråd).
- IDÉBANK tvavagar (lotus): a4r stora vägens buffertar bara när den kan slås på (-2,3 MB delat minne).
- DOMAREN: ljusdomaren saknar tajthet (g1 vann i ögat trots -1,3) - lägg in ljusLag/latens med vikt före nästa arena.

## KLART 2026-11-08 kväll (arenan tvavagar körd i huvudchatten, f2 + g1 LIVE ea7bb71, rapport tools/natt/arena-2026-11-08-tvavagar/) - KÖR INTE IGEN
ARENA: ANALYSATORNS TVÅ VÄGAR (ägaren 11-08: 'lägg till arena till natten' + 'de får ge förslag på ändringar i delade analysatorn' +
   'arenan skall tydligt veta att vi vill ha två vägar i analysatorn, de kan gärna flytta mellan/återanvända saker/ta bort/lägga till osv.
   Målet är inte enbart snabbhet (iaf inte på långsamma, där är det hur bra den analyserar som borde ge högst poäng). Snabba vägen ger högst
   poäng om den utför samma uppgift eller bättre. Snabbare'). KÖRS EFTER 'TAKTMATNINGEN IN I LÅNGSAMMA VÄGEN' (nedan) - på den nya strukturen.
   ARKITEKTUREN DELTAGARNA SKA BYGGA MOT (står i varje deltagares brief): EN analysator, TVÅ vägar.
     SNABBA VÄGEN (huvudtråden, varje hop): det ljuset behöver direkt - nivå, band, kick/anslag, drop-flanken. Mål: SAMMA uppgift eller
       bättre, på kortare tid och med kortare latens.
     LÅNGSAMMA VÄGEN (workern, egen kärna): det dirigenten behöver - tempo, rutnätets fas/ettan, taktmatningen, sektioner, build/drop-
       struktur, låtgräns. Mål: att FÖRSTÅ låten så bra som möjligt; fart räknas bara som en gräns (workern ska hinna med).
     FRITT: flytta saker mellan vägarna, återanvända (t.ex. en temposökning i stället för två), ta bort dubbelarbete, lägga till nya
       signaler. Allt i src/ får ändras FRITT, även de delade filerna (analyser.ts, split.ts, slowWorker.ts) - ägaren 11-08: 'men vi
       skall ju få ändra? är väl hela meningen med arenan? sen får vi ju bara porta till lotus'. Ingen lotus-spärr, inga profilvärden
       krävs; domaren tittar inte alls på lotus (ägaren: 'domaren behöver inte kolla på det alls i detta läget'). Lotus portas EFTER arenan och döms i lotus egen bänk. fft.js byts inte,
       men hur/hur ofta den anropas får ändras.
   DOMAREN (byggs FÖRE körningen av nattagenten ur befintliga verktyg, tools/arena/tvavagar.py - inte domare.py ensam; skriv vikterna i
   filhuvudet och ändra dem inte under körningen):
     LÅNGSAMMA (poäng 0,6): analyskvalitet i % mot bas - tempo (tools/tempoMix.mjs + taktKorpus.mjs, korpus frozen6), ettan/gridfas
       (testDownbeat.mjs, natt.py:s gridfas), sektioner (sektionMatt.mjs/sektionStat.mjs mot facit), drop (dropFacit.mjs mot de inspelade
       facit-dropsen: träff, falska, insats->drop ms), låtgräns (boundaryBench.mjs). Gräns: workern ligger efter högst X hop i realtid
       (mät bas först, sätt X = bas + 1) annars DISK.
     SNABBA (poäng 0,4): huvudtrådens CPU per hop (node --cpu-prof eller process.cpuUsage, median av 5, % mot bas) + kick->ljus-latens
       (natt.py/ljusLag). SPÄRR 'samma uppgift eller bättre': antingen DMX-md5 identisk (dmxDump/dmxDumpMoment DUMP_MOMENTS=1, HELA
       filerna) ELLER ljusdomaren domare.py v3 (dynamik/koreografi/takt) >= bas -0,5 på holdout; sämre = DISK.
     BONUS I FINALEN (ägaren 11-08: 'lägg till bonus kanske till sista rundan, hur kan vi minska latens till workern?'): upp till +3
       poäng för kortare väg till och från workern, mätt med tools/feedRealtid.mjs (realtid 300 s, lang1107 + LABFX): hop efter när
       huvudtråden läser (bas a9a411b: 1 hop 67 %, 2 hop 17 %, >=3 hop 7 %; leveransfördröjning p50 0,05 / p99 0,44 / max 16,7 ms) och
       väckningskostnaden i huvudtråden (bas ~4 µs per hop). +1 per halvering av andelen >=2 hop efter, +1 om p99 halveras, +1 om
       väckningen halveras (max +3; sämre än bas på något av dem = 0 bonus). Idéer att pröva: Atomics.notify mer sällan / batchade
       record, workern väcks på det den behöver i stället för varje hop, tillståndsblockets layout, att det ljuset behöver från takten
       (ankaret) räknas fram i huvudtråden ur workerns senaste ankare + klockan (då spelar ett hops fördröjning ingen roll).
     ALLMÄNNA SPÄRRAR: fade-down aldrig snabbare, strobe max 3/s, inget mot vitt, inte mer ljus i snitt (domare v3:s regel).
     Holdout: lang1014 + lang-20261107T154200 i finalen (ingen deltagare ser dem före).
   REGLER: 8 agenter (skillen dmx-arena: runda 1, runda 2 med attacker, final + fusion, med tvavagar.py som domare), max två bänkar
   parallellt, budget enligt skillen. Inga worktrees/junctions (kopior i .arena/tvavagar/<id>/ med egen tsconfig som extends - MÄTFÄLLA
   11-08: `tsc --rootDir <annan> --outDir` med rootDir-fel emitterar ändå och skrev 126 .js i src/). VINNAREN: bit-identisk ljusdel =
   ren ersättning i koden; ändrat beteende = DMX-profilvärde (lotus av) som ägaren dömer i ladan; backup-tagg, commit med pathspec, ingen
   deploy, ingen push. Delad fil ändrad: analyser_shared.py --write + fynd 'DELAD FIL ÄNDRAD' i analysator-fynd.md (lotus morgonagent
   kopierar och kör pariteten). Bra långsam-väg-fynd som lotus kan ha nytta av: skriv dem som ÖPPNA förslag till lotus (lotus egen bänk
   avgör, de blir inte live på lotus av sig själva).
   PROFILEN PER FUNKTION (11-08, lang1107 + LABFX, hela filen): fft.js _realTransform4 27 %, beatFeed onsetStep 9,8 % + fullStep 5,9 %
   + fullScore 2,4 % + update 2,1 % (= ~20 %), analyser process 9,1 %, fastBandStep 7,7 %, bigStep 7,5 %, scoreEnv 5,8 %, dropStep 3,8 %.
   LEDTRÅD: både analysatorn (scoreEnv/alignScore) och taktmatningen (onsetStep/fullStep, alla tempon per hop) söker tempo - pröva om
   taktmatningen gör om arbete analysatorn redan gjort, eller söker oftare/bredare än ljuset behöver (svaret måste ändå bli bit-identiskt).
   ARENAN puls2 (D) FLYTTAS EN NATT TILL (en arena per natt).
TAKTMATNINGEN IN I ANALYSATORNS LÅNGSAMMA VÄG (ägaren 11-08: 'är det inte bättre att slå ihop till en analysator, bara att i den finns
   två olika vägar, den snabba och sen den som ger dirigenten information' + 'vi borde enkelt kunna lägga flagga på långsamma vägen som lotus
   inte använder'). TAGET 2026-11-08 DAGTID av huvudchatten (ägaren: 'kör igång direkt') - nattagenten: läs commit-loggen, gör inte om. GÖRS FÖRE ARENAN I NATT (arenan optimerar sedan den nya strukturen; räcker inte natten: arenan nästa natt).
   I DAG: src/beatFeed.ts (ladans egen löpande temposökning: onsetStep/fullStep/fullScore, ~20 % CPU) körs i HUVUDTRÅDEN varje hop
   (index.ts:199 beatFeed.update(frame, cfg, analyser)) fast det är långsam-väg-arbete; analysatorn kör redan tempo/gridfas/sektion i
   workern (DMX-profilen ANALYSER_SPLIT 'worker', split.ts SAB-ring + tillståndsblock, slowWorker.ts).
   GÖR: flytta taktmatningen in i analysatorns långsamma väg (workern), bakom ett nytt värde i DMX:s analyserProfile.ts (t.ex.
   BEAT_FEED: 'slow'); lotus profil saknar värdet = som i dag. Resultatet (cfg.beat: ankare, bpm, konfidens, ettan, coast) publiceras via
   tillståndsblocket och läses in i huvudtråden; nya kommandon motor -> analysator = flagga i recordet (se lotus-analyser-split-regeln),
   inte postMessage. BEVIS: (1) lotus: analyserParity.mjs 0 avvikelser med LOTUS-profilen; (2) DMX: DMX-md5 identisk mot före på hela
   lang1021 + lang1107 + lang1014, med och utan DMX_LABFX=1, dmxDumpMoment DUMP_MOMENTS=1 - i bänkens inline/synkrona läge; (3) splitProof-
   motsvarigheten för taktmatningen (worker mot inline, 0 avvikelser); (4) profil före/efter: huvudtrådens CPU per hop ska sjunka ~20 %.
   I realtid kan workern ligga ett hop efter: mät lagMs (analyserCost.split) i en realtidskörning på PC:n och skriv det i rapporten -
   ankaret är en tidpunkt, så ett hops fördröjning ska inte flytta slagen. Backup-tagg, ingen ratt utöver profilvärdet, ingen deploy.
KLART 2026-11-08 (dagtid, huvudchatten): a9a411b, backup-tagg backup/fore-taktmatning-slow-20261108. DMX-profilen BEAT_FEED 'slow' + slowHopFeedModule
   './beatFeed.js': split.ts TAKTVÄGEN (hop-ring + eget tillståndsblock), index.ts analyser.hopLane.feed(frame, cfg, analyser) i st f beatFeed.update;
   beatFeed.update(…, now) tar hoppets klocka (förr Date.now() på 9 ställen). BEVIS: (1) lotus analyserParity 0/562 500 hop x4 varianter + splitProof
   gammal=ny; (2) DMX-md5 36/36 identiska (3 filer hela x utan env/LABFX x dmxDump/dmxDumpMoment DUMP_MOMENTS=1; odelad gammal=ny, inline gammal=ny,
   inline gammal = riktiga workern i lås-steg ny; dumparna har nu DUMP_SPLIT=inline|sync|worker); (3) tools/feedProof.mjs worker mot inline 0/562 500 hop
   (cfg.beat, beatErr, tilliten, analysatorns rutnät, hela ramen), även gammal huvudtråd mot ny worker 0; (4) profil inline gammal: beatFeed.js 21,4 % av
   huvudtråden -> 0 i nya (16,2 % av workern); realtid PC 300 s lang1107+LABFX (tools/feedRealtid.mjs, analys+takt+effekter): huvudtråden 26,5 -> 22,0
   us/hop (-17 %); (5) workern efter vid hoppets läsning: 1 hop 67 %, 0 9 %, 2 17 %, >=3 7 %; taktvägens fördröjning p50 0,05 ms, p99 0,44 ms, max 16,7 ms,
   0 tappade. Slagen flyttas inte (ankaret är en tidpunkt); rutnätets ryck (~235/min, median 23 ms) når effekterna ~1 hop (2,7 ms) senare än förr.
   KVAR: verifiera på Pi:n (ARM, Node 24) - workerns kostnad 43 us/hop på PC:n (EMA), notify per hop. Lotus-morgonagenten kopierar de tre delade filerna
   (fynd i analysator-fynd.md); till dess vägrar deployspärren om lotus-kopian ligger bredvid. Ingen deploy.

## PRIORITET I NATT 2026-11-07 -> 11-08 (ägaren: '3 och 4 har mest prio') - GÅR FÖRE ALLT, I DENNA ORDNING
NATTEN 11-08 (nattagenten, inget deployat) - KOMMANDOT FÖR LADAN NU: `python tools\ladan.py --env DMX_LABFX=1` (de tio är kodens standard;
   ladan.conf blir bara LABFX). Bevisverktyg: tools/dmxDump.mjs <dist> <wav> (DMX-md5 per lampa; bygg gamla koden med tsc --outDir .arena/x/dist och jämför).
KLART 2026-11-08: A = d539915 (cal.gamma/cal.top per lampa i output.ts + server-sanering + UI 'Kurva'/'Tak %'; minLit/sameLightK i output; DMX-md5
   identisk; gamma 2,2 på lampa 2 ändrar bara lampa 2). KVAR av kontraktet: energins DMX-procent och uttoningens tidskonstant räknar med riggens
   referensgamma (GAMMA), och moment.ts/lab*.ts toV() importerar GAMMA - flytta om en lampa med annan kurva ska få exakt rätt energi.
KLART 2026-11-08: KVAR-delen av A = b0448b1 (tagg backup/fore-lampkontrakt-20261108): ingen gamma utanför output.ts - motorn/stunderna
   räknar i andel ljus, output.ts lampLevel/lampFadeK/keepLit/sameLight per lampa; ctx.fx bort. DMX-md5 identisk (lang1021 + lang1107, av/LABFX,
   med/utan stundcykel fest..lab5); cal.gamma 2,2 på lampa 2 ändrar bara lampa 2. Kontraktskommentarer + effects/README + ARKITEKTUR i nästa commit.
   Effekternas utseende (kulörbyten, motfärg, hysteres, FX_REN) är INTE lampanpassning (ägaren 11-08) - ligger kvar i effekterna.
KLART 2026-11-08: C = e03663c (backup-tagg backup/fore-tio-standard-20261108): alla tio standard, rattarna bort, ny kod utan env = gammal kod
   + tio env bit-identiskt (DMX-md5, lang1021 + lang1107). Kvar som ratt: DMX_LABFX. Bänkrattarna DMX_B_SUBW/B_LO_S/DROP_WIN_S läses fortfarande
   (nya standardvärden 0,25/0,25/1) - de hör till energilagrets bänkfamilj.
DELVIS 2026-11-08: B = PROV DMX_FX_REN=1 (vidga blandkulör, twin vandring var 8:e slag, ripple paret var 4:e slag): dynBench lang1107 sidoBlink
   0,8 -> 0,9/min, ofriv 0,6 -> 0,6, lang1021 oförändrad -> 'redo för ladan'. Sirenens motfärg = egen ratt DMX_FX_REN_SIREN: 0,8 -> 2,6/min
   (siren 61 blink) - kulörbyte på uttonande lampa. Behållna med skäl: upptakt släckta (ägarens 'såg likadan ut på alla lampor'), drift 4 s
   hysteres (32 kulörhopp/min i en lugn effekt - effektens fladder, inte diodens), inget vitt (smak).
KLART 2026-11-08 (huvudchatten, ägaren: 'ta bort gränsen, men spåra direkt'): cb7d841 RGB_SHARE-grinden bort (1-100 % rakt mot kalibreringen;
   blink 0,8/0,6 -> 0,8/0,5, studs oförändrade - grinden var INTE F:s orsak). F:s orsak spårad (DYN_STUDS): byter effekten kulör på en lampa som
   tonar ut fick den nya kulören den hållna nivån PER KANAL (röd 40 -> magenta 40+40 = dubbla ljuset; 9 av 17 studsar). Lagat i uttoningen
   (effects.ts, UTTONINGEN STIGER ALDRIG I LJUS: ny kulör får högst gamla kulörens ljus via output.ts sameLight): studs lang1107 0,35 -> 0,08,
   lang1021 0,37 -> 0,32, blink/ofriv/dynamik oförändrade. Kvar (lang1021 minnet/gallop): fallande cyan 40 -> 43 och håll = ett svagt nytt slag
   i effekten + MINSTA PÅ-TID, effektens utseende - inte lagat. EJ DEPLOYAT, ägaren dömer i ladan.
FÖRKASTAT 2026-11-08: F = DMX_FADE_NYKANAL (patch tools/natt/prov/fadenykanal-20261108.patch): (1) ny kanal på effektens nivå utan egen
   uttoning: studs 0,35 -> 0,35, sidoBlink 0,8 -> 2,2 (rå effekt fladdrar); (2) med egen uttoning från effektens nivå: studs 0,35 -> 0,29 men
   sidoBlink 0,8 -> 1,5, ofriv 0,6 -> 1,2 (dansparet 7 -> 24): den nya kanalen startar lågt, under utgångens 6 %-grind (RGB_SHARE) mot den
   hållna gamla kanalen, och tänds/släcks av grinden. Nästa försök: grinden i output.ts ska räkna andelen mot effektens nivå, inte den hållna -
   eller en kanal som tillkommer under uttoningen får RGB_SHARE-undantag. Lagas i output, inte i effekterna.
FRÅGA 2026-11-08: G ej byggt - stunden 'show' är omskriven till dramaturgi (c8acda8: mörkret/soluppgång/frys/orkestern/pianot/bollarna), akterna
   och HJÄRTAT finns inte längre. Förslag: provLook spelas som egen stund 'prov' (8 takter effekten, 8 takter show) eller som akt efter frysen.
FÖRKASTAT 2026-11-08: E = DMX_DROP_ON_BASS (patch tools/natt/prov/droponbass-20261108.patch, mätare tools/dropBas.mjs). FACIT: i 18 av 22 show-drops
   (lang1107 14, lang1014 7, lang1021 1) har basen (sub+kick) redan slagit an 20-77 ms FÖRE flanken - flanken är alltså ~50 ms SEN mot basen, inte
   tidig. Flank före bas > 150 ms: 4 av 22 (lang1107 79,8 s +360 / 315,1 s +181, lang1014 138,7 s +211; 94,3 s +45) ≈ ägarens '1 av 8'.
   Bästa varianten (anslag 8 dB/80 ms, 'redan där' inom 100 ms, vänta högst 1 s): 315,1 -> på basen (-21 ms), 94,3 -> -8 ms, de 17 rätta orörda,
   MEN lang1014 138,7 s blev minidrop: där ligger basen jämnt ~25 dB utan anslag (den är redan där) och väntan hittar inget. 'Basen på sin
   nivå' (inom 6 dB från långsam topp, rå eller 100 ms-glättad) räddade den inte. Nästa: 'basen redan där' = sub+kick över låtens basmedian
   (inte toppen), och mät om de 18 'sena' flankerna kan fyra på anslaget i stället (tajthet -50 ms på dropen, bara uppgången).
MÄTT 2026-11-08: I(a) LABFX i natt-bänken (live-labfx): sångaren väljs ALDRIG (korpus 0 %, mixar 0 s, kvällen -), sökljuset 0,6 % av korpus;
   minnet 189 s + dansparet 75 s av mixarnas 1200 s, korpus 4,9/3,9 %. Pris: korpus r 0,22 -> 0,16 (80 av 222 klipp ändrade), kvällen
   effektivt 28,3 -> 27,0, unika 70 -> 72, hör ihop 81 -> 84 %. Sångaren tävlar i 'lugn'-poolen utan företräde vid !hasBeat - ägarens
   användningsfall (okänd takt) är inte byggt i dirigenten. Nästa: dirigenten tar sångaren när takten är okänd (H), bänka på lugnt material.
D (arenan puls2) KAN KÖRAS NÄSTA NATT: C är KLART och json-bevisad; basenv.txt = DMX_LABFX=1 (det enda som är live utöver koden).
A. KONTRAKTET + KALIBRERINGEN PER LAMPA (punkt '4'): GAMMA-läckorna ur effects.ts (E_MIN_LIT, kulörtoningen) till output.ts, sedan gamma och
   tak per lampa i cal (standard 1,6/0,95) + server.ts-saneringen + UI:ts kalibreringsflik. Json-identiskt bevisat. Se 'MÅLET MED KONTRAKTET' nedan.
B. EFFEKTERNAS DIODANPASSNINGAR BORT (punkt '3'): provratten DMX_FX_REN, mät med RGB_STRICT. Se 'ÄGAREN IGEN' nedan.
C. Om tid finns: de tio proven till standard (avsnittet nedan). Görs C inte i natt: nästa natt FÖRST.
D. ARENAN puls2 FLYTTAD TILL NÄSTA NATT (kräver C KLART). Kör den inte i natt.
F. STUDSEN I SLUTET AV FADEN (ägaren i ladan 11-07: 'när en effekt fadar en färg så kan den hacka i slutet av fade, snabbt öka ljusstyrka'
   + 'har varit lika innan också'), efter A/B. Mått: dynBench fadeStudsMin/studsLook (ny 11-07, DYN_STUDS=1 skriver exempel) - lang-20261107T154200
   med de tio: 0,27/lampa/min (eko 3, backbeat 3, slagga, hiss, rave, siren). ORSAK i hälften: effekten byter kulör på en lampa som TONAR UT;
   uttoningen (effects.ts steg 2, lampLvl * fadeK) lägger den gamla nivån på den NYA kulören -> en ny diod tänds direkt på hela uttoningsnivån
   (eko 135,8 s: R 42 tonar, B tänds på 40 = röd -> magenta, dubbelt ljus). Lagning i MOTORNS UTTONING (inte i effekterna): kanaler som
   lyste tonar exakt som i dag; en kanal som tillkommer under uttoningen får effektens egen nivå, inte den hållna. Låst: ingen fade blir
   snabbare för en kanal som lyste. Provratt DMX_FADE_NYKANAL (osatt = identiskt), mät fadeStuds + sidoBlink + takt/sprid, 'redo för ladan'.
   Resten (backbeat/rave) = effektens nästa puls som startar några rutor tidigt - lista, laga inte.
G. SHOWEN SOM PROVSCEN (ägaren i ladan 11-07: 'det kan vara ett sätt att även testa framtida effekter' + 'nu har det varit svårt när en eller
   två effekter uppdaterats, men jag vet inte när de spelas'). Stunden 'show' (src/moment.ts, 24db60d, POST /api/moment {moment:'show'})
   är en programmerad koreografi 8 akter x 8 takter. Bygg AKT 9 'PROVET': efter HJÄRTAT (= signalen) spelar den RIKTIGA effekten
   cfg.provLook (en effekt-key ur registry.ts) i 8 takter genom motorns vanliga väg (steg 1-3, samma energi/uttoning/kalibrering), sedan
   börjar showen om. Sätts med POST /api/moment {moment:'show', provLook:'<key>'} (server.ts sanerar mot registret; okänd/tom = ingen akt 9).
   Nattagenten sätter provLook till den effekt den ändrat (skriv det i rapporten: 'starta showen, akt 9 = <effekt>'). Fest orörd (w = 0),
   strobe/rök som effekten själv. Efter A/B/E/F.
H. SÅNGAREN SOM RIKTIG EFFEKT (ägaren i ladan 11-07 om showen: 'den som kör nu är grym' + 'effekten sångare är ju perfekt om takten blev
   okänd pga inte mycket bas och takt'). Förlaga: src/moment.ts showTick, grenen SÅNGAREN (281086d): EN lampa, ljusstyrkan = röstbandet
   0,25 lowMid + 0,5 mid + 0,25 highMid glättat 60 ms över ett krypande golv; ny fras (rösten åter efter >= 350 ms) = ny lampa (aldrig samma
   två gånger i rad) + ny kulör. Gör den till en effekt i registry.ts som dirigenten väljer när TAKTEN ÄR OKÄND (!hasBeat) och/eller i lugna
   partier (break/intro, låg bassline) - ägarens användningsfall. Effekten ger bara 0-100 % (kontraktet). Provratt DMX_SANGARE (osatt =
   identiskt), mät hur ofta den väljs och att takt-looks inte trängs undan när takten finns. Efter A/B/E/F.
I-STATUS 11-07 18:55: ägaren 'jag vill lägga till dom' -> 1-4 BYGGDA OCH LIVE som provratt DMX_LABFX=1 (src/effects/sangare.ts,
   dansparet.ts, minnet.ts, sokljus.ts + registry/fit/Mode/SPREAD_SKIP; ladan.conf har elva rattar). dynBench lang-20261107T154200 med de tio:
   blink 0,7 -> 0,8/min, dirigenten väljer minnet/dansparet i refrängerna (sångare/sökljus kräver lugna partier - inspelningen har nästan inga).
   KVAR för natten: (a) bänka sångaren/sökljuset på material MED lugna partier (korpus/ladan-1101) och visa att de väljs; (b) 5 (reprisen) och
   6 (fråga-svar i duel/eko) enligt nedan; (c) ägarens dom i ladan -> standard (ratten bort, som de tio). Dagens rad i C blir elva rattar.
I. LABBETS FAVORITER IN I FESTSHOWEN (ägaren i ladan 11-07: 'effekter är klart för kvällen. Lägg till de vi tyckte var bra, och kör sen
   vanliga vägen'). Kvällens experiment ligger som stunder i src/moment.ts ('show') och src/lab.ts-lab5.ts ('lab'..'lab5'), POST /api/moment.
   Gör varje favorit till en RIKTIG EFFEKT i src/effects/ + registry.ts som dirigenten väljer på sitt läge, enligt kontraktet (effekten ger
   bara 0-100 %, inget om dioderna) och riktmärket: 'tänk fest, ljuset skall hjälpa dom som dansar att dansa i takt'. En provratt per effekt
   (osatt = identiskt), bänka (dynBench blink/studs/fladder + domare v3), 'redo för ladan'. Ägarens domar, i ordning:
   1. SÅNGAREN - 'klockren, vi behåller den' (= uppdrag H, förlaga moment.ts showTick + lab.ts singer): lugnt / okänd takt; avbryts DIREKT
      när basen kommer (kick > 0,55 eller baskropp + musik på, 1,2 s) - 'avbryt sångaren så fort hög bas aktiveras'.
   2. DANSPARET - 'denna är bättre' (lab4.ts dansparet): refräng; två ljuspunkter i motfärger, ett steg per slag (STEPS), byter plats varannan takt.
   3. MINNET - 'jag gillar denna' (lab.ts memory): refräng; improviserat lampmönster per slag i första refrängen, EXAKT samma i nästa;
      slagens styrka ur kick + baskropp ('saknade att lamporna körde på energi'). Kräver låtgräns-nollställning (ny låt = nytt minne).
   4. SÖKLJUSET - 'nice' (lab2.ts sokljus): lugnt; en stråle byter lampa varje takt (300 ms glid), virveln blinkar raden kort i strålens färg.
   5. SÅNGAREN + DROPENS SLOW MOTION varannan sekund i lugna partier - 'nice' (lab.ts, calmSwap): reprisen av dropens 4 s i kvarts fart.
   6. FRÅGA-SVAR - 'ok, men tror vi har den' (lab2.ts fragasvar): förbättra duel/eko med 'samma rytm två takter senare på andra sidan' i st.f. ny effekt.
   AVVISAT (bygg inte): månen ('ingen känsla' - drift utan händelse), dragkampen i lugna partier ('passar inte'), polyrytm 3:4 och explosioner
   på minidrops ('tappar takten'), showens första version ('lik de andra effekterna'). Ej dömt: kanon, klangfärg, glöd, domino, förväntan,
   spänningen, målningen, karusellen, uppladdningen, lab5 (gunget/danssteget/virveln/hoppet/stjärnfall).
   KVÄLLENS BÄNKLÄXA: kulörbyte på en TÄND lampa = diodblink (lab2 67 -> 1,7/min när byten flyttades till takt/varv eller mörk lampa).
   Ordning: efter A/B (ägarens prio). Stunderna show/lab* får ligga kvar som provscen.
MATERIAL 11-07 kväll: tools/ladan-2026-11-07/lang-20261107T154200.wav (10 min, ladan 16:42 med ALLA TIO proven live, ingen ägarmarkering;
   analysatorn 11 drops: 10,4 / 101,7 / 220,2 / 258,7 / 340,7 / 384,1 / 449,5 / 516,6 / 530,6 / 557,5 / 585,3 s). Används i E (flank -> bas)
   och som FJÄRDE fil i arenans kontrollmängd (tools/arena/bank.py HOLDOUT: lang1107) - aldrig som bänkfil för deltagarna.
E. DROPEN FYRAR PÅ BASEN (ägaren i ladan 11-07: 'om det är en drop, att det också måste vara djup bas' + 'ibland vid drop nu bara energin
   går upp så lyser den DROP, men själva basdropen är 500 ms senare'). NY FORM (går före texten nedan): flanken ARMERAR, DROP fyrar på första
   tunga basanslaget (kickband/eBass-anslag, mät vilket) inom ett fönster (~1 s, bestäm med facit); ingen bas i fönstret = minidrop.
   Mät per drop i facit: tid flank -> basanslag (ägaren: ~500 ms), hur många av kvällens 59 som fyrar före basen, och efter ändringen
   fel i ms mot basanslaget (målet ~0 +- 30 ms). Uppvärmningsfällan/break: basen kan ligga högt före (1/11 ~71 s) - då räknas anslaget, inte nivån.
   ÄGAREN: 'kanske 1 av 8 drops som den fyrar för tidigt' -> de 7 rätta får INTE fördröjas: har flanken redan bas (basanslag inom +-30 ms)
   fyrar den direkt som i dag; BARA flank utan bas väntar på anslaget (högst ~1 s, sedan minidrop). Bevis: ändrade drops <= ~15 % av alla,
   ingen drop som redan satt på basen flyttas mer än 0 ms. Mät andelen 'flank före bas > 150 ms' i facit och jämför med ägarens 1/8.
   Provratt DMX_DROP_ON_BASS (osatt = identiskt). Ursprunglig text:
   DROP KRÄVER DJUP BAS, om tid finns efter A/B: i stepDrop
   (effects.ts, DMX:s egen - INTE delade analysatorn) får efterkontrollen ett andra krav: basbandet ska ha stigit mot nivån före dropen,
   annars minidrop. Bestäm band (kick 60-120 / sub 20-60 / båda) och tröskel MED FACIT, inte gissning: dropFacit.mjs (19 markerade),
   kvällens 59 drops (dag-20261107-drop.md), tools/ladan-2026-11-07/lang-*.wav + ägarens markeringar (.events.json). Fälla: basen kan redan
   ligga högt före (1/11-inspelningen, dropen ~71 s på taket) - mät höjningen relativt, och visa per drop: före/efter i dB, dom gammal/ny,
   facit. Provratt DMX_DROP_BASS_DB (osatt = identiskt). Mål: färre falska drops, ingen riktig drop tappad. 'Redo för ladan'.
Bänka A/B med de tio rattarna satta som env (KICKREGN_PAR, BUILD_TOPP, BREAK_HOLD_MS=20000, DROP_LAND_CAP=0.9, DROP_LIFT_FLOOR=0, DROP_WIN_S=1,
B_SUBW=0.25, B_LO_S=0.25, BASGANG=1, RGB_STRICT=1) = det som är live. Deploya aldrig; 'redo för ladan' med hela kommandot (tio + nytt).

## Från kvällen 2026-11-07 - GODKÄNT I LADAN: FYRA PROV IN I KODEN (ägaren i ladan: 'godkänt' x3 + 'perfekt'; går före allt annat)
LIVE sedan 15:55-16:10 (Pi 10.171.211.218 via hotspot, PC 10.171.211.53), ladan.conf = KICKREGN_PAR=1, BUILD_TOPP=1, BREAK_HOLD_MS=20000,
DROP_LAND_CAP=0.9, DROP_LIFT_FLOOR=0, DROP_WIN_S=1, B_SUBW=0.25, B_LO_S=0.25, BASGANG=1. Ägaren godkände i tur och ordning (a) BREAK_HOLD,
(b) drop-trion, (c) SUBW+LO_S, (d) BASGANG (arenans vinnare; 'perfekt'), och (e) KICKREGN_PAR + BUILD_TOPP ('låt båda vara i koden'), och (f) RGB_STRICT=1 (f386ddb, live 16:40: 'mycket bättre, har inte sett något ännu';
   'jag skiter i om en färg blir mer gul eller orange').
1. Gör (a)-(f) till KODENS STANDARD (RGB_SHARE 0,06 blir en konstant) och ta bort rattarna (feedback-ingen-opt-in / kodstädningen): backup-tagg först, ersätt i koden,
   gamla grenen bort. BASGANG: a8-looksens nya formler blir de enda; a7:s spridning (SPREAD_D/SPREAD_SKIP) blir standard.
2. Bevis: ny standard UTAN env = json-identiskt mot `tools/arena/bank.py <mapp> --bas` med de nio rattarna satta (dvs. dagens ladan).
3. tools/ladan.py: kommandot efteråt blir `python tools\ladan.py` UTAN --env (ladan.conf töms; alla nio är standard).
   DEPLOYA INTE - skriv 'redo för ladan' med kommandot; ägaren deployar vid nästa besök (riggen kör redan samma ljus via ladan.conf).
4. .arena/<nästa körning>/basenv.txt: TOM när (a)-(f) är standard (minnet feedback-arena-domaren-basenv).
5. Markera KLART här.
KLART 2026-11-08 (nattagenten): 1-4 = e03663c, json-/DMX-identiskt bevisat; ladan-kommandot `python tools\ladan.py --env DMX_LABFX=1` (LABFX = elfte, utan dom). Ej deployat.

ARENA: resten av looksen ska bära basgången (ägaren 2026-11-07 kväll: valde detta som nattens arenafråga; EFTER punkt 1-5 ovan)
- Bakgrund: arenan puls1 (tools/natt/arena-2026-11-07-puls1.md) skrev om de 5 mest spelade looksen (tryckvåg, gallopp, varannan, duell,
  tvilling: styrkan ur ctx.bassBody, rutnätet bara vem/när, uniforma punch/kickEnv-mattor bort). Övriga looks får bara a7:s spridning
  (SPREAD_D dämpar alla utom ledaren mellan basslagen). Frågan: ge ÖVRIGA looks basgången på riktigt - styrkan ur basen, olika saker på
  olika lampor, mörkt mellan slagen - så att hela showen blir mer lik en programmerad dansgolvsshow, utan mer ljus i snitt.
- Kör skillen dmx-arena: körning `.arena/puls2`, 8 deltagare, basenv TOM (alla nio är standard efter punkt 1; kör inte arenan om punkt 1
  inte är KLART och json-bevisad - skriv varför). Uppgiften från tools/arena/MALL-uppgift.md, med frågan ovan; tillåtna filer som i puls1.
  Deltagarna ska först mäta VILKA looks som spelas och hur mycket (a8 i puls1 hade perlook.py/ana.py i .arena/puls1/a8 - får läsas) och
  rör inte de fem som redan är omskrivna. Strategikorten ska vara olika mekanismer.
- Efter runda 1: steg 4b (final på kontrollmängden för topp 3 + EN fusionsagent, budget 4 bänkar, med en variant per delkombination).
  Vinnaren = högst holdout-poäng utan DISK; läs vinnarens diff mot de låsta reglerna själv.
- Vinnaren blir provratt (osatt = json-identiskt, satt = json-identiskt mot vinnarens mapp, båda bevisade med bank.py) + 'redo för ladan'.
  DEPLOYA ALDRIG. Rapport tools/natt/arena-<datum>-puls2.md. Markera KLART med vinnaren och poängen.

DIODFLIMMER - DELVIS LÖST 11-07 kväll av RGB_STRICT (f) ovan (orsaken: bikanalen skalades in i diodens dödzon + kulörtoningens svans 0/1
av 255); kvar i bänken: siren 4 (kulörbyte på uttonande lampa) + gallop 2 korta blinkar/10 min - ta dem bara om tid finns.
PRINCIP (ägaren 11-07: 'effekterna skall ju inte veta något om hur mina specifika lampor är mappade. Det skall ju göras i output'): allt som
beror på dioderna (tändpunkt, dödzon, när en kanal syns) lagas i src/output.ts (kalibreringen), ALDRIG i effektfilerna - siren ändras inte för
flimrets skull. Minsta på-tid per färgkanal (CH_MIN_ON_MS i effects.ts steg 2) räknar på effektens värden, inte diodens - flytta den till
output.ts som diodens på-tid (json-identiskt bevis) om tid finns.
KONTRAKTET (ägaren 11-07: 'effekt skall bara justera hur mycket 0-100 % kanaler skall lysa och inte veta något annat'): effekterna OCH motorns
steg 1-2 ger R/G/B 0..1 per lampa; gamma, tändpunkt, tak och dödzon finns BARA i output.ts. Läckor i dag: effects.ts importerar GAMMA för
E_MIN_LIT (minsta tända nivå = 'gammans första DMX-steg') och kulörtoningen (rad ~564, ljusstyrka efter utgångens gamma). LÅG PRIORITET, sist:
flytta dem till output (json-identiskt bevisat). ÄGAREN IGEN: 'effekter skall ju inte justera lamporna' - effekternas DIOD-ANPASSNINGAR
(lista alla: vidga grannkulör i st.f. blandkulör 11-02, upptakt släckt 'för att 6 % syntes som 17 % efter gamma/tändpunkt', kulörbyte bara per
fras i siren/twin/ripple/drift 'för diodblinket', mm. - grep 'diod'/'tändpunkt'/'gamma' i src/effects/) ska BORT ur effekterna: varje effekt
gör det den är tänkt att göra i 0-100 %, output (RGB_STRICT) tar dioderna. Bygg som EN provratt DMX_FX_REN=1 (osatt json-identiskt), mät
dynBench sidoBlink/ofrivBlink med RGB_STRICT (får inte stiga mot RGB_STRICT ensam - stiger den: det som blinkar lagas i output.ts, inte i
effekten), 'redo för ladan'. UNDANTAG: 'inget vitt' är ägarens smak (vitt blixtrade), inte en diodanpassning - behåll.
MÅLET MED KONTRAKTET (ägaren 11-07: 'köper jag andra lampor vill jag bara kalibrera dom, och det skall användas av output'): en ny lampa =
kalibrera i UI:t, inget annat. Finns per lampa i dag (config.json fixtures[].cal, server.ts sanerar, UI-slider/stegtest/walk-test):
on, onR/onG/onB/onW, full. GEMENSAMT i dag och ska bli PER LAMPA i cal: gamma (output.ts GAMMA 1,6) och taket (MAP_TOP 0,95) - standard
1,6/0,95 när fältet saknas = json-identiskt för ladans fyra. Förutsättning: GAMMA-läckorna i effects.ts (E_MIN_LIT, kulörtoningen) bort först,
annars blir motorns minsta nivå fel för en lampa med annan kurva. server.ts-saneringen + UI:ts kalibreringsflik får fälten. Bevis: json-identiskt
utan fälten; med cal.gamma 2,2 på EN lampa i bänken ändras bara den lampans DMX. Gamla texten:
(ägaren i ladan 11-07: 'ibland när en kanal R/G/B lyser så flimmrar fortfarande ibland en av de andra lite'; EFTER arenan,
bara om tid finns): dynBench lang1021 med de nio: sidoBlink 0,1/min (siren 2) utan BASGANG, 0,5/min med (gallop 7 - ALLA vid 221,7-221,9 s:
kulörbyte mitt i uttoningen, bikanalen glider 30 -> 2 -> 30 kring tändpunkten 16). Samma mekanism som 11-02 (twin/pendel/backbeat-svansen,
siren-bytet). Gallopps avmättnad (1 - punch*0,3) provad som orsak: ingen effekt, backad. Förslag att BÄNKA (opt-in, standard identiskt):
minsta AV-tid 100 ms för en färgkanal medan lampan är tänd (spegling av färgkanalens minsta på-tid), eller hysteres på tändpunkten för
bikanaler. Får inte röra uttoningen eller fade-down; mät sidoBlink/ofrivBlink + takt/sprid. Redo för ladan om det håller.

## DAGKÖRNINGEN 2026-11-07 MED TRE AGENTER (ägaren: 'kan man få takten att följa själva basrytmen bättre (energilagret)' + 'efter drop ... taket 95 %, men golvet 70 % dödar dynamik' + 'målet är inte mer ljus överlag, utan att takten syns bättre'; INGET deployat, inget standard ännu)
Provrattar i koden (osatt = json-identiskt, verifierat: dag-baslinje = nattens golv-av/hold-av): 99b1d53, e86932f, 88a3ec7. Rapporter: dag-20261107-rytm.md / -drop.md / -tillit.md.
1. TAKTEN EFTER DROPEN (dag-20261107-tillit.md): DMX_BREAK_HOLD_MS=20000 - syntetiska break 4/8/16 s (tools/breakSyntet.py) takt85 4,49 -> 0,26 s; nattens
   'kostnad' i dropsprång var brus (hop-förskjutning 0,40-0,50); kvällen unika 70 -> 66 är verkligt men kommer av ANALYSATORNS bpm 0 mitt i full musik
   (183 s av kvällen, 16 episoder 7-18 s) som hållet täcker. TRUST_UP förkastat (falsk tillit), TRUST_LEAK_MS verkningslös (läckan multipliceras per hop).
2. EFTER DROPEN (dag-20261107-drop.md): BUGG - efterkontrollen kräver eSm >= 1,15 x före + 0,02 och 'före' >= 0,85 i 53 av 59 drops -> omöjligt, lyftet släpps
   efter 0,6 s i ~9 av 10 drops. DMX_DROP_LAND_CAP=0.9 + DMX_DROP_LIFT_FLOOR=0 + DMX_DROP_WIN_S=1 (basfönstret ankras om på refrängen i stället för golv):
   kvällen drops med lyft 6 -> 49/59, ljus mot refrängen 1,04 -> 1,17, monotona 11 -> 3, puls/slag 0,31 -> 0,34, slag som når taket 38 -> 52 %.
   Pris lampspr pop -1 % (dalarna mörka på alla lampor samtidigt). Taket är redan 1 (= 95 %) under lyftet. Minidropens golv: behåll 1.
3. TAKTEN I ENERGILAGRET (dag-20261107-rytm.md, mått tools/rytm.py): DMX_B_SUBW=0.25 + DMX_B_LO_S=0.25 (kickbandet väger mer, dalen följer fortare):
   lang1021 rA +0,025, slagK 0,295 -> 0,312, ljusLag t90 40 -> 25 ms, ej släckt längre (mörkret hamnar mellan slagen). Pris lampspr pop -6 %, mega -2 %.
   Alternativ SUBW 0.25 + CURVE 4. FX_FLOOR förkastat (inte orsaken), E_NORM_S förkastat, mer sub sämre (lotus-fyndet gäller inte här).
   HUVUDFYNDET: energin följer basen bra (r 0,69-0,83) men ljuset följer energin svagt (r 0,35-0,54) - EFFEKTERNAS mönster styr ljuset. Ska basgången
   kännas i ögonen på riktigt är nästa steg i effekterna (vilka effekter följer basen, rytm.py per look), inte energilagret.
4. EFFEKTERNAS PULS UR BASEN (runda 3, 69d906c): låst takt gav effekternas puls (c.heart/beatPulse/kickEnv) ur RUTNÄTET och stängde av punchens
   per-slag-del - basgången nådde aldrig effekterna. DMX_FX_BASS=1 + DMX_FX_BASS_PUNCH=0.5 (ovanpå SUBW 0,25 + LO_S 0,25): lang1021 rA 0,190 -> 0,265,
   rK 0,206 -> 0,272 (dagens största vinst), dynSet ljusSteg 2,02 -> 2,39, fladder 0, refrängen starkare (1,73 -> 1,82). Pris lampspr pop -8 % / mega -4 %,
   dropsprång hög -0,02. Bandsvepet: bara sub (~lågpass 60 Hz, lotus-värdet) SÄMST, bara kick (60-120) bäst för takten, 0,25 kompromiss. PUNCH 1 = 'allt lyser'-risk.
ÖGONPROV I LADAN (ägaren, en sak i taget, i denna ordning): (a) BREAK_HOLD, (b) drop-trion, (c) SUBW 0,25 -> + LO_S 0,25, (d) + BASGANG 1 (arenans vinnare). FX_BASS UTGÅR (DISK i arenan, ljus +4,6 %). Godkänt = in i koden + ratten bort.
Fortfarande live och utan dom: DMX_KICKREGN_PAR=1, DMX_BUILD_TOPP=1.
5. DMX-ARENAN puls1 (skillen dmx-arena, tools/arena/, körningen i .arena/puls1 - gitignorerad): runda 1 med 8 agenter, domare v3 + --live-kick:
   a8 (effekterna själva: styrkan ur c.bassBody) +13,7, a1 (beatFrac på basanslaget, jitter 75 -> 33 ms) +6,2, a7 (ljusaste lampan leder) +4,8,
   ref FX_BASS DISK (ljus +4,6 %). FINAL på kontrollmängden: a8+a7 (fusion-b) +14,1 vinner, a8 +13,3; allt med a1 föll (överanpassat).
   VINNAREN = provratt DMX_BASGANG=1 (osatt json-identiskt mot bas, satt json-identiskt mot fusion-b). Rapport: tools/natt/arena-2026-11-07-puls1.md.
   MÄTFÄLLA 52 IGEN: dynBench.mjs/dynSet.py matar INTE registerKick (kickboosten statisk) - rytm.py har nu --live-kick, dynSet saknar motsvarande.
   NATTAGENTEN: lägg --live-kick i dynBench (opt, standard oförändrat) och notera skillnaden i dynamik.md.

## Från eftermiddagen 2026-11-04 - HIGH NR 3+ FÅR NÄSTA LOOK (ägaren: 'ja, låt nattagenten pröva b i natt'; går före allt annat)
Bakgrund: look-taket förkastat i dag (31ac4a9, se KLART nedan). Diagnosen: tryckvags 36 % i megamix är MANUSETS ÅTERSEENDE - high kommer
  tillbaka och tar samma look igen (effects.ts manus keep ~rad 830-840, manusHist rad 617/968), inte långa sträckor.
1. PRÖVA (b): när samma sektionsnyckel kommer tillbaka för 3:e gången (eller fler) i samma låt får den NÄSTA look ur manusHist/pickLook
   (minst spelad som passar), inte sektionens första. 1:a och 2:a gången oförändrade (återseendet ska bestå - refrängen känns igen).
   Pröva gärna varianten "från 4:e gången" som andra punkt. Rör inte drop-hold, duel eller look-taket (förkastat).
2. Döm mot SAMMA baslinje som i dag (looktak-av / json-lik): mega lookTime tryckvag (ner från 36 %), återseende (får sjunka lite, inte rasa),
   hör ihop, byten/min, korta < 8 s, ljusLag 90 %, dropsprång och lampspr (FÅR INTE FALLA - det var det som fällde taket).
   Bevisar det sig: in I KODEN som standard (ingen env-flagga), backup-tagg backup/fore-highvarv-20261104. Annars backa + spara patch + siffror.
   Deploya inte.
3. Tryckvags kanter först efter detta, mot den nya baslinjen.
KLART 2026-11-04 kväll (nattagenten): (b) BEVISAT från 4:e gången -> I KODEN som standard e03a2f4 (HIGH_VARV 4, ingen flagga, tagg
  backup/fore-highvarv-20261104, EJ deployat). Varv = gången nyckeln 'high' kommer i låten (räknas i switchLook när nyckeln byts, nollas på
  låtgräns); varv >= 4 och inte drop: minst spelad ur manusHist (utom manusets och nuvarande), annars ny ur poolen. natt --snabb, av json-lik looktak-av:
  mått              av      3:e+    4:e+ (standard)
  mega tryckvag     36 %    19 %    21 %
  mega lampspr      83      74 <-   88
  mega dropspr L/H  0,37/0,44  0,38/0,50  0,36/0,50
  mega r · kick     0,12 · 184  0,12 · 160  0,17 · 187
  ljusLag 90 % p/m/1021  15/35/40  15/15/35  15/15/40
  kvällen återseende 78 %  59 % <-  65 %;  hör ihop 84/84/81;  korta <8 s 15/16/16 %;  byten/min 2,67/2,72/2,67;  pop oförändrad med 4:e+.
  Dirigenten megamix: låt 1 high varv 5/6/7 = tryckvag/gallop/tryckvag, låt 2 frasraknare/sidokedja/frasraknare - växlar mellan låtens refränglooks.
  PRIS: återseende -13 pp (kvällen), dropsprång lugn -0,01. Ägarens öga avgör; backa = git revert e03a2f4.

## Från förmiddagen 2026-11-04 - TAK FÖR EN LOOK I STRÄCK (ägaren: 'ja, låt nattagenten pröva det i natt'; går före allt annat)
Ägaren frågade 'kör den alltid tryckvåg?': megamix 0-600 s tryckvag 218 s (36 %), sidokedja 121, gallop 112 (natt/2026-11-04.json lookTime);
  pop är spridd (backbeat 118, eko 102, drumkit 86, tryckvag 65). Orsak: LÅTMANUS byter bara vid sektionsgräns/build/drop (effects.ts ~rad 309,
  860 manus keep) och megamix första 5 min är nästan bara high -> samma look ligger kvar i långa high-sektioner/återseenden.
1. PRÖVA ETT TAK: en look får spela högst ~60 s i sträck (pröva 45/60/90 s, på slaget/frasgräns så bytet sitter musikaliskt); sedan nästa bästa
   ur samma pool (pickLook, minst spelad). Återseendet ska bestå: samma refräng som kommer tillbaka får gärna börja i sin look - taket gäller
   tid i sträck, inte vilken look som väljs. Drop-hold (high efter drop) och duel rör du inte.
2. DÖM PÅ: megamix lookTime (största andel ned från 36 %), kvällens hör ihop/återseende/byten/min (inga fler korta looks <8 s), ljusLag 90 %
   och dropsprång/lampspr (får inte falla). Bästa takvärdet byggs in I KODEN som standard (ingen env-flagga, ägarens regel; backup-tagg
   backup/fore-looktak-20261104) om det bevisar sig - annars backa och rapportera siffrorna. Deploya inte.
3. Tryckvags kanter (NÄSTA från natten 11-04) först efter detta, och mät dem mot takets nya baslinje.
KLART 2026-11-04 kväll (nattagenten, FÖRKASTAT - koden backad, patch tools/natt/prov/looktak-20261104.patch, tagg backup/fore-looktak-20261104):
  tak i sträck inom sektionen (byte på sektionens taktraster, pickLook minst spelad, manuset behåller sektionens första look). natt --snabb, av json-lik baslinjen:
  tak       av      90 s    60 s    45 s
  mega tryckvag 36 %   36 %    34 %    31 %     (mega längsta 73 / 73 / 60 / 46 s, looks 13/13/14/17, tak-byten i mega 0/0/1/5)
  mega lampspr  83     83      73      75   <- FALLER (kravet 'får inte falla'); mega dropsprång hög 0,44/0,44/0,49/0,51, kick->ljus 184/184/149/152, r 0,12/0,12/0,22/0,21
  kvällen hör ihop 84/86/84/88 %, återseende 78/77/74/74 %, korta <8 s 15/15/14/14 %, byten/min 2,67/2,80/2,91/3,16; ljusLag 90 % oförändrat 15/35/40 alla.
  DIAGNOS: tryckvags 36 % är INTE långa sträckor (bara 1 sträcka > 60 s i megamix) utan MANUSETS ÅTERSEENDE - high kommer tillbaka och tar tryckvag igen
  (och mega 0-300 s är nästan bara high). Ett tak kan därför bara ta ~5 procentenheter. Lampspr faller för att taket/kaskaden byter sidokedja -> motor.
  NÄSTA (ägarens val): (a) 45 s ändå (målet + hör ihop + drops upp, lampspr mega -8); (b) angrip återseendet: high nr 3+ i samma låt får nästa i manusHist
  i stället för första looken; (c) låt det vara. Tryckvags kanter (punkt 3) ej påbörjade - baslinjen är oförändrad.

## Från förmiddagen 2026-11-02 - DAGKÖRNING (ägaren på jobbet: 'kan vi inte sätta igång agent nu'; går före allt annat)
Ordning: (1) HYRKITET 2+3 (startlistan nedan: virvel, upptakt, blixtnedslag, glimt, kickregn, glesna; rum i party/snap/mullra/rulle) - 4 lampor
bit-identiskt; (2) BRÖLLOPSLÄGET (avsnittet nedan, steg 1-5). Hoppa över steg 3 'en idé' och tajthetsavsnittet i dag - baslinjen räcker med
--snabb efter varje commit. Väntar på ägaren (rör inte): siren/twin-blinket i motorn, SECTION_DROP_HOLD.
KLART 2026-11-02 (dagkörningen): hyrkitet 2+3 + bröllopsläget 1-5 byggt, ej deployat - se KLART-raderna i de två avsnitten nedan.

## Från kvällen 2026-11-01 (sist) - BRÖLLOPSLÄGET: MIDDAG I PARETS FÄRGER + KNAPPAR FÖR KVÄLLENS STUNDER (ägaren: 'ja'; EFTER diodblinken och hyrkitet nedan)
Varför: ett bröllop är ~70 % middag/tal - i dag står showen och väntar på dansmusik. Det här gör kitet till en bröllopsprodukt.
Det ägaren sagt ja till: en PLAN + byggt bakom knapparna; standardläget (Fest) ska vara BIT-IDENTISKT med i dag (natt --snabb json-lika).
1. LÄGET 'stund' I MOTORN: nytt cfg.moment: 'fest' | 'middag' | 'tal' | 'forstadans' | 'tartan' (standard 'fest' = dagens show, orörd).
   - middag: stilla ljus i parets färger (cfg.themeColors, 1-3 av de SEX rena kulörerna - lamporna är RGB-kluster, blandade kulörer blir
     grumliga, se hsv-snappningen), varje lampa sin färg, långsam andning (~8-12 s) och nivån följer musikens volym MJUKT (ingen takt,
     inga drops, ingen rök, ingen strobe). Tak ~50 % av mastern.
   - tal: allt stilla och dämpat (~25 %), en färg, ingen musikkoppling alls (talarens röst får inte pumpa ljuset).
   - forstadans: varmt (röd+grön = gul/amber om det inte blir grumligt, annars parets första färg), mittlamporna (c.lamp) högre, kanterna
     svaga, långsam andning på frasen - INTE takt/drops. Rök: en liten puff vid start om röken är på.
   - tartan: en kort 'ta-da' (alla upp mjukt på ~1 s, håll 20 s, tillbaka till föregående stund).
   - Övergångar mellan stunder: mjuk korstoning 2-3 s (uppgång får vara snabbare, NEDGÅNG ALDRIG snabbare än dagens fall - låst regel).
   - Fest -> dirigenten som i dag; när man lämnar fest fryses inte dirigentens minne (manus/låtminne) - tillbaka till fest = som om inget hänt.
2. EN VÄG IN: ws {type:'setMoment', value} + POST /api/moment, samma kodväg för webbknapp och fysisk knapp (som vredet: applyIntensity).
   Aktiv stund syns i framen (activeMoment) så alla klienter visar samma.
3. GÄSTSIDAN (inte /setup): fyra stora knappar under reglaget: Middag / Tal / Första dansen / Fest (+ Tårtan som liten knapp). Aktiv knapp
   tänd. Inget annat ändras på gästsidan. /setup -> fliken Ljus: välj parets färger (sex färgrutor att trycka på, max 3) + visa samma knappar.
4. FYSISKA KNAPPAR (koden nu, hårdvaran köper ägaren): cfg.momentButtons: [{chip,line,moment,activeHigh?}] | null (standard null = inget
   startas). Återanvänd src/button.ts (gpiomon) - lägg till activeHigh (bias pull-down, stigande flank = tryck) för 433 MHz-mottagare
   (YK04-typ, D0-D3 är höga medan knappen hålls). Kort tryck = den stunden, tryck igen på aktiv stund = tillbaka till Fest.
   Kolla vilka GPIO som är lediga: Codec Zero äger I2S (18-21), I2C (2/3), SW1 27 och sina lysdioder; vredet (intensityKnob) och DMX-UART
   (14/15) - lista lediga i rapporten. LED i knapparna: INTE nu (väntar på ägarens hårdvaruval).
5. BEVIS: bänk som spelar korpusen med moment = middag/tal/forstadans och mäter att det INTE följer takten (kick->ljus-korrelation ~0),
   att nivån inte faller snabbare än i dag, ingen strobe, ingen lampa under tändpunkten; fest json-identisk. Skärmdump av gästsidan i mobilvy.
REGLER: inget deployas, en commit per steg, ingen opt-in-flagga (standard fest = dagens kod), rapportera i scoreboard + här.

BRÖLLOPSLÄGET: EJ PÅBÖRJAT 2026-11-02 (natten gick till diodblinken + hyrkitet 1/4).
KLART 2026-11-02 (dagkörningen, ej deployat): 1-5. src/moment.ts (MomentLayer blandas in i steg 1: fest*(1-w) + stund*w, följer inte
  släckgränsen/ingången; övergångar linjärt 2,5 s, tårtan upp 1 s; ingen strobe/blinder/hazer, rök bara manuell + dansens puff via
  fogTrigger-vägen), cfg.moment/themeColors/momentButtons (standard saknas = fest, parets färger magenta+röd), ws setMoment/setThemeColors,
  GET/POST /api/moment, frame.activeMoment, gästsidan 4 knappar + Tårtan, /setup Ljus: sex färgrutor (max 3), button.ts activeHigh.
  Bevis tools/momentBench.mjs (pop 60-210 s, render 5 ms): takt fest 0,17 / middag 0,01 / tal 0,00 / dans 0,02 / tårta 0,00; strobe 0,
  under tändpunkt 0; snabbaste fall fest 3400 DMX/s, stunderna <= 600, övergångar <= 1200; tal med tyst ingång lyser kvar 73/255 (29 %);
  middag median 128/255. kick-korrelationen är ~0 även för festen (måttet skiljer inte) - takt-måttet är beviset. Fest json-identisk:
  natt --snabb --tag brollop. Lokal server: knapparna, tryck på aktiv = fest, färgvalet [5,0,2] sparat - verifierat i mobilvy.
  LEDIGA GPIO för knapparna (BCM): 5, 6, 13, 26 (+ 12, 16, 17, 22-25 i reserv). Upptagna: 2/3 I2C, 14/15 DMX-UART, 18-21 I2S, 27 SW1,
  10 SPI0 (ringen, avstängd). Codec Zeros lysdioder: kolla kortets dokumentation före 22-25 (ej verifierat här). Exempel i config:
  momentButtons: [{chip:"gpiochip0",line:5,moment:"middag",activeHigh:true}, ...6 tal, 13 forstadans, 26 fest]. Tårtan via webben.
  ÖPPET FÖR ÄGAREN: nivåerna (middag 50 %, tal 25 %, dans 60 %), andningens längd, dansens gula (om grumligt: parets första färg),
  rökpuffens längd = fog.burstMs (2,5 s, inte 'liten').

## Från kvällen 2026-11-01 (sent) - HYRKITET: 8 LAMPOR I TVÅ STATIV (ägaren: 'förbered för det'; efter diodblinken nedan, före allt äldre)
Ägaren hyr ut kit för bröllop/studentfester utan ljustekniker. Standardkitet blir 2 stativ x 4 PAR (rgb7, samma som ladans), ett på var
sida om dansgolvet, adresser i ordning VÄNSTER stativ (lampa 1-4) -> HÖGER stativ (lampa 5-8) = en rad på 8 tvärs över rummet, 'mitten'
= lamporna närmast golvet (c.lamp 3-4). Effekterna är framtagna och trimmade på 4 lampor - inget är bänkat på 8.
1. BÄNKEN PÅ 8: ge tools/effectDyn.mjs och tools/dynBench.mjs en flagga --lampor N (bygg N rgb7-fixturer med adresser i följd, samma
   kalibrering som ladans 4; standard = som i dag så 4-lampssiffrorna är oförändrade). Kör session_mono + facit3 med 4 och 8.
2. GRANSKA ALLA EFFEKTER PÅ 8 (lampa-för-lampa-trace, mall scratchpad fx3/trace.mjs): hitta de som ser fel ut på 8 - hårdkodat 4
   (beatIdx % 4 som lampindex, 'ett lamppar' i lamptrappan SPARSAM/fxSparse som bara tänder 2 av 8, party-hålet en lampa av 8, slaggans
   vandring som tar två takter, mittparet i sidokedja/tryckvag = e >= (n-1)/4 -> 4 lampor), c.idx där c.lamp behövs, mönster som blir för
   glesa/täta. Mått på 8 mot 4: effectDyn sprid/rum/takt/niva + dynBench sidoBlink/fladder. Rätta så att 8 ser lika bra ut - KRAV:
   4-lampsriggen (ladan) ska vara bit-identisk (natt --snabb json-lika + effectDyn-siffrorna på 4 oförändrade).
3. SPEGLA ELLER RAD: pröva om speglade stativ (lampa 5-8 = 4-1, båda stativen gör samma sak) ser bättre ut än en rad på 8 för de
   rumsliga effekterna (chase/bounce/slagga/frasraknare). Rapportera med siffror och en rekommendation; bygg INTE en ny inställning utan
   ägarens ja (en ratt räknas som lager - ägaren vill ha simpelt).
4. STROBE-KONTROLL (ägarens video 11-01 18:48: ~2 s strobe på ~10 Hz, var 3:e videoruta svart, under ett lookbyte): enda effekten som ber
   om lampornas strobe-kanal är fyrverkeri (want.strobe 0,5 vid dropEnv > 0,9). Bekräfta orsaken i bänk/trace; LÅST REGEL strobe <= 3/s -
   om det är fyrverkeri: ta bort strobe-önskan (blinder får vara kvar). Rapportera om något annat kan ge snabb strobe på rgb7-kanal 7.
REGLER: inget deployas, ingen opt-in-flagga i motorkoden (verktygsflaggan --lampor i bänkarna är ok), en commit per effekt/steg.

KLART 2026-11-02 (delvis): 1 = --lampor N i effectDyn/dynBench (b6c0dd5, 4 lampor oförändrat); 4 = strobe BEKRÄFTAD fyrverkeri (want.strobe 0,5 -> DMX 127 så länge dropen hålls ~2 s) och BORTTAGEN d2ee3b4. 2/3 EJ gjorda - startlista ur effectDyn mega 4->8: virvel takt 0,30->0,19 rum 0,64->0,42, upptakt rum 0,62->0,33, glimt, blixtnedslag takt 0,27->0,15, kickregn, glesna; rum halveras i party/snap/mullra/rulle.

KLART 2026-11-02 (dagkörningen, ej deployat): 2 = src/effects/rig.ts slotSize(n): på 8+ lampor körs en-lampa-i-taget-effekterna över 4 platser
  om n/4 grannlampor (virvel, upptakt, glimt, kickregn, blixtnedslag, glesna, party-hålet, snap, mullra, rulle, slagga, ankomst, kaskad,
  uppvarmning, viska) + c.group inre/yttre = ytterplatserna (8: 0,1,6,7 mot 2-5; förr 2 mot 6). effectDyn mega 60-240 s, takt 4 -> 8 före ->
  efter: virvel 0,35 -> 0,23 -> 0,35, glimt 0,29 -> 0,17 -> 0,31, kickregn 0,36 -> 0,22 -> 0,36, blixtnedslag 0,31 -> 0,17 -> 0,30,
  glesna 0,22 -> 0,16 -> 0,22. 4 lampor bit-identiskt (effectDyn-utskriften lika, natt --snabb --tag hyrkit). 'rum' faller ändå på 8
  (virvel 0,65 -> 0,43): lampordningen utifrån-in/inifrån-ut gör platserna till SPEGLADE par (0+7, 1+6 ...) - tyngdpunkten står i mitten
  och måttet ser 0, ögat ser ett symmetriskt svep. 3 = SPEGLA ELLER RAD (scratch standDyn, mega på 8): 'ett stativ helt mörkt' median 1 %
  av tända rutor, men 5 effekter > 30 %: ankomst 61 % (93 före platserna), upptakt 44, virvel 41, bounce 40, glesna 40 - alla glesa
  build/intro/break-effekter. REKOMMENDATION: behåll RAD (inget nytt reglage): spegling ger samma 4-lampsbild i båda stativen men tar bort
  det enda som kitet har mer än ladan, svepet tvärs över golvet; ordningsväxlingen ger redan speglade svep halva tiden. Ögat avgör vid
  första uthyrningen - om ett mörkt stativ i builden stör: spegla bara de fem glesa effekterna (ej byggt).

## Från kvällen 2026-11-01 - DIODBLINK I DE ÄLDRE EFFEKTERNA (ägaren i ladan: 'lägg till nattagent att fixa de äldre, men i övrigt ser det fint ut nu'; går före allt annat)
LÄGET: LIVE sedan 18:30 = ff83da2 (tempo-helsok; 42ae94a snabbspolad hit från agent-work/warmup-gc + minidropen: bara tända lampor till
fullt i egen kulör, miniColEnv-looken borttagen - ägaren: 'blev riktigt snyggt', GODKÄND), ladan.conf DMX_WARMUP_GC=1 + DMX_STAIR_BREAK=1.
Nytt i dag (ägaren: 'ser fint ut nu'): flimmerfixen (rampen sänker taket, 600ac30), nytt mobil-UI med flikar, rökhungern (nästan-drop),
DROP_LIFT_FLOOR 0,7 + drop sätter liftAt/nearAt, drop-looker kräver beat >= 0,8, tre nya refrängeffekter slagga/sidokedja/tryckvag med
mjuk puls och UTAN vitt, lookbyte direkt när sektionen går high inom 2 s efter en analysator-drop som blev minidrop (ee8d19b).
Refrängfiltret beat >= 0,7 provades och BACKADES (911fcdd): ägaren vill ha refrängens lugna basslag-effekter (droppar/famn/svall) kvar och
inga hårda av/på-pulser - 'de får gärna köra men med mjuka stigningen och ner igen'.
1. DIODBLINKEN (huvuduppdraget): ägaren: 'R och G lyser men B bara blinkar till, vilket inte är snyggt'. dynBench session_mono
   (rgb.blinkLook, sidoBlink < 300 ms, 15 min, före vit-fixen): vidga 33, siren 19, twin 14, backbeat 10, pendel 7, slagga 7 (vitt - fixat
   42ae94a), eko 4, gallop 3, tryckvag 3 (fixat), duel 2, droppar 2. Hitta orsaken PER EFFEKT med en lampa-för-lampa-trace (mall:
   scratchpad fx3/trace.mjs i huvudsessionen, eller tools/dynBench.mjs DYN_HIST): kandidater (a) hsv() snäpper mättnad < 0,5 till VITT
   -> en kort vit topp tänder den släckta dioden; (b) tvåfärgad kulör (gul/cyan/magenta) nära tändpunkten - diodernas tändpunkter skiljer
   sig (cal.onR/onG/onB), så ena dioden växlar när ljuset pumpar svagt (output.ts calibrate: alla färgkanaler samma colK); (c) kulörbyte
   mitt i en puls. Rätta i EFFEKTEN (inte motorn/utgången) så karaktären består; mät blinkLook före/efter + effectDyn --sec high
   (takt/sprid/rum får inte falla, hopp/kulhopp inte stiga). Blir (b) en generell orsak: rapportera ett förslag för utgången, bygg inte.
2. MJUK PULS I DE ÄLDRE REFRÄNGEFFEKTERNA som ägaren upplever som av/på (party, snap, rave, gallop, backbeat - fråga inte, mät:
   'hopp' i effectDyn och antal 0<->full-språng per slag): samma mönster som slagga/sidokedja/tryckvag (soft(f, 0,12 slag smoothstep upp,
   exp ut)). Takten ska synas lika tydligt (takt-måttet), uppgången bara mjukare. Uttoningen (fade-down) rörs aldrig.
3. ÖPPET, BARA ANALYS: 'dropen efter minidroppen' - inspelningen corpus/ladan-1101/lang-20261101T165711.wav (start 17:57:11,9): full drop
   58,8 s (ägaren: 'minidrop'; efterkontrollen dömer den falsk 59,41 s men smällen har gått och SHOW_DROP_GAP_MS 12 s är förbrukad),
   riktiga dropen ~71 s (ägaren: 'drop') gav INGEN flank-kant och ingen analysator-drop. Förklara med siffror varför (fdC-taket efter
   58,8? FLANK_GONE_DB? break-längd?) och föreslå minsta ändring; bygg bara som opt-in-bänk, inget i koden.
REGLER: inget deployas, ingen opt-in-flagga i koden (ägaren: backup-tagg + ersätt), en commit per effekt, låsta regler som vanligt.
OBS: agent-work/refrain-fx (gren refrain-fx, 5 commits ovanpå 7344384) har förbättrade frasraknare/backbeat/vagbrytare/drops/gallop
(takt +0,02..+0,15) - EJ live, ej granskade av ägaren. Bygg inte ovanpå dem; nämn i rapporten om dina ändringar krockar.

KLART 2026-11-02 (delvis): 1 = vidga FIXAD d384205 (+0,08 blandkulör -> grannkulör; blinkLook 33 -> 0, sidoBlink 1,8 -> 1,3). twin/pendel/backbeat = kulörtoningens svans + pump (klippt svans 1/48 och 1/16 gav ~0 -> backat, motorn orörd); siren = kulören byts direkt på uttonande lampa (mörk övergång i effekten 16 -> 22, backad; förslag till motorn i rapporten, ej byggt); tryckvag 9 = drop-lookens vita kärna. 2 (mjuk puls äldre) EJ gjord. 3 analys KLAR: basen tillbaka ~66 s med 9-13 dB dipp (ingen break för flanken), vid 71 s ligger basen på taket -> flanken kan inte se den; fynd 11-02 till lotus (sektion break 67,3-71,3 med full bas).

## Från kvällen 2026-10-27 - GALLOP/TAKTGRIDET VIDARE + UPPVÄRMNINGEN (ägaren: 'nya test för natten'; går före allt annat)
Läget: inget nytt live sedan 10-26 18:06. Nattens prov 491f9c7 DMX_FEED_RISE=1 rättade gridet (gallop +134 -> -32 ms, taktKorpus 67,1 ->
83,2 %) men flyttade showen (sektion upp 2,6 -> 4,1 s, kvällen hör ihop 71 -> 62 %, mega r 0,15 -> 0,03). Lotus bygger det omättade
kickfältet (fynd 10-27 TAGET). Låsta regler som vanligt; uttoningen och delade analysatorn rörs inte. Inget deployas.
(20:04 ÄNDRAT: FEED_RISE ÄR NU STANDARD - ägaren godkände i ladan. Punkt 1 gäller fortfarande men vänt: rise-gridet är kod, så målet är
   att ta tillbaka sektionerna (upp 4,1 -> ~2,6 s, hör ihop 62 -> ~71 %) UTAN att flytta gridet från kicken. Bänkvarianten = analysatorn
   på en cfg-kopia med den GAMLA vikningen; opt-in-provet = cfg.beat (analysatorn) viks som före 10-27, effektklockan behåller rise-gridet.
   Gallop-fasen och taktKorpus 83 % får inte gå ner.)
1. ISOLERA KOPPLINGEN (hypotes: analysatorns kickgrind/sektion läser cfg.beat - --delad-cfg - så ett flyttat grid flyttar sektionerna).
   BEVISA/FÄLL FÖRST: kör FEED_RISE=1 med analysatorn på en egen cfg-kopia vars beat följer den GAMLA vikningen (bänkvariant, ingen
   motorändring). Kommer sektion upp 2,6 s / hör ihop 71 % / mega r 0,15 tillbaka medan gallop-fasen står kvar på ~-32 ms -> hypotesen håller.
   HÅLLER DEN: bygg opt-in DMX_FEED_RISE=2 i beatFeed.ts: två rutnät - cfg.beat (det analysatorn läser) viks som förr, effektklockan
   (beatFrac/beatIdx/beatPulse) får rise-rutnätet. Döm: gallop-fasen (fas.py-metoden nedan), taktKorpus (effektklockans tempo), natt --snabb:
   sektion upp <= 2,7 s, hör ihop >= 70 %, återseende >= 83, mega r >= 0,14, drops 60, av json-identiskt. Läs dirigentens rader på gallop-klippet.
   FALLER DEN: hitta vad som flyttar sektionerna (taktfasen/barShift? resetTempo-anropen? tilliten?) - ett steg i taget, siffror.
2. GRIDFASEN SOM NATTMÅTT: lägg in gridets fas mot basens ansats i natt.py + scoreboard (ny kolumn), så varje natt mäter om takten sitter
   på slaget. Nattens skrapskript (konsertReplay-kopia med DBG-rader + fas.py, se NATTEN 2026-10-27) gav R ~0 på hela filer - mät per 10 s-
   fönster med låst takt och bara starka subansatser (+6 dB, >= 0,6 slag isär), rapportera median fasfel och andel inom +-40 ms. Material:
   gallop-klippet (ladan-2026-10-26/video-...-x4-norm17.wav, ej i git), pop, megamix, lang1021. MÄTFÄLLA: lang-/mix-wav har nframes=0 i
   headern - läs rått från offset 44.
3. UPPVÄRMNINGEN (B från i natt, ej byggd): global.gc() direkt när warmUpInBackground är klar (--expose-gc finns på Pi:n) och släpp
   skrapinstanserna. Bänk med Node 24 (tools/liveLab.mjs/skrap): första 2 min major/minor GC, heap och loop-max före/efter; showen måste
   vara bit-identisk (natt --snabb json-lika). Kolla också om workerns isolat (långsamma sidan) behöver egen uppvärmning (worker-tidens
   p99 första minuten). Bit-identiskt -> 'redo för ladan' (python tools/ladan.py), mät /api/perf första 5 min vid nästa besök.
4. OM LOTUS HAR LEVERERAT det omättade kickfältet (läs analysator-fynd.md 10-27 + lotus morning-todo): prova att vika det i beatFeed i
   stället för den egna dB-stigningen (samma domar som punkt 1). Annars hoppa över.
RAPPORT: avsnitt 'Gallop och uppvärmning' i artifacten; redo för ladan bara om alla domar håller.

## Från kvällen 2026-10-26 - LATENS OCH OPTIMERING (ägaren: 'natten vill jag att agenterna skall jobba med latensen och optimering'; går före allt annat)
Ersätter 10-21:s 'INTE NU: mer latensjakt' för i natt. Läget: de fyra proven är STANDARD + ute sedan 18:06 (se LADAN 2026-10-26) -> kör
baslinjen först (ny nivå: kvällen hör ihop 71 / återseende 84). Showen (vilka looker, när) får INTE ändras av nattens arbete: allt som bara
gör saker snabbare/billigare ska vara bit-identiskt (natt --snabb json-lika + konsertReplay kvällen i ett svep lika). Det som ändrar
ljuset (uppgången) är opt-in med bevis. Låsta regler gäller: fade-down/uttoningen rörs aldrig, delade analysatorn ändras inte (fynd ->
analysator-fynd.md, lotus-morgonagenten har samma uppdrag i morgon bitti), strobe <= 3/s.
PRIORITET EFTER ÄGARENS VIDEOR (punkt 5 nedan, 5 klipp 18:25-18:43): kedjan ljud->ljus är MÄTT live till ~35-45 ms (video 5, drop i
slowmotion; handklappen rättad: ~10-30 ms till första rörelse) - jaga inte den vidare. Ordning i natt: (A) gallop-felet (punkt 5: stora
steget ~150 ms efter slaget), (B) UPPVÄRMNINGEN efter omstart (punkt 3, rättad nedan), (C) latensbudgeten (punkt 1) som tabell med videons
livevärde som facit, (D) uppgången (punkt 2) bara om tid finns.
RÄTTELSE 19:53 (perf-ladan-2026-10-26-kvall.json, 98 min drift): 'major ~1/min under musik' var de första minuterna efter deployens
omstart, inte stabilt läge. Stabilt läge (18:37-18:51, musik): major 0, minor 8-11/min (max 8,5 ms), render 0,19 ms snitt / max 6 ms,
loop p99 11,2 / max 20 ms, heap 21-24 MB; totalt sedan start 4 major (max 61 ms), forcedGc 0. Flaggorna på Pi:n: node24 --heap-growing-
percent=200 --expose-gc --max-old-space-size=96 --min/max-semi-space-size=4, DMX_GC_DARK=0.6, MemoryMax 340M, MALLOC_ARENA_MAX=2.
=> optimeringen gäller UPPVÄRMNINGEN (1:a minuten: minor 92, major 1-2/min i 5 min, loop max 1144 ms, render max 8 ms) - kan den
flyttas före musiken (warmup.wav körs redan vid start) eller göras billigare? Och de få render-topparna 2-6 ms i stabilt läge.
LIVE-BASLINJE ur ladan 10-26 17:06-17:12 med musik, nya koden (tools/natt/perf-ladan-2026-10-26.json, /api/perf, Node 24, Pi load 0,6, 34 °C):
  render 200 Hz snitt 0,18-0,26 ms, max 3,6-8,4 ms, over5 0-7/min; loop p99 10,3-12,7 ms (10 ms-intervall), max 21-81 ms;
  minor GC 6-28/min (max 4-8 ms); MAJOR GC ~1/min UNDER MUSIK (19-72 ms, 17:08 72 ms = loop max 81 ms); heap 18-30 MB; 1:a minuten
  (uppvärmning) minor 92, loop max 1144 ms. Mörkerstädningen (gc-dark, forcedGc) ska ta de stora i tystnad - här kom de mitt i musiken.
1. LATENSBUDGETEN ljud -> lampa, hela kedjan i ms (det mesta är omätt sedan 10-21: 'kedjan ljud->DMX ~30 ms kompenseras inte'):
   arecord/ALSA (period/buffer i audio.ts), analysatorns hop (128 @ 48 kHz) och fönster per fält (faltLatens.mjs), beatFeed, render-
   steget (200 Hz = upp till 5 ms väntan), DMX-sidovagnen/SPI (dmx.ts setMaxHz, sidovagnens 200 Hz-tak, ramlängd 24..512 slots),
   lampans egen ramp. Tabell: steg, ms medel/max, källa (mätt i bänk / räknat ur kod / gissat). Peka ut de 2 största som går att korta.
2. UPPGÅNGEN: ljusLag ger korskorr 5-10 ms men 90 % av toppen först 35-60 ms (pop 45, mega 60, 1021 35) - var sitter de 30-50 ms mellan
   första rörelse och 90 %? (effektens envelope/attack, FX_FLOOR, tändpunkt, gamma, minsta på-tid, energins uppgång, 25 ms-raster i bänken
   vs 5 ms live). Prova EN förkortning på uppgången som opt-in, döm med ljusLag (90 %) + natt --snabb (inget annat ner). Aldrig nedgången.
3. OPTIMERING (se RÄTTELSE ovan: stabilt läge är bra): uppvärmningens major GC/loop-toppar och render-toppar > 2 ms. Vad fyller gamla generationen (18-30 MB) i 1-minutstakt? Mät med
   tools/liveLab.mjs + tools/skrap (winAlloc, andra varvet = stabilt läge, mätfälla 50 och bänkklockan som överskattar). Kandidater att
   granska: dirigentens Map/arrayer (lookPlayMs, manusHist, recentLooks, LOG-rader), sektions-/palettspår, inspelningens ringbuffert,
   console-strängar som byggs fast quiet. Kolla också varför gc-dark inte tog dem (villkoren: tystnad >= 1,5 s, släckt ram, gamla >= 60 %).
   Varje fix: bit-identiskt bevisad, µs/ruta och kB/s före/efter (Node 24 i bänken). Uppvärmningens första minut (1144 ms loop) som egen rad.
4. Fynd i den delade analysatorn (FFT-kostnad, skräp i process(), fältlatens) -> analysator-fynd.md med siffror.
5. ÄGARENS VIDEO 10-26 18:25 (tools/ladan-2026-10-26/: PXL_20261026_182512747.mp4 10 s 30 fps, ljudet ur den som wav, x4 + norm -17 för
   bänken, skripten lag/ev/sub2/bench.py - inte i git), ägaren: 'vad tror du om latensen?'. Huvudsessionens mätning: musiken 127-128 BPM, look
   gallop. FÖRSTA ljusrörelsen ~50 ms efter kickens början i videon (inkl. kedja, telefonens A/V och ljudets väg ~10-15 ms) - bänken +5..14 ms.
   Men det STORA steget (alla 4 lampor/hela bilden +20-30 %) kommer +145..+190 ms efter kicken, slag efter slag (7,69/8,16/8,63/9,10 s).
   Bänken på samma ljud (konsertReplay --step 5 --delad-cfg --live-kick --trace, varv 3): grupp 2+4 upp +12 ms (0,29 -> 0,85), grupp 1+3 upp
   i ETT steg vid +130 ms (0,18 -> 0,74), nästa kick +479 ms. gallop.ts säger grupp B på 0,5 och 0,75 av slaget (+234/+352), inte +130 ->
   REDA UT: vad lyfter grupp B vid +130 (beatFrac-fasen? kickEnv/punch? minsta på-tid? rutnätets fas mot kicken; varv 4 glider +30 -> +163 ms)?
   Är det designat (galoppfigur) eller ett fasfel? Om fasfel: fix (opt-in) så att det STORA steget kommer på slaget. Det är det ögat ser som
   'latens' - kedjans egen latens är liten. Mät också med ljusLag/showTight om 90 %-måttet fångar detta.
   VIDEO 2 (18:33, PXL_20261026_183344151.mp4, ~135 BPM, look med paren L1+L3 / L2+L4 omlott; ana.py = generell mätning): paret på kicken
   tar sitt största steg i median +39 ms efter kicken (13 slag, -37..+72, ±17 ms bildruta), första rörelse +48 ms, andra paret en halv takt
   senare som tänkt. Samma metod på video 1: första rörelse +35 ms men stora steget +189..+222 ms -> kedjan är bra, GALLOP är avvikaren.
   (Bänken valde en annan look på video 2:s ljud - looken live går inte att återskapa ur 10 s.)
   VIDEO 3 + 4 (18:36 / 18:37) ÄR SLOWMOTION: com.android.capture.fps=120, spelas i 30 -> 4x långsammare, LJUDET OCKSÅ (kick ~64 Hz
   hamnar på ~16 Hz). Verklig tid: 3,2 / 3,4 s, ~126 BPM (bastoppar var ~488 ms), 8,3 ms per bildruta. Mät med slow.py (FAC 4) + rt2.py
   (basen 25-150 Hz i tidsdomän, 10 ms envelope; kickens start = där basen lämnar golvet +3 dB). Video 4, 7 slag: basen sväller ~145 ms
   från golv till topp (pumpande bas, inte kort kick); ljuset 10 % +66, 50 % +112, 90 % +160 ms efter basens start = 50 % ~30 ms FÖRE och
   90 % ~vid basens topp -> ljuset följer basens energi utan synlig fördröjning. Video 3 (5 slag): 10 % +55, 50 % +110, 90 % +126 ms
   (basens topp +148). Osäkert: slowmotion-ljudets synk mot bilden, och var örat hör slaget (trummans ansats) - en transientmätning
   (rt3) gav artefakter och är förkastad. Slutsats för uppdraget: kedjan är snabb; där ljuset KÄNNS sent är det för att ljuset följer
   basens kropp (sub+kick 20-120 Hz) som i pumpande musik toppar 100-150 ms efter ansatsen, och gallop (video 1) som har eget fel.
   Video 4 mörknar ~2,3-3,4 s verklig tid (hela 45 -> 15, L3/L1 släcks 1,2 / 1,8 s) trots samma bas - inte utrett.
   VIDEO 5 (18:43, PXL_20261026_184340254.mp4, slowmotion 4x, 3,3 s verklig) = BÄSTA LATENSMÄTNINGEN: break (basen borta 0,65-1,45 s) och
   drop. Ljudet lämnar golvet 1,464 s (brett band -46 -> -39 dB), basen halvvägs ~1,490, topp 1,536. Ljuset (8,3 ms rutor): oförändrat t.o.m.
   1,4933, +12 % vid 1,5016, ~75 % vid 1,5099, 100 % vid 1,535. => ljud -> första ljus ~+33 ms, ~75 % ~+46 ms, fullt ~+71 ms (= basens topp);
   + ljudets väg till telefonen (~3 ms/m) => ~35-45 ms ljud->ljus. Stämmer med bänken (~40 ms) + kedjan. Dropen är tajt. (Slowmotion-ljudets
   synk mot bilden overifierad.)
   VIDEO 6 (18:47, PXL_20261026_184737063.mp4) = HANDKLAPP i slowmotion, synktest: ljudets ansats 2,223 s (fil), händerna möts mellan ruta
   2,302 (sida vid sida, oskärpa) och 2,335 (pressade) -> LJUDSPÅRET LIGGER ~20-28 ms (verklig tid) FÖRE BILDEN i telefonens slowmotion
   (klapp-montage.jpg). Rättat video 5: ljud -> första ljus +29..+38 - ~24 = ~+5..+14 ms, ~75 % ~+22 ms, fullt ~+47 ms; plus ljudets väg
   högtalare -> telefon (~3 ms/m, avstånd okänt) => ljud -> ljus ungefär 10-30 ms till första rörelse, ~25-40 ms till 75 %. Samma rättelse
   (-~24 ms) gäller video 3/4. Kedjan är alltså SNABBARE än bänkens uppskattning 40 ms + 30 ms - latens är inte problemet; gallop är det.
(A) KLART 2026-10-27 (nattagenten): GALLOP = FASFEL I RUTNÄTET, inte i gallop.ts. onset.kick är 0/1 och står på 1 i spridda hop under
  hela bas-svallet (+0..+165 ms) -> beatFeeds vikning lägger slaget där ettorna är tätast: median +134 ms efter subbens ansats (p10 35 /
  p90 197). Grupp A (beatPulse) tänds då +130 ms, grupp B:s 0,75-puls hamnar på kicken = videons 'stora steget sent'. PROV 491f9c7
  DMX_FEED_RISE=1 (viker basens dB-stigning i stället): gridet -32 ms (showLead 47 före, rått +15), taktKorpus 67,1 -> 83,2 % (>= 60 %
  102 -> 133), ljusLag mega 90 % 65 -> 35, 1021 35 -> 25. MEN sektion upp 2,6 -> 4,1 s, kvällen hör ihop 71 -> 62 %, återseende 84 -> 79,
  mega r 0,15 -> 0,03 - EJ redo för ladan. Av json-identiskt. NÄSTA: isolera kopplingen (analysatorns kickgrind läser cfg.beat) - t.ex.
  prova rise-vikningen bara för effektklockan, eller vänta på lotus omättade kickfält (fynd 10-27 i analysator-fynd.md).
(B) DELVIS 2026-10-27: skrivbordsanalys, ingen Pi att mäta på. warmup.ts värmer bara huvudtrådens analysator (roll 'all') + skrapmotorn;
  workerns isolat (långsamma sidan) värms inte, och skrapinstanserna blir skräp när uppvärmningen är klar (~1-2 min) = trolig källa till
  1:a minutens major GC. Förslag (ej byggt): global.gc() direkt när warmUpInBackground är klar (--expose-gc finns) - mät live /api/perf.
(C) KLART 2026-10-27: budgettabell i artifacten (ALSA period 128 = 2,7 ms + buffer upp till 21 ms, hop/fält ~5 ms med FAST_BANDS, render
  0-5 ms, DMX-ram ~1-23 ms beroende på slots, live mätt 10-30 ms). Största att korta: ALSA-bufferten och DMX-ramlängden (räknat, ej mätt).
RAPPORT: eget avsnitt 'Latens och optimering' i artifacten: budgettabellen, nattens fix(ar) med före/efter, vad som är redo för ladan
(`python tools/ladan.py` för bit-identiska fixar, `--env` för uppgångsprovet) och vad som ska mätas live nästa besök (/api/perf).

## LADAN 2026-10-28 (ägaren i ladan, Pi 10.100.168.218 via hotspot, PC 10.100.168.53)
19:05 UTE: PROV DMX_FEED_RISE=2 i ladan.conf (7ea12f8: analysatorn eget rutnät med gamla vikningen, effektklockan rise) + lotus kickRise
  (analyser.js, nytt fält). md5 lika (beatFeed 7765ec48, index 591c4d4f, analyser b9aa0555), NRestarts 0, warmup klar 27,6 s. arecord
  pcm_read I/O error 5 s efter omstart (fällan 10-23), arecord startade om själv. Långinspelning 600 + 300 s startad (taket 600 s/fil).
  TITTA: refrängens look snabbare efter nivåhöjning? gallop kvar på slaget? Backa: `PI_HOST=10.100.168.218 python tools/ladan.py`.
19:25 Långinspelningen hämtad: tools/ladan-2026-10-28/lang-20261028T180531.wav (600 s) + T181533 (300 s), ej i git, 0 markeringar.
  sektionLag på dem utan/med provet: fladder 11/41 -> 6/38, upp 11,6 s båda (bara 3 skiften), gridfas +17 ms båda, MEN p25 -20 -> -115 ms med provet.
19:43 STANDARD (ägaren: 'känns inte sämre', sedan '1' = gör till standard) -> KOD, flaggan bort (backup-tagg backup/fore-feed-rise2-2026-10-28).
  Bevis natt --snabb utan env json-identisk med provet. Deployat utan env, ladan.conf borta, md5 lika (beatFeed cdc82149, index 69e9e6ef), NRestarts 0.
  NÄSTA FÖR NATTAGENTEN (KLART 2026-10-29, se NATTEN 10-29: 1+4 förklarade, 2+3 förkastade): (1) gridfasens p25 -115 ms med två rutnät på kvällens inspelning - vilka fönster, låser effektklockan en halv takt
  fel (huvudfeeden gör inte längre analysatorns resetTempo)? (2) 'hör ihop' 71 -> 61 sitter i effektklockan - hitta vad i rise-gridet som
  ändrar dirigentens val. (3) prova lotus frame.kickRise i stället för egna dB-stigningen. (4) minidrop 62 på 10 min i kvällens inspelning.

## LADAN 2026-10-27 (ägaren i ladan, Pi 10.100.168.218 via hotspot, PC 10.100.168.53)
19:56 UTE: PROV DMX_FEED_RISE=1 i ladan.conf (gallop-rättningen 491f9c7, bänken blandad: grid på kicken + taktklocka 67 -> 83 %, men
  sektion upp 2,6 -> 4,1 s, hör ihop 71 -> 62 %). beatFeed.js md5 lika (8bb7870a), flaggan i unit-env, NRestarts 0, warmup klar 31 s.
  TITTA: gallop på slaget? kommer refrängens look i tid? Backa: `PI_HOST=10.100.168.218 python tools/ladan.py`.
20:04 GODKÄNT (ägaren: 'Det ser bra ut, behåll FEED_RISE och gör det till standard') -> KOD, flaggan bort (9b92301, backup-tagg
  backup/fore-feed-rise-2026-10-27). Bevis: natt --snabb utan env json-identisk med provet (2026-10-27-feedrise-std.json == -feedrise.json).
  Deployat utan env, ladan.conf borta, beatFeed.js md5 lika (b57008bd), NRestarts 0. NY BASLINJE = feedrise-raden (sektion upp 4,1 s,
  kvällen hör ihop 62 % / återseende 79 %, mega r 0,03) - jämför i natt mot den, inte mot 10-27 00-raden.

## LADAN 2026-10-26 (ägaren i ladan, Pi 10.54.139.218 via hotspot Pixel_9285, PC 10.54.139.53)
17:57 UTE: PROV DMX_MANUS_TOP=2 DMX_SWITCH_ON=1 DMX_BREAK_CALM=1 DMX_TAGFIX=1 i ladan.conf (ägaren: 'alla fyra i en körning').
  Bara effects.js + effects/registry.js skilde; md5 lika med dist, NRestarts 0, alla fyra i unit-env. Väntar på ögat.
  TITTA: lookbyte på slaget, refrängen släkt med versen, lugnt break, pulse/stegring/sug i uppbyggnaden.
  Backa ett: kör om utan dess --env; alla: `PI_HOST=10.54.139.218 python tools/ladan.py`. Godkänt -> konstant i koden, flaggan bort.
18:06 GODKÄNT (ägaren: 'Standard') -> alla fyra KOD, flaggorna bort (d3248b5, backup-tagg backup/fore-fyra-prov-2026-10-26): MANUS_TOP 2,
  SWITCH_ON 1, break tar toggles bara ur sina egna, taggarna rättade i effektfilerna. Bevis: natt --snabb utan env json-identisk med
  provet (2026-10-26-fyra-std.json == -fyra.json). Deployat utan env, ladan.conf borta, md5 lika (9 filer), NRestarts 0.

## LADAN 2026-10-23 (ägaren i ladan, Pi 10.153.152.219 via hotspot)
15:58 UTE: flaggstädningen (DMX + delade analysatorn) + UI-städningen + PROV DMX_SECTION_EARLY_DB=1.5. md5 lika, NRestarts 0.
  Ett arecord-läsfel 5 s efter omstarten (pcm_read I/O error), ramar kom ändå; vid omdeployen 16:08 inget fel, arecord kör.
16:05 GODKÄNT (ägaren: 'nu börjar jag även kunna se de olika effekterna mer när ljuset har mer dynamik', 'ser bra ut') ->
  STANDARD i DMX-profilen SECTION_EARLY_DB '1.5' (backup-tagg backup/fore-early-db-2026-10-23). Profil = provet byte-identiskt
  (konsertReplay 3 lang + pop). 16:08 deployat utan env, ladan.conf borta, md5 lika, NRestarts 0.

## FLAGGSTÄDNINGEN 2026-10-22 (ägaren: 'allt som är standard ... inga massa flaggor, koden skall vara optimal') - KLART, inget deployat
DMX-sidan d1dae8a: 71 env-rattar = konstanter (ladans värden, DMX_GC_DARK 0,6), konsertläget + delflaggor enda vägen, avstängda prov bort.
Delade analysatorn (båda repona, dmx b1a3fb8+42905b4, lotus 3d992a2, md5 8c771759): lika i båda = kod, av i båda = bort, tempoTracker.ts
raderad. Bevis: konsertReplay 25 lang + mixar byte-identiska, natt.py identisk, lotus analyserParity 0/787 500 hop. Bortvalda prov: minnet
feedback-kodstadning-flaggor (föreslå inte igen utan nytt skäl). NY REGEL: rattar finns inte som env längre - ett live-prov = tillfällig
env-flagga i koden, godkänt -> konstant, underkänt -> bort. Nästa `ladan.py` tar med städningen (ljuset identiskt) + flyttar tempoTracker.js.

## Från kvällen 2026-10-21 - DIRIGENTENS FÖRSTÅELSE (ägaren: nattens uppdrag, går före allt annat, i denna ordning)
Ägaren i ladan 10-21: "inte latensen det största, utan hur snabbt dirigenten förstår typ av sektion/låt". Latensen är nu ~40 ms till första
rörelse (FAST_BANDS standard) - jaga den INTE vidare. Läget: LADAN 2026-10-21 KVÄLL nedan (fem prov blev standard 23:4x).
1. LÅTSTARTEN: efter låtgräns står sektionen 'intro' i 20 block (rangen kräver 20 s historik). Kvällens inspelning
   (tools/ladan-2026-10-21/lang-20261021T203952.wav, ej i git): ny låt ~140 s, 'high' först 151 s och sedan fladder. MÄT med
   tools/sektionLag.mjs + en ny del i den: tid från låtgräns (LATGRANS/boundaryCount) till första rätta sektion och första look som håller
   >= 8 s, på 24 lang + kvällens. PROVA i DMX-profilen först (SECTION_CARRY, SECTION_EARLY_S, ...); behövs ändring i delade analysatorn
   (t.ex. bär nivåskalan från förra låten / jämför mot kvällens block i stället för bara låtens 20) -> analysator-fynd.md (eller bygg opt-in
   med paritet i båda repona som 10-21 FAST_BANDS, om ägaren sagt till). Målet: rätt sektion inom ~5 s efter låtstart utan mer fladder.
2. NATTENS MÅTT: natt.py:s 'kick->ljus' mäter från frame.kick, som är brus (fynd 10-19). Lägg in tools/ljusLag.py (riggens ljus mot ljudets
   basanslag: korskorr + 90 % av toppen) och tools/sektionLag.mjs (etikett mot ljudets nivåskifte upp/ned + fladder) i natt.py och
   scoreboard.md, så varje natt mäter det ägaren bryr sig om. Ny baslinje-rad efter bytet.
3. RÖDA TRÅDENS TAPP: med FAST_BANDS sjönk 'hör ihop' 81 -> 77 % och återseende 67 -> 64 % (24 lang; SECTION_WIN 2 tog tillbaka en del:
   återseende 76 %). Hypotes: beatFeed viker nu det snabbare onset.kick -> rutnätet flyttas ~20 ms -> kickgrinden -> sektionerna skiljer 8 %.
   Bevisa/fälla hypotesen (t.ex. mata beatFeed med 2048-vägens onset i en bänkvariant) och föreslå en fix som behåller tajtheten.
4. KICKFLAGGAN (fynd 10-19, öppet hos lotus): frame.kick fyrar på kylningens kant (66-94 ms före slaget) och driver KICK-BYPASS-rendern,
   registerKick och tilliten. Följ upp med lotus via analysator-fynd.md; DMX-sidan får prova att ersätta KICK-BYPASS/registerKick med
   onset.kick-toppen (nu 5 ms efter ljudet) - opt-in med bevis.
1-2 KLART 2026-10-22: latStart.mjs + natt.py bank v3 (ljusLag/sektionLag); låtstartens fel = starka låtstarter (hiStart 38 %), inte intro -> prov EARLY_DB 1,5.
3 KLART 2026-10-22: --feed2048 == FAST_BANDS=0 (sektion/look 0 % olika) - mekanismen bekräftad, men med dagens standard ger FAST_BANDS återseende 73 -> 76, hör ihop 76 -> 79: inget tapp, ingen fix.
4 KLART 2026-10-22: mätfälla 52 (bänkarna utan registerKick/KICK-BYPASS, konsertReplay --live-kick, ±5 ms); onset.kick klampad 0/1 -> kick på toppen kräver analysatorn (fynd 10-22).
5. FACIT: be ägaren (i rapporten) om fler långinspelningar med 'Drop!'/'Minidrop!'-markeringar och gärna refrängstarter - det mesta i kväll
   vilar på bänkens egna mått.
INTE NU: mer latensjakt, snabb dropkropp (FAST_BANDS '2'-varianten gav drops 68 -> 57; kräver omkalibrering mot facit).

## Från kvällen 2026-10-20 - DEN TVÅDELADE ANALYSATORN (ägaren: nattens uppgift, går före allt annat)
Ägaren: "analysera den tvådelade analysatorn. Kan vi förbättra den och göra fördelningen bättre? Ena med mål snabbaste latens och andra
bästa analys." PRINCIPEN (ägaren): SNABBA DELEN = LJUSSTYRNINGEN (det ljuset reagerar på direkt: kick/onset, basenergi, nivå,
drop/minidrop-smällen, taktens puls) - minsta latens och jitter, inget annat. LÅNGSAMMA DELEN = INPUT TILL DIRIGENTEN (tempo, taktfas,
sektion, karaktär/profil, build/refräng, låtgräns) - bästa analys, får ta tid. Mät varje fält mot den regeln. KEDJAN HELA VÄGEN (ägaren):
snabb analys -> EFFEKTEN (render per ruta, ljusstyrning) och långsam analys -> DIRIGENTEN -> EFFEKTEN (vilken look, palett, tier, manus).
Kartlägg även gränsen dirigent -> effekt: dirigenten (stepDirigent/switchLook, stepPalette) körs i dag inne i render() varje ruta (200 Hz)
i motorns tråd fast den fattar beslut några gånger per minut - vad kostar den per ruta (µs, skräp), vad behöver den läsa varje ruta, och
kan den köras sällan/utanför den heta vägen (t.ex. på långsamma sidans takt) så att render bara gör effekt + energi + kalibrering?
Undantag som MÅSTE vara snabba: dropens/minidropens lookbyte och smäll (drop-steget). Förslag med µs per ruta före/efter och bevis
att showen är identisk (konsertReplay 24 lang, natt --snabb). Dirigenten och effects.ts är DMX:s egna - får provas (opt-in/bevis). DMX kör delningen live (analyserProfile.ts ANALYSER_SPLIT 'worker' sedan 09-24): snabba sidan i motorns tråd, långsamma
(tempo/gridfas/sektion) i slowWorker på egen kärna. GÖR:
1. KARTA: vad räknas var i dag (analyser.ts + split.ts + slowWorker.ts + beatFeed.ts), per hop: µs, vilka fält ljuset läser direkt från
   den snabba sidan (kick, onset, bodyDb, nivå, drop/mini) och vilka som kommer från den långsamma (med hur många hop/ms fördröjning).
   Mät med Node 24 (Pi:ns version) i bänken: process() p50/p99 per sida, recordens storlek/frekvens, kö/fördröjning snabb -> långsam -> tillbaka.
2. FELPLACERAT: det som ligger på snabba sidan men inte behövs inom ett hop (flytta ut = lägre latens/jitter), och det som ligger på
   långsamma sidan men borde vara snabbt (drop/onset-beslut som väntar), eller som fick sämre analys för att det tvingades vara billigt
   (kortare fönster, grövre upplösning, färre tempokandidater) - där den långsamma sidan har budget för mer. Även beatFeed.ts (DMX-sidan,
   viker onset.kick var 250 ms i motorns tråd) - hör den hemma på långsamma sidan?
3. FÖRSLAG med siffror: snabba sidans µs/hop och kedjan ljud -> DMX före/efter; analysens kvalitet (tempo/sektion/drop mot facit,
   konsertReplay 24 lang) före/efter. Bit-identiskt där bara platsen byts (splitProof).
REGLER: delade filerna (analyser.ts, split.ts, slowWorker.ts, tempoTracker.ts) ändrar du INTE - förslagen skrivs i analysator-fynd.md
(lotus-morgonagenten bygger dem i båda repona). DMX-sidan (beatFeed.ts, index.ts, analyserProfile.ts) får du prova, med bevis. Rapportera
i artifacten under egen rubrik. Inget deployas.
KLART 2026-10-21 (nattagenten): karta + förslag i tools/natt/delning-2026-10-21.md, fynd P1/P5 + kick-tillägg i analysator-fynd.md.
  Node 24 PC: snabba 13,6-15,8 ms/s (FFT:erna ~61 %), långsamma 2,5-2,8 (~40x marginal), dirigenten 0,15 ms/s (lämnas i render).
  Ljusets bandfält ur 2048-FFT:n 21-27 ms efter ljudet = största latensen (P1 till lotus). DMX_ONSET_LAG_MS=15 provad och förkastad.

## LADAN 2026-10-19 KVÄLL
19:21 LÖPANDE TAKT UTE (ladan.py utan env, md5 lika, NRestarts 0). Ägaren: 'takten sitter bra nu' -> GODKÄND, är redan kodens enda väg.
19:27 PROV LIVE (ladan.conf): DMX_SECTION_BODY_HIGH=2000 DMX_SECTION_BODY_HIGH_DB=2 (grundfixen, delade analysatorn de111d4) - väntar på ögat.
19:32 GODKÄND (ägaren: 'refrängen håller efter dropen') -> STANDARD i DMX-profilen (SECTION_BODY_HIGH 2000 / _DB 2, backup-tagg
   backup/fore-section-body-high-2026-10-19), env-provet = profilen byte-identiskt (2 lang), deployat utan env, ladan.conf tom, md5 lika.

## LADAN 2026-10-21 KVÄLL
23:4x STANDARD (ägaren: 'kör standard'; backup-tagg backup/fore-kvallens-prov-2026-10-21): DROP_SEC_HIGH (enda vägen), MINI_ENERGY (enda
vägen, golv DMX_MINI_E_MIN_MS 250), SECTION_UNIT_MIN_MS 4000 -> 2000, DMX-profilen FAST_BANDS '1' + SECTION_WIN '2'. Bevis: env-provet ==
ny standard byte-identiskt (natt --snabb + kvällens inspelning). Deployat utan env, ladan.conf borta, md5 lika, NRestarts 0.
22:37 UTE (Pi 10.38.24.218 via hotspot Pixel_9285): lotus-fixen 19bebf7 + FAST_BANDS-koden (analyser.js, effects.js, md5 lika) och
PROV i ladan.conf: DMX_DROP_SEC_HIGH=1 DMX_FAST_BANDS=1. NRestarts 0, båda flaggorna i processens env. Första körningen avbröts av
'Unable to open channel' i warmup-steget (Pi:n uppe 2 min) efter filkopian - omkörning gick igenom. Väntar på ägarens öga.
Backa ett prov: `python tools/ladan.py --env <det andra>`; båda: `python tools/ladan.py`.
22:39 LIVEINSPELNING 5 min (tools/ladan-2026-10-21/lang-20261021T203952, ej i git): perf render 0,20 ms, minor 8-12/min max 4-6 ms.
  Tajthet på kvällens ljud (ljusLag): 90 % av toppen 105 -> 40 ms med FAST_BANDS, korskorr 90 -> 10 ms.
ÄGAREN: 'inte latensen det största, utan hur snabbt dirigenten förstår typ av sektion/låt'. Live: ny look 4-6 s efter sektionsbytet
  (SECTION_UNIT_MIN_MS 4000), sektionsetiketten själv 3-8 s efter ljudet. 22:5x PROV DMX_SECTION_UNIT_MIN_MS=2000 (replay: 4,0 -> 2,0 s,
  korta looker 3 -> 2, minidrops lika). + ÄGAREN: minidrop efter energin -> opt-in DMX_MINI_ENERGY=1 (look+stöt 0,60 -> 0,31 s,
  tillbaka 3,9 -> 0,9 s). ladan.conf nu: DROP_SEC_HIGH, FAST_BANDS, SECTION_UNIT_MIN_MS=2000, MINI_ENERGY. Väntar på ögat.
  SEKTIONSETIKETTEN MÄTT (tools/sektionLag.mjs, 25 inspelningar 150 min, ljudets nivåskifte >= 5 dB -> etikett): WIN 4 (i dag) upp 0,7 s /
  ned 2,9 s (p75 5,2), korta delar 165/513, 3,12 byten/min; SECTION_WIN=2: upp 0,3 / ned 1,3 s (p75 4,2), korta 143/467, 2,83/min (snabbare
  OCH mindre fladder). RUN 3 snabbare ned men fladder 233/649 - nej. 23:1x PROV DMX_SECTION_WIN=2 i ladan.conf (5 prov nu).
  Showen 24 lang (konsertReplay, kvällens 4 prov -> + WIN 2): byten 2,87 -> 2,62/min, återseende 73 -> 76 %, hör ihop 77 -> 78 %, kort look
  16 -> 15 %, dropens look kvar +10 s 68 -> 76 %, drops 68 -> 66. (Före kvällens prov: byten 2,79, återseende 67, hör ihop 81.)

## NÄSTA LADAN-BESÖK (ägaren 10-19: vänta till dess)
ÄGAREN 10-26: ALLA FYRA PROV I EN KÖRNING (Pi:n nåddes inte 10-26, PC på hemmanätet): `PI_HOST=<ip> python tools/ladan.py --env DMX_MANUS_TOP=2
  --env DMX_SWITCH_ON=1 --env DMX_BREAK_CALM=1 --env DMX_TAGFIX=1`. Bänk ihop (natt/2026-10-26-fyra.json): kvällen hör ihop 56 -> 71 %, återseende
  73 -> 84, unika 61 lika, effektivt 25,8 -> 21,9, byten 2,57 -> 2,66, drops 60 lika; pop r 0,32 -> 0,31, mega r 0,17 -> 0,15, mega 90 % 60 -> 65 ms.
+ PROV (natt 10-26): `--env DMX_BREAK_CALM=1` (lugnt break, se NATTEN 2026-10-26) och `--env DMX_TAGFIX=1` (10-25) kan läggas i samma körning.
PROV (natt 10-24 + 10-25, ett paket): `PI_HOST=<ip> python tools/ladan.py --env DMX_MANUS_TOP=2 --env DMX_SWITCH_ON=1` - refrängen släkt med
  versen (hör ihop 56 -> 71 % hela kvällen) + lookbytet på slaget (2 -> 72 %). Backa ett: kör om med bara det andra; båda: utan --env.
KLART 2026-10-23 (STANDARD + UTE, se LADAN 2026-10-23): `PI_HOST=<ip> python tools/ladan.py --env DMX_SECTION_EARLY_DB=1.5` - bara
  DMX-profilens ratt (ingen ändring i delade analysatorn, dist = main 5fd4a8e). Tidiga-refrängspärren (första 45 s efter låtgräns kräver
  high +3 dB över låtens median, men medianen räknas på förra låtens bärda block) sänkt till 1,5 dB. 25 lang (latStart.mjs): high i
  låtens första 20 s 38 -> 49 %, fel 28 -> 25 %, etikett upp p75 4,1 -> 3,0 s, fladder 143 -> 141, hör ihop 79 -> 77 %, drops 66 -> 67;
  mixarna lika. TITTA: kommer refrängens look direkt när en låt startar stark (kvällens 10-21: låten 144 s, high först 151 s)?
  Backa: `python tools/ladan.py` (utan --env). Godkänt -> SECTION_EARLY_DB '1.5' i analyserProfile.ts (standard).
FÖRBERETT 2026-10-21 (ägaren: 'förbered båda') - lotus-fixen 19bebf7 + DMX_DROP_SEC_HIGH=1 i EN körning:
  Lokalt kontrollerat: tsc bygger, node --check 0 fel på dist, deployspärren (analyser_shared.check) ok, flaggan finns i dist/effects.js,
  24 lang (konsertReplay --step 5 --delad-cfg) ladan nu 68/85 % -> båda 70/85 %, dropens look kvar +10 s 67 -> 71 %, drops 67 -> 68.
  1. PC på hotspot Pixel_9285, hitta Pi:n (senast 10.38.24.218).
  2. `PI_HOST=<ip> python tools/ladan.py --dry --env DMX_DROP_SEC_HIGH=1 --env DMX_FAST_BANDS=1` - väntat: analyser.js (+ effects.js,
     beatFeed/split om de skiljer) och ladan.conf med DMX_DROP_SEC_HIGH=1 och DMX_FAST_BANDS=1; inget annat.
  3. `PI_HOST=<ip> python tools/ladan.py --env DMX_DROP_SEC_HIGH=1 --env DMX_FAST_BANDS=1` - en omstart; kolla md5 lika och NRestarts 0.
     (Ägaren 10-21: snabba banden MED i paketet.)
  TITTA: ligger looken kvar genom refrängen när dropen kommer direkt ur en uppbyggnad? Godkänt -> flaggan blir kodens enda väg.
  Backa flaggan: `python tools/ladan.py` (utan --env, ladan.conf skrivs om tom). Lotus-fixen backas bara med gammal dist (a2999d9).
  + SNABBA BANDEN (10-21 kväll, opt-in i delade analysatorn): `--env DMX_FAST_BANDS=1` i samma körning. Ljusets bandfält (spec, onset,
  trumenveloper) 5 ms efter ljudet i stället för 21-27; drops identiska; riggens ljus 15 ms tidigare (korskorr, 19/24 filer). Pris i bänken:
  röd tråd återseende 70 -> 67 %, hör ihop 85 -> 75 % (med DMX_DROP_SEC_HIGH). TITTA: känns ljuset tajtare på trummor/bas? Tappar
  looken sammanhanget mellan vers och refräng? Backa: utan --env DMX_FAST_BANDS=1.
3. PROV (natt 10-20, 171720b): `python tools/ladan.py --env DMX_DROP_SEC_HIGH=1` - en drop som kommer i samma ruta som build-
   inträdet sparades i build-manuset (dropens basstarka look blev låtens build-look) och refrängen bytte bort droplooken 5-10 s efter
   smällen (10 av 67 drops). Med provet blir dropens look refrängens manus-look och ligger kvar. 24 lang: återseende 68 -> 71 %, hör ihop
   85 -> 89 %, drops/minidrops lika. TITTA: ligger looken kvar genom refrängen efter en drop som kommer direkt ur en uppbyggnad?
   Godkänt -> enda vägen (ta bort flaggan, ingen opt-in kvar). (Punkt 1 nedan är UTE sedan 10-19 19:32.)
4. LOTUS-FIXEN 19bebf7 (10-20 morgon, delade analysatorn, ingen flagga - följer med vilken `ladan.py` som helst): SECTION_BODY_HIGH även
   i intro efter låtgräns. Kontroll 10-20 (24 lang): ensam återseende 68 -> 67 %, hör ihop 85 -> 81 %, drops 67 -> 68, minis 383 -> 388;
   ihop med DMX_DROP_SEC_HIGH=1: 70 % / 85 %, dvs provet ger samma +3/+4 ovanpå. TITTA på båda samtidigt.
   OMKÖRT 10-21 (24 lang, konsertReplay --step 5 --delad-cfg, ladan nu = före 19bebf7): ladan nu 68 % / 85 %, + flaggan 71 / 89,
   + lotus-fixen 67 / 81, båda 70 / 85. Dropens look kvar +10 s: 67 -> 72 % med flaggan (lotus-fixen 0). Sektion high efter drop
   +2/+4/+8 s 90/79/79 % i alla fyra. Lotus-fixen = +1 drop, +5 minidrops, annars brus/svagt minus för DMX; flaggan = liten vinst.
1. GRUNDFIXEN (ägaren 10-19, ersätter nattens DMX_DROP_NO_BUILD_S som togs bort): `python tools/ladan.py --env DMX_SECTION_BODY_HIGH=2000
   --env DMX_SECTION_BODY_HIGH_DB=2` (delade analysatorn de111d4). Bänk 24 lang (konsertReplay --delad-cfg --step 5, av -> på): high +2 s
   efter drop 12 -> 33, +8 s 22 -> 36, build 0,5-8 s efter drop 21 -> 14, korta looker 20 -> 16 %, lookbyten 404 -> 413, drops 66 -> 69,
   sektionsbyten 2,64 -> 3,08/min. Nå Pi:n: PC på telefonens hotspot Pixel_9285, Pi:n hamnade där på
   10.38.24.218 senast (port 22-skanning av hotspotnätet hittar den) -> `PI_HOST=<ip> python tools/ladan.py ...`.
0. LÖPANDE TAKT (10-19, i koden, d51f8da; backup-tagg backup/fore-lopande-takt-2026-10-19): rutnätet på kickbandets anslag i stället
   för kick-PLL + tempospärr. Bänk: rutnätets fel mot ljudet 132 -> 28 ms (24 lang), pop 144 -> 6, megamix 198 -> 9. Följer med
   `python tools/ladan.py`. TITTA: sitter gallop/chase/siren/rulle på slagen nu? Backa: deploya taggen.
2. /api/perf efter en kväll: `major` nära 0, `forcedGc` efter pauser (Node 24 + heap-flaggan, ute sedan 10-18).

## TAGGRÄTTNINGEN 2026-10-25 (ägaren: 'rätta taggarna ... som prov med bevis i bänken', inget deployat)
ROTORSAK (kvällen i ett svep, 217 lookval med dirigentlogg): de 16 aldrig valda var blockerade av taggar, inte av passform. Build-trion
  (pulse/stegring/sug) taggad build men saknas i BUILD_LOOKS (36/36 build-val filtrerade bort dem); sju i rutor som nästan aldrig inträffar
  (svall/famn/droppar lugn x refräng 4/66, startskott/blixtnedslag/mellanslag full x intro 7/42 - alla via toggle-tvånget, pump full x vers
  2/49); andrum föll på 90-spärren 21/24; tide även needsBass 0,30 (ladans median 0,23); airglow needsBright 0,40 (19 ggr); 58 % av valen
  toggle-tvång.
PROV REDO: DMX_TAGFIX=1 - build-trion in i BUILD_LOOKS, de sju ett tier-steg till 'fart' (registry.TIER_FIX), andrum/tide ur CALM_ONLY.
  Kvällen i ett svep: av = byte-identisk med kv-baslinjen; på: pulse 6, stegring 4, sug 3 (alla i build), pump 2 (vers), startskott/
  blixtnedslag/mellanslag 1 var (intro); unika 61 -> 67, effektivt 25,8 -> 26,2, återseende 73 -> 74, hör ihop 56 lika, byten 2,57 -> 2,56,
  drops 60 lika; mixarna json-lika i allt (natt/2026-10-25-tagfix.json). Fortfarande 0: svall/famn/droppar, andrum, tide, airglow, breathe,
  dyning, urladdning - toggle-tvånget (refräng och break) och krav, inte taggar. `python tools/ladan.py --env DMX_TAGFIX=1`.
  TITTA: build-trion under uppbyggnaden, startskott/pump när de dyker upp. Godkänt -> taggarna rättas i effektfilerna, flaggan bort.

## FÖRMIDDAGEN 2026-10-30 - TEMPOT (ägaren: 'försöka förbättra takt mm så vi kan få rutnätet att ha rätt tempo'; inget deployat)
KLART: ny bänk tools/tempoMix.mjs (korpusklippen skarvade till kontinuerlig mix med katalogfacit, --all 161 klipp/99 min) + steg i natt.py
  (raden 'tempo'). Baslinje: effektklockan rätt 75,8 % (klipp för klipp 81,7 %), lås efter låtbyte median 5,1 s, aldrig rätt 9/161 -
  andra sökcentrum var analysatorns bpm (frame.bpm 74 % rätt i mixen), som står kvar på förra låten / harmoniskt syskon.
PROV REDO (gren tempo-helsok, main orörd): beatFeed.ts HELA TEMPOOMRÅDET - basens stigning vikt över alla tempon 80-160 (1 %, ett varv/0,6 s,
  ett tempo var 3:e hop), domare bland 3/2-, 2/3-, 4/3-, 3/4-syskon på bas x virvel/diskant, aldrig oktavbyte, hysteres 1,5. tempoMix:
  75,8 -> 84,5 %, lås 5,1 -> 2,8 s, inom 5 s 78 -> 127/161, aldrig 9 -> 2, hopp 0,90 -> 0,57/min; taktKorpus 81,7 -> 91,3 %, byten 1,29 -> 1,20.
  natt (2026-10-30-helsok4.json): sektion/gridfas/korpus identiska, hör ihop 61 -> 63, återseende 83 -> 85, ljusLag 1021 40 -> 35,
    drops mixar 56 -> 57; MEN effektivt 25,6 -> 22,8, r mega 0,17 -> 0,15, kick->ljus pop 96 -> 101 / mega 67 -> 91 (looken: mega backbeat -> gallop 118 s).
  Kostnad beatFeed 12 -> 17 µs/hop (PC). Prova: `git checkout tempo-helsok` + `python tools/ladan.py`; backa: main + ladan.py.
  TITTA: takteffekterna på slaget direkt efter låtbyte i mix, inga halv/hel-fart-hopp i 150-160-låtar, refrängens look.
FÖRKASTAT: samma tempo till analysatorns rutnät (agrid 60,8 -> 67,1 % men sektion upp 2,6 -> 4,1 s), HMM-utjämning, bekräftelse två varv,
  0,5 %-steg, hysteres 1,0 (gridfas 10-21 95 -> 27 %) och 1,25. Fynd till lotus: helsökningen slår frame.bpm (analysator-fynd 10-30).

## KVÄLLEN 2026-11-03 (huvudsessionen, ej deployat - läggs in nästa gång ägaren är i ladan)
KLART: duel tillbaka på trumdetektorns envelopes (ligger på ljudet) med stigning 50 ms och eko-fall tau 0,4 s: ljusLag 10-21 90 % 130 -> 40 ms
  (som före 428e5d9), hopp pop/mega 0,032/0,025 -> 0,028/0,024, blink 0,31/0,43 -> 0,11/0,28. Rör inte duel i natt.
UTREDT, INGET BYGGT: diodblinket frasraknare 8/pendel 6 (session_mono 15 min). Inte kulörtoningens svans (0,002 -> 0,02: identiskt);
  skarpt byte vid svagt ljus (v < 0,35) gav frasraknare 8 -> 4, pendel 6 -> 6 - för lite för ett motoringrepp. Pendels blink sitter vid dropen
  (vit kärna: alla tre dioder -> 255) = ägarens öppna beslut om drop-lookens vita kärna. Lägg ingen natt på detta.
KLART: dropen håller high är STANDARD i den delade analysatorn (ägaren 11-03 'sätt som standard direkt'), flaggan SECTION_DROP_HOLD
  borttagen i båda repona (97dc4d0 / lotus 5c7ac6ce, backup/fore-drop-hold-20261103). LIVE i ladan 11-03 19:45 med duel (172a4b2). Kombinerad bänk:
  megamix t90 -5 -> 35, kick->ljus 152 -> 184, hör ihop 88 -> 84 - ägaren i ladan: 'låt ligga kvar'. Backa INTE drop-hold; vill du vinna tillbaka
  megamix: titta på vilka refrängeffekter som nu spelas längre efter dropen och deras ansats. Ny baslinje i natt innehåller den - jämför sektionsmåtten med det i minnet.

## Från eftermiddagen 2026-11-05 - DAGKÖRNING 2 (ägaren borta 2 h: 'kör på'; går före allt annat, var klar inom ~1,5 h)
Baslinje = 6e448a3 (high-varv + omtaggning kickregn->intro+high, kaskad->high+low+break, standard). Kör först en baslinje-rad (--tag bas).
Förkastat i dag (rör inte): bounce/ripple/split -> versen/fart (pop lampspr 76 -> 64, patch prov/omtagg-gles-trio-20261105.patch); VARV_STEG; tryckvags kanter.
Rör inte drop-hold, duel, high-varv, BUILD_TOPP (väntar på ägarens öga). En ändring i taget mot samma baslinje. Deploya inte.
Fortsätt varför-tabellen i dynamik.md (aldrig valda), en omtaggning per prov:
1. svall, famn, tyngdlyft (fart-tier men bara high; high med full tier har bara full-poolen och de är inte toggles): pröva tier full.
2. bounce, ripple, split: annan plats än versen - pröva break (breaket är lugnt, LAMPTRAPPAN I BREAKET gör glesa looker rätt där) ELLER
   ta bort dem ur SPARSAM i refrängen bara när basen inte är hård. Välj det enklaste, ett prov.
3. gravity (krav + full-tier i low): om tid finns.
Döm: hör ihop, återseende, unika/effektivt, byten/min, korta < 8 s, ljusLag 90 % (alla tre), pop/mega lampspr och dropsprång FÅR INTE FALLA.
Håller det: in i koden som standard, backup-tagg backup/fore-<namn>-20261105. Annars backa + patch + siffror i dynamik.md.
KLART 2026-11-05 (nattagenten, inget deployat): 1 HÅLLER = STANDARD 655cba0 (svall/famn/tyngdlyft tier full; kvällen unika 69->70, effektivt 28,4->28,6,
  allt annat json-likt, korpus identisk; kvällen svall 170 s/famn 31/tyngdlyft 9, förr 0; tagg backup/fore-tierfull-20261105). 2 FÖRKASTAT (trio även break: unika 70->65,
  effektivt 28,6->27,5, pop lampspr 77->76; patch prov/omtagg-trio-break-20261105.patch). 3 utan effekt (gravity fart, + krav 0,10: json-identiskt - spärren sitter i passform/pick;
  patch prov/gravity-fart-krav-20261105.patch). Siffror i dynamik.md.

## Från morgonen 2026-11-05 - DAGKÖRNING (ägaren borta 6 h: 'kör det direkt'; går före allt annat)
Baslinje = natt/2026-11-05.json (high-varv standard e03a2f4). Tryckvags kanter är STÄNGDA (tre nätter, se NATTEN 2026-11-05) - rör dem inte.
Rör inte drop-hold, duel eller high-varv. En ändring i taget mot samma baslinje. Deploya inte (high-varv väntar på ladan när ägaren är där).
1. 35 EFFEKTER ALDRIG VALDA I MIXARNA (bl.a. duel, ripple, pendel, eko-familjen): ta fram VARFÖR per effekt (pool/tier/section-krav,
   fitScore, rotation av, toggle-krav, MANUS_TOP/MIX_TOP_FRAC-fönstret, pickLook). Skriv en tabell i dynamik.md: effekt, orsak, åtgärd
   (släpp in / gallra / låt vara). Pröva högst EN regeländring som släpper in de bästa (döm: hör ihop, återseende, byten/min, korta < 8 s,
   ljusLag 90 %, dropsprång och lampspr får inte falla). Gallra inget ur koden - lista förslagen för ägaren.
2. ÅTERSEENDET 65 % efter high-varv: kan det höjas utan att tryckvagen kommer tillbaka (mega lookTime tryckvag ska stanna nära 21 %)?
   T.ex. att high nr 4+ växlar mellan två looks ur manusHist i stället för en ny. Döm som ovan + mega tryckvag.
Bevisar något sig: in i koden som standard, backup-tagg backup/fore-<namn>-20261105. Annars backa + patch + siffror.
KLART 2026-11-05 kväll (nattagenten, inget deployat): 1 = tabellen överst i tools/natt/dynamik.md (instrumenterad dirigent, filtersteg per beslut).
  Mixarna har bara 34 fria lookval på 80 effekter (41 av 75 beslut = återseende) -> '58 aldrig valda' är mest för få val. Kvällen (238 fria val): 12 aldrig valda.
  Spärrarna: build MANUS_TOP 2 (pulse/stegring/sug/gryning), toggle-tvånget i refrängen (snap/fyrverkeri/drumkit), tier (svall/famn/tyngdlyft/kickregn/kaskad),
  SPARSAM i refrängen (bounce/ripple/split - taggade bara high = i praktiken döda), krav (gravity/tide). Inget gallrat - förslagen i tabellen.
  PROV HÅLLER som opt-in DMX_BUILD_TOPP=1 (5a8e6d5, av json-identiskt): kvällen unika 68->72, effektivt 27,7->28,9, korta 16->15 %, resten lika; builds 12->16 olika,
  men lugna build-looks 3->15 av 39 (siren/hiss/rulle 17->4) - ägarens öga: blir uppbyggnaden för lugn? `python tools/ladan.py --env DMX_BUILD_TOPP=1`.
  2 = FÖRKASTAT DMX_VARV_STEG=2 (byt vart 2:a varv från nr 4): återseende 65->67, men mega tryckvag 21->28 %, lampspr 88->85, r 0,17->0,13 (patch prov/varvsteg-20261105.patch).

## Från ladan 2026-11-06 em - TAKTEN EFTER DROPEN (ägaren i ladan: 'efter drop så tog det kanske 2-3 sekunder innan den tydligt visade takten igen'; går före allt annat)
LIVE i ladan sedan 11-06 15:11: 9914aab + ögonprov DMX_KICKREGN_PAR=1 och DMX_BUILD_TOPP=1 (ägarens dom väntar - rör dem inte).
Bevis: tools/natt/ladan-20261106-drops.jsonl (ws-frames 15 min, ~20 Hz, loggare tools/wslog.mjs; fält t, lv, e, k=kick, b=beat, bpm, bc=bpmConfidence,
  dc=dropCount, m=look, pb=profile.beat). 6 drops. Tydligaste: dc 2->3 vid 184,7 s - analysatorn tappade tempot i breaket (bpm 0 från 174,3 s, 14,6 s)
  och låste först 4,2 s EFTER dropen (bpm 143, bc 1,0). Dc 6->7 (792 s): bpm 154 -> 146 -> 144 och bc 0,64 vid dropen, full tillit först ~4 s efter.
  Dessutom: DROP_LIFT_FLOOR 0,7 håller energin >= 70 % i ~8 s efter dropen -> bastrycket pulsar bara 0,7..1 (svagare takt även när tempot finns).
1. TEMPOT GENOM BREAKET (delade analysatorn, båda repona, analyser_shared.py): när takten tystnar i ett break, behåll senaste låsta tempo + fas i stället
   för bpm 0, och när dropen kommer: ta upp det gamla rastret direkt; dropträffen är nästan alltid en etta -> förankra fasen på dropen.
   Bänka mot korpus + syntet + mixarna (tempo/fas får inte bli sämre vid låtbyten - ghost-wait/guard finns, se pi-dmx-tempo-transitions).
   Mått: tid från drop till låst takt (bc >= 0,8) i mixarna + ladan-loggen (offline-replay om möjligt), mål < 1 s.
2. LYFTETS GOLV: pröva DROP_LIFT_FLOOR 0,7 -> 0,5 (och 0,6). Döm dropsprång, lampspr, ljusLag 90 %, kick->ljus de första 8 s efter dropen.
   OBS ägaren 11-01 ville INTE ha monotont efter dropen och 10-17 inte att energin dör - golvet får inte bort lyftet.
Håller det: in i koden som standard (backup-tagg backup/fore-<namn>-20261106; analysatorn i båda repona + manifest). Deploya inte.

KLART 2026-11-07 (nattagenten, inget deployat): 1 tempot genom breaket = FÖRKASTAT i DMX:s effektklocka (DMX_BREAK_HOLD_MS=20000, patch prov/breakhold-20261107.patch):
  mega lås (tillit >= 0,8 efter drop, tools/dropTakt.mjs) median 1,73 -> 0,67 s, > 1 s 12 -> 10 av 24, klockan borta före drop 2 -> 0, tempoMix 84,5 -> 86,9 %, grid40 62 -> 67 %,
  MEN mega dropsprång hög 0,50 -> 0,46, kvällen unika 70 -> 66. Bara dropens upptag: lås 4,0 s (sämre). Analysatorns del -> analysator-fynd.md (ÖPPET 2026-11-07).
  2 golvet = opt-in DMX_DROP_LIFT_FLOOR (737a126, standard 0,7 json-identiskt): 0,5 -> puls p90-p10 0,8-8 s efter drop pop 0,36 -> 0,40, mega 0,60 -> 0,61, medelljus -0,01,
  lampspr pop 76,8 -> 76,3, dropsprång lika/upp, dirigent lika. REDO: python tools/ladan.py --env DMX_DROP_LIFT_FLOOR=0.5 (ögat: pulsar det efter dropen utan att lyftet dör?).

## NATTEN 2026-11-07 (nattagenten, inget deployat; commits på tempo-helsok, pushad)
Baslinje 4f81d7b (full) json-identisk med 11-06. Brister: (1) megamix: 12 av 24 drops når tillit >= 0,8 först efter > 1 s (median 1,73 s; 178,9/310/392 s aldrig inom 15 s) -
  det är tilliten, inte klockan (borta bara före 2 drops); (2) korpus r 0,35 (kickregn-paret väntar på ögat); (3) ljusLag 90 % lang1021 40 ms mot 15.
  Tajthet oförändrad: kick->ljus pop/mega/korpus 123/187/136 ms, ljusLag 90 % 15/15/40. Uppdragen ovan KLART.
  NÄSTA (förslag): tillitens uppgång efter drop (0,12 per kick = ~12 kickar till 0,8) utan att hålla rutnätet i breaket - det var hållet som kostade dropsprånget.

## NATTEN 2026-11-06 (nattagenten, inget deployat; commits på tempo-helsok, pushad)
KLART: inga nya kvällsuppdrag. Baslinje a6df6a8 (full) json-identisk med 11-05 tierfull-full. Brister: (1) korpus r 0,38 -> 0,35 sitter i 5 klipp där
  kickregn (en lampa av fyra) tar refrängen efter tryckvag/drops: energiR15 139 0,60 -> -0,18, 176 0,83 -> 0,09, 112 0,62 -> -0,04 (refrängen mörkare än versen);
  (2) 58 effekter aldrig valda i mixarna (34 fria val, känt); (3) ljusLag 90 % lang1021 40 ms mot 15 i mixarna.
  PROV HÅLLER som opt-in DMX_KICKREGN_PAR=1 (3bb1b2b, av json-identiskt): i 'high' tänder kicken lampan + den mittemot. Korpus r 0,345 -> 0,374, energiR15 0,325 -> 0,330,
  de fem klippen +0,55/+0,45/+0,27/+0,11/+0,04 (178 -0,07), korpus lampspr 89,95 -> 89,70; mixarna/kvällen/ljusLag identiska (kickregn väljs inte där).
  Tajthet oförändrad 123/187/136 ms, ljusLag 90 % 15/15/40. Analysatorfynd: inga nya.
  REDO FÖR LADAN: python tools/ladan.py --env DMX_KICKREGN_PAR=1 (ögat: ser regnet fortfarande ut som regn med två lampor i refrängen?).

## NATTEN 2026-11-05 sent (nattagenten, inget deployat; commits på tempo-helsok, pushad)
KLART: dagkörning 2 (se KLART ovan). Baslinje 606fef8 (full): mixarna = omtagg-kk; KORPUS r 0,38 -> 0,35 (energiR15 0,335 -> 0,325, nivaR15 0,457 -> 0,453) sedan 457c75c
  = kickregn/kaskad-omtaggningen 6e448a3 (dagkörningen mätte bara --snabb, korpusen syns inte där). Mest i uppvärmningen; rätt mått faller 0,01 - ägarens öga, inte backat.
  655cba0 (tierfull) full: korpus identisk med 606fef8. Tajthet oförändrad: kick->ljus pop/mega/korpus 123/187/136, ljusLag 90 % 15/15/40. Analysatorfynd: inga nya.
  REDO FÖR LADAN: python tools/ladan.py (kod: high-varv, omtaggningarna kickregn/kaskad + svall/famn/tyngdlyft) eller --env DMX_BUILD_TOPP=1.
  NÄSTA (förslag): gravity och trion bounce/ripple/split kommer inte in med taggar - gallring är ägarens val; korpus-r efter 6e448a3 värd en titt (vilka klipp).

## NATTEN 2026-11-05 kväll (nattagenten, inget deployat; commits på tempo-helsok, pushad)
KLART: dagkörningens två uppdrag (se KLART ovan). Baslinje 457c75c json-identisk med 01ca9c5. Tajthet oförändrad: kick->ljus pop/mega/korpus 123/187/136 ms,
  ljusLag 90 % 15/15/40. Analysatorfynd: inga nya. NÄSTA (förslag): ägaren tittar på BUILD_TOPP i ladan; taggfrågan för bounce/ripple/split (bara high + SPARSAM) och
  kickregn/kaskad (fel tier för sin enda sektion) - omtaggning eller gallring är ägarens val.

## NATTEN 2026-11-05 (nattagenten, inget deployat; commits på tempo-helsok, pushad)
KLART 2026-11-05: inga nya kvällsuppdrag. Baslinje natt/2026-11-05.json (01ca9c5) json-lik med 11-04-highvarv (ingen ny kod): kick->ljus pop/mega
  123/187, r 0,29/0,17, ljusLag 90 % 15/15/40, lampspr 76/88, dropsprång hög pop/mega 0,26/0,50, återseende 65 %, hör ihop 81 %.
  PROV FÖRKASTAT (DMX_TRYCK_ANSATS, koden backad, patch tools/natt/prov/tryckansats-20261105.patch, av json-identiskt): tryckvags kanter med
  trumkickens ANSATS (stigning 50 ms) men klockans utklingning (tau 0,3 slag, räknad i slag):
    mått                av      1 (bara trum)  2 (max m. klockan)
    mega kick->ljus / r 187/0,17  149/0,18     173/0,19
    ljusLag 90 % p/m/1021  15/15/40  30/15/35    15/15/35
    dropsprång hög pop/mega  0,26/0,50  0,21/0,50  0,24/0,49
    lampspr pop/mega    76/88   79/87          76/84
  SLUTSATS efter tre nätter (TRYCK_DRUM 1/2, ANSATS 1/2): varje sätt att flytta kanternas topp mot trumslaget sänker pops dropsprång (kanterna lyser
  på fel slag/mer före dropen) - kick->ljus-vinsten i megamix kostar alltid drop-kontrast. Lägg INTE fler nätter på tryckvags kanter utan ägarens ord.
  NÄSTA (förslag): 35 effekter aldrig valda i mixarna (bl.a. duel, ripple, pendel, eko-familjen) - gallring/varför-analys; återseendet 65 % efter high-varv.

## KVÄLLEN/NATTEN 2026-11-04 sent (nattagenten, inget deployat; commits på tempo-helsok, pushad)
KLART: baslinje 21e88dd json-identisk med looktak-av. High-varv 4+ standard e03a2f4 (se KLART under eftermiddagens uppdrag). REDO FÖR LADAN:
  python tools/ladan.py (kodändring, ingen env). NÄSTA: tryckvags kanter (trumenvelop som ansats, klockans utklingning) mot NY baslinje e03a2f4.

## NATTEN 2026-11-04 (nattagenten, inget deployat; commits på tempo-helsok, pushad)
KLART 2026-11-04: inga nya kvällsuppdrag (11-03-kvällens 'rör inte duel', 'ingen natt på diodblink' följda). Baslinje natt/2026-11-04.json (e63993a = live
  duel+drop-hold): json-lik med 11-03-duel-drophold. Mot 11-03-baslinjen: mega kick->ljus 152 -> 184, r 0,16 -> 0,12, ljusLag mega 90 % -5 -> 35,
  10-21 130 -> 40 (duel), hör ihop 88 -> 84, återseende 82 -> 78, korta 27 -> 23 - allt drop-hold + duel, ingen ny kod.
  Megamix lookar: motor 128 s -> sidokedja 121 s (drop-holds basstarka drop-look), tryckvag 218 s (0-300 s nästan bara tryckvag i high).
  DIAGNOS mega t90 35: INTE lyftet som håller i refrängen (rad 1569 av som diagnos: t90 35 kvar). Medelljusets topp ligger 115 ms efter
  basanslaget = tryckvags kanter på effektklockans soft(0,12 slag).
  PROV FÖRKASTADE (koden backad, av-läget json-identiskt sido-av):
  (1) DMX_SIDO_DRUM=1 sidokedjans ytterpar på trumdetektorns kick (duels stigning 50 ms/tau 0,4): mega kick->ljus 184 -> 163, r 0,117 -> 0,107,
      ljusLag hela megamix 600 s oförändrat (90 % 35 -> 35, lyft 0,44 -> 0,45) - showTight:s frame.kick-mått flyttar sig, ljudmåttet inte.
  (2) DMX_TRYCK_DRUM=1 tryckvags kanter på trumenvelopen: mega kick->ljus 184 -> 144, r 0,115 -> 0,141, medeltopp 115 -> 35 ms, MEN ljusLag pop
      90 % 15 -> 30 ms, dropsprång pop hög 0,26 -> 0,22, lyft mega 0,45 -> 0,40.
  (3) DMX_TRYCK_DRUM=2 max(klockans soft, trumenvelopen): mega r 0,115 -> 0,134, medeltopp 115 -> 50 ms, lyft 0,45 -> 0,47, ljusLag lika (1021 40 -> 35),
      MEN dropsprång pop hög 0,26 -> 0,23 / mega lugn 0,37 -> 0,36, lampspr mega 83 -> 74, träff mega 0,42 -> 0,39. Kanterna lyser mer mellan
      slagen -> mindre kontrast mot mitten och mindre drop-språng.
  NÄSTA: tryckvags kanter - trumenvelopen som ANSATS men samma utklingning/golv som klockans soft (0,15 + 0,85*soft, tau 0,3 slag), så kanterna
  inte lyser mer mellan slagen; döm på ljusLag-medeltoppen + dropsprång + lampspr. Diodblink/duel: rör inte (ägaren 11-03).

## NATTEN 2026-11-03 (nattagenten, inget deployat; commits på tempo-helsok, pushad)
KLART 2026-11-03: inga nya kvällsuppdrag (11-01/11-02 alla KLART, live 11-02 18:42). Baslinje natt/2026-11-03.json (2fe89b7 = live): mixar/kvällen
  json-lika med 11-02-effektsvep (MINI_LIFT 4 -> 2 s syns inte i mixarna). Mot 11-02-baslinjen (4ee495b): kick->ljus pop 136 -> 123 / mega 147 -> 152,
  hör ihop 80 -> 88, ljusLag 90 % pop 15 / mega -5 / 10-21 40 -> 130 ms (effektsvepet 428e5d9: duel på effektklockan med soft i stället för trumenveloper).
  OBS mätfälla: ljusLag korskorr på 10-21 är platt (0,82-1,00 över -50..200 ms) - 10 <-> 120 ms är brus, döm på t90 + medelkurvan.
  Diodblink session_mono (dynBench): sidoBlink 1,3 -> 0,6/lampa/min; kvar frasraknare 8, pendel 6, twin 6, eko 4 (siren/tryckvag 0).
  PROV FÖRKASTAT DMX_SOFT_LEAD=0.12 (soft-effekterna läser klockan 0,12 slag före så toppen landar på slaget): kick->ljus pop 123 -> 120, mega 152 lika,
  r +0,01, MEN ljusLag 90 % pop 15 -> 30 / mega -5 -> 35 ms. Toppen styrs av energilagret (basen ~0,1 slag efter klockan), inte effektens fas. Koden backad.
  NÄSTA: diodblinket i frasraknare (ny soft 28fb258) och pendel; ljusLag 10-21 t90 130 ms - pröva duel med trumenvelopen som ansats + soft-utklingning.

## NATTEN 2026-11-02 (nattagenten, inget deployat; commits på tempo-helsok, pushad)
Baslinje natt/2026-11-02.json (4ee495b = gårdagens kod): hör ihop 66 -> 80, återseende 86 -> 82, kick->ljus pop 104 -> 136 / mega 107 -> 147
  (sidokedja/tryckvag med mjuk stigning tog duel/rave:s platser; tryckvag 216 s av mega 600), ljusLag 90 % pop 45 -> 15, r mega 0,20 -> 0,16.
  Snabbkörningen med d384205 + d2ee3b4 json-identisk (vidga/fyrverkeri väljs inte i mixarna). REDO FÖR LADAN: python tools/ladan.py (kodändringar).
  NÄSTA: hyrkitet 2/3 (startlistan ovan), mjuk puls i äldre refrängeffekter, bröllopsläget; siren/twin-blinket kräver motorbeslut (ägaren).

## NATTEN 2026-11-01 (nattagenten, inget deployat; checkouten står på tempo-helsok = det som kör i ladan, commits där, ej pushad gren)
KLART 2026-11-01: inga nya kvällsuppdrag. Baslinje natt/2026-11-01.json (2405334): mot 10-30 hör ihop 61 -> 66, återseende 83 -> 86, effektivt
  25,6 -> 23,6, r mega 0,17 -> 0,20, kick->ljus mega 67 -> 107 (lookvalet: gallop 112 s), ljusLag 1021 40 -> 35 - helsökningen + drop-fixarna 10-30.
  NÄSTA 10-30 (gridfas 71 %) KLART: mätfel - provet hade ~235 ansatser mot ~513 (konfidensgrinden 0,35 släppte färre fönster). natt.py visar nu n.
  10-27 punkt 3 KLART som opt-in 5d0c558 DMX_WARMUP_GC=1 (en full GC när uppvärmningen är klar; PC 12 ms, 34,0 -> 16,6 MB) - mät live /api/perf min 1-5.
  PROV REDO d12b12e DMX_STAIR_BREAK=1 (lamptrappan även i sektion break): break mega 2,25 -> 1,58 lampor, alla fyra 63 -> 25 %; dropsprång efter
    lugnt mega 0,366 -> 0,392; drops/kvällen lika; r mega 0,20 -> 0,19. Av json-identiskt. `python tools/ladan.py --env DMX_STAIR_BREAK=1`.
  Kvar för ladan: FLANK_SILENT_LV (2405334) ej deployad - går före; ett i taget.

## NATTEN 2026-10-30 (nattagenten, inget deployat)
KLART 2026-10-30: inga nya kvällsuppdrag. Baslinje natt/2026-10-30.json json-identisk med 10-29 i alla delar.
  BRIST: effektklockans tillit mäts mot frame.kickAtMs, som grindas på ANALYSATORNS rutnät - mot effektklockan slump (kvällssvepet: på slaget
    50,5 %, fasfelet jämnt; lang-180531 R 0,02-0,15 mot effektklockan, 1,00 mot analysatorns 128 BPM i en låt på 90). Fynd 10-30 till lotus.
  FÖRKASTAT: DMX_TRUST_RISE=1 (tilliten på basens ansatser +6 dB / 0,6 slag): hör ihop 61 -> 61, r pop 0,31 -> 0,19, mega 0,17 -> 0,14,
    kick->ljus pop 96 -> 117, drops mixar 56 -> 52; MEN gridfas 62 -> 71 % inom 40, ljusLag pop 90 % 45 -> 15. Av json-identiskt, koden återställd.
  NÄSTA: isolera vad i provet som gav gridfas 71 % (coastens nollning läser onBeatRate -> clockDetBpm/gridCoasting) - eget prov utan att röra tilliten.
  Uppvärmningens gc (10-27 punkt 3) fortfarande ej gjord: PC:n Node 22.

## NATTEN 2026-10-29 (nattagenten, inget deployat)
KLART 2026-10-29: baslinje natt/2026-10-29.json = 10-28 feedrise2-std i mixar/ljusLag/sektionLag/kvällen (korpus+ladan1008 nya: korpus 125 ms/0,41/r 0,32).
  LADAN 10-28 NÄSTA (1) KLART: gridfas p25 -115 = EN låt (89,7 BPM) i 180531: analysatorns skuggrutnät (onset.kick-vikningen) hittar ingen topp och
    fryser på 127,5 BPM; effektklockans fas hoppar ett halvt slag. Analysatorns rutnät på icke-harmoniskt tempo: pop 13 / mega 32 / kväll 34-45 % av
    tiden; tilliten kvällen 0,82 (ett rutnät) -> 0,73. Ett rutnät: samma fönster +12..+29 ms. Skript: scratch gridWin.mjs/gm.mjs (sektionLag-kopia, --one).
  (2) FÖRKASTAT: tre prov där analysatorns rutnät följer vid fel tempo (tempo+fas / bara tempo / frame.bpm): hör ihop 61 -> 68/71/67, MEN sektion upp
    2,6 -> 7,4/4,6/4,6 s, drops 60 -> 57/55/59, effektivt 25,6 -> 23,8/22,1/20,7 - sektionerna är inställda på det felaktiga rutnätet. Fynd 10-29 till lotus.
  (3) FÖRKASTAT: beatFeed läser frame.kickRise - inte bit-identiskt (beatFeeds ring pausar vid bpm 0): gridfas 62 -> 66 %, hör ihop 61 -> 59.
  (4) KLART: minidrop 62/10 min = analysatorns miniDropCount, oläst av DMX sedan 10-11 (MINI_SPACING_MS 1 -> en per slag i low/eko). Ingen ljuseffekt.

## NATTEN 2026-10-28 (nattagenten, körd på kvällen, inget deployat)
KLART 2026-10-28: baslinje natt/2026-10-28.json json-identisk med 10-27 feedrise-std. Kvällens uppdrag 10-27:
  1 KLART: kopplingen bevisad (analysatorns kickgrind/taktfas läser cfg.beat). PROV 7ea12f8 DMX_FEED_RISE=2 (skugg-BeatFeed med gamla
    vikningen till analysatorn via BeatFeed.analyserCfg + setBeatGrid, effektklockan behåller rise): sektion upp 4,1 -> 2,6 s, korta 27/80,
    återseende 79 -> 83, mega r 0,03 -> 0,17, drops 58 -> 60, gridfas +23 -> +22 ms; MEN hör ihop 62 -> 61 (tappet 71 -> 62 sitter i
    effektklockan, inte analysatorn), ljusLag 1021 90 % 25 -> 40 ms. Av json-identiskt, liveLab röktest ok. `python tools/ladan.py --env DMX_FEED_RISE=2`.
  2 KLART: gridfas i sektionLag + natt.py (bank v5, sista kolumnen): median ms slaget efter basens ansats / andel inom +-40 ms.
  3 EJ GJORT: PC:n har Node 22 (inte 24) - uppvärmningens gc kräver mätning live (/api/perf) eller Node 24.
  4 Lotus levererade frame.kickRise (493b5ce) under kvällen - ej provat i beatFeed än (nästa).

## NATTEN 2026-10-27 (nattagenten, inget deployat)
KLART 2026-10-27: baslinje natt/2026-10-27.json json-identisk med 10-26 fyra-std (c62d20d). Kvällens uppdrag A/B/C ovan.
PROV (EJ REDO) 491f9c7 DMX_FEED_RISE=1 - se (A) ovan. Fynd till lotus: onset.kick-klampningen flyttar gridet +130 ms (analysator-fynd.md 10-27).

## NATTEN 2026-10-26 (nattagenten, inget deployat)
KLART 2026-10-26: baslinje natt/2026-10-26.json json-identisk med 10-25 (5a12e80). Inga nya kvällsuppdrag, inga nya inspelningar.
PROV REDO (b8c6553): DMX_BREAK_CALM=1 - i break tas toggle-tvånget bara ur breakets egna effekter (förr ur hela TOGGLE_POOL:
  'manus break: last takt (15 toggles) -> varannan/bounce/motor'). Kvällen i ett svep: break 9,6 min toggle 62 -> 36 %, breakets egna
  väljs (glesna, morkerslag, dyning, skuggor, urladdning, fyr), återseende 73 -> 76, unika 61 -> 65, effektivt 25,8 -> 26,6, hör ihop 56,
  byten 2,57 och drops 60 lika; mixar r -0,01 (pop 0,32 -> 0,31, mega 0,17 -> 0,16); av json-identiskt. `python tools/ladan.py --env DMX_BREAK_CALM=1`
  (kan tas i samma körning som MANUS_TOP/SWITCH_ON/TAGFIX). TITTA: blir breaket lugnt och glest i stället för stegande lampor?
ÖPPET: eko-överstyrningen efter valet (bassline >= 0,6) ger eko 22 % av break och 19 % av vers - ägarens val 10-11, rörs inte utan ägaren.
  Mega lampAntalR 0,14 (pop 0,27). Skript: scratch secLooks.mjs/breakSeg.mjs (look per sektion ur konsertReplay-json) - kopiera till tools/ om de behövs igen.

## NATTEN 2026-10-25 (nattagenten, inget deployat)
KLART 2026-10-25: 'kvällen i ett svep i natt.py' (NÄSTA 10-24) - bank v4 (cf804de): 10-11-kvällen skarvad (kvall-svep.wav, ej i git) genom
  konsertReplay som live + rodTrad i varje körning, även --snabb (~6 min). Baslinje json-identisk med 10-24; kvällen hör ihop 56 / återseende 73 %.
PROV REDO (490be1e): DMX_SWITCH_ON=1 - sektionens lookbyte på slaget. konsertReplay --slag: i dag 1-2 % av sektionsbytena på en tick
  (p50 261 ms efter slaget; phraseOk-reserven nästan alltid sann, secBarOk-fönstret missade ticken -> 2 takter extra). Med =1: kvällen på
  slaget 72 %, återseende 73 -> 84, hör ihop 56 -> 61, sektion->look >4 s 61 -> 43; 25 lang 1 -> 72 %, återseende 76 -> 78, drops lika;
  mixarna r -0,01. Ihop med MANUS_TOP=2: hör ihop 71 %, återseende 85 %, unika 61 -> 55. =4 (ettan) förkastat (återseende 58-78).
  `python tools/ladan.py --env DMX_SWITCH_ON=1 --env DMX_MANUS_TOP=2`. TITTA: byter looken på slaget/smällen i stället för mitt i takten?
NÄSTA: gallringen av 16 aldrig valda (ägarens öga); ettan-varianten kräver att sektionsstarten följer barShift (analysator) - inte nu.

## NATTEN 2026-10-24 (nattagenten, inget deployat)
KLART 2026-10-24: baslinje natt/2026-10-24.json = 10-23 + SECTION_EARLY_DB 1,5 (identisk med provet edb15 10-22): sektion upp 4,1 -> 2,6 s, ljus 1021 40 -> 35 ms.
MÄTFÄLLA 53: bänken kör varje lang-fil med NY motor -> kvällens minne (lookPlayMs i pickLook, seenLooks, recentLooks, prevSongLook) nollas
  per fil -> bäst passform (duel) vinner i varje fils början. 10-23-bristen 'duel 33 % av refrängen' = BÄNKARTEFAKT: 10-11-kvällens 23 lang
  skarvade till EN wav (141 min, scratch-skript: rå PCM efter 44-bytes huvud, mono 48k) -> duel 15 %, topp3 43 %, effektivt 11,8 (fil för fil 7,7).
  Men live-bristen syns bara där: hör ihop 56 % (fil för fil 83 %) - pickLook tar minst spelade bland topp 80 %, rel väger noll.
PROV REDO (ce9269e): `python tools/ladan.py --env DMX_MANUS_TOP=2` - med manus väljs bara bland de 2 bäst rankade. Kvällen i ett svep:
  hör ihop 56 -> 63 %, återseende 73 -> 76, refrängen effektivt 11,8 -> 11,1, unika 61 -> 56, drops 60 lika; 25 lang fil för fil och mixarna
  oförändrade; av = 25/25 byte-identiska. TITTA: refrängens look släkt med versens även sent på kvällen? Godkänt -> konstant, flaggan bort.
FÖRKASTAT 2026-10-24: kvällsminne-straff i rankingen (DMX_KVALL_REF) - 0 effekt, rankingen väljer inte när alla ryms i topplistan.
NÄSTA: [KLART 2026-10-25: bank v4] lägg kvällen i ett svep i natt.py (röda tråden mäts där); 16/77 effekter aldrig valda på hela kvällen (breathe pulse airglow tide
  stegring andrum sug svall famn startskott droppar dyning blixtnedslag mellanslag pump urladdning) - ägarens öga om gallring.

## NATTEN 2026-10-23 (nattagenten, inget deployat)
KLART 2026-10-23: baslinje natt/2026-10-23.json json-identisk med 10-22 (UI-städningen c1aa111 ljusneutral). Inga nya kvällsuppdrag.
BRIST: refrängen likadan i varje låt - 25 lang: duel 33 % av refrängtiden, duel+gallop+backbeat 66 %; kvällen 35/77 effekter, effektivt 17.
  Rotorsak: manusTog = takt || bas och löpande takten ger tillit ~1,00 -> nästan varje låt toggle-låt; i high lämnar SPARSAM + tempokrav
  rave/gallop/duel/backbeat (17/20 refrängval hade 2-3 kandidater).
FÖRKASTAT 2026-10-23: (a) toggle-låt bara vid basgång (+takt-förtur): unika 35 -> 42, hör ihop 81 -> 72; (b) utan förtur: hör ihop 64;
  (c) ny helrigg-toggle 'kors' (DMX_KORS, patch tools/natt/kors-2026-10-23.patch): duel i refrängen 33 -> 17 men kors 27 %, mega r 0,17 -> 0,13,
  lampspr 80 -> 71 / 53 -> 45, hör ihop 81 -> 79. Toggle-tvånget är det som håller ihop vers/refräng.
NÄSTA SPÅR: fler helrigg-toggles för high som inte vinner passformen var för sig, eller kvällsminne (straff efter speltid i kvällen) i
  toggle-grenen. Mät med scratch-mönstret: konsertReplay 25 lang --step 5 --delad-cfg --live-kick + rodTrad + refrängens lookandel.

## NATTEN 2026-10-21 (nattagenten, inget deployat)
KLART 2026-10-21: baslinje natt/2026-10-21.json (50e487f) json-identisk med 10-20 i mixarna (pop 99/0,48 r 0,33; mega 37/0,38 r 0,13;
  korpus 117/0,42 r 0,30). Nytt ärligt tajthetsmått tools/ljusLag.py (riggens ljus mot ljudets basanslag): 24 lang medelljusets 90 %
  50 ms efter anslaget (median), korskorr 25 ms.
FÖRKASTAT 2026-10-21: DMX_ONSET_LAG_MS=15 (rutnätet på ljudet: -16 -> -0,5 ms, men riggens ljus oförändrat över 24 lang). Reverterat.
ÖPPET: analysatorfynd P1 (bandfälten ur snabb väg, -15..-20 ms) och kickflaggan (10-19) - lotus.

## NATTEN 2026-10-20 (nattagenten, inget deployat)
KLART 2026-10-20: baslinje natt/2026-10-20.json (a2999d9): pop kick->ljus 99 ms/träff 0,48 r 0,33; mega 37 ms/0,38 r 0,13; korpus 117/0,42
  r 0,30. Mot 10-19: kick->ljus är nu per lampa till topp (showTight a23d4c3, mätfälla 51) + löpande takt + SECTION_BODY_HIGH.
KLART 2026-10-20: 24 lang baslinje (rodTrad): byten 2,77/min, återseende 68 %, kort look 17 %, hör ihop 85 %, drops 67, unika 31/77.
KLART 2026-10-20: opt-in DMX_DROP_SEC_HIGH=1 (171720b), se NÄSTA LADAN-BESÖK punkt 3. Av = 24/24 byte-identiska.
ÖPPET: återseende-missarna (37/116): 24 = sektionsbytet kommer ~4 s in (SECTION_UNIT_MIN_MS 4000, median 4,1 s, p90 7,5) så förra
  sektionens look dominerar korta delar - rörs inte (ägaren backade =0 10-17). 22 av 77 effekter valda i mixarna, 31 på 24 lang.
  Analysatorfynd 10-20: drops i 'intro' efter låtgräns når inte 'high' (12/29).

## NATTEN 2026-10-19 (nattagenten, inget deployat)
KLART 2026-10-19: baslinje natt/2026-10-19.json byte-identisk med 10-18 (pop 125/0,46 r 0,30; mega 150/0,41 r 0,12; korpus 125/0,44 r 0,26).
KLART 2026-10-19: opt-in DMX_DROP_NO_BUILD_S=8 (dc6c64c) - build inom 8 s efter show-drop = dropens landning, ingen build-look förrän
  sektionen lämnat build. 24 lang: kort look 20 -> 17 %, drop->build-korta 12 -> 0, lookbyten 404 -> 377, återseende 80 -> 82 %, hör ihop
  70 -> 74 %, drops 62 lika; mega byten 3,7 -> 3,0/min, ljus full 0,52 -> 0,60. ERSATT 10-19 av grundfixen SECTION_BODY_HIGH (ägaren) - koden borttagen.
ÖPPET: sektionen high bara 4/68 vid show-drop, 22/68 efter 8 s (analysator-fynd 10-19); lugn-effekterna (20) väljs inte i mixarna;
  sektionsfladder 31 av 76 korta looker.

## LADAN-BESÖKET 2026-10-18 15:45-16:20 - ALLT NEDAN ÄR UTE (PC på telefonens hotspot, Pi:n 10.38.24.218, PI_HOST=...)
Resultat: små städningar 15/min -> 8-13/min, längsta liten 4-7 ms på Node 24, render snitt 0,25 -> 0,20 ms. Node 18 (apt nodejs/npm
+ 130 node-paket) AVINSTALLERAD efter ägarens beslut; node/npm/npx = länkar till /opt/node24 i /usr/local/bin. Stora städningar och
mörkerstädningen (forcedGc) ej färdigutvärderade - läs /api/perf nästa gång (efter pauser mellan låtar).

### (checklistan som den var)
1. `python tools/ladan.py` (utan --env; ladan.conf ska vara tom sedan drop-proven blev standard 10-17). Tar med allt sedan 10-17 15:53:
   skräpjakten (render i steg, doubleFields, hsv direkt import + tabell, kalibreringens tal via fält, --interrupt-budget=32768 på Node 18
   i v8Tiering.ts, perfStats skräpfri, BLE borttaget), nattens 10-18-fixar, computeBpm orörd. Ljuset byte-identiskt.
2. Efter 15 min musik: `curl http://<pi>/api/perf` - jämför med 10-16 16:58-17:11 (minor 15/min, längsta 6-10 ms, major ~0, loop max
   14-22 ms). Väntat (bänk Node 18): ~25-45 kB/s skräp -> en liten städning var 1,5-3 min.
3. BLE BORTTAGET UR DMX (10-18, ägaren: 'om det inte är exakt samma BLE-modul som lotus, ta bort den' - DMX hade @abandonware/noble i
   sidovagnen pi-dmx-ble, lotus @stoprocent/noble i motorn). Punkt 1 tar ut motorn utan BLE (bleClient, /setup-sidans BLE-kort, ws-
   meddelandena); sidovagnen + bluetoothd städas bort av punkt 5. Ingen ljusändring - BLE läste bara den färdiga ramen.
4. HEAP-FLAGGAN + STÄDA NÄR RIGGEN ÄR MÖRK (portat från lotus 10-18, där: 0 storstädningar på 28 min med flaggan, tvingad GC ~93 ms):
   EFTER punkt 1: `python tools/ladan_heap.py` (torrkörning) och sedan `--kor` - lägger --heap-growing-percent=200 --expose-gc i heap.conf
   och gc-dark.conf (DMX_GC_DARK=0.6: full GC bara när tystnadsgrinden är stängd >= 1,5 s, ramen helt släckt och gamla minnet >= 60 % av
   gränsen; src/gcDark.ts). Läs /api/perf `forcedGc` (paus, fyllnad) efter en paus mellan låtar + `total.gc.major`. Backa: `--backa`.
5. NODE 24 (10-18, ägaren: 'ta backup och kör på Node 24 i stället för extra kod och toggles'). EFTER punkt 4 (heap-flaggan läggs
   på node-raden oavsett sökväg): `python tools/ladan_node24.py` (torrkörning: arkitektur måste vara aarch64) och sedan `--kor`:
   backup /home/pi/dmx-backup-node18-20261018.tgz (enhetsfil + drop-ins + spi.node) -> Node 24.18.0 i /opt/node24 (tarbollen från
   ~/node24dl på PC:n, sha256-kontrollerad) -> ExecStart pekas om -> spi.node byts mot tools/node24/spi-node24-arm64.node (byggd på
   lotus mot 24.18.0, require + ESM-import provade) -> pi-dmx-ble + bluetooth bort -> omstart, skriver health/perf/journal.
   Stegen provkörda mot en låtsasrot på lotus (backup, byte, sed i drop-ins, återställning). LED-RINGEN ÄR AVSTÄNGD TILLSVIDARE (10-18, ägaren) -
   spi-device laddas inte alls, spi.node-bytet är bara för en framtida påslagning. Kontrollera /api/perf efter 15 min musik mot punkt 2 (bänk: 34 mot 43 kB/s på Node 22 mot 18). v8Tiering.ts väljer själv
   --invocation-count-for-turbofan=100 på V8 >= 12. Backa: `--backa` (packar upp backupen, omstart). Live-allokeringsprofil som på
   lotus (SIGUSR1 + HeapProfiler inkl. bortstädat) går nu även här.

## Från kvällen 2026-10-17 - SKRÄPJAKTEN (ägaren: nattens ENDA uppgift natten till 10-18, se engångsundantaget i nattagentens SKILL.md)
Läget efter dagen (allt på PC, stabilt läge, med V8-flaggan): DMX-motorn 112 kB/s (effects.js 35, boundaryDetector.js 32, analysatorn 21);
lotus-motorn 203 kB/s (tickInner 75 utspritt över ~20 anropsställen med decimaltal, analysatorn 56 med låtbyten, alsaMic 31).
Klart 10-17: delade analysatorn (dmx 6b4963e / lotus 4e264e9, LIVE på lotus 14:04), v8Tiering.ts i båda (dmx a8966ee, lotus 1a0365a LIVE
14:45), lotus micvägens periodbuffert (LIVE 14:45). Ladan: allt väntar på nästa `python tools/ladan.py`.
GÖR i natt: (A) lotus tickInner + helpers (bassBody.step, subKickDb, pulseSplit, trustSmooth, updateBeatClock, processOnset, processDrop,
emitBands) och (B) DMX effects.ts + effects/*.ts + boundaryDetector.ts med recepten; bevisa byte-identiskt efter varje steg; deploya inte.
+ (ägaren ~15:05) FÖRST: mät båda motorerna med Node 18.20.4 (Pi:ernas version, portabel zip i C:/Users/richa/node18, nedladdningen godkänd
av ägaren - se SKILL-undantaget) mot Node 22 med/utan flagga; gör jakten med Node 18 som huvudmått; rapportera 'skulle Node 22 på Pi:erna
hjälpa?' med siffror och risker. Uppgradera inget på Pi:erna.
LADAN 10-17 14:58: deployat utan env (skräpfixar + FLANK_SHORT/STOP_MINI/SUBKICK standard); 15:00 LIVE prov DMX_SECTION_UNIT_MIN_MS=0
(ladan.conf), väntar på ägarens öga. MÄTFÄLLA 49: Pi:erna kör Node 18 (V8 10.2) - flaggan finns inte där.
15:09 BACKAT (ägaren: 'den missar en hel del minidrops iaf') - ladan kör 14:58-läget utan ladan.conf. Bänken (24 lang) gav inte färre
minidrops med provet (390 -> 395); orsaken okänd tills ägarens öga/inspelning med Mini!-markeringar säger mer. Rör inte SECTION_UNIT i natt.
15:5x LIVE (ladan.conf, väntar på ögat): DMX_DROP_LIFT_MS=8000 DMX_DROP_LIFT_FALL_MS=3000 DMX_DROP_LIFT_HIGH=1 DMX_TEMPO_PERSIST_S=3
DMX_DROP_BASS_LOOK=1 (a653837/80039f8/53156e4). Skräpjakten i natt ska bevisas identisk även MED dessa env (kör konsertReplay-beviset med dem också).
KLART 15:53: ägaren 'dropparna känns bra nu' -> alla fem är KODENS STANDARD (2273bb9) och deployat utan env (ladan.conf tom). Natten jämför
mot den nya standarden (ingen env behövs). Ny baslinje natt/2026-10-17-drop-std.json: pop kick->ljus 125 ms (var 100), r 0,30 (0,33).
KLART 2026-10-18 (nattagenten, skräpjakten, inget deployat): stabilt läge = ANDRA VARVET av materialet (första varvet = deopt vid nya
grenar, en rigg med dagars drift ligger i andra). Node 18 (Pi:ns V8) DMX 113 -> 74 kB/s (79ba733 låtgränsen, 85f650a effekterna,
fb70598 dirigenten), lotus 85 -> 41 (9e6501c, 153f7aa, d3cd59d, pushat). Allt byte-identiskt (DMX 24/24 lang + dropTiming + natt
--snabb; lotus engineReplay). MÄTFÄLLA 50: Node 18:s heap-profilerare visar bara överlevare -> tools/skrap/winAlloc.mjs (+ skrapReplay
--varv/--mode, n18compat, probe.py PROBE_RET). Största orsaken på Node 18: decimaltal i modulvariabler (let) boxas vid varje skrivning.
Kvar: analysatorn 20-27 kB/s (analysator-fynd 10-18, computeBpm 0 % TurboFan på Node 18) och DMX-effekterna ~40 kB/s (billiga som fast
look, 70-145 B/anrop i rotation; V8 slutar inlina hsvToRgb i långkörande processen - olöst, fxLab.mjs/fxHook.mjs). Node 22 på Pi:erna:
bara med flaggan (v8Tiering sätter den) DMX 74 -> 49, lotus 41 -> 39; utan flaggan sämre (lotus 94) - rekommendation i rapporten: inte nu.
Nästa deploy `python tools/ladan.py` tar med skräpfixarna (ljuset byte-identiskt) - titta på GET /api/perf mot 10-17.

## Från kvällen 2026-10-17 - SKRÄPET HITTAT (DMX-sessionen, ägaren: 'målet var att få bort allt skräp analysatorn skapar löpande')
Mätt i stabilt läge (allocProf --fran 300, lang-1014): motorn 450 kB/s, analysatorn 183, effects 146, boundaryDetector 47. Störst: V8 optimerar
om en funktion först efter 3000 anrop - computeBpm (4 Hz) och dropStep deoptas på sällsynta grenar och kör sedan otolkat i minuter (TurboFan bara
44 % av tiden), och då boxas alla tal. Flaggan `--invocation-count-for-turbofan=100`: motorn 450 -> 187 kB/s (effects 146 -> 35, analysatorn
183 -> 95), ljuset byte-identiskt på 3 inspelningar. Analysatorns kodfixar (decimaltal via fält, sällsynta grenar i egna metoder, scratch-
buffertar) -> lotus-morgonagenten (analysator-fynd.md 10-17 kväll + lotus morning-todo); med flaggan + kodfixarna 138 kB/s.
I KODEN SEDAN 10-17 (src/v8Tiering.ts, först i index.ts, följer med nästa `python tools/ladan.py`; 24/24 inspelningar byte-identiska).
Titta efter deployen på GET /api/perf mot 10-16 (minor ~15/min, längsta ~10 ms, major ~0 i stabilt läge).
Nattagenten: mät effects.js i stabilt läge med flaggan (vad som är kvar av 35 kB/s) och boundaryDetector (32 kB/s).

## Från eftermiddagen 2026-10-16 - KORT BREAK + STOPP-MINI GODKÄNDA I LADAN (går före allt annat)
LIVE 15:23/15:3x (main 1d5a3de + ladan.conf DMX_FLANK_SHORT_S=1, DMX_STOP_MINI_S=0.6; deploy med nyckel ~/.ssh/id_pidmx, 97da1f6).
Ägaren: 'dropparna känns bra' (kort break), 'minidropparna känns bra, behåll stopp-minidroppen'. GÖR: lyft båda till kodens standard
i effects.ts (FLANK_SHORT_S 1, STOP_MINI_S 0,6; =0 = av), bevisa natt --snabb + dropTiming --step 5 bit-identiska med env-proven, commit,
och skriv i rapporten att nästa deploy är `python tools/ladan.py` utan --env (tömmer ladan.conf).
+ ~15:5x DMX_BASS_SUBKICK=1 LIVE ihop med de två, ägaren: 'sub+kick känns bättre, behåll den' -> lyft även den till standard (basenergin
ur sub+kick; =0 = bodyDb som förr), samma bevis. (Lotus-omdömet 10-15 gällde gamla koden - bass-body kom aldrig ut på lotus-Pi:n.)
KLART 2026-10-17 (nattagenten, 5ebefe5): FLANK_SHORT_S 1, STOP_MINI_S 0,6, BASS_SUBKICK 1 är kodens standard (=0 = av); natt --snabb json-identisk
med gårdagens env, dropTiming --step 5 lang-1014 byte-identisk. NÄSTA DEPLOY: `python tools/ladan.py` utan --env (tömmer ladan.conf).
NYTT PROV 2026-10-17 (nattagenten, ingen kodändring): `python tools/ladan.py --env DMX_SECTION_UNIT_MIN_MS=0` - looken byts PÅ sektionsgränsen
i stället för 4 s in (24 lang: återseende 84 -> 94 %, kort look 13 -> 9 %, byten 2,55 -> 2,70/min; pop kick->ljus 100 -> 125 ms). Titta: kommer
refrängens look på refrängens första slag, och fladdrar det vid korta sektioner? Förkastat: build före drop ur basen borta (precision ~0,2).

## Från kvällen 2026-10-15 - LOTUS: BASEN SOM DMX, SUB+KICK GODKÄND I KÄLLAREN (porterat, opt-in, ej deployat i ladan)
Lotus fick DMX:s basenergi (LOTUS_BASS_BODY, lotus a5e972d/668ffc3). Ägaren: =1 (baskroppen 20-250 Hz) 'lite mörkare, ok, men följer inte bara
bas'; =2 (bara sub+kick 20-120 Hz) 'känns bättre'. Porterat till DMX som opt-in DMX_BASS_SUBKICK=1 (effects.ts BASENERGIN; flank-dropen läser
fortfarande bodyDb). natt --snabb: av json-identiskt; på: kick->ljus pop 125 -> 100 ms, megamix 150 -> 125 ms, r energi 0,34/0,09 oförändrat,
mörkt 0,02/0,03 oförändrat. Lotus-bänken (samma källa): r mot 250-1200 Hz 0,20 -> 0,15 (ladan-wav). REDO FÖR LADAN:
`python tools/ladan.py --env DMX_BASS_SUBKICK=1`. Nattagenten: mät gärna energiMatt med sub+kick som referens.
KLART 2026-10-16 (nattagenten): konsertReplay --bas-ref subkick (716eefa), 24 lang-*.wav (151 min, energiMatt): med sub+kick som referens
lyfter DMX_BASS_SUBKICK=1 r bara +0,01-0,02 (high r_bas 0,49 -> 0,50, r_bas_hp 0,42 -> 0,44; build hp 0,42 -> 0,44), diskanten ner (high r_disk
0,19 -> 0,17), refrängens dal 0,09 -> 0,07, slagdjup/sving lika. Mot bodyDb-referensen oförändrat. Liten skillnad i bänken - ägarens öga avgör.

## Från kvällen 2026-10-14 - KULÖRTONINGEN GODKÄND I LADAN (går före allt annat)
LIVE ~18:55 via ladan.conf DMX_HUE_GLIDE_MS=400 (commit "Kulörtoning opt-in"). Ägaren: "känns mer polerat nu". GÖR: standard 400 i effects.ts
(DMX_HUE_GLIDE_MS=0 = av), bevisa natt --snabb bit-identisk med --env DMX_HUE_GLIDE_MS=400, commit; rapporten: nästa deploy utan --env.
KLART 2026-10-14 ~19:2x (huvudsessionen): standard 400 + SAMMA LJUS SOM EFFEKTEN (ägaren: 'påverkade även energin ... fade är bara när
det går' -> glidkulören skalas till effektens ljus efter gamman, annars skarpt), deployat utan env, 0 filer skiljer. Nattagenten: mät gärna
skarpa kulörhopp på tända lampor (hue-sond: rgb ur eng.universe, hopp > 1/12 per renderruta) och hur ofta toningen faller till skarpt.
KLART 2026-10-15 (nattagenten): tools/hueSond.mjs (--delad-cfg --step 5) på lang-1014: skarpa hopp 149 -> 69 (14,9 -> 6,9/min) med 400 ms;
toningen faller till skarpt pga ljuskravet i 95 av 4760 glidbara byten (2 %); resten av hoppen = drop/mini/fastLight (38) och nytända (52).

## Från kvällen 2026-10-14 - NY LÅNGINSPELNING MED ÄGARENS MARKERINGAR (går före allt annat)
tools/ladan-2026-10-14/lang-20261014T161434.wav (+ .events.json, marks.jsonl; gitignorerad, ligger lokalt): 18:14:34-18:24:34, 10 min,
ladans nivå, kod = main med sektionsstandarden (RUN 5/RUN_IN 3/CARRY 20), TRUST_REPEAT, flank-drop, manus-return, minidrop-kulören.
Ägarens knappar (s från start): drop 54, mini 67, drop 108, drop 173, mini 181, drop 209, mini 262, drop 273, mini 304, drop 341,
mini 447, drop 530, drop 598. GÖR: kör konsertReplay --delad-cfg --step 5 + dropTiming på filen; jämför showens drops/minidrops mot
markeringarna (träff/miss/falsk, fördröjning) och mot events.json (det som hände live); sektionMatt på filen (fladder, intro-andel).
Rapportera vad markeringarna säger om drop-/minidrop-gränsen (ägaren tryckte Drop! 8 ggr på 10 min - fler än showens ~0,3/min?).
KLART 2026-10-15 (nattagenten): live-takt (dropTiming --step 5). Showen gav full drop vid 2/8 drop-markeringar (273, 597); 5 av de 6 övriga
låg på analysatorns fyrning (±1,1 s) efter bara 1,1-2,0 s basbreak (en takt) och blev minidrop pga flankens 4 s-krav; 341 = minidrop.
Mini-markeringar: 2/5 fick minidrop-look (262 blev drop, 304), 3/5 inget (67, 181 = bara nästan-drop 73 %, 447). Omarkerad show-drop: 333.
Analysatorns miniDropCount räknar i skurar (140 på 10 min) -> analysator-fynd 10-15. Idé byggd: DMX_FLANK_SHORT_S=1 (opt-in, 9f417c0):
break >= 1 s räcker om breaket ligger >= 24 dB under taket -> 7/8 drop-markeringar, 1 mini-markering blir drop; 23 filer 0,31 -> 0,72/min,
rätt 34 -> 87, falska 3 -> 7. REDO FÖR LADAN: `python tools/ladan.py --env DMX_FLANK_SHORT_S=1`. NÄSTA: de 3 missade minidrop-markeringarna.
KLART 2026-10-16 (nattagenten, de 3 missade): alla tre (67, 181, 447) = basen borta ~1 s mitt i refrängen och tillbaka; nästan-dropen
fyrar där men ger inget ljus i konsertläget (V123), energilyftet ser inte en dipp som återgår (67 dessutom blockerad av nästan-dropens 4 s-spärr).
Prov 972feb2 DMX_STOP_MINI_S=0.6 (opt-in): stopp 0,6-3 s i high -> minidrop-looken utan energilyft. Live-takt: mini-markeringar 2/5 -> 4/5
(+ drop-markeringen 341 som mini), 2 nya omarkerade; 151 min: minidrops 2,20 -> 2,73/min, drops identiska. Kostnad: blixt 0,1-0,3 s före
10/62 drops (dropSprångHög mega 0,35 -> 0,29). REDO FÖR LADAN: `python tools/ladan.py --env DMX_STOP_MINI_S=0.6` (ihop med
DMX_FLANK_SHORT_S=1 på lang-1014 live-takt: mini-markeringar 2/5 -> 4/5 även där, +1 omarkerad (291), drops lika).
IHOP MED LOTUS 10-15: lotus föreslog MINI_SPACING_MS 1500 (profilen, i stället för 1) mot skurarna; kört ihop med FLANK_SHORT på lang-1014 i
live-takt: bit-identiskt (konsertläget läser inte miniDropCount) -> ingen ljusvinst, bara läsbara loggar. Inte infört.

## Från kvällen 2026-10-14 - SEKTIONSPROVET GODKÄNT I LADAN (går före allt annat)
LIVE 17:57 (main 983d76b + ladan.conf DMX_SECTION_RUN=5, DMX_SECTION_RUN_IN=3, DMX_SECTION_CARRY=20). Ägaren i ladan: "mycket go känsla nu".
GÖR: lyft de tre till kodens standard i DMX-profilen (src/analyserProfile.ts sys: SECTION_RUN '5', SECTION_RUN_IN '3', SECTION_CARRY '20' -
profilen, inte delad kod), bevisa att natt.py/sektionMatt med standard = gårdagens körning med env (bit-identiskt), commit, och skriv
i rapporten att ladan.conf ska tömmas vid nästa deploy (`python tools/ladan.py` utan --env).
KLART 2026-10-14 ~18:1x (huvudsessionen, ägarens 'gör det till standard direkt'): profilen ändrad, sektionMatt 23/23 bit-identisk med
ladans env, deployat utan env (ladan.conf tom, bara analyserProfile.js skilde). Nattagenten: inget att göra här, bara baslinje.

## ANALYSATORN - ÄGARENS PRIORITERING 10-13 (i denna ordning; mät före/efter på alla lang-*.wav i tools/ladan-2026-10-11/, kör
## även konsertReplay --step 5 = live-takt; den delade analysatorn src/analyser.ts ändras INTE utan att lotus-sidan tar samma sak -
## lös i profilen (analyserProfile.ts) och/eller DMX-sidan (effects.ts/egen modul), eller lägg förslaget i analysator-fynd.md)
1. SEKTIONER SOM HÅLLER + INGA FALSKA LÅTGRÄNSER: sektionen fladdrar (low/build/high/intro byts på 5-20 s) och låtgränsdetektorn
   ger 'ny låt' mitt i låtar. Röd tråd, sektionstaket och build-valen hänger på det. Mål: sektioner >= 8 s (andel byten kortare än
   8 s ner kraftigt), falska låtgränser ~0 mot inspelningarnas riktiga låtbyten (lyssna/räkna dem en gång, spara som facit-fil).
   KLART 2026-10-14 (nattagenten, sektionsdelen, ej deployat, INGEN kodändring - befintliga profilrattar): REDO FÖR LADAN
   `python tools/ladan.py --env DMX_SECTION_RUN=5 --env DMX_SECTION_RUN_IN=3` (ur refrängen/mellanlägen kräver 5 raka 1 s-block i
   stället för 3, IN i refrängen fortfarande 3). 23 lang-*.wav (tools/sektionMatt.mjs + sektionStat.mjs): fladder (kort, ej build, ej
   nollning) 41 -> 17, sektionsbyten 3,12 -> 2,34/min, < 8 s 23 -> 18 % (resten = build 4-7 s före refrängen, avsiktligt kvar), high-start
   oförändrad (medel -0,04 s), tid high 40 -> 45 %, low 24 -> 21 %, build 13 % oförändrad. konsertReplay --delad-cfg --step 5: lookbyten
   3,14 -> 2,58/min, återseende 71 -> 81 %, hör ihop 77 -> 80 %, kort look 16 -> 14 %, variation 26 -> 27 looker 11/15 rutor. Showens drops
   bit-lika (dropTiming 44, rätt 35/sen 5), minidrop-looker 320 -> 312. energiMatt (ladans nivå): r_bas high 0,45 -> 0,48, slagdjup lika.
   Kostnad: megamix (överstyrd) r energi 0,18 -> 0,08, pop 0,37 -> 0,33. Svagare alternativ utan r-kostnad: DMX_SECTION_REPEAT=32
   (fladder 41 -> 28, byten 3,0/min). Prövat och förkastat: SECTION_HYST 0,25 (build 13 -> 10 % = emot prio 2).
   ÖPPET: falska låtgränser - facit saknas (kräver öron: 49 gränser på 141 min, flera 127 -> 127 BPM med grund nivådipp i 15:xx-seten
   är misstänkta). Efter varje gräns är sektionen 'intro' 20 s (17 % av tiden) -> analysator-fynd.md 10-14.
2. UPPBYGGNADEN TIDIGARE: analysatorns buildUp är död på ladans nivå (morgonagenten 10-12: ingen ersättare med AUC > 0,56);
   motorns buildProg börjar först när sektionen säger build. Ägaren (10-11): 'dirigenten skall bli snabbare att byta till BUILD
   innan drops'. Mål: känna igen builden 4-8 takter före dropen (facit = flank-dropparna, tools/dropTiming*.mjs), utan att
   fyra i verser.
3. BASGÅNG SOM SKILJER: profile.bassline ligger 0,62-0,77 i median i ALLA sektioner -> 'tydlig basgång' (toggle-låt, eko
   >= 0,85) är grov. Mål: ett basgångsmått relativt låtens egen nivå som skiljer en vers med melodisk basgång från pumpande sub.
4. TAKTSÄKERHET: beatConf ofta 0,3-0,6 i ladan, tempohopp inom låt (81 -> 144 -> 108). Mål: färre tempohopp inom låt (bänken
   396/503 + ladans inspelningar), högre tillit där takten är tydlig.
   KLART 10-13 (nattagenten, branch, ej deployat): TILLITEN = MÖNSTRET ÅTERKOMMER (beatFeed.ts TRUST_REPEAT, DMX_TRUST_REPEAT=0 = av):
   kick räknas som bevis om den ligger på slaget ELLER upprepar en kick 2 slag tidigare (±6 %). Ladan 141 min (konsertReplay
   --delad-cfg --step 5): tillit > 0,5 52,6 -> 98,8 %, bpmConfidence median 0,41 -> 0,99; tempo/drops bit-lika, minidrop-looker
   321 -> 318, lookbyten 447 -> 438. Korpus (tools/taktKorpus.mjs): klockan 81,5 % oförändrad; gamla måttet gynnade FEL tempo
   (AUC 0,43), nya 0,64. Tempohoppen (2,9/låt) är kvar - två DMX-ersättare förkastade, förslag i analysator-fynd.md.
   MÄTFÄLLA 47 (konsertReplay --delad-cfg: live får analysatorn motorns cfg -> kickgrinden på) och 48 (setVirtualClock(EPOCH+t) =
   dubbel epok, kickarna 1,7e12 ms före Date.now(): effekternas slag satt godtyckligt från kickarna i ALLA bänkar som gör så -
   rättat i konsertReplay/taktKorpus, övriga bänkar (concertBench, showTight, dropTiming, dynBench, ...) har kvar felet).
5. STARTEN EFTER OMSTART (~15 s uppvärmning, ojämnt ljus/snabba lookbyten) - morgonagenten har tagit uppvärmningen (analysator-fynd).
6. RENDERRUTOR -> TID: gå igenom allt i effects.ts (och effekter) som räknar i antal renderingar/rutor i stället för tid
   (mätfälla 46: live 200 Hz, bänk 40 Hz) och jämför konsertReplay --step 25 mot --step 5; allt ska ge samma.


## 10-13 NATT (huvudsessionen, MERGAT I MAIN, EJ DEPLOYAT): RÖD TRÅD + FLANK-DROP + TIDSBASERAD HISTORIK
- RÖD TRÅD (låtmanus, branch 4586c1c mergad): en look per sektionstyp per låt som återkommer, byten bara vid sektion/build/drop,
  en kulörfamilj per låt, refrängen släkt med versen. Kedja 141 min: lookbyten 5,2 -> 3,1/min, unika looker/låt 12 -> 5,
  återseende 2 -> 78 %, variation över kvällen kvar (71 looker, 15/15 rutor). Drops/minidrops oförändrade. Mått: tools/rodTrad.mjs.
- FLANK-DROP (83ce52c mergad, OPT-IN DMX_FLANK_DROP=1, DMX_FLANK_BREAK_S 3): rätt drops 33 % -> 78 % (4 s: 80 %, 0,31/min),
  falska 17 -> 2, median 91 -> 24 ms. Förslag till ägaren: slå på med break 4 s i ladan.
- HISTORIKEN TIDSBASERAD (be586f7): energilyftets/nästan-dropens fönster räknades i renderrutor - live 200 Hz gav 5x kortare
  fönster än bänken (live 3,4 minidrops/min mot bänkens 2,1). MÄTFÄLLA 46: allt som räknar i renderrutor måste vara tidsbaserat;
  konsertReplay --step 5 kör som live.


## NATTEN 2026-10-13 (nattagenten, inget deployat)
KLART 2026-10-13: baslinje natt/2026-10-13.json (pop 125/0,42 r 0,42 byten 3,1/min; mega 125/0,42 r 0,22 3,7/min; korpus 125/0,42 r 0,46;
  kickträff 0,50 -> 0,42 = basenergin följer bodyDb, inte varje kick; 54 aldrig valda i mixarna = röd tråd, kvällen 37 looker/14 rutor).
KLART 2026-10-13: opt-in DMX_MANUS_RETURN=1 - när sektionens look faller (tier 2 steg, ögonblickskrav punch/beat) prövas låtens tidigare
  looker för sektionen först, utan ögonblickskraven. 23 inspelningar: omval inom låt 15 -> 6, återseende 78 -> 83 %, hör ihop 82 -> 79 %,
  drops/mini/ljus oförändrade, av json-identiskt. Redo: ladan.py --env DMX_MANUS_RETURN=1.
ÖPPET: halva resten av återseende-missarna = looken byts först sekunder in i sektionen (fras/raster); refrängens slagdjup 0,56 < vers 0,61
  (dal 0,17); minidrop-kontrasten nu ok (median +0,54, 5/38 svaga, alla i hög refräng).

## ÄGARENS UPPDRAG 10-12 KVÄLL: RÖD TRÅD - "nu känns det bara som olika effekter hoppar hela tiden. Kan man få någon bra röd tråd,
## mer som att den är förprogrammerad?" (går före situationsrutnätet; drop-timingen nedan är lika viktig)
MÅLET I ÄGARENS ORD (tillägg): "så allt mer känns anpassat efter låten och som att de hänger ihop" - looken ska matcha LÅTENS
karaktär (tempo, basgång, energi, lugn/fart/full) och delarna ska höra ihop (samma kulörfamilj/gruppering genom låten, refrängen
en förhöjd version av versen snarare än en helt annan effekt, builden leder in i refrängens look).
Läget (main 41e06a5, LIVE 19:05): 78 effekter, dirigenten byter look 4,9 ggr/min (median ~12 s per look) och väljer ~60 olika looker
per 2 h; orsaker (replay 22 filer): sektion ~40 %, fras ~30 %, basgång, karaktär, drop, build, tempo. Sektionsdetektorn fladdrar
(low/build/high/intro byts ofta på 5-20 s, falska låtgränser -> 'ny låt: glömmer looker'), och varje fladder blir ett lookbyte.
En ljustekniker programmerar en låt: få looker per låt som ÅTERKOMMER (vers-look, build-look, refräng-look, break-look), byten på
riktiga sektionsgränser, en kulörfamilj per låt, variation inom looken (kulör per fras, lampordning) i stället för nya looker.
GÖR: (1) mät 'röd tråd' i bänken (tools/konsertReplay.mjs): lookbyten/min, unika looker per låt, andel byten som sker vid en
sektionsgräns som håller >= 8 s, återseende (samma sektionstyp i samma låt -> samma look), hur ofta en look visas < 8 s; (2) föreslå
EN ersättning som ger tydlig röd tråd, t.ex. 'låtens manus': vid låtstart väljs en liten uppsättning looker per sektionstyp ur
rutnätet (tier x sektion x basgång/kick) som sedan återanvänds hela låten; fras/basgång/karaktär byter inte look (bara kulör/
lampordning/gruppering), sektionsbyte kräver att sektionen hållit sig X s (eller att det är build/drop), nya looker bara vid ny låt;
(3) bevisa i bänken att drops/minidrops/energi är oförändrade och att variationen över en kväll finns kvar (alla rutor används över
många låtar). 'Ersätt, lägg inte till lager/rattar'. Deploya aldrig - 'redo för ladan' med siffror före/efter.


## 10-12 EFTERMIDDAG: NY ENERGIKEDJA I MAIN (ej deployad) - läs först
Ägaren: 'energin kändes inte ... vill att ljuset följer basgången, sub-känslan i ögonen, svänga mycket, taket sänks efter var i låten'.
Tre agenter: granskning (dubbelmodulering: kickdipp 3-4 ggr, SPOT/UNIFORM förbi energin, golv som låser energin, E_CURVE 10 binär,
TAKET TVÅ GÅNGER via dimmern rgb7 -> vers 0,65 blev ~0,42), mätning (branch worktree-agent-aea10e8f12cc72c8a, ej mergad: energin
6-13 % av svingen, lagren tar ut 4/5 av varandra, beatK följer inte basen r~0), prototyp MERGAD (89dde8f via merge): basenergi ur
frame.bodyDb (topp glider 10 s, dal 1 s, min 6 dB, kurva 3), golven/beatK/SPOT/UNIFORM-mdSel/död kod borta, taket bara på färgen.
Bänk 23 filer: följer basen r 0,12-0,18 -> 0,32-0,47 (diskant ~0,1), topp vers 0,40 -> 0,76, refräng 0,80 -> 0,95; drops/mini/
lookbyten identiska. 'Tak i vers' (cfg.verseCeil, /setup, 0,65) justerbart. Öppet: refrängens relativa slagdjup (0,52) < versens
(0,56) - tät bas lyser mellan slagen; uttoningen får inte bli snabbare.


## ÄGARENS UPPDRAG 10-12 (går först): FULL DROP-TIMINGEN - "känns som bara var 3:e träffar rätt"
Ägaren i ladan 10-12 13:0x. Två källor till riktiga drops (live sedan 10-11 kväll / 10-12):
  (a) analysatorns drop ([dropfire] i journalen: rise/underPeak/goneSpan/edgeAgo; edgeAgo = tid från baskroppens stigande flank till
      fyrningen - 10-12 12:45:55 var edgeAgo 2160 ms (!), 12:46:45 224 ms; 10-11 21:52:43 202 ms 'sen'), kräver 2 s bastystnad
      (BODY_GONE_MIN_MS 2000) och kroppen inom 3 dB från toppen (DROP_QUALITY_DB) - väntan på toppen gör den sen;
  (b) LYFT + SPRÅNG (effects.ts DROP_JUMP_DB 17, DROP_PAIR_MS 600): energilyftet (0,6 s-medel >= 10 dB) och nästan-drop-språnget
      samtidigt - kräver 0,6 s medel, alltså byggt för att komma efter flanken.
  + gemensam spärr SHOW_DROP_GAP_MS 12 s; en spärrad drop blir minidrop.
INSPELNING MED FACIT 10-12: tools/ladan-2026-10-11/lang-20261012T110658.wav (13:06:58-13:16:58, 10 min) + journalens [dropfire]/
  [dirigent] 13:06-13:18 (felsökning på). Ägarens rapporter (skrivtid, händelsen ~3-15 s före): 13:06:59 'drop, lite sen', 13:11:13
  'drop, ok', 13:12:31 'drop, full körde mini' (ville full drop, fick minidrop ~13:12:13-26), 13:13:34 'drop, kunde vart mini'
  (lyft+språng-drop 13:13:28), 13:13:57 'drop miss', 13:14:21 'förra skulle dock vara mini', 13:14:30 'minidrop miss', 13:14:46 'fel
  drop skulle vara mini' (lyft+språng 13:14:37), 13:15:07 'drop miss' (fick minidrop 13:15:04), 13:15:32 'sen drop' (dropfire 13:15:29),
  13:15:42 'kunde också vart mini'. Analysatorns drops med edgeAgo 4795 ms (13:17:44) och 13675 ms (13:16:23) = fyrar SEKUNDER efter
  flanken - huvudmisstänkt för 'sen'. EFTER detta (13:21 LIVE): lyft+språng-dropen BORTTAGEN (lyft = minidrop), riktiga drops bara
  från analysatorn, spärr 12 s, spärrad drop -> minidrop. Ägaren: 'hellre öka gränsen till riktig drop, bara minidrops kör vidare'.
GÖR: mät timingen per källa mot ljudet - var är smällen (baskroppens/kickens flank, onset) och när fyrar ljuset (inkl. kedjan:
fade-in 30 ms, BLE/DMX-latens ~0)? Fördelning tidig/rätt/sen per källa på alla långinspelningar (tools/ladan-2026-10-11/, och nya
från 10-12 om de finns), facit = ägarens rapporter (tider i todo ovan: 'sen' 21:29:57, 21:52:5x; 'lite tidig' 10-12 ~12:47;
'rätt' 21:31:12, 12:46:0x; 'fel drop' 12:46:0x) + ihållande baslyft (konsertReplay + analys-2026-10-11.md). Hitta varför 2 av 3
känns fel (för sen? för tidig? fel ställe?) och föreslå EN ersättning bevisad i bänken (t.ex. fyra på flanken när bastystnaden
varit lång nog, i stället för att vänta på toppen). Ändra inte den delade analysatorn (analyser.ts) - profilen (analyserProfile.ts)
och effects.ts går bra. Deploya aldrig; 'redo för ladan' med siffror.
REDO FÖR LADAN 10-12 (agent, ej deployat): DMX_FLANK_DROP=1 (effects.ts 'FULL DROP PÅ FLANKEN'): motorn tar riktiga drops själv på
  frame.bodyDb - break >= 3 s (0,6 s-topp >= 10 dB under taket) och fyr på flanken (taket - 6 dB, >= 12 dB på 0,5 s); analysatorns drop
  utan egen flank = minidrop. Bänk 23 filer/141 min (tools/dropTiming*.mjs): 46 -> 55 drops (0,33 -> 0,39/min), på baslyft 63 -> 96 %,
  rätt 15 -> 43, sen 11 -> 6, falsk 17 -> 2, fördröjning p50 91 -> 24 ms, p75 155 -> 43; 1012-filen: före 264/328 falska, 510 sen (ägaren
  'sen drop'/'kunde vart mini'), 565 5 s efter takten - efter 225,7 + 250,7 ('drop, ok' 13:11:13) + 315,1 ('full körde mini' 13:12:31).
  Lookbyten/ljus oförändrade (+-3 byten, +-0,01), minidrop-looker 277 -> 321. Färre: DMX_FLANK_BREAK_S=4 (44 drops, 0,31/min, 95 %).
  Kvar: 486 s ('drop miss' 13:15:07 - kroppen sjunker gradvis, break < 3 s) och 415 s (bara 5 dB baslyft) fångas inte.


## NATTEN 2026-10-12 (nattagenten, inget deployat)
KLART 2026-10-12: baslinje natt/2026-10-12.json (pop 125/0,50 r 0,42; mega 175/0,50 r 0,07; korpus 150/0,48; 22 aldrig valda).
KLART 2026-10-12: refrängen ljusare än builden -> opt-in DMX_EKO_HIGH=0 (56c6527): eko-förstavalet vid basgång gäller inte i high.
  Ljus high 0,28->0,36 / 0,38->0,42 (ladan 21:17/21:34), pop 0,34->0,45, mega 0,36->0,43; build oförändrad. Redo: ladan.py --env DMX_EKO_HIGH=0.
ÖPPET: minidrop-kontrasten - 4/26 minidrops på kvällens inspelningar har ljus 0,73-0,93 redan före (ingen synlig skillnad);
  förslag blixt på lampans strobe-kanal när DROP_STROBE är kalibrerad. Mega kick->ljus 150<->175 = 25 ms-rastrets kant (ej regression).
  Analysatorfynd: buildUp död (0,000 även i build). Situationsrutnätet (nya effekter) ej påbörjat i natt.

## LADAN 10-11 KVÄLL 21:15-22:15 (allt LIVE, ägarens live-omdömen i parentes)
- V123 live 21:16 (se nedan + analys-2026-10-11.md).
- BODY_GONE_MIN_MS 1000 -> 2000 (analyserProfile): falska drops var 30:e s på pumpande bas ('falsk' x3).
- 'Builden landar i refrängen' BORTTAGEN (falsk 21:42:39) -> LYFT + SPRÅNG = DROP: energilyft och nästan-drop >= 17 dB inom 600 ms
  (DROP_JUMP_DB). Bänk: 0,27/min, 91 % på baslyft. 14 dB provat och backat (ägaren: 'vill inte ha fler riktiga drops').
- Minidrop: energilyft 4 s + 1,5 s uttoning ('perfekt'), looken 600 ms (var 350; 'såg inte att det ens blev minidrop' - energin
  stod redan på max i starka partier -> minidropen syns bara som kulören. NÄSTA: kontrast, t.ex. kort svärta före eller vitare kärna).
- Huvuddropen: max 700 ms (var 1300), energilyft efter 4 s (var 2) - 'energin ska fortsätta efter'.
- Lampordningen växlar framåt/bakåt/utifrån-in/inifrån-ut per look och var 32:a slag (ctx.idx; c.group orörd).
- Uppbyggnaden laddar: motorns buildProg (32 slag från builden start) ersätter analysatorns DÖDA buildUp i build-effekterna
  + energigolvet stiger med förloppet under build-looker ('kändes inte som den laddade'). Bänken visar liten ökning i medelljus -
  mät hellre antal tända lampor/takt mot slutet. Efter: 'träff', 'perfekt', 'nja inte 100'.
- NÄSTA LADAN-BESÖK (ägaren 22:2x): kalibrera ingångsnivån - riktvärde för Flow 8 MON-reglaget till Pi:n (EQ rak, fast nivå;
  10-11 kväll låg ingången ~10 dB under eftermiddagen, fönster -35..-24 dB, ljuset mörkare). Geminis lågpass < 120 Hz AVRÅTT
  (takt, riser, virvel, sektioner, låtgränser behöver hela spektrumet).
- ÖPPET: 'sen' drops (analysatorn väntar tills kroppen är inom 3 dB från toppen, edgeAgo ~200 ms; QUALITY 6,5 gav bara fler
  drops); falska låtgränser mitt i låtar (sektion -> intro, 'ny låt: glömmer looker') ger lookbyte vid refrängen;
  'energi dog efter' 21:31 = sektionen high -> break 7 s efter dropen.
- Inspelningar med ägarens rapporter: lang-20261011T191741 (21:17-21:27), 193430 (21:34-21:40) i tools/ladan-2026-10-11/.
  Rapporttiderna finns i chattloggen (ej marks.jsonl): 21:18:42 falsk (dropfire 21:18:38), 21:20:56 miss, 21:28:36 miss
  (lyft + 27,7 dB), 21:29:11 träff, 21:29:57 sen, 21:31:12 rätt, 21:31:37 falsk, 21:32:26 miss, 21:42:1x miss, 21:42:45 falsk,
  21:49:0x miss, 21:52:5x sen, 22:12:18 'nja' (lyft + 14,6 dB).

## ANALYSEN AV KONSERTLÄGET 10-11 KVÄLL (läs först: tools/natt/konsert/analys-2026-10-11.md)
Showen reagerar 9,3 ggr/min men bara 15 % på riktiga baslyft (nästan-dropen = slump, analysatorns minidrops 17/min); build-looker
32 % av tiden mot sektion build 12 %; refrängen inte ljusare än builden. Provad ersättning V123 (ingen look/blixt från minidrops/
nästan-drop, build bara på sektion build, ny lyftdetektor 0,6 s ≥ 10 dB) -> 2,7 reaktioner/min, 42 % på lyft, build-look 15 %.
GODKÄNT AV ÄGAREN 10-11 kväll ("jag vill testa 123") och INFÖRT i src/effects.ts (bänken identisk med provet: 2,7/min, 42 % på lyft,
build-look 15 %). Nästa: refrängen ljusare än builden (ljus high 0,32 mot build 0,34), sedan drops mot ägarens Drop!-markeringar.

## FACIT FRÅN ÄGAREN: MINIDROP-/DROP-MARKERINGAR (10-11 kväll, går först när det finns markeringar)
Knapparna "Minidrop!"/"Drop!" i /setup (0dc7885): ägaren trycker när hen HÖR en minidrop/drop. Tiderna finns i långinspelningarnas
.events.json ("marks": [{wallMs, kind}]) och i snippets/marks.jsonl. Inspelningarna hämtas till tools/ladan-2026-10-11/ (och senare datum).
GÖR: per markering, vad gjorde detektorerna +-2 s (analysatorns drop/minidrop, DMX-sidans nästan-drop, energilyft, sektionslyft,
'builden landar', minidrop-looken miniColEnv) - träff/för sen/miss, och vilka fyrningar som saknar markering (falska). Ställ in
trösklarna (LIFT_DB, PRE_DROP_*, NEAR_*, BUILD_DROP_*, MINI_GAP_MS, analysatorprofilens drop-krav) mot markeringarna med bänken
(tools/window.mjs-mönstret i scratch: replay av wav med 100 ms-utskrift). Ägarens definition: minidrop = "från lugnt till ett tydligt
energilyft (även om det är lägre) med basslag"; riktiga drops: inga timrar, snävt mål. Allt nytt opt-in, redo för ladan.
Live 10-11 kväll (efter 1cff9df..0dc7885): drops utan timrar (BODY_GONE 1000, RISE 20, QUALITY 3), sektionslyft, energilyft, build
landar i refrängen = drop, energilyft avslutar build, minidrop-look 350 ms + lyft 1 s, basslagen i energilagret KICK_E 0,8,
konsertgolv 0,4, dropen bär in i refrängen (4 s), eko förstaval vid basgång, enhetliga effekter med energi på utvalda lampor,
tide/aurora/andrum bara < 90 BPM, fem nya effekter (fyllning, pingpong, virvel, fyr, rullandning).

## STORA PROJEKTET: SITUATIONSRUTNÄTET, ÖVER 100 EFFEKTER (ägaren i ladan 2026-10-11, går före gallring/rattar)
Ägaren: "den skall ju kunna välja - lugn låt och intro och få några val. Fartfylld låt, refräng, tydlig basgång, och få några val
osv. så kanske över 100 effekter". Dirigenten känner igen LÄGET och har 4-6 effekter byggda för just det läget.
AXLAR (finns redan som taggar/signaler): (1) låtens fart = tier lugn/fart/full (EffectDef.tier, tierEma), (2) del av låten =
section intro/low(vers)/build/high(refräng)/break (EffectDef.section, frame.section), (3) vad musiken gör = tydlig basgång
(bassline >= 0,6, EffectDef.toggle-poolen, eko förstaval), tydlig kick/låst takt (beatTrust >= 0,85), ingen takt (hasBeat falskt).
LÄGET 10-11 (50 effekter, "rumsl" = lamporna lyser olika; tools/effectDyn.mjs spridning >= 0,3):
  tier/sektion | intro       | low(vers)    | build       | high(refräng) | break
  lugn         | 11 (8 rumsl)| 6 (5)        | 0           | 0             | 7 (4)
  fart         | 0           | 14 (11)      | 11 (7)      | 8 (7)         | 1 (0)
  full         | 0           | 2 (2)        | 0           | 15 (12)       | 0
KLART 2026-10-12 (dagsession, ej deployat): 8 nya - svall (lugn x high), gryning (lugn x build), ankomst (fart x intro), glimt
  (fart x break), rulle (full x build), kickregn (full x intro), efterskalv (full x break), motor (full x low). effectDyn spridning
  1,00 alla. Replay 22 ladan-filer: valda 5,8 % av tiden (ankomst 2,2, gryning 0,9, motor 0,9, rulle 0,8, kickregn 0,6, svall 0,4);
  glimt/efterskalv 0 - ladans 'break' har nästan alltid basgång (eko/toggle-poolen tar dem). BUILD_LOOKS + gryning, rulle.
  c.lamp = fysisk lampa (ring-effekterna), c.idx = växlande ordning.
KLART 2026-10-12 (dagsession): BASGÅNGSGRÄNSEN - bassline är hög i ALLA sektioner (median 0,62-0,77, break 0,69) -> eko-förstavalet
  (>= 0,6) tog 30 %. Ny standard: eko förstaval bara >= 0,85 och aldrig i refrängen (nattagentens EKO_HIGH=0 nu standard, brytaren
  borta). De 14 nya effekterna fick FIT/SPATIAL i fit.ts (saknades -> neutral passform, valdes nästan aldrig). Replay 22 filer:
  eko 30 -> 10 %, variation (2^entropi) 21 -> 34, nya 6 -> 16 %, break-effekter valda. Toggle-gränserna (CLEAR_BASS 0,78/0,85)
  spelade nästan ingen roll.
KLART 2026-10-12: REFRÄNGEN STARKAST OCH TYDLIGAST TAKT (ägaren: takten ska kännas mest i refrängen, lamporna ska lysa olika).
  MÅTTET = LJUSASTE LAMPAN + slagdjup (topp/dal i 0,6 s-fönster), INTE medel över riggen (det belönar att tända fler lampor).
  Tak per sektion på ljusaste lampan (vers/intro/break 0,65, build 0,65 -> 0,85 med förloppet, refräng/drop 1), taktdipp 60 % i
  refrängen (50 annars), energigolv 0,8 i refrängen, build laddar halvt, siren 0,25+0,45p. Replay: topp refräng 0,76 / build 0,66 /
  vers 0,62 (före ~0,78 överallt), slagdjup refräng 68 %, tända lampor oförändrade. Förkastat: grundton på mörka lampor, kickblixt på alla.
KLART 2026-10-12 (dagsession): alla rutor >= 2 (ägaren: "gärna att alla har minst 2 st") - flod (lugn x build), famn (lugn x high),
  spaning (fart x intro), startskott (full x intro), siren (full x build), skuggor (full x break). 64 effekter. Närmaste syskon
  flod-rullandning 0,78. effectSimilarity saknade c.lamp/trebleEnv/airEnv (rättat). Replay: 14 nya = 6,3 % av tiden, 47 olika looker;
  break-rutorna (glimt, efterskalv, skuggor) väljs aldrig - ladans 'break' har basgång (eko 30 %). NÄSTA: rutorna till 4-6.
GÖR, några rutor per natt (5-8 nya effekter), tomma rutor först: lugn x high (lugn låts refräng), lugn x build, fart x intro,
fart x break, full x build, full x intro, full x break, full x low. Sedan varje ruta upp till 4-6, och inom rutan minst en per
musikdimension (basgång / kick / ingen takt). REGLER för en ny effekt: egen signal ur rutan (inte en dubblett), rumslig (spridning
>= 0,3 i effectDyn, aldrig alla lampor lika - de enhetliga får energi på utvalda lampor), kulör ur paletten via c.hueIdx (kulörsvansen
vid frasbytet ska finnas kvar - ägaren gillar den), ingen vitning (avmättnad <= 0,35), fastLight bara om stegen är kortare än 150 ms,
strobe <= 3 Hz synkront. ÄGAREN 10-12: INGET SKA KÄNNAS SOM STROBE - högst 1 blink per slag och LAMPA (som rulle: grupper får
turas om), kulörbyten högst 1 per slag. Mät med effectDyn 'blink/slag' (alla 78 <= 0,42 den 10-12). Bevis per effekt: effectDyn (spridning/rörelse/nivå), effectSimilarity mot syskonen i rutan (< 0,9), att
dirigenten väljer den i rätt läge (showTight/concertBench lookTime på mixar + ladan-2026-10-11-inspelningarna). Effekter på tagg
(section/tier/toggle) räcker för att dirigenten ska hitta dem; kontrollera att poolen inte töms (fallbacks i effects.ts).
Deploya aldrig - "redo för ladan" med listan av nya effekter, ägaren tittar.

## LÄGET 2026-10-11 12:31 - KONSERTLÄGET ÄR ENDA LÄGET (LIVE i ladan, ägaren: "mycket bättre, gör det till enda läget")
Live sedan 12:31 (a3ce847, deployad, ingen env utöver DROP_MIN_GAP_S): CONCERT = true i koden = sektionspalett, frasbyten, lamptrappa v2,
kulör per fras, full öppnar 0,6, aldrig enhetliga effekter (UNIFORM), BUILD före drop (kroppen borta 5 dB/1,5 s; build-sektion direkt),
effekten leder (energins golv 0,6), varje slag (dämpning mellan slagen 0,3 i steg 1), energi per lampa (EffectWants.energy, SPOT-regeln).
STÄMNINGARNA chill/fest/galet BORTTAGNA: vredet/slidern = bara ljustak (master 0,2..1). Bänken = live nu (natt.py kör samma kod).
Mått (enda-laget): lampspr 99/74, kickTraff 0,47/0,39, build före drop 0,50/0,47. Ny baslinje: natt/2026-10-11-enda-laget.json.
UPPBYGGNAD + MINIDROPS LIVE 12:5x (3eeab5a): effekten upptakt (en lampa pendlar, farten dubblas var 4:e takt) tar builden, enhetliga
build-effekter ur poolen; minidrop = högst en per 2 s och alla fyra lamporna samma kulör fullt en kort stund. Ägaren hade sett att
"uppbyggnad och mindre drops" var svagast - mät dem på långinspelningen nedan och föreslå förbättringar.
FÖRSTA LÅNGINSPELNINGEN: tools/ladan-2026-10-11/lang-20261011T103310.wav (10 min, 48 kHz, ladans nivå, ägaren spelade låtar med builds
och drops; .events.json har drop/minidrop/sektion/look per 100 ms MED DEN GAMLA build-logiken före 3eeab5a). Inte i git (gitignore
ladan-*). ANDRA: lang-20261011T105428.wav (10 min, MED nya build/minidrop-logiken 3eeab5a - jämför de två). TREDJE: lang-20261011T112342.wav (10 min, MED build som håller och landar 1feda46 - en drop per build, mät att dropen landar på smällen). Kör showTight/concertBench/dropFacit på dem: breaklängd före riktiga drops (4 s-kravet), build före drop, minidrops.
ÄGAREN GILLADE 10-11 ~13:3x: "när den fadar av på sekundära färgen sen byter, det var riktigt snyggt" - MITT I en effekt (inte efter
blink/drop). Troligen kulörbytet per fras (HUE_PHRASE) + uttoningens svans (gamla kulörkanalen tonar 0,25 s, nya tänds direkt). Den
"kulörsvans" som förr räknades som en brist ska BEHÅLLAS. Ta inte bort den, och tänk på den när effekter görs om.
MINIDROPS 08188fc: energilyft (lugnt -> basslag) + lyft som håller 0,5 s; ägaren: minidrop = "från lugnt till ett tydligt energilyft
(även om det är lägre) med basslag". Mät på långinspelningarna om lyften sitter på rätt ställen.
ÖPPET FRÅN ÄGAREN: "mindre drops [minidrops] ska vi kanske justera så att alla lampor då lyser lika iaf eller något, vet ej exakt än" -
förbered förslag med mått (t.ex. minidrop = alla fyra lamporna lyfts lika en kort stund, i steg 1), bygg som opt-in, ägaren avgör.
GALLRING att föreslå: UNIFORM-effekterna (breathe, snap, mono, pulse, party, airglow, hjarta, tyngdlyft, strobe) väljs aldrig längre i
smart-läget - bara manuellt. Föreslå gallring eller omgörning till spatiala varianter; gallra inte utan ägaren.

## (äldre) LÄGET 2026-10-11 eftermiddag (ersätter äldre "LÄGET"-rader nedan där de krockar)
KÖR LIVE i ladan (deploy 10-10 20:27): TRE STEG, Lägsta nivå 0,2, 4 s break före riktig drop, minidrop byter inte look, toggle-effekter
utan grundnivå + föredras vid låst takt, arecord FIFO 60. COMMITTAT MEN EJ DEPLOYAT (identiskt i bänken, ägaren kör `python tools\ladan.py`):
beatFeed.ts, långinspelningen (/setup "Spela in 5 min"), reglagerensningen (döda flaggor, env-brytare, dwell = fast 45 s, gamma en källa,
släckgräns bara /setup). OPT-IN SOM VÄNTAR PÅ ÄGARENS ÖGA (rör inte deras standard; mät gärna mer):
  DMX_SECTION_PALETTE=1, DMX_PHRASE_SWITCH=1, DMX_LAMP_STAIR=1 (v2: glesa lamppar i vers/intro), DMX_HUE_PHRASE=1  = konsertpaketet
  DMX_TIER_OPEN=0.6 (full ljusare än fart)   DMX_DROP_STROBE=<DMX> (lampans strobe-kanal vid drop, ≤ 3 blixtar/s, kalibreras i ladan)
  Siffror: tools/natt/konsert/*.json, rapport-artifacten (tools/natt/artifact.txt). Bänk: tools/concertBench.mjs, lampCount.mjs, knobSweep.py.
NÄSTA FÖR NATTAGENTEN, i ordning:
  1. Om ägaren spelat in lang-*.wav (snippets, hämtas i ladan): lägg dem i bänken (natt.py-mängd), mät drops med historik (dropFacit.mjs),
     breaklängd före riktiga drops (är 4 s rätt?), och om de "döda" rattarna i tools/natt/rattar.md (SECTION_UNIT_RESERVE_MS, SYNC_ERR_FRAC,
     DROP_CALM_BUILD, DROP_LAND_GAIN, E_RELEASE_MS, MIX_UNSEEN_BONUS, NEAR_FULL_DB) är döda även på riktigt material -> ta bort med json-bevis.
  2. Lugn-effekterna (breathe, mono, airglow) väljs aldrig - mixarna har ~60 s lugnt. Mät på långinspelningar/lugna korpusklipp innan gallring.
  3. Kick->ljus 150 ms (bara uppgången får kortas) - ny baslinje sedan beatFeed (mätfälla 43); budgeten i rapporten.
  4. Konsertshowen vidare om ägaren godkänt paketet: fler SPARSAMMA effekter (egna 1-2-lampsvarianter), kulör per sektion i fler effekter.
AGENTERNA 10-11: nattagentens instruktion omskriven (kortare, dagens ljusväg; gamla i tools/natt/agent-backup/). Analysatorfel skrivs till
tools/natt/analysator-fynd.md - lotus-morgonagenten läser den varje morgon (dess steg 4e) och fyller i Status.
Mätfällor sedan 10-10: 43 = bänkens taktmatning (nu beatFeed som live), 44 = korpusens första 15 s (analysatorns uppvärmning; använd energiR15).

## STANDARD ÄNDRAD 2026-10-10 19:50 (ladan): "Lägsta nivå" energyFloor 0 -> 0,2 (låtbyten och tysta intron var svarta 10-15 s: energifönstret mindes förra låten + brant kurva). Ny baslinje i bänken - kör om natt.py-baslinjen före jämförelser.

## LÄGET 2026-10-10 20:30 (ladan, kvällens fem fixar - båda STANDARD, filerna på Pi:n md5-verifierade, aktiva vid nästa omstart)
1. LÅSNINGARNA LÖSTA (e5012f0): "låser sig ibland" var att ljudet slutade komma 0,5-2 s ~15-22 ggr/h (I2S SYNC error efter varje omstart
   av capturen). Orsak: arecord låg på kärna 3 med vanlig prioritet bredvid dmx-helperns FIFO-50-tråd -> 21 ms-bufferten rann över.
   Fix: audio.ts spawnar `chrt -f -p 60` på arecord. Prov 15 min: 0 avbrott (väntat ~5). Kodekens state är rätt (127 kontroller jämförda).
   RÖR INTE: arecords prioritet/kärna, DMX_ALSA_BUFFER eller audio.ts STALL_MS utan nytt ladanprov. Bänken (PC) påverkas inte.
   Rapportera bara om du ser något i koden som kan svälta arecord igen (t.ex. ny realtidstråd på kärna 3).
2. "Svart vid låtbyte" = energifönstret minns förra låten ~10 s + brant kurva (e 0,4 -> md 0) - inte släckgränsen. Därför energyFloor 0,2
   (193beaf, se nedan). Ägaren: "nu är låtbytena bättre, lyser hela tiden". Om du rör energin: låtbyten och tysta intron får inte bli svarta
   igen - mät mörker de första 10 s efter en låtgräns i bänken (mixarna) före/efter.
3. FÄRRE RIKTIGA DROPS (cd1d932, live 20:07): BODY_GONE_MIN_MS 2000 -> 4000 i DMX-profilen (riktig drop kräver 4 s break). Ägaren:
   "hellre färre drops, mini fångar dom", "minidrop gör inget om de blir fler". Bänk: megamix 27->15, pop 4->2, minidrops 23->25.
   OBS drop-facit (uppgift 1b): bänken fyrade 2/10 på ladan-2026-10-10 före, 0/10 nu - mät klippen med 4000 och skriv hur långt
   breaket före varje riktig drop är (fyrade de live med 2 s-kravet bara för att breaket var 2-4 s?). Sänk inte kravet utan ägaren.
4. MINIDROP BYTER INTE LOOK (93bfae1, live 20:18): minidropen lyfter bara ljuset. Ägaren: "minidrop måste ju inte orsaka look-byten".
   Bänk: byten/min oförändrat (pop 6,2->6,0, megamix 6,8) - MIN_HOLD 8 s styr takten, bytena hamnar nu på nästan-drop/sektion/basgång.
   Ägaren: "låt 8 sekunder ligga" - rör inte MIN_HOLD. Minidrops är redan många (pop 11/min, megamix 58/min vid MINI_RISE_DB 10):
   sänk inte minidrop-kravet. showTight.mjs räknar nu minidrops (tajt.minidrops).
5. PARVISA EFFEKTER SYNS (6b8603d, live 20:27): toggle-effekter (EffectDef.toggle, nu även backbeat) får ingen FX_FLOOR - golvet lyfte
   'av'-gruppen till ~55 %, kontrast (max-min)/max bara 0,03-0,12 (tools/pairBench.mjs). Dirigenten tar varannat look-byte ur toggle-
   poolen när takten är låst och beatTrust >= 0,85 (ägaren: "är bpm låst och tydlig takt så vill jag att dirigenten föredrar dom").
   Bänk: toggle-andel pop 0,25->0,44, megamix 0,35->0,48, lampspr 50->64 / 28->40, ljus p50 0,59->0,50 / 0,70->0,64.
   MÄTFÄLLA 43 (gäller ALLA bänkar - showTight/pairBench/dynBench): bänken sätter cfg.beat.anchorMs = fr.beatAnchorMs varje hop, live
   (index.ts) har en PLL som nudgar ankaret. I bänken hoppar ctx.beatFrac 0,00->0,45 på 27 ms varje slag (halverad effektklocka +
   ankarhopp -> halfTick flippar fel), så grupp A:s topp ritas aldrig. UPPGIFT: gör bänkens taktmatning som live (bryt ut PLL-delen
   ur index.ts och använd den i bänkarna, bevisa identisk), mät sedan pairBench igen och skriv kontrasten per toggle-effekt. Kolla
   också om halfTick-flippen kan ske live (beatTick vs beatFrac-wrap när ankaret nudgas). Ändra aldrig den delade analysatorn.

## Från 2026-10-10 eftermiddag — NYA DROP-KLIPP + LÅNG INSPELNING (efter "FÄRRE REGLAGE")
KLART 2026-10-10 natt (8a3f782): (1) tools/dropFacit.mjs - bänken 0/10 fulla drops men minidrop vid dropen 10/10 (±0,4 s, rise 10-27 dB);
klippen börjar 15 s före dropen så analysatorn ser aldrig kropp->borta->tillbaka (live hade minuters historik) - breaklängden går inte
att mäta ur dem. (2) "Spela in 5 min" i /setup (src/longRecord.ts, /api/longrec; egen modul, recorder.ts är delad med lotus), alltid
tillgänglig, ingen kostnad i vila. NÄSTA: när ägaren spelat in lang-*.wav - kör dropFacit/showTight på dem (drops med historik).
Ägaren i ladan 10-10 ("ja, lägg in båda"). LÄGET: kodens standard deployad 10-10 ~14:10 (TRE STEG, dimmern konstant, minsta på-tid
lampa 150 ms / färgkanal 100 ms med EffectDef.fastLight (strobe), Släcktid 3 s, Lägsta nivå 0 % (energins golv), energin släcker aldrig
en tänd lampa). Live-mätning 10-10: 19 looks/3 min, färg DMX p5/50/95 18/75/215, max 242, DIM 255.
1. DROP-FACIT: tools/ladan-2026-10-10/ = 10 klipp à 30 s (recorder, Aux -18 dB, 0 % klippt, RMS p50 -15..-25 dBFS), kind "drop":
   riggen fyrade en RIKTIG drop vid 15,0 s i varje (prerollSamples 720000; motorns live-flaggor i *.events.json "flags").
   (a) Lägg klippen i bänken (dynSet/natt.py, egen mängd "drop1010") och mät ljusets språng 0-2 s efter 15,0 s mot 1 s före,
       drop-looken (blackout före, dropfärg/vit kärna), nästan-drops - oavsett om bänkens detektor fyrar.
   (b) Bänken (showTight, även med DMX_DROP_SONG_HOLD_S=0) fyrar bara 2/10 drops + 3 minidrops: ta reda på varför - för kort
       historik före dropen (15 s; detektorns baslinjer/uppvärmning), låtstartsregler, eller en verklig skillnad mot live
       (jämför med flags i events.json). Ändra ALDRIG den delade analysatorn för att få bänken att träffa; skriv fyndet.
2. LÅNG INSPELNING I APPEN: knapp i /setup "Spela in 5 min" (eller 2-3 min) som tar ett sammanhängande stycke ljud + motorns
   händelser till /var/lib/audio-dmx-engine/snippets (Recorder.startRaw finns: max 150 s full takt / 420 s 16 kHz - bygg det som
   behövs för 5 min 48 kHz mono ≈ 29 MB, eller dela i flera filer). Bara aktiv när DMX_RECORDER=1 (realtidsprincipen) - eller
   föreslå hur den kan vara på utan att belasta showen. Status i UI (spelar in / klar / fil). Deploya aldrig; "redo för ladan".

## Från 2026-10-10 kväll — KONSERTSHOW ⭐ (efter de två ovan; "löser du det får du en stjärna i kanten")
STEG 1+2 KLART 2026-10-10 natt (51c237b, rapport-artifact v4): tools/concertBench.mjs + sektionspalett opt-in DMX_SECTION_PALETTE=1
(paletter/sektion 2->1, palettbyte på gräns 0,1->0,97, återseende 0,23->1,0; av json-identisk; resultat i tools/natt/konsert/).
ÄVEN BYGGT samma natt (opt-in, av json-identisk): DMX_PHRASE_SWITCH=1 frasbundna byten (cf67e68; pop bytePaFras 0,22->0,45,
megamix 0,09->0,18), DMX_LAMP_STAIR=1 lamptrappa via dirigenten (712ee4b; pop allaTanda 0,81->0,69, versRefrang 0,06->0,21,
natt r 0,17->0,34; PRIS 11 aldrig valda mot 5). Alla tre ihop: tools/natt/konsert/*-alla3.json. VÄNTAR PÅ ÄGARENS ÖGA i ladan.
10-11 FÖRMIDDAG (sessionen): (a) KLART a0b4b22 - lamptrappan glesar ut icke-sparsamma effekter till ett lamppar i vers/intro
(steg 1) i st.f. att begränsa poolen: allaTanda pop 0,53, megamix 0,74, versRefrang 0,26/0,29, aldrig valda 4. (b) KLART 24a0109 -
DMX_HUE_PHRASE=1 (ctx.hueIdx): kulörbyten/min 17->13 / 21->16. ALLA FYRA ihop (tools/natt/konsert/*-alla4.json): kulörbyten 11/14,
kulörer/sektion 3, paletter/sektion 1, allaTanda 0,54/0,76, versRefrang 0,25/0,28, aldrig valda 8. (c) KLART 9bca6cd: DMX_DROP_STROBE=<DMX> = lampornas EGEN strobe-kanal under drop-smällen (RGB kan inte strobea -
uttoningen; snabbare fade förbjudet). KALIBRERAS I LADAN med lågt värde, max 3 blixtar/s. Röken var redan rätt (drop + hunger 300 s).
VÄNTAR PÅ ÄGARENS ÖGA i ladan (alla opt-in).
FART->FULL (nattagentens brist) KLART 9bca6cd: DMX_TIER_OPEN=0,6 (energins golv höjs med andelen full): full mot fart korpus
0,29->0,35 (fart 0,28), megamix 0,61->0,66 (fart 0,63), pop 0,56->0,63 (fart 0,50); r upp överallt. Opt-in, redo för ladan.
RATTSVEPET KLART 9bca6cd: tools/knobSweep.py -> tools/natt/rattar.md. Döda på mixarna: DWELL_MS (env-standarden 45 s vinner
alltid över cfg.smartDwellMs -> stämningarnas/UI:ts 'Byter effekt' är verkningslös), SECTION_UNIT_RESERVE_MS, SYNC_ERR_FRAC,
DROP_CALM_BUILD; nära noll DROP_LAND_GAIN/E_RELEASE_MS/MIX_UNSEEN_BONUS/NEAR_FULL_DB/NEAR_MIN. Dubbletter rättade: DMX_GAMMA en källa
(output.ts), DMX_SILENCE_LEVEL bort (/setup enda källan). NÄSTA: avgör per död ratt om den är död även live (lugnt material,
lång-inspelningarna) innan borttagning. DWELL KLART 58fcdff (ägaren: 'kör på vad du rekommenderar'): fast 45 s, smartDwellMs/UI bort.
Ägaren: "Hur kan vi få ljusshowen mer lik en riktig konsert-show?" Riggen: 4 RGB-parlampor (dimmer konstant, R/G/B bär allt),
rökmaskin, inga movers; allt i realtid ur aux (ingen låtlista, inget låtminne). Arkitekturen är fast: TRE STEG (effekt -> energi ->
kalibrering), effekterna äger färg/styrka/lampa, dirigenten väljer look.
1. ANALYS (skriv i rapporten, kort): vad gör en ljusdesigner på en riktig konsert som vår show INTE gör? Tänk t.ex. på: dramaturgi per
   sektion (återhållsam vers, stor refräng, kontrast/blackout i break), EN palett (2-3 kulörer) per låt eller sektion i stället för nya
   färger hela tiden, "hits" på accenter (snare/stab) och tystnad mellan, antal tända lampor som dynamik (1 -> 2 -> 4), symmetri och
   rörelse över riggen (chase/sweep i takt, spegling), bygg-och-släpp kring drops, strobe och rök sparsamt och vid rätt ögonblick,
   att samma sektion ser likadan ut när den kommer tillbaka (igenkänning), och övergångar som följer frasen (4/8/16 takter).
   Mät det som går att mäta i bänken (mixarna + ladan-klippen): t.ex. kulörer per minut, hur ofta riggen är helt tänd, lampspridning,
   skillnad vers/refräng, look-byten mot frasgränser - jämför med vad en konsertshow skulle ha. Döm på kurvan, inte på gehör.
2. EN idé, bevisad, som ger mest "konsert" för ögat - t.ex. sektionspalett (dirigenten låser 2-3 kulörer per sektion och byter palett vid
   sektionsgräns), eller "lamptrappa" (antal tända lampor följer sektionens energi), eller frasbundna byten. Opt-in, json-identisk av,
   före/efter-mått, "redo för ladan" med exakt kommando. Bryt aldrig: inget lager efter effekten får lyfta/vitna, fade-down aldrig
   snabbare, energin släcker aldrig en tänd lampa, ändra aldrig den delade analysatorn. Deploya aldrig.
3. Resten av idéerna som en rangordnad lista (nytta för ögat / insats) i rapporten - ägaren väljer nästa.

## Från 2026-10-10 — FÄRRE REGLAGE (går före allt annat)
KLART 2026-10-11 natt (16e43da): av-brytarna MIX_V2/SECTION_SWITCH/SECTION_UNIT/HALVE_SHOW/BOUNDARY_SOFT + döda DMX_EXPECT_LEAD_MS bort, effects.ts env-läsningar 52 -> 47, json-identisk (mixar + 222 klipp + ladans 20). Kvar som eget spår: inventeringstabellen med mätt effekt per numerisk ratt + dubbletterna.
DELVIS KLART 2026-10-10 kväll (sessionen, allt json-identiskt mot natt/2026-10-10-baslinje-beatfeed.json): 7 döda config-/UI-flaggor
(4177e02: beatPulse, calmDecay, energyCeiling, clubMode, ambientGlow, strobeUnlimited, regiPro), oanvända konstanter (4ed3851),
5 env-brytare (2f0c662), SECTION_REUSE (66d5f5c), ENERGY_FALLBACK. KVAR: av-brytarna för
MIX_V2/SECTION_SWITCH/SECTION_UNIT/HALVE_SHOW/BOUNDARY_SOFT (många användningar - en i taget med json-bevis), inventeringstabellen (steg 1) med
mätt effekt per numerisk ratt, dubbletterna (steg 3). Behåll som prov: DMX_PHASE_FOLLOW (lotus gridfas 0,95 mot kick-PLL 0,49 -
kandidat för bättre takt, kräver GRID_PHASE i DMX-profilen) och DMX_AUDIO_CLOCK (omätt på Pi-DMX). OBS ny baslinje: kick->ljus 125->150 ms
i bänken är MÄTNINGEN (beatFeed som live, mätfälla 43), inte koden.
Ägaren 10-10: "kolla om vi kan minska antal reglage ännu mer, om de inte gör något eller om t.ex. två gör nästan samma sak, går de
kombinera m.m." Ljuset styrs nu på TRE ställen (effekt -> energi + en uttoning -> kalibrering, se pi-dmx/TRIMRATTAR.md); allt annat
som rör ljuset är borta (backup-taggar backup/fore-ett-ljus-2026-10-10, backup/fore-tre-steg-2026-10-10).
GÖR:
1. INVENTERA alla reglage: env-rattar (effects.ts 55, index.ts 10, server.ts 3, output.ts 2, audio.ts 2, analyserProfile DMX-delen),
   config-fält (src/config.ts), stämningarna (src/moods.ts) och /setup (public/index.html). Tabell: namn, standard, var den läses,
   vad den gör, MÄTT effekt (natt.py --snabb + dynSet med ratten på ett annat värde - ger den 0 skillnad = död).
2. STARTLISTA (10-10, grep): config-fält som effects.ts inte läser alls: ambientGlow, energyCeiling, calmDecay, clubMode,
   beatSyncStrength (kolla index.ts/analysator), strobeUnlimited, regiPro, beatPulse (45 träffar i src men 0 som cfg i effects.ts -
   kolla vad som läser den) - och stämningarna/vredet som sätter dem. Om ingen läser dem: bort ur config, moods, server, UI.
3. DUBBLETTER: rattar som gör nästan samma sak (t.ex. flera golv/tak, dropEnv/dropColEnv-vägar, MINI_*/NEAR_*-par, sektionsrattar)
   - föreslå EN, mät att showen blir densamma (eller bättre), slå ihop.
4. Varje borttagning: json-identisk (natt.py --snabb) om ratten var död; annars mät före/efter och skriv i rapporten. En commit per
   grupp. Deploya aldrig. TRIMRATTAR.md uppdateras. Markera "KLART <datum>: <antal före -> efter>".

## Från 2026-10-10 — RENSA DEN DÖDA PULSKODEN (EN VÄG FÖR LJUSET)
KLART 2026-10-10 (i dagsessionen): -196 rader, json-identisk.
Ägaren 10-10: "kör ren kod utan massa toggels" - dimmern är en konstant och dimmerpulsen är borta (backup: git-taggen
backup/fore-ett-ljus-2026-10-10). Kvar i effects.ts är koden som RÄKNAR pulsen (beatMulNow: ENERGY_FB/transientpuls, ENERGY_RISE_K
'energi direkt', PULSE_GAP_*, BEAT_MIN, BEAT_FLUTTER_RELEASE, HEARTBEAT/hbEnvelope, BEAT_LIFT) men den når inga lampor längre.
Ta bort det som inte läses av något annat (kolla index.ts telemetri frame.beatMul, effekternas ctx.beatPulse/heartPulse - de är
EFFEKTENS puls och ska vara kvar). Bevis: natt.py --snabb json-identisk före/efter, dynSet identiskt. En commit per block.
Markera "KLART <datum>".

## Från kvällen 2026-10-09 — KVÄLLENS LADAN-ENV BLIR KODENS STANDARD (går före allt annat)
KLART 2026-10-10: tolv prov → kodens standard (TEMPO_* via DMX-profilen), E_SLOW_MS/HUE_CUT_MS/DIM_PULS/CH_MAP borta; mixar + effektval json-identiska mot ladans env, ladans 20 klipp identiska i allt ljus; TRIMRATTAR uppdaterad. Nästa ladan: `python tools\ladan.py` utan --env.
Ägaren i ladan 10-09 ("nu kör!" → "ja, gör dem till standard i natt"). Det som kör på Pi:n nu (ladan.conf, deployat ~10-09 kväll)
utöver SHOW_ENV (DMX_DROP_MIN_GAP_S=15):

  DMX_HUE_CUT=1  DMX_ALLA_LOOKER=1  DMX_E_CURVE=10  DMX_E_TOP=0.95  DMX_E_WIN_S=10  DMX_E_GATE=1
  DMX_GAMMA=1.6  DMX_E_NORM_S=2  DMX_E_LIN=1  DMX_FX_FLOOR=0.6  DMX_TEMPO_SHIFT=1  DMX_TEMPO_HOLD=1

GÖR (ägarens princip: ersätt, lägg inte till lager - flaggan försvinner, den gamla vägen tas BORT, värdet blir koden):
1. BASLINJE FÖRST: `python tools\natt.py --snabb --tag fore-standard --env <alla tolv ovan>` + `python tools\dynSet.py --env <alla tolv>`
   (spara json). Det är facit: efter varje steg ska `python tools\natt.py --snabb` UTAN --env ge json-identiska mixar mot den.
2. Gör standard, ett steg i taget, en commit per steg, json-identisk efter varje:
   - effects.ts: HUE_CUT (postprocess.ts: per-lampa-vägen blir enda vägen, kanalvisa ballistiken för färg bort), ALLA_LOOKER
     (registry.ts: REQ_ALLA blir REQUIREMENTS; effects.ts: build-inträdet + minst-spelad blir enda vägen, gyllene snittet bort),
     E_CURVE 10, E_TOP 0,95, E_WIN_S 10, E_GATE (fönstret uppdateras bara över ingångsgränsen), E_NORM_S 2, E_LIN, FX_FLOOR 0,6.
   - output.ts: GAMMA 1,6 som standard i LUT:en (ratten kan bli konstant).
   - TEMPO_SHIFT och TEMPO_HOLD ligger i den DELADE analysatorn: sätt dem i DMX:s egen PROFIL (src/analyserProfile.ts, sys:
     TEMPO_SHIFT '1', TEMPO_HOLD '1') - INTE som ändrad standard i analyser.ts (då ändras lotus). analyser.ts orörd ⇒ md5 orört.
3. TA BORT rattar som provats 10-09 och inte används: DMX_E_SLOW_MS, DMX_HUE_CUT_MS (och hueRatio), DMX_DIM_PULS (förkastad i ögat),
   DMX_CH_MAP + output.intent om HUE_CUT gör den onödig (mät ofrivBlink i dynSet före/efter - ska vara 0 kvar), E_STAT finns inte.
   Bevisa json-identitet mot steg 1 efter borttagningen.
4. ladan.py: SHOW_ENV oförändrad (bara DROP_MIN_GAP_S). Deploya ALDRIG - ägaren kör `python tools\ladan.py` (utan --env) nästa
   gång; då skrivs ladan.conf om och showen ska se exakt likadan ut som i kväll. Skriv det i rapporten.
5. TRIMRATTAR.md + ARKITEKTUR.md: uppdatera energin (fönster 10 s, tystnad räknas inte, topp 0,95, kurva 10 i DMX-procent efter
   gamma 1,6, effektens topp normerad 2 s, grundnivå 0,6), färgen (kulör direkt, ljusstyrkan tonar), dirigenten (alla 44 nås).
   Markera detta avsnitt "KLART <datum>: <en rad>".
Mätfällor från kvällen: bänkens nivå är -17 dBFS sedan 10-09 (mätfälla 42); dynBench mäter med cal.on 16 (standardconfigen saknar
cal); jämför json, inte scoreboardrader; ingen ändring i analyser.ts (lotus-agentens fil, md5-spärr).


## Från kvällen 2026-10-08 — LEVANDE DYNAMIK UTAN FLADDER (går före kodoptimeringen nedan)
KLART 2026-10-09: instrument dynBench/dynSet (+ natt.py -> dynamik.md); R/G/B = DMX_CH_MAP=1 (ofrivillig blink 4,3 -> 0/min/lampa, alla3 0,022 -> 0,038, json-identisk av); dynamik-kandidat DMX_E_CURVE=3 (spann 0,78 -> 1,18 steg, kontrast 1,50 -> 1,68, fladder 1,6 -> 1,1/min, ljus p50 -6 %); pulsen pa foljande fonstret = ingen matbar skillnad (kan bytas som ren forenkling). Redo for ladan, EN i taget.
Ägaren i ladan, ordagrant: "jag vill att nattagenten kollar över detta med dynamiken så ljuset känns levande, börjar bli bra.
Men tror vi kan göra det bättre. Då utan att de fladdrar."

LÄGET (godkänt och live 10-08 kväll, läs pi-dmx/TRIMRATTAR.md och memory/pi-dmx.md sista avsnitten):
- Ingången: Aux −18 dB (klippte förut - ALLA gamla ladan-inspelningar är klippta, nivåspann ~5 dB; mät INTE dynamik mot dem).
- Energin: ingångens volym (levelVU) i dB i ett FÖLJANDE fönster (E_WIN_S 20, E_MIN_DB 4) → kurva E_CURVE 2 → avklingning 100 ms →
  EN dämpningsfaktor på effektens RGB (aldrig > 1). Ägaren: "mycket bättre nu".
- Minidrop: lyft 0,9 i MINI_BANG_MS 150, ingen spärr. Nästan-drop 0,5–0,85. Ägaren: "drop-lyftet hjälper dynamiken".
- Utgång: en mappning (färg 1 % → släck+1; DIM golv+1..0,95 × fullpunkt 255; bara full drop till 255).
- Puls: effekternas c.heart + energipulsen ("energi direkt") som fortfarande läser det GAMLA dB-fönstret (liveLevelSm/lightLoud) -
  samma sak mäts alltså på två ställen. Kandidat: låt pulsen läsa samma följande fönster (en signal).

GÖR:
1. INSTRUMENT FÖRST: skriv/utöka en bänk som mäter (a) LEVANDE: energifaktorns spann i STEG (log2(p90/p10) av md), ljusets
   1 s-envelopp mot ingångens dB (r), och lugnt-mot-högt-kontrast; (b) FLADDER: per lampa antal riktningsbyten i ljuset med
   amplitud > 5 % av fullt inom < 150 ms som INTE ligger på ett slag/kick (±60 ms) - det är fladder, slagpuls är inte fladder;
   rapportera fladder/min. Kontrollera instrumentet: en konstant ton ska ge ~0 fladder, en ren kickloop fladder ~0 och puls = kickar.
2. MÄT läget med de NYA inspelningarna: tools/ladan-2026-10-08/*.wav (20 klipp à 30 s, 48 kHz mono, inspelade av motorns recorder
   i ladan 10-08 med Aux −18 dB: 0 % klippta sampel, 100 ms-RMS p10/p50/p90 −25,8/−17,4/−12,7 dBFS = 13 dB spann; .events.json/.json
   bredvid). Kör showTight på dem UTAN --norm (de ÄR ladans nivå). De gamla pop/megamix_ladan är klippta - räkna dem inte för dynamik.
   Lägg gärna till klippen i natt.py som en tredje mängd ("ladan10-08") så dynamiken följs natt mot natt.
3. EN idé, bevisad: mer levande (spann i steg upp, r upp) med fladder/min inte upp. Kandidater: pulsen på samma följande fönster;
   E_WIN_S/E_MIN_DB/E_CURVE; energins uppgång (attack) när volymen stiger; per-lampa-dynamik (inre/yttre). Fallhastighet får INTE
   ökas för lampan (DMX_FADE_MIN_S); energins egen avklingning ägs av ägaren (100 ms nu).
4. Allt som opt-in env, "redo för ladan" med exakt kommando. Ägarens princip: ersätt, lägg inte till lager.
5. STABILARE R/G/B (ägaren 10-08: "få lamporna att köra stabilare på r g b dioderna. nu kan tex R lysa och B fladdra till"):
   TROLIG ORSAK: en svag SIDOKANAL (t.ex. B i en rödaktig kulör) skalas med lampans ljusstyrka (energi/puls via colK i
   output.ts calibrate) och passerar diodens fysiska tändpunkt (~16) upp och ner -> B tänds/släcks i takt med LJUSSTYRKAN, inte
   med färgen. Förr fanns DISTINKTA FÄRGER (HUE_RATIO_ON 0,25 / OFF 0,15: sidokanal tänd/släckt efter sin ANDEL av starkaste
   kanalen, med hysteres) - den låg på !LOW_PURE-vägen och togs bort i steg 1 10-08 som död. Återinför DEN REGELN på den levande
   vägen i output.ts (färggrenen): sidokanalens andel avgör på/av med hysteres; tänd sidokanal hålls minst på sin tändpunkt+1 så
   den inte blinkar vid låg ljusstyrka; släckt = 0. Kulörens förhållande bevaras i övrigt. Mät med colorBench (per kanal) + ett
   nytt mått: antal på/av-växlingar per sidokanal och minut (ska ner mot 0 när färgen står still). Opt-in först, redo för ladan.
   FÖRSTAHANDSVAL (ägaren 10-08: "den skall ju kunna köra 50% blå och 30% röd") = PER-KANAL-MAPPNING: i output.ts färggren mappas
   VARJE färgkanal för sig: 0 = släckt, 1..255 -> den kanalens tändpunkt+1 (onR/onG/onB, annars on) .. tak - i stället för att
   alla kanaler skalas med den starkaste kanalens faktor (colK). Då kan ingen kanal som effekten säger är PÅ hamna under sin
   tändpunkt, och 50 % B + 30 % R lyser båda stabilt. Ägarens regel "1 % = släck+1" per diod. Ingen hysteres/andelsregel behövs.
   Bevaka: (a) avrundning - energi/puls kan skala en svag kanal till raw 0 (8 bitar) -> av/på nära botten; mät och räkna i
   flyttal hela vägen till mappningen om det fladdrar; (b) kulören blir något ljusare nära botten (ej proportionell) - acceptabelt.
   (Alternativ B, kvantiserad kulör, STRUKEN: klarar inte blandningar som 50/30.) Alternativ A (andelsregeln) bara om
   per-kanal-mappningen mäter sämre.

## Från kvällen 2026-10-07 — KODOPTIMERING AV LJUSVÄGEN

PÅGÅR 2026-10-08 (körd i dagsessionen, datorn sov i natt): steg 1 klart (output.ts 19→3 rattar, 467→335 rader), steg 2 klart
(gamla energins döda delar + DIM-taket/LiveRange bort; dB-fönstret KVAR - det matar pulsens 'energi direkt' och drop-landningen),
steg 3 väntar på ägarens beslut om HARD_GATE, steg 4 ej påbörjat, steg 5 klart (pi-dmx/TRIMRATTAR.md). Alla steg json-identiska
mot baslinjen 10-08 (mixar + 222 klipp). Render 62→55 µs/ruta (timeProbe.mjs). Nästa: steg 4 (effects.ts 98 env-rattar).

Ägarens mål (ordagrant): "allt jag vill med detta är att koden skall bli snabbare, tydligare och enklare att trimma till rätt"
och "vi skall inte lägga massa olika spärrar på ljuset, blir ju till slut omöjligt att styra".

GRUNDKRAV (ägaren 10-07): "så simpelt och snabbt som möjligt, men få ut effekten". Ersätt vägar, lägg aldrig till lager.
Kvällens opt-in-prov (HARD_GATE, DIM_MAX, PULSE_GAP_BEAT, MINI_FULL, ENERGY_SRC, ENERGY_GAMMA, ALSA_BUFFER, FAST_RECOVER, NEAR_*) ska
antingen bli standard med gamla vägen BORTTAGEN, eller tas bort helt - de får inte bli kvar som parallella rattar.

ÄGARENS LJUSKONTRAKT (bestämt i ladan 10-07, går före allt äldre):
- Ända till output kör vi 0–100 %. Effekter/dirigent/energi vet INGET om hårdvaran (tändpunkt, golv, DIM-mättnad).
- 0 % = släckt, och det är dirigentens/effektens beslut. Effektens 1 % mappas till lampans SLÄCK+1.
- Mappningen är SISTA steget i output (`output.ts` LIN_MAP, standard sedan 10-07). Ingen annan modul känner till den.
- Effekt 100 % = 95 %; bara drop (dropEnv som tal till calibrate) öppnar de sista 5 %.
- Energilagret får bara MINSKA. Snabbare fade-down är fortfarande förbjudet.
- Ingångens lägsta: EN hård, justerbar gräns (Släckgräns i /setup) på analysatorns nivå, inga tider (prov DMX_HARD_GATE=1).

REGEL FÖR VARJE STEG: showen ska vara BIT-IDENTISK med kodens standard + ladans SHOW_ENV före och efter
(`python tools\natt.py --snabb` + korpus, jämför json, inte bara scoreboardraden). Ett steg = en commit. Faller identiteten:
revertera och skriv varför. Deploya aldrig (ägaren kör ladan.py). Rör aldrig analysatorn.

STEG I ORDNING (gör så många som hinns, ett i taget):
1. `output.ts`: ta bort de vägar som är döda med LIN_MAP som standard — CAL_V2 + dess 8 rattar (förkastat prov 10-06),
   klampningsgrenen (LIN_MAP=0), 10 %-regeln LOW_ON/OFF_CH, HUE_LIFT/HUE_RATIO (gäller bara utan LOW_PURE), MIN_DIM,
   LOW_PURE-flaggan om den nu alltid är på. Mål: ~3 rattar kvar (golv FLOOR_CH, MAP_TOP, DIM_MAX) och en calibrate
   som går att läsa på en skärm. Kolla att tools/ (calProbe m.fl.) inte bryts — gallra verktyg som bara mätte döda vägar.
2. ÄGARENS MODELL (10-07 kväll, ordagrant): "energilagret, följer det inte bara inputs energinivå med liten fade out?" - JA, så
   ska det vara. I dag: basens dB (LIVE_BASS_W 1 = bara bodyDb) -> 10 dB-fönster mot 120 s-ankare med särregler -> 3 utjämningar i
   rad (350 ms, 25/150 ms, log-release) -> TVÅ vägar (md på RGB golv 0,25 + uppbyggnad/drop/sektionsgas; vu på DIM golv 0,20, 0,45/1,2 s)
   -> sektionsdämpning. Bygg den enkla vägen: en energisignal, direkt upp, EN kort avklingning, ETT golv, applicerad EN gång (DIM).
   PROV LIVE 10-07: DMX_ENERGY_SRC=intensity (analysatorns frame.intensity 0,05..0,85 -> 0..1 i stället för dB-fönstret) gav i bänken
   pop r 0,20 -> 0,48, megamix 0,09 -> 0,45 - läs memory/pi-dmx.md om ägaren godkänt den; då är intensity energisignalen.
   GODKÄNT 10-07 ~20:20 ("mycket bättre energiföljning nu"): ENERGY_SIMPLE är STANDARD. Steg 2 = TA BORT den gamla energikedjan
   som nu är död: LIVE_LEVEL-fönstret/ankaret (LIVE_WIN_DB, LIVE_OFFSET_DB, LIVE_ANCHOR_*, LIVE_RELEASE_MS, LIVE_BASS_W, LIVE_CEIL),
   lightShapeSm/lightLoud/log-release/soft-snap, md0 med LIGHT_FLOOR/buildUp/dropEnv-påslag, sektionsgas (secGain/dynGain/RANK/
   EXPECT_LIFT), vu/range/CEIL_FLOOR/ceilMul-vägen, ENERGY_GAMMA, ENERGY_SRC - allt som bara matade md/ceilMul. Kolla vad ANNAT
   som läser samma fält (lightLoud används t.ex. av dirigent/tier? tierEma?) innan något tas bort; bevisa med natt.py att showen
   är bit-identisk med ENERGY_SIMPLE före och efter borttagningen.
   (Historik) Energin på ETT ställe med EN ratt: i dag multiplicerar energin både effektens RGB (md, golv LIGHT_FLOOR 0,25) och DIM
   (ceilMul, golv CEIL_FLOOR 0,20) — två golv som multipliceras. Effekterna äger RGB enligt kontraktet, så energin hör
   hemma på DIM. Kartlägg först (siffror), föreslå i rapporten, bygg som opt-in om det inte kan vara bit-identiskt.
   OBS ladans stegtest 10-01: DIM mättar vid ~85 (prov DMX_DIM_MAX=85 live 10-07 kväll, ägarens öga avgör).
3. Ingångsgränsen: om ägaren godkänt DMX_HARD_GATE (står det i memory/pi-dmx.md) — ta bort gamla tystnadsgrinden
   (SILENCE_MS, SILENCE_RELEASE_S, gain-skalning, START_FADE_MS, låtstartsflanken). Annars: lämna.
4. `effects.ts` (101 env-rattar, 2 114 rader): gallra rattar som aldrig blivit standard och vars standard gör grenen död.
   Lista först alla rattar med standardvärde + om grenen körs med SHOW_ENV; ta bort döda grenar några per natt.
5. Skriv/uppdatera EN tabell över trimrattarna som finns kvar på ljusvägen (fil, ratt, standard, vad den gör) i
   pi-dmx/ARKITEKTUR.md eller en egen TRIMRATTAR.md — det är ägarens trimyta.

Mät också: rader och env-rattar per fil före/efter, och process()/render-tid per ruta (snabbare = ett av målen).
HÄNG (ägaren i ladan 10-07 ~20:55: "känns som motorn hängde sig ett tag"): Pi-loggen visade 0 krascher/watchdog/OOM - bara
kvällens 5 deploy-omstarter (efter omstart 10-20 s utan taktlås/nivå). Mät ändå på PC:n i bänken: max och p99 för
render()-tid per ruta och för analyser.process per hop över hela mixarna, och vilka steg som kostar (effekter, dirigent,
postprocess, output). Ta bort onödiga beräkningar i ljusvägen (allokering per ruta, strängbyggen, döda grenar) - ägaren tror
att det är där hänget försvinner. Rapportera före/efter i ms.
Rapportera under egen rubrik. Markera detta avsnitt "KLART <datum>: <en rad>" när steg 1–5 är gjorda
(annars "PÅGÅR <datum>: steg X klart").

## Från kvällen 2026-10-07 (sent) — INGÅNGEN VAR ÖVERSTYRD
Ladans inspelningar pop_ladan.wav/megamix_ladan.wav är tagna med en ÖVERSTYRD ingång (22–29 % klippta sampel, 97–99 % av
sekunderna i 0 dBFS, nivåspann 5 dB). Ingången är sänkt 13,5 dB som standard (server.ts: Aux 49, Mixin PGA 3) och ägaren:
"mycket bättre nu". Konsekvens för bänken: mixarna motsvarar inte längre riggen för energi/nivå/tystnad — skriv det i
rapporten, jämför inte energimått mot gamla rader, och be ägaren spela in nya ladan-mixar (DMX_RECORDER=1) nästa gång.
Simulera inte nivåsänkningen på de klippta filerna (klippningen går inte att ta bort i efterhand).
