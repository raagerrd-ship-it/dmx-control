# r2-svar k4

## Granskningen av fusion-h (diff mot samrad-1: +5/−4, bara `onsetStep` + en konstant + två fält)
- Rad 249–250, överst i `onsetStep`, körs varje hop: `scanFreeAt = now + 14000` när `tempoBpm` saknas, saknades förra hoppet, eller
  har flyttat sig > `TG_SNAP` sedan förra hoppet; `settled = now >= scanFreeAt`.
- `settled` står som villkor på exakt de tre k4b-raderna (`cb`/`scanFar`, kronan, blippspärren). Inget annat rört. Inga nya objekt per hop.
- Det är min idé (i) som jag beskrev den, plus "från/till inget tempo". Koden gör det förslaget säger.

## Varför låt 5 kommer tillbaka fast inget tempobyte sker – jag hade fel
Jag och k2 räknade med att spärren inte löser ut i låt 5 (114 → 114). Den löser ut ändå, av låtgränsen:
- `relock()` → `tgReset()` sätter `tempoBpm = 0` i ett varv. Det syns i alla tre diag-körningarna: `tempoBpm` = 0,0 i två prov vid
  t0 + 3,2 s i låt 5 (bas, k4b och samrad-1 lika).
- Villkoret `!(tempoBpm > 0)` öppnar då 14 s fri sökning från låtgränsen.
- Det som fällde låt 5 i samrad-1 låg just där: klockan stod på 114,7 i tre prov EFTER låtgränsen och gick sedan 113,5 (1,05 % isär,
  jokerns iakttagelse) – kronan höll kvar 114,7. Med fri sökning går klockan till 114,1 som i basen.
Sonden stämmer alltså med koden. Min invändning ("avviker redan under övertoningen") gällde svackan 111–112, men den avgör inte
måttet; det gör proven efter låtgränsen.

Följd att känna till: spärren löser ut på låtgränsen (hintTrackChange) i mixen. På material utan låtgräns (långa inspelningar, lotus
utan Sonos-byte) finns bara tempobytet > 3 % som utlösare.

## Siffrorna jag lutar mig på (jokerns sond, 86,7 min)
| | bas | k2c | samrad-1 | fusion-h |
|---|---|---|---|---|
| utfl_min | 0,82 | 0,74 | 0,24 | 0,32 |
| utfl_tid % | 2,11 | 1,39 | 1,21 | 1,62 |
| syskon_tid % | 2,67 | 1,02 | 1,01 | 1,05 |
| pålitliga låtar ≤ 3,23 (av 14) | 8 | 8 | 6 | 8 |
Lås = bas i alla 16. Sonden har träffat domaren på låt 5 och 9 i varje jämförelse (samrad-1: 4,0 / 8,3 mot 4,05 / 8,26).

## Vad det kostar och vad som är osäkert
- utfl_tid 1,21 → 1,62 (l1011 1,35 → 4,38): varje utflykt i `tempoBpm` är två byten > 3 % och ger 14 s utan spärr efteråt. Sämre än
  k2c ensam (1,39) på det måttet; utfl_min bär vinsten.
- Låt 15 avgör (9:e låten): myntkast, som i basen. Låt 12 1,75 → 2,05 visar att förloppet inte är basens ens i de fria 14 s.
- Källaren (samrad-1 3,30, sämre än bas) och lotus motfas/i fas (7, 68/115) är osonderade för fusion-h.
- Övningens mix_still säger lite om kontrollens (fusion-d).

## Röst: MÄT fusion-h som samrad-2
- Mekanismen går att motivera utan tal trimmade mot låtarna: spärr och krona förutsätter ett tempo som satt sig; 14 s är samma tid
  som tolkningen kräver.
- En mätning med utgången bestämd i förväg är billigare än att lämna frågan öppen. Jag ändrar mig från r2-förslaget för att sonden
  motsäger det jag antog om låt 5.
- **Faller den på mix_still: inga fler sökningsvarianter** (jokerns punkt 3), och k2c och k4b läggs fram för ägaren.
- Godkänd på övningen men sämre än bas på källaren: det ska stå i raden till ägaren, inte gömmas i poängen.
