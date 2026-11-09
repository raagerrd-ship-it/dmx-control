# Arenan entempo 2026-11-08/09: EN TEMPO I HELA MOTORN

**Ägarens fråga:** "Ja måste vara en och inte två! Är ju extremt svårt att trimma annars." (+ "varför behöver vi en separat?", "allt skall ju ligga i analysatorn").

**Domaren:** `tools/arena/tvavagar.py` (från tvavagar) med tilläggen, i ordning:
- (a) sektionsspärren: upp_s/ned_s får inte bli sämre än bas (+0,1 s);
- (b) nytt mått mix_still (b744981);
- (c) KRAV EN KÄLLA granskat i koden ger ljusdomarens gräns −3,0;
- (d) CPU ger inga poäng. Gränsen är Pi-budgeten: workern ≤ 130 µs/hop PC (e353f8b, 19e1c4d);
- lampspridningen döms på MEDLET över filerna (< 94 % = DISK, en fil < 80 % fäller). Ändrad i domare.py 1cf4d1d (ägaren 10:35: "Fixa lampspridningsspärren").

Basenv tom. Bas = ea7bb71 (f2 + g1 + labbets favoriter).

**Vinnaren = mta, kod e451800** (backup-tagg `backup/fore-entempo-20261109`, tagg `entempo-mta`). Den är ingen enskild deltagare utan kombinationen:
- f0 (r0 + a7r:s struktur + a1r:s takträknare + a2r:s tempogram),
- a2f:s två tempominnen,
- t1f:s tillit (repeatRate × tgClear),
- m1f:s manusTog (en toggle-låt kräver tydlig basgång).

## KRAV EN KÄLLA i vinnaren (granskat i koden)
1. En temposökning: computeBpm/scoreEnv/alignScore och skuggrutnätet är borta. Klockan finns i `analyserClock.ts` och körs av analysatorn: `sys.BEAT_FEED` 'slow' i workern, 'inline' i process(). Kickgrinden läser klockans inre rutnät + 45 ms.
2. En tillit: `cfg.beat.confidence` → frame.bpmConfidence, profile.beat, hasBeat, trust, frasräknaren och manuset.
3. En takträknare: ctx.beatIdx = rutnätets index (+ gridK i hela takter, >> 1 vid halvering), monoton, en paritet.
4. En pulskurva: beatEnv grindas med beatLocked som beatPulse/heartPulse.
5. Låtgränsen: H_BOUND i hop-recordet → relock(). Klockans egna slutsatser om låtbyte är borta.

## Ranking
**Runda 1** (övning; ingen klarade alla fem kraven):
| deltagare | kort | poäng | anmärkning |
|---|---|---|---|
| a6 | tilliten som ett mått | +1,29 | alla 17 mått = bas; pulsen grindad med hasBeat |
| a7 | minsta diff | +0,52 | beatIdx = rutnätet; ljus −2,3 (jitter) |
| a4 | låtgränsen i taktvägen | +0,12 | H_BOUND + relock() |
| a5 | breaket som tillstånd | 0 | md5 lika |
| a2 | analysatorns sökning | −9,98 | heltalstempot klart sämre (klipp 98 → 77 %) |
| a3 | flera hypoteser | DISK | upp_s 1,90; localBpm 93,7 mot klockans 125 = 3/4 |
| a1 | tempogrammet | DISK | upp_s/ned_s; fyndet att skuggans coast nollade tempot |
| a8 | Pi-budget | DISK | ned_s 4,00; upp_s styrs av tempoåterställningar |

**Remix** (från r0, alla fem kraven): a2r +6,04 (tempogram 3,5 s), a8r +3,50 (billigare finsökning), a1r +1,74 (r0:s takträknare frös vid halvering, lagad), a6r, a7r (klockan i analysatorn, bit-identisk med r0), a4r, a5r, a3r (sammanslagningen bär inte). Dubbletten tempogram mot sammanslagning: tempogrammet vann.

