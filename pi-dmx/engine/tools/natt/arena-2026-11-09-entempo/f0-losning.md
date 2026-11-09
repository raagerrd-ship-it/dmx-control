# f0 – fusionen (startpunkt för finalisterna a2r, a8r, a1r)

**IDÉN.** Analysatorn har EN klocka i sin långsamma väg, `analyserClock.ts`, med a7r:s struktur och `BEAT_FEED` 'slow'/'inline' på ett ställe. Klockans tempogram är a2r:s (fönster 3,5 s, minne 0,4 per varv). Ovanpå ligger a1r:s två delar: takträknaren i hela takter (`gridK`) och låtgränsens etta i ankaret vid `relock()`. Allt läser klockans bpm, tillit och ankare: kickgrinden, sektionerna, boundaryDetector, ramen och ljuset.

**Diffen:** `losning.diff` (mot engine/src). Mot a7r ändras bara analyserClock.ts (a2r:s 3 rader + a1r:s relock) och effects.ts (a1r:s gridK).

## SIFFRORNA (M4 = tvavagar.json = koden)
**f0 +7,69 OK** (plats 1; a2r +7,04 med bonus 1, alltså +6,04 utan). Långsamma +8,90 %, latens 80 ms (+5,88 %), ljusdomaren +5,6 utan spärrar, upp_s/ned_s 1,35/2,15, p99 5 hop (bas 7).
- Mot a2r:
  - gridfel 22,05 -> 19,40
  - mix_hopp 0,08 -> 0,03
  - korta 32,9 -> 32,2
  - grid40 53,1 -> 53,7
  - mix_klocka 97,11 -> 97,00 (sämre)
- Övriga 12 mått är lika: mix_las 2,10, mix_still 2,84, ettan 100, låtgränsen 11/15 med 0 falska.
- **MÅLET nåddes inte helt:** gridfel 19,4 är fortfarande > bas 15,1.

## KRAV EN KÄLLA (fil:rad i `.arena/entempo/f0/src`)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1457/1735 (computeBpm/scoreEnv/alignScore borta), :1769 setClock, :2052 (analysatorn läser klockan ur sin egen taktväg); analyserClock.ts:355 (kickgrind = klockans inre rutnät + KICK_PHASE_MS :109, null i coast), :114–115/:224 tempogrammet (a2r) |
| 2 | en tillit | analyserClock.ts:359 (ramens bpm/bpmConfidence = klockan), split.ts:244; effects.ts:1772 trust, :1672/1675 frasräknaren, hasBeat (cfg.beat) |
| 3 | en takträknare | effects.ts:2010–2027 (rutnätets index, `>> 1`, `halfTick = gi & 1`, `gridK` i hela takter :2020; fri räkning bara utan lås :2027) |
| 4 | en pulskurva | effects.ts:1302 (beatEnv bakom samma beatLocked som beatPulse/heartPulse) |
| 5 | låtgränsen | analyser.ts:1771 trackBoundaries, split.ts:236 H_BOUND, analyserClock.ts:349 -> relock() :332–337 |
| A | klockan i analysatorn | analyser.ts:33 (import), :3085 (inline), :3142/3147/3202 (skapas av createAnalyser), analyserProfile.ts:35 BEAT_FEED |

## DELAR
| del | från | bär (övning) |
|---|---|---|
| struktur: klockan i analysatorn | a7r | bit-identisk (fusion-b = a8r:s alla 17 mått) |
| tempogram 3,5 s / 0,4 | a2r | mix_las 3,49 -> 2,10, gr 9 -> 11/15, falska 1 -> 0, **latens 80** |
| gridK (takträknarens frysning och +44-hopp) | a1r | ljus/jitter (effects, rör inte analysen) |
| etta i ankaret vid relock | a1r | gridfel 22,05 -> 19,40, mix_hopp 0,08 -> 0,03 (fusion-m mot f0) |
| finsökningen billigare + 2 hyp/hop | a8r | **BORTVALD**, se dubbletten |
| relock bara vid tillit < 0,65 | a6r | bortvald: mix_hopp får vi redan av relock-ettan, och spärren krockar med snabb omlåsning |

**LATENSEN 80 ms** kommer av tempogrammet, inte av någon egen del. a2r:s diff mot r0 är bara tempogrammets tre konstanter, och vikning/t90 blir 50/20 (r0 55/20). Med a8r:s 2 hyp/hop blir det 50/25 = 85, och A+B+relock ger 55/25 = 90.

