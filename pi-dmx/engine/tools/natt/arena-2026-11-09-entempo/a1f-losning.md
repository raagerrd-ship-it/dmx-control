# a1f – finalen: f0 + ljusets kick förbi spärren (D1)

**IDÉN.** f0 är orörd i analysen; alla 17 kvalitetsmått är bit-lika med f0. Den enda delen D1 rör ramens `frame.kick`, alltså ljusets kick
(registerKick och kick-bypass). Den kommer från samma detektor och samma anslag, men släpps 170 ms efter förra ljuskicken när anslaget
ligger på klockans slag, i stället för efter hela spärren (0,6 slag, tak 330 ms). Analysatorns kick (sektionernas kicktäthet, slagets tid
till klockan, drops) har f0:s spärr kvar.

## KRAV EN KÄLLA (fil:rad i `.arena/entempo/a1f/src`, samma som f0 – D1 rör ingen av dem)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1769 setClock (computeBpm/scoreEnv/alignScore borta som i f0); analyserClock.ts:108 KICK_PHASE_MS, kickgrinden = klockans inre rutnät (null i coast) |
| 2 | en tillit | analyserClock.ts:359 och split.ts:244 (ramens bpm/bpmConfidence = klockan) |
| 3 | en takträknare | effects.ts:2010–2027 (rutnätets index, `>> 1`, `halfTick = gi & 1`, gridK i hela takter :2020) |
| 4 | en pulskurva | effects.ts:1302 |
| 5 | låtgränsen | analyser.ts:1771 trackBoundaries, split.ts:236 H_BOUND, analyserClock.ts:349 -> relock() :332 |
| A | klockan i analysatorn | som f0 (analyserClock.ts, skapas av createAnalyser) |

## DELAR mot f0 (`mot-f0.diff`, 48 rader, bara analyser.ts)
| del | mekanism | bär |
|---|---|---|
| **D1** ljusets kick förbi spärren (analyser.ts:2404–2417, :3074) | `kl = anslag && now − lastKickLight > cool`, där cool = 170 ms om anslaget ligger inom grindens tolerans från klockans slag, annars f0:s spärr. `f.kick = kl`. Analysatorns kick är orörd | ljusdomaren +5,6 -> +6,5; alla 17 mått och latensen (80 ms) = f0 |

## Vad jag mätte och valde bort (3 --mat: 2 använda; 6 egna ljusLag/rytm: 6 använda)
- **Analysatorns kickfördröjning** (`a1f/k.mjs`, 60 s-fönster): f0:s kickar kommer senare efter basens ansats än basens.
  - 181533 (126 BPM): median 29/53 ms mot basens 24/37.
  - lang1021: 56 mot 29.
  Orsaken är spärren: ligger förra kicken på en åttondel ligger nästa slag i spärren, och anslaget fyrar på basens andra puckel.
  - Grinden är inte orsaken: flanken räknad på det ogrindade anslaget gav identiska kickar.
  - DMX_KICK_COOLDOWN=170 ger tidiga kickar men 255 mot 175 per minut.
- **Mätning 1 – släppet i analysatorns kick** (alla konsumenter): 181533 ljusLag t90 35 -> 15 och rytm --live-kick t90 25 -> 15 (bas 20),
  lampspr 0,276 (bas 0,275). Men på övningen **upp_s 1,35 -> 2,85 = DISK** (kniven vid ~145 s i lang1021), gridfel 19,4 -> 22,6 och
  latensen 80 -> 85. Den varianten är bortvald.
- **Mätning 2 = levererad (D1, bara ljusets kick):** sektionerna är oförändrade. Men domarens ljusLag (utan --live-kick) mäter inte
  ramens kick: 181533 t90 = 35 som f0. **Kontrollmängdens latensfel (135 ms) är alltså INTE löst av D1.** Det sitter i analysatorns
  kick, som mätning 1 visade, och att lösa det utan att flytta upp_s-kniven kräver att sektionernas kicktäthet frikopplas från kickens
  tidpunkt. Det hann jag inte bevisa.
- **Lampspridningen (kontrollmängden −12 %)** gick inte att återskapa på 181533 (bas 0,275, f0 0,281, a1f 0,276). Mekanismen är inte hittad.

## SIFFRORNA (mätning 2 = `tvavagar.json`; mätning 1 = `tvavagar-mat1.json`)
- **a1f +7,69 OK.** f0 har +8,69, varav 1 är bonusen. Utan bonusen är det lika på långsamma (+8,90 %) och latens (80 ms, +5,88 %).
- Ljusdomaren **+6,5** (f0 +5,6), inga spärrar. upp_s/ned_s 1,35/2,15, p99 5 hop.
- cpu-kvoten är 1,11 (f0 1,08, räknas inte; basens körningar spred 40–45 µs).

## WORKERN
D1 ligger på snabba sidan (huvudtråden): två jämförelser och en modulo per anslagsflank, två skalära fält (`lastKickLight`, `hKickLight`) och
inga nya objekt per hop. Workern är orörd: f0:s 23,2 µs/hop.

## RISKEN
- Ljusets kickar blir fler: 181533 240/min mot f0 188 och bas 175, lang1021 238 mot 196. Effekter som blinkar per kick blinkar oftare
  (strobe-taket gäller i effekten, inte här). Fladderspärren slog inte till på övningen.
- Kontrollmängden: latensen och lampspridningen är som f0 (troligen DISK där som f0) – D1 är en ljusförbättring, inte finalens rotorsak.

KLAR a1f poäng -1.00 OK krav 5   (mot f0, övning: +7,69 mot f0:s +8,69, skillnaden = f0:s bonus 1; utan bonus 0,00)
