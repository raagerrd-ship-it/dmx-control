# Env i ladan (systemd drop-ins i /etc/systemd/system/audio-dmx-engine.service.d/)

Två filer, alla värden inerta i default (utan env = validerad baslinje):

- `tempo.conf`  → `Environment=BPM_MIN=80`   (festlåtar 80–160; ta bort → 100–200 megamix)
- `drop.conf`   → se `drop-disco.conf` (barn-disco 2026-09-05)

| var | värde | varför |
|---|---|---|
| DROP_QUALITY_DB=6.5 BODY_RISE_DB=17 DROP_ARM_MS=300 | drop | facit-kalibrerad + arm once/gone (pop: 7/10 min) |
| DMX_GHOST_WAIT=1 DMX_SUBH_GUARD=1 SUBH_MULT=8 OCT_UP=12 | tempo | 2/3-fantom-guard, validerad (31→17 s) |
| DMX_BOUNDARY_SOFT=1 | tempo | låtminnets falska gränser nollade låset → mjuk hint |
| DMX_LIVE_BEAT=1 LIVE_TRUST_LO=0.2 LIVE_TRUST_HI=0.5 LIVE_BEAT_MS=150 | heartbeat | pulsa på kickar när gridden saknas/är osäker (crossfade på fas-tillit; 150 ms < kick-intervall så pulsen släpper i dubbeltakt). Ägaren: hellre levande än perfekt synk |
| DEPTH_GAIN=1.4 | heartbeat | hårdare slag oavsett tillit (mätt: ingen skillnad — djupet var inte flaskhalsen, ofarlig) |
| BEAT_MIN=0.30 LIGHT_FLOOR=0.45 | ljus | pulsgolv 0.30 (0.5 plattade pulsen), loudness-golv 0.45 |
| DMX_DROP_TRACE=1 DMX_BPM_TRACE=1 | spår | ~0.3 rader/s, ofarligt; kan tas bort |
| (DMX_PALETTE) | palett | AV — blå/lila läser dimt på RGB-PAR; `fodelsedag`/`bla`/`rosa`/`eld`/`regnbage` eller "4,4.6,5.55" |

Ändra env = `install` + `daemon-reload` + `systemctl restart audio-dmx-engine` (≈10 s hack). Batcha.
