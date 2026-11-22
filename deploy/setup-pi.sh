#!/usr/bin/env bash
# One-time setup, run ON the Raspberry Pi from the project folder:
#   sudo PORT=80 ./deploy/setup-pi.sh
# Installs nginx + python3, creates the web root owned by your user,
# and enables the site. Later deploys need no sudo.
set -euo pipefail

PORT="${PORT:-80}"
WEBROOT="${WEBROOT:-/var/www/carnet-francais}"
OWNER="${SUDO_USER:-$(whoami)}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo." >&2; exit 1; fi

apt-get update -qq
apt-get install -y -qq nginx python3 rsync

mkdir -p "$WEBROOT"
chown -R "$OWNER":"$OWNER" "$WEBROOT"

sed -e "s|__PORT__|$PORT|g" -e "s|__WEBROOT__|$WEBROOT|g" "$HERE/deploy/nginx.conf" \
  > /etc/nginx/sites-available/carnet-francais
ln -sf /etc/nginx/sites-available/carnet-francais /etc/nginx/sites-enabled/carnet-francais
if [[ "$PORT" == "80" ]]; then rm -f /etc/nginx/sites-enabled/default; fi

nginx -t
systemctl enable --now nginx
systemctl reload nginx

sudo -u "$OWNER" bash -c "cd '$HERE' && python3 build.py && rsync -a --delete public/ '$WEBROOT/'"
echo "Site live on http://$(hostname -I | awk '{print $1}'):$PORT/"
