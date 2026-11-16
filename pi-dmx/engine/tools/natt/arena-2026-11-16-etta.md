# Arenan etta, 2026-11-16 13:30–15:55: taktens etta på musikens etta

Ägaren: "kör hel arena" (han var borta och kunde inte se ljuset). Inget är inlagt i src och inget är utlagt. Vinnaren väntar på ägarens ord.
Bas = HEAD 8acbe99 (ingen env). Domare: tools/arena/ettdom.py (ny). Den mäter motorns etta (effektklockans tick, beatIdx % 4) mot Beat This-ettan
på riktig musik genom hela motorn (konsertReplay --slag --delad-cfg). Mängder:
- Övning: 151659, 172432, 160345
- Mellan: 200719
- Kontroll: 171840, 193040, 193818

## VINNARE: f0 (jokerns final-remix = a6r + a8r:s backbeat)

| | övning | mellan (200719) | kontroll (3 filer) |
|---|---|---|---|
| rätt etta, bas -> f0 | 33,5 -> 86,5 % | 34,6 -> 68,9 % | 29,9 -> 63,9 % |
| ettan byts per min, bas -> f0 | 1,41 -> 0,48 | 1,58 -> 1,47 | 1,38 -> 1,17 |
| på slaget (spärr), bas -> f0 | 70,4 -> 71,0 % | 80,2 -> 80,7 % | 79,3 -> 79,9 % |
| poäng | +57,65 | +35,0 (bäst) | +35,00 (bäst) |

Kontroll per fil (bas -> f0): 171840 34 -> 63 %, 193040 29 -> 66 %, 193818 27 -> 62 %.

FINALISTERNAS KONTROLLER:
- dropdom3 (övning, 3 starter): drop, minidrop och uppbyggnad IDENTISKA med bas på alla tre filerna. us/hopp 154/115/142 mot 157/118/144.
- latskak (takt + låtbyten, 5 starter):
  - övning: bas 95,88 / f0 95,85 (takt 94,7 = 94,7, låtbyten 4/5 båda, 0 falska)
  - kontroll: identiskt 92,29 (takt 91,5, 2/2)
- klockdom DMX-läge 2 GICK INTE att köra: den kräver pop_ladan.wav och katalogmixen, som arkiverades 11-13 (hämtas inte utan ägarens ja). Ersatt med
  latskak ovan + paslag-spärren på sju filer.
- Kodgranskning (orkestratorn): bara analyserClock.ts + split.ts. Ingen allokering per hop, inga flaggor, en källa.
  - barOff ökar monotont. Alla konsumenter (beatClock, index.ts, server.ts) räknar med samma bpm som ankaret, så förskjutningen är alltid exakt
    hela slag och fasen påverkas inte.
  - Lotus läsning av ankaret är INTE kontrollerad: det får porten visa.

## Grundorsaken (fyra deltagare oberoende: a1, a4, a6, a8)
Rutnätets fasrättning flyttar ankaret med en stor del av ett slag, så SAMMA musikaliska slag får ett nytt nummer. Taktminnet bokförde
särdragen i den glidande numreringen, och därför satt ettan låst på fel slag och valdes om var 30–60 s.

## f0:s delar

| del | från | vad | bär |
|---|---|---|---|
| glidräkning per slag | a1 (idén), a6r (per färdigt slag) | ankarets hopp summeras; varje slag bokförs i musikens numrering | största delen: r0 59,7 -> a6r 68,8 % på mellan |
| relock flyttar inte inre ankaret | a6r | ettans val kan aldrig påverka tempo eller fas | tempot efter låtgräns oberoende av ettan |
| barOff bara ökar | jokern | ettan flyttas alltid framåt, så inget EXTRA TICK mitt i ett slag (en puls ur takt i lamporna) | r0 föll på mellan (paslag 77,6) utan den |
| kickens återstart med tak 2 | a2 + jokern | rösten för slaget där kicken kommer tillbaka | glidrättning + R 79,8 % övning |
| backbeat-termen | a8r | diskantens anslag i slagets första fjärdedel -> virvel/clap på 2 och 4 (musikteori, inte skattad ur facit); basens mot-term B borttagen | +3,5 övning, +4,5 pe på mellan i a8r |
| split.ts treble | a8r | specAbs.treble till workern (HOP_REC_LEN 19), krävs i ladans delade läge | (bänken kör inline) |

