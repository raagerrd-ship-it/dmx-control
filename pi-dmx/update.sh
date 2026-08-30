#!/usr/bin/env bash
# Pull latest code from git and re-run the installer.
# Triggered from the mobile UI via POST /update (systemd-run detaches it
# from the engine service so the restart at the end doesn't kill us).
#
# AUTO-ROLLBACK: efter install verifierar vi att audio-dmx-engine kommer
# igång och håller sig igång i 60 s. Om den kraschar (Restart=always slår
# till mer än 2 ggr på en minut) rullar vi tillbaka till förra SHA så
# hyresgästen inte står med en brickad box klockan tolv en fredagskväll.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/var/log/pi-dmx-update.log
PREV_SHA_FILE="$REPO_DIR/pi-dmx/.prev-sha"
exec >>"$LOG" 2>&1
echo "=== $(date -Is) update start ($REPO_DIR) ==="

cd "$REPO_DIR"

# Refuse to blow away local uncommitted changes (e.g. on-device install-fixes).
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ABORT: working tree has uncommitted changes — not resetting. Commit/stash on the Pi first."
  exit 1
fi

# Spara nuvarande SHA så rollback.sh kan gå tillbaka om nya releasen strular.
# En rad, atomiskt: skriver bara om vi fick ut något giltigt (skydd mot att
# `.prev-sha` överskrivs med tomt vid t.ex. detached HEAD).
CUR_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
if [[ -n "$CUR_SHA" ]]; then echo "$CUR_SHA" > "$PREV_SHA_FILE"; fi

git fetch --all --prune
# Reset to the tracked upstream branch by NAME (origin/HEAD can be unset/stale
# after a prune → 'git reset --hard origin/HEAD' would error under set -e).
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git reset --hard "origin/${BRANCH}"
NEW_SHA="$(git rev-parse HEAD 2>/dev/null || true)"

echo "--- $(date -Is) uppdaterar $CUR_SHA -> $NEW_SHA ---"

bash "$REPO_DIR/pi-dmx/install.sh"

# install.sh skriver BUILD.json + /var/log/pi-dmx-deploy.log — eka den raden hit
# också så update-loggen ensam räcker för att se vad som faktiskt deployades.
tail -n1 /var/log/pi-dmx-deploy.log 2>/dev/null || true

echo "--- $(date -Is) install klar, verifierar 60 s stabilitet ---"

# Övervaka motorn i 60 s. Restart=always gör att en enstaka krasch inte syns i
# `is-active`, så vi räknar NRestarts via `systemctl show` — mer än 2 på en
# minut = ny release är trasig, rulla tillbaka.
START_RESTARTS="$(systemctl show audio-dmx-engine -p NRestarts --value 2>/dev/null || echo 0)"
STABLE=1
for i in $(seq 1 12); do
  sleep 5
  STATE="$(systemctl is-active audio-dmx-engine 2>/dev/null || echo unknown)"
  NOW_RESTARTS="$(systemctl show audio-dmx-engine -p NRestarts --value 2>/dev/null || echo 0)"
  DELTA=$(( NOW_RESTARTS - START_RESTARTS ))
  echo "  [+${i}0s] state=$STATE restarts=+$DELTA"
  if [[ "$STATE" != "active" && "$STATE" != "activating" ]]; then STABLE=0; break; fi
  if [[ "$DELTA" -gt 2 ]]; then STABLE=0; break; fi
done

if [[ "$STABLE" -eq 1 ]]; then
  echo "=== $(date -Is) update done — v$NEW_SHA stabil ==="
  exit 0
fi

echo "!!! $(date -Is) ny release instabil — försöker auto-rollback till $CUR_SHA"
if [[ -z "$CUR_SHA" ]]; then
  echo "ABORT: ingen tidigare SHA sparad — kan inte rulla tillbaka automatiskt."
  exit 2
fi
git reset --hard "$CUR_SHA"
bash "$REPO_DIR/pi-dmx/install.sh" || true
echo "=== $(date -Is) auto-rollback klar → $CUR_SHA ==="
exit 3