**Final och riktade** (från f0 = +7,69 på övningen). Kontrollmängden avgör:
| variant | övning | kontroll | kontroll-DISK / anm. |
|---|---|---|---|
| **mta** = f0+a2f+t1f+m1f | +5,29 (DISK ned_s 3,00) | **+8,90** | – (latens 90, ned_s 0,30) |
| am = f0+a2f+m1f | – | +6,25 | – |
| d1f = mta + låtbeslut | +5,29 | +8,90 | lampspr lang1011 −23,7 % (< −20) |
| m1f | +7,69 | +2,47 | upp_s |
| mt1 / md1 | +9,75 OK | +0,02 | upp_s |
| a8r / a8f | +3,50 | −4,24 | upp_s |
| at = f0+a2f+t1f | – | −11,10 | – (latens 140) |
| f0 / a1f | +7,69 | −13,53 | upp_s (latens 135) |
| k1f | +7,69 | −16,53 | upp_s |
| a2f / a2r | +8,47 / +7,04 | −21,75 / −19,61 | latens 160 |
| r0 / a1r | +0,76 / +1,74 | −22,1 | ned_s 2,80 |
| t1f | +9,75 | −23,98 | upp_s (latens 155) |

## Kombinationsgranskningen (kontrollmängden, ovanpå f0)
| del | ursprung | ensam | tillskott | med/struken |
|---|---|---|---|---|
| P3 två tempominnen | a2f | −21,75 OK | bas för bygget | MED |
| P1 manusTog kräver tydlig basgång | m1f | +2,47 DISK upp_s | +28,0 (am +6,25) | MED |
| P2 tillit repeatRate×tgClear | t1f | −23,98 DISK | +2,65 (mta +8,90) | MED |
| P4 låtbeslut efter satt tillit | d1f | – | ±0, men DISK lampspr | struken |
| P5 ljusets egen kickspärr | k1f | −16,53 DISK | – | struken (latensen går via lookvalet) |
| P6 a8:s tempogram | a8r/a8f | −4,24 DISK | krockar med P3 | struken |

Omvänd ordning: P2 (DISK) → P3+P2 (at −11,10) → +P1 = mta. Samma slut.

## Fynd (även till lotus och nästa arena)
- **Sektionernas fart kom av skuggans tempoåterställningar** (a1, a8), inte av fasen. Sektionsmedianerna vilar på 14/10 skiften (knivsegg, a5r).
- **Latensen kick→ljus på kontrollmängden** (t90 35 → 85 ms på lang1014, 140 bpm) gick via dirigentens lookval. m1f:s manus gav 95 ms. Kickspärren 0,6 slag gör att kicken fyrar på basens andra puckel (a1f) och på en förtransient vid 3 kickar per 2 slag (a8f).
- **Lampspridningen föll** därför att klockans tillit mättade på 1,00. Manuset gjorde då VARJE låt till en toggle-låt. Basgångsgrenen påverkar bara loggen; manusTog styr (m1f).
- **MÄTFÄLLA:** lampspridning per fil är brus. Samma kod gav på pop 0,405 eller 0,267 av en ohörbar skalning på 0,003 % (d1f). Därför döms nu medlet.
- **CPU:** r0-familjens +7 % i huvudtråden följer workern på PC:ns hyperthreading-syskon (a4r). Workern kostar 23–45 µs/hop mot basens ~48.

## Kontamination och risk
Finalisterna fick kontrollmängdens felklasser utan filnamn (final.md), och kombinationen valdes på kontrollmängden. Vinnarens +8,90 är därför inte en oberoende mätning. På övningen är mta DISK på ned_s 3,00 (bas 2,25). Ögat i ladan avgör.
Lotus: 44 292 av 45 000 hop avviker. Lotus måste porta och bänka (fynd DELAD FIL ÄNDRAD). Deployspärren vägrar om lotus-kopian ligger bredvid och skiljer sig.

## Redo för ladan
`PYTHONIOENCODING=utf-8 PI_HOST=10.171.211.218 python tools/ladan.py` (koden e451800; ingen env).
Kontrollera i `/api/health-log` split att workern ligger 1–3 hop efter och kostar ~150–200 µs/hop på ARM.
OBS deployspärren (deploy-dist.py/analyser_shared.check) jämför mot lotus-light-link-kopian om den ligger bredvid - den skiljer tills lotus portat. Huvudchatten/ägaren avgör (lotus-port först, eller ANALYSER_SIBLING).
