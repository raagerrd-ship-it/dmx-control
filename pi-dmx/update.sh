#!/usr/bin/env bash
# Pull latest code from git and re-run the installer.
# Triggered from the mobile UI via POST /update (systemd-run detaches it
# from the engine service so the restart at the end doesn't kill us).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/var/log/pi-dmx-update.log
exec >>"$LOG" 2>&1
echo "=== $(date -Is) update start ($REPO_DIR) ==="

cd "$REPO_DIR"
git fetch --all --prune
git reset --hard origin/HEAD
bash "$REPO_DIR/pi-dmx/install.sh"
echo "=== $(date -Is) update done ==="
