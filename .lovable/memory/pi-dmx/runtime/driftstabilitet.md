---
name: pi-dmx driftstabilitet (percentil-AGC, hälsomått, stall, minne, BLE-churn)
description: v0.3.0-härdningen i pi-dmx: percentil-AGC på mic, runtimeHealth i /api/health-log, tyst arecord-stall, heap-tak 112/64 MB + swappiness 10, BLE anti-churn och loggtak.
type: feature
---
Portat från Lotus-motorn (samma Pi Zero 2 W), pi-dmx v0.3.0:

- **Percentil-AGC** (`engine/src/analyser.ts`): envelopen = näst största av 16 blockmaxima à 128 ms av RÅ rms (≈95:e percentilen), attack `tauUp×2`, retreat `tauDown×0.25`. Momentan-EMA av gainad nivå pinnade level ≥0,95 i ~55 % av tiden med upp till 21 % klipp i Lotus. Målet är ett TAK för topparna, aldrig ett medelvärde. Gäller BARA mic — aux låser gain på 1×, därför är BPM-sviten oförändrad. Bänk: `engine/tools/testAgc.mjs` (8 seeder; krav pinnad <15 %, klipp ~0, build > intro).
- **runtimeHealth.ts**: chunkFps/renderFps/loopLag/jitter/overruns/långa anrop (>50 ms), 1 Hz-sampling från index.ts, läses via `GET /api/health-log` → `runtime`. Läsning nollställer max-värden. CPU-% är inte användbart — ALSA kapar bufferten innan lasten ser mättad ut.
- **Tyst stall** (`engine/src/audio.ts`): arecord kan leva men sluta leverera; varken `exit` eller `error` fyrar. 1500 ms utan stdout-data → SIGKILL (TERM kan hänga i samma ALSA-anrop), befintlig respawn tar över.
- **Minne**: motor `--max-old-space-size=112 --max-semi-space-size=8` (var 200), BLE-sidecar 64 (var 80), `vm.swappiness=10` via `/etc/sysctl.d/99-pi-dmx.conf` i install.sh. Swap-in under GC = flera hundra ms frysning i ljuset.
- **BLE anti-churn** (`ble-writer/src/index.ts`): 2 s golv mellan försök per slinga (en miss kostar 4 s scan som stjäl radiotid från fungerande slingor), 5 fel/30 s → 15 s paus, aldrig permanent uppgivning. Avstängning har 800 ms tak — annars väntar systemd ut TimeoutStopSec.
- **Loggtak**: overrun 1 rad/10 s (med antal), BLE-connect-fel 1 rad/slinga/30 s. Exakt räkning finns i hälsomåtten.

**Tillägg 2026-08-30 (portat från Lotus micRecovery + watchdog-diagnos):**

- **Återhämtningstrappa i `engine/src/audio.ts`**: 2 rena respawns → 2 respawns med `rebind` (index.ts kör `applyInputRouting` igen; codec-zero kan hamna i fel ingång) → **säkert läge**: sluta jaga, `logHealth("err","audio",…)`, ett försök/60 s. Räknaren nollställs först när capturen levererat OAVBRUTET i 5 s (`firstDataAt`) — annars räcker en chunk mellan två stall för att äta upp trappan i evighet. `capture.recover()` nollställer trappan manuellt.
- **Watchdog med diagnos** (`systemd/watchdog.sh`): `/health` svarar 503 med orsak i kroppen (`audio` | `audio-safe` | `dmx`). `audio` → `POST /api/audio/recover` (riktad capture-omstart, syns knappt i ljuset) max 3 gånger, räknat i `/tmp/pi-dmx-watchdog-tries`; först därefter `systemctl restart`. `audio-safe` (trappan redan slut) eller oåtkomlig `/health` → omstart direkt. Processomstart släcker showen ~4 s, därför alltid riktad åtgärd först.