Struket: a3r bassNov (+4,3 övning men +0,2 mellan, kostar FFT i snabba vägen även i lotus), a1r topprestart (föll på mellan), a8:s mallar
(skattade ur Beat This på övningen; föll på mellan), a4:s dropvittne (svagt på mellan, kräver nya split-fält), a5, a7.

## Ranking

RUNDA 1 (övning; mellan inom parentes):

| deltagare | idé | övning | mellan |
|---|---|---|---|
| a8 | mallar | +47,3 | (+20,0) |
| a6 | ny beslutsregel | +44,7 | (+12,4) |
| a1 | när anslaget mäts | +36,9 | (+27,6) |
| a4 | drop som vittne | +35,4 | (+12,1) |
| a3 | bastonen | +34,0 | (+20,5) |
| a2 | kickmönster | +23,4 | (+21,5) |
| a5 | backbeat-band | +16,8 | – |
| a7 | fras | +5,5 | – |

Jokern r0 = a1 + a2 + tak:
- först DISK på mellan (paslag 77,6 < 80,2 − 2)
- lagad (barOff bara ökar): övning +49,5, mellan +23,6

RUNDA 2 (remix från r0):

| deltagare | övning | mellan |
|---|---|---|
| a6r | +54,2 | +35,6 |
| a8r | +51,4 | +28,0 |
| a3r | +53,8 | +23,8 |
| a1r | +53,2 | +21,6 |

FINAL (kontroll):

| plats | deltagare | poäng |
|---|---|---|
| 1 | f0 | +35,0 |
| 2 | a8r | +30,7 |
| 3 | r0 | +27,0 |
| 4 | a6r | +22,2 |
| 5 | a1 ensam | +10,9 |

Kontrollmängden användes 5 gånger (a6r, a8r, r0, a1, f0) + bas. Ingen bonusrunda: vinnaren (f0) innehåller redan tvåans (a8r) del.

## Fynd värda mer än varianten
- Extra tick: när ettan flyttades bakåt hoppade effektklockans slagindex fram och fyrade ett slag mitt i ett slag. Det finns i dagens
  motor varje gång barShift sjunker, och sedan 11-08 (a5) väljs ettan om var 30–60 s, så det har synts som en puls ur takt.
- 172432: Beat This markerar 98 takter om två slag. Där kan ingen fast etta bli rätt mer än ungefär halva tiden, så taket sitter delvis i facit.
- 171840: kvar i f0 ligger 17 % på förskjutning 2 (etta på slag 3). Det är det vanligaste kvarvarande felet.
- Rangordningen skiftade mellan mängderna: övningens etta a8 var 4:a på mellan. Bara det som höll på alla tre mängder är med i f0.

## Risk bänken inte ser
- Live-mic i ladan: rummets diskant (3,5–10 kHz) försvagar backbeat-termen.
- Ladans delade läge (worker): split.ts-ändringen är inte mätt av bänken.
- Musik utan trumma eller långa breaks: ettan kan vandra.
- barOff växer obegränsat, så frasläget beatIdx % 16 ligger inte där det gjorde (det var inte heller förankrat i musiken förut).
- Lotus: ANALYSER_SHARED.md5 ska räknas om, och lotus behöver samma split.ts-fält. Lotus läsning av ankaret är okontrollerad.

## In i koden (väntar på ägarens ord)
Backup-tagg, sedan .arena/etta/f0/src/{analyserClock.ts, split.ts} -> src, bygg, analyser_shared.py --write, commit.
Fynd DELAD FIL ÄNDRAD i analysator-fynd.md, så lotus portar efteråt (lotus-deploy kräver ägarens ord).
Ladan: nästa besök tillsammans med dagens fem andra ändringar. Ögonprov: sitter ljusets fras och lookbyten på musikens etta?

Tokens ungefär 2,3 M (8 deltagare + 4 remixer + jokern i tre omgångar). Tid 2 h 25 min. Alla diffar och lösningar ligger i
tools/natt/arena-2026-11-16-etta/ (idébanken).
