#!/bin/bash
# Health watchdog for the audio-dmx-engine (rental robustness).
#
# Restarts the engine ONLY if it is "active" but not answering /health (a hang
# where the process lives but the audio/DMX pipeline stalled). Plain crashes are
# already covered by systemd Restart=always, so we never fight the normal
# restart path — we only intervene on an active-but-stuck service. Two checks
# with a pause so a single transient blip doesn't trigger a needless restart.
#
# DIAGNOS FÖRST (2026-08-30): /health svarar 503 med ORSAKEN i kroppen. Är det
# ljudet försöker vi laga riktat — POST /api/audio/recover startar om enbart
# arecord, vilket syns knappt i ljuset, mot ~4 s svart vid processomstart. Först
# efter TRE misslyckade riktade försök (räknas i /tmp) startar vi om motorn.
# "audio-safe" = motorns egen återhämtningstrappa har redan gett upp; då är det
# meningslöst att pilla mer på capturen, gå direkt till omstart.
set -u

[ "$(systemctl is-active audio-dmx-engine)" = "active" ] || exit 0

STATE=/tmp/pi-dmx-watchdog-tries
MAX_TRIES=3

probe() { curl -s -o /tmp/pi-dmx-health-body -w '%{http_code}' --max-time 5 http://127.0.0.1/health 2>/dev/null; }

restart() {
  logger -t pi-dmx-watchdog "$1 — restarting engine"
  rm -f "$STATE"
  systemctl restart audio-dmx-engine
  exit 0
}

code=$(probe)
if [ "$code" = "200" ]; then rm -f "$STATE"; exit 0; fi

sleep 3
code=$(probe)
if [ "$code" = "200" ]; then rm -f "$STATE"; exit 0; fi

reason=$(cat /tmp/pi-dmx-health-body 2>/dev/null)

# Ingen svarskod alls = motorn hänger i event-loopen. Riktad åtgärd är omöjlig.
[ -z "$code" ] || [ "$code" = "000" ] && restart "engine active but /health unreachable"

case "$reason" in
  audio)
    tries=$(cat "$STATE" 2>/dev/null || echo 0)
    tries=$((tries + 1))
    if [ "$tries" -gt "$MAX_TRIES" ]; then restart "audio dead after $MAX_TRIES targeted recoveries"; fi
    echo "$tries" > "$STATE"
    logger -t pi-dmx-watchdog "audio stalled — targeted recovery $tries/$MAX_TRIES"
    curl -sf -X POST --max-time 5 http://127.0.0.1/api/audio/recover >/dev/null 2>&1
    ;;
  audio-safe)
    restart "audio recovery ladder exhausted (safe mode)"
    ;;
  *)
    restart "engine active but /health failed twice ($reason)"
    ;;
esac
