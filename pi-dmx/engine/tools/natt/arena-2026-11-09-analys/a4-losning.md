# a4 – BASEN, EN KÄLLA (arenan pausad efter mätning 1 av 3)

## Idén
Analysatorns snabba band 0–2 (fbAbs sub/kick/bas, biquads på varje hopp, 3–12 ms, FB_K-kalibrerade mot 2048-dB) är den enda basen. bodyDb, energilagrets bas-dB och frame.energy räknas som transformer av den en gång per hopp på snabba sidan. Dropdetektorn i workern får samma tal via hopprecordet, så ljuset och dropbeslutet läser samma bas med samma latens.

## FLYTTAT
| vad | förut | nu (analysatorn) | ramens fält |
|---|---|---|---|
| energilagrets bas (0,25·sub-dB + 0,75·kick-dB, PB_SUBW/DMX_B_SUBW) | effects.ts:1399–1400 (räknades ur specAbs), konstanten effects.ts:434 | analyser.ts:3402–3408 (`baseDb`, `BASE_SUBW`); effects.ts:1399 läser bara ramen | `frame.bassDb` (nytt) |
| baskroppen (bodyDb) | analyser.ts: 2048-band 0–2, rå dB (förr 1854/3051), skickades tillbaka från workern via BS_BODY | analyser.ts:3402–3406 (`baseBodyDb` = effekt-EMA 20 ms av fbAbs 0–2, medel-dB), ut i ramen direkt från snabba sidan (3837) | `frame.bodyDb` (samma fält, ny källa, ingen workerfördröjning) |
| dropStep-input | 2048-banden i workern | `r[o+B_BODY]` = snabba sidans baseBodyDb (analyser.ts:1816/1862, split.ts:179 `B_BODY = 16`, BIG_REC_LEN 17); utan split: 3060 | `dropCount/miniDropCount` |
| frame.energy (punch effects.ts:1768–1788, registerKick index.ts:204) | 512-bin 0–15 · gain (analyser.ts:2902/2985) | analyser.ts:3407: `min(1, (sub+kick+bas)·BASE_E_K·gain)`, samma EMA; BASE_E_K = 0,00115 (medianen kalibrerad mot den gamla på lang1021) | `frame.energy` |

effects.ts räknar inte längre någon bas själv: flank (787), lyft (1209), minidrop (1824), energilagret (1399) och punch (1768) läser bara ramfälten. Kickdetektorns interna energigrind (analyser.ts:3129, `hEnergy` ur 512-FFT:n) ligger kvar. Den hör till kickdetektorn och publiceras inte.

## DUBBLETTEN
Jag valde B, snabba banden, för att de har lägst latens och redan drev ljusets energi. A (2048-bodyDb) blir en transform av B, och C (512-energin) ersätts av B. Utan mätning jämförde jag på lang1021 (55 s): ny bodyDb mot gammal har mediandiff 0,06 dB, p10/p90 −3,1/+2,3 dB och korrelationen 0,85 med toppen vid 3 hopp, alltså att den nya ligger ~8 ms före.

## SIFFRORNA (mätning 1, tvavagar.json)
- md5 skiljer. Ljusdomaren ger **+2,4** utan domarspärrar, alltså klart över bas −0,5.
- drop_falska 5,71 → **0,00** (+100 %), drop_ms 216 → 211, drop_traff 100 som förut. Korta sektionsdelar 30,3 → 29,0 %.
- Tempo, ettan, grid och låtgräns är identiska med bas. Latensen är 80 ms som bas.
- **SPÄRR:** upp_s 1,35 → 3,80 s och ned_s 3,00 → 3,20 s, alltså **DISK**. Orsaken är att den snabba basen har mindre kortsiktig dynamik än 2048-fönstret (läckage i biquads av 2:a ordningen: pop-breaken läser 6–8 dB för högt). Därför blev det färre hela drops och färre bodyretur-händelser (`g.drops = dropCount + secBodyRet`). Sektionen förlorar då sin uppåtsignal, och upp-medianen (14 skiften, knivsegg) hoppar från 1,35 till 3,8.

## Worker µs/hop och allokering
Huvudtråden mättes till 50,7 µs/hop mot bas 49,7 (kvot 1,02, inom bruset). Worker p99 är 6 hopp, gränsen 7. Det kommer inga nya objekt per hopp: tre Float64-tal i en befintlig array och ett extra recordfält.

## Idébank (ej mätt, sparad i `src-omatt/` och `idebank-omatt.diff`)
Lagningen av upp_s: biquads av 4:e ordningen (HP×2 + LP×2) tar bort läckaget i breaken, med FB_K 0–2 ×1,41. Utöver det används magnitud-EMA och `BODY_EXPAND = 1,4` runt ett 0,35 s-medel, som återställer 2048-fönstrets kortsiktiga struktur. Offline (egna 600 s-körningar) gav det drops/minidrops ungefär som bas: pop 3/149 (bas 3/112), lang1011 6/320 (5/310), megamix 23/582 (22/582). Det bör mätas först när arenan återupptas. Obs att frame.energy då behöver kalibreras om (pop-medianen 0,56 → 0,42).

## RISKEN
Sektionsetiketten hänger på dropräkningen (knivsegg). Dropkalibreringen (BODY_RISE_DB 17, DROP_QUALITY_DB 3,5) är mätt på 2048-skalan. frame.energy är nu bara bas (<250 Hz) i stället för 0–1,4 kHz, så punchen blir dynamiskare (p10/p90 0,10/0,27 mot 0,15/0,24).
