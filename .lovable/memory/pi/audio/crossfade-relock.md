---
name: Låtbytesbeslut vid crossfade (BPM-omlåsning)
description: Omlåsning bedöms på råestimat + sammanhållen utmanare + dominans + FRISK takt (conf ≥0.9, topp ≥0.8× lockPeak), bevis mätt i ms
type: feature
---

Beslutet "ny låt utan tystnadslucka" i `analyser.ts` ligger UTANFÖR median-grenarna (glid/oktav) och mäts på RÅestimatet.

**Varför:** MÄTT 2026-08-23 på crossfade 128→146 pekade tempogrammet om inom ~0,4 s, men 5 s-medianen låg innanför ±11 % i sex sekunder ⇒ "samma takt"-grenen tog rutan och rösträkningen startade först 26,9 s. Omlåsning 28,4 s = 8,4 s efter bytet. Nu ~3,5 s, deterministiskt (testBpmHard crossfade 73 % → 84 %, 8/8 identiska körningar).

**Fyra villkor samtidigt, annars vädras beviset ut (×0.7):**
1. `bpmStable >= 60` (committad oktav).
2. Råestimatet >11 % från låset.
3. SAMMA utmanare: varje estimat inom 4 % glider in i `challengerBpm`, allt annat nollställer. Utan detta kunde brus som bara var oense ackumulera fram ett låtbyte (brusigt rum tappade takten helt).
4. FRISK takt: `conf >= 0.9` och `bestVal >= lockPeak * 0.8`, där `lockPeak` är EMA (α 0.05) av tempogram-toppen medan takten är stabil. Ett breakdown ser ut som ett låtbyte i allt utom kvaliteten — MÄTT: conf 0.58–0.70, topp ~0.5 mot 0.9 frisk, råestimat vandrade till ~107 och fällde låset (142→111).

**Bevis i TID, inte anrop** (`newSongVote` i ms, `lastSongVoteMs`): stride växlar 100→20 Hz med låset. Krav: dominant rival >2.5× ⇒ 1500 ms, >1.6× ⇒ 4000 ms, annars 25 000 ms (6 s halverade tidigare BPM mitt i en låt).

**Vid omlåsning:** lås på `challengerBpm` (inte medianen) och kasta `bpmHist` + `lockPeak` — ett medianfönster halvfullt av förra låtens tempo kostade flera sekunder.

**Rör inte:** tempogrammets EMA-alpha (0.15 låst). Att korta minnet vid oenighet testades — det gjorde brusigt rum och breakdown instabila (0 % i vissa körningar).
