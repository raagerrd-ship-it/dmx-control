#!/bin/bash
# Health watchdog for the audio-dmx-engine (rental robustness).
#
# Restarts the engine ONLY if it is "active" but not answering /health (a hang
# where the process lives but the audio/DMX pipeline stalled). Plain crashes are
# already covered by systemd Restart=always, so we never fight the normal
# restart path — we only intervene on an active-but-stuck service. Two checks
# with a pause so a single transient blip doesn't trigger a needless restart.
set -u

[ "$(systemctl is-active audio-dmx-engine)" = "active" ] || exit 0

ok() { curl -sf --max-time 5 http://127.0.0.1/health >/dev/null 2>&1; }

if ok; then exit 0; fi
sleep 3
if ok; then exit 0; fi

logger -t pi-dmx-watchdog "engine active but /health failed twice — restarting"
systemctl restart audio-dmx-engine
