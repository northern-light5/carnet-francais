#!/usr/bin/env bash
# Push the source to the Pi and build it there.
#   PI=pi@raspberrypi.local ./deploy/deploy.sh
# Requires SSH key access and a one-time `sudo ./deploy/setup-pi.sh` on the Pi.
set -euo pipefail

PI="${PI:-pi@raspberrypi.local}"
REMOTE_DIR="${REMOTE_DIR:-french-site}"
WEBROOT="${WEBROOT:-/var/www/carnet-francais}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Syncing source to $PI:~/$REMOTE_DIR"
rsync -az --delete --exclude .git --exclude public "$HERE/" "$PI:$REMOTE_DIR/"

echo "→ Building on the Pi"
ssh "$PI" "cd '$REMOTE_DIR' && python3 build.py && rsync -a --delete public/ '$WEBROOT/'"
echo "✓ Deployed"
