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

# Refuse to blow away local uncommitted changes (e.g. on-device install-fixes).
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ABORT: working tree has uncommitted changes — not resetting. Commit/stash on the Pi first."
  exit 1
fi

git fetch --all --prune
# Reset to the tracked upstream branch by NAME (origin/HEAD can be unset/stale
# after a prune → 'git reset --hard origin/HEAD' would error under set -e).
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git reset --hard "origin/${BRANCH}"
bash "$REPO_DIR/pi-dmx/install.sh"
echo "=== $(date -Is) update done ==="
