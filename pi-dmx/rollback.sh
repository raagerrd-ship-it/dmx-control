#!/usr/bin/env bash
# Rollback till förra versionen (SHA sparad av update.sh i .prev-sha) och
# kör om install. Triggas från mobil-UI:t via POST /update/rollback.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/var/log/pi-dmx-update.log
PREV_SHA_FILE="$REPO_DIR/pi-dmx/.prev-sha"
exec >>"$LOG" 2>&1
echo "=== $(date -Is) rollback start ($REPO_DIR) ==="

if [[ ! -s "$PREV_SHA_FILE" ]]; then
  echo "ABORT: ingen .prev-sha sparad — kör en update först så finns det något att gå tillbaka till."
  exit 1
fi
PREV="$(head -n1 "$PREV_SHA_FILE" | tr -d '[:space:]')"
if [[ -z "$PREV" ]]; then
  echo "ABORT: .prev-sha tom eller trasig"
  exit 1
fi

cd "$REPO_DIR"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ABORT: working tree har ocommittade ändringar — resetta på Pi:n först."
  exit 1
fi

echo "checking out $PREV"
git fetch --all --prune
git reset --hard "$PREV"
bash "$REPO_DIR/pi-dmx/install.sh"
echo "=== $(date -Is) rollback done ==="
