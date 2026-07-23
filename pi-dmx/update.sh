#!/usr/bin/env bash
# Pull latest code from git and re-run the installer.
# Triggered from the mobile UI via POST /update (systemd-run detaches it
# from the engine service so the restart at the end doesn't kill us).
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
bash "$REPO_DIR/pi-dmx/install.sh"
echo "=== $(date -Is) update done ==="
