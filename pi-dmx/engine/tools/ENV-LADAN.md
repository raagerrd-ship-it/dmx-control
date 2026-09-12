# Env i ladan (systemd drop-ins i /etc/systemd/system/audio-dmx-engine.service.d/)

Två filer, alla värden inerta i default (utan env = validerad baslinje):

- `tempo.conf`  → `Environment=BPM_MIN=80`   (festlåtar 80–160; ta bort → 100–200 megamix)
- `drop.conf`   → se `drop-disco.conf` (barn-disco 2026-09-05)

| var | värde | varför |
|---|---|---|
| DROP_QUALITY_DB=6.5 BODY_RISE_DB=17 DROP_ARM_MS=300 | drop | facit-kalibrerad + arm once/gone (pop: 7/10 min) |
| DROP_RISE_MIN=1 BODY_FAST_S=0.06 | drop | 09-08: stigning mot MIN i 0,5 s-fonstret (suget fore dropen gav exakt en takts lagg) + snabbare kropp. Pop ra-kant->fyr p50 365->80 ms, p90 445->200; megamix 30 fyr, 0 i falska klassen. DROP_PEEK_MS forkastad (oppnar falska). |
| DMX_DWELL_FLAT_MS=30000 | show | 09-12: enformiga svep (airglow/breathe/drift/mono/subbreath/tide/viska/wave) byts efter 30 s; kraver DMX_DWELL_MS |
| DMX_DWELL_MS=120000 | show | 09-12: dwell-timern bara nodfallback; dirigenten byter vid tier/sektion/drop/halvering (agaren: "bara vid andringar i laten") |
| DROP_SNAP_MS=150 | show | 09-12: drop-smallen vantar in nasta slag om det ligger inom 150 ms och taktlaset ar palitligt (agaren: "traffar varje riktig drop men ~100 ms fore"). Roken direkt. |
| (DROP_UPGRADE_DB=3, AV) | drop | 09-12 matt: inom 4 s-fonstret far en kandidat fyra om den landar >=3 dB narmare toppen; megamix 30->41 (alla <4), pop 9->10. Ej pa: agaren nojd med traffarna. |
| (MINI_DELAY_MS=500) | show | 09-12: mini-reaktionen vantar 0,5 s och avbryts av en riktig drop (minin fyrade 24-400 ms fore 4/5 drops live -> "for tidig") |
| MINI_SPACING_MS=12000 | drop | 09-12: minidrops (lyft >=10 dB efter >=0,8 s svacka >=3 dB, eget avstand 12 s). Facit: pop 2,4/min, megamix 2,8/min (agaren: ~10 per lat). Effekt: look-byte + stot 0,35 (MINI_DROP_ENV), ingen rok |
| (DMX_CLEAR_BEAT=0.9) | show | 09-12: profile.beat>=0,9 & conf>=0,7 -> dirigenten valjer ALLTID innerouter (15 % av pop-tiden). Kraver DMX_HALVE_SHOW |
| DMX_HALVE_SHOW=1 | show | 09-12: halverad effekt-klocka vid dubbeltakt (>135) och lugn energi; dirigenten kor varannan/innerouter/hjarta. Utan env: bara hjartslagets form halveras. |
| DMX_GHOST_WAIT=1 DMX_SUBH_GUARD=1 SUBH_MULT=8 OCT_UP=12 | tempo | 2/3-fantom-guard, validerad (31→17 s) |
| DMX_BOUNDARY_SOFT=1 | tempo | låtminnets falska gränser nollade låset → mjuk hint |
| DMX_LIVE_BEAT=1 LIVE_TRUST_LO=0.2 LIVE_TRUST_HI=0.5 LIVE_BEAT_MS=150 | heartbeat | pulsa på kickar när gridden saknas/är osäker (crossfade på fas-tillit; 150 ms < kick-intervall så pulsen släpper i dubbeltakt). Ägaren: hellre levande än perfekt synk |
| DEPTH_GAIN=1.4 | heartbeat | hårdare slag oavsett tillit (mätt: ingen skillnad — djupet var inte flaskhalsen, ofarlig) |
| BEAT_MIN=0.30 LIGHT_FLOOR=0.45 | ljus | pulsgolv 0.30 (0.5 plattade pulsen), loudness-golv 0.45 |
| DMX_DROP_TRACE=1 DMX_BPM_TRACE=1 | spår | ~0.3 rader/s, ofarligt; kan tas bort |
| (DMX_PALETTE) | palett | AV — blå/lila läser dimt på RGB-PAR; `fodelsedag`/`bla`/`rosa`/`eld`/`regnbage` eller "4,4.6,5.55" |

Ändra env = `install` + `daemon-reload` + `systemctl restart audio-dmx-engine` (≈10 s hack). Batcha.