## DUBBLETTEN: FASEN (A = a2r, B = a8r)
Alla rader har a7r-strukturen och gridK. "lang/mix" är egna körningar av domarens tvavagarKor-jobb, `--mat` är domarens fullständiga mätning.
| variant | gridfel | grid40 | mix_las | mix_still | mix_hopp | upp/ned | gr | latens | poäng |
|---|---|---|---|---|---|---|---|---|---|
| bas | 15,10 | 56,0 | 3,55 | 4,15 | 0,08 | 1,35/2,25 | 9 | 85 | 0 |
| **A** (fusion-m, --mat) | 22,05 | 53,1 | 2,10 | 2,84 | 0,08 | 1,35/2,15 | 11 | 80 | +6,04 |
| **B** (fusion-b, --mat) | **14,70** | 56,5 | 3,29 | 3,65 | 0,03 | 1,35/1,90 | 9 | 85 | +2,50 |
| A+B (fusion-c, lang/mix) | 19,30 | 53,1 | 2,10 | 2,65 | **0,23** | 1,35/1,65 | 11 | – | – |
| A+B+relock (fusion-d, --mat) | 17,15 | 53,7 | 2,10 | 2,78 | 0,23 | 1,35/1,65 | 11 | **90** | +0,32 |
| B+relock (första f0, lang/mix) | 13,6 | 58,9 | 3,29 | 5,47 | 0,03 | 1,35/**2,80** DISK | 9 | – | – |
| A+B, beslut varannat varv (fusion-i/j, lang/mix) | 14,8/14,65 | 56,9 | 2,10/2,48 | 2,6 | 0,21/0,08 | **2,85** DISK | 11 | – | – |
| A+B andra konstanter (fusion-e/g/k/l) | 15,9–17,2 | – | 2,6–2,9 | – | – | upp 1,9–2,85 DISK | 11 | – | – |
| **A + relock (f0, --mat)** | 19,40 | 53,7 | 2,10 | 2,84 | 0,03 | 1,35/2,15 | 11 | 80 | **+7,69** |

**Slutsats:** B:s fas kombineras inte med A:s fart. Med 2 hyp/hop och snabbt minne byter toppen tempo 0,23 gånger/min. Varje variant som håller gridfel ≤ 15 med snabb omlåsning faller på upp_s. Där klarar a8r:s finsökning (a8r-mått: −25 % taktvägen) ingen Pi-budget som A inte redan har (workern 23 µs/hop), och den ändrar fasen (A med den: gridfel 25,7). Den är därför bortvald.

**upp_s-kniven (för finalisterna):** en enda ansats avgör. lang1021 har ett skifte uppåt vid ~145 s, 2,3 s efter låtgränsen 142,7 s. Med långsamt tempogram ligger klockan i coast efter relock, grinden står öppen och etiketten blir high före skiftet (−1 s). Med snabb omlåsning låser grinden direkt och etiketten kommer 10 s sent, vilket flyttar medianen 1,35 -> 2,85 (verktyg/en.py). Fasfelet ligger i megamix/lang1011 (per fil median 37–200 ms mot 3–12 ms i lang1021/pop), inte i ett jämnt fel.

## WORKERN
taktväg + långsam väg (feedRealtid workerUsPerHop): **23,2 µs/hop** (bas samtidigt 36,5; gräns 130). Inga nya objekt per hop: a2r är konstanter, relock körs bara vid låtgräns och gridK är skalära fält.

## BUDGET
4 av 4 --mat: fusion-d, fusion-b, fusion-m, f0. Därutöver domarens lang/mix-jobb i ~14 körningar (verktyg/delmat.py, en.py) och en feedRealtid på 55 s. Delkombinationerna ligger i fusion-a…n (mk.py bygger dem). fusion-d/tvavagar.json bär `mapp` f0 eftersom den mättes där.

## RISKEN
- Sektionsmedianerna står på en knivsegg (se ovan). Holdout kan falla.
- 3,5 s-fönstret ser bara 6–7 slag i glesa låtar.
- relock-ettan bär förra låtens etta tills taktmodellen hittat den nya.
- cpu-kvoten 1,08 räknas inte. Huvudtråden rörs inte av fusionen.

KLAR f0 poäng 7.69 OK krav 5
