#!/bin/sh
# Install the local USB runtime using the user's existing SSH configuration.
set -eu
pi_target=${1:?Usage: ESP32_SERIAL=... UNO_SERIAL=... NANO_SERIAL=... ./scripts/deploy-pi.sh USER@PI_HOST}
: "${ESP32_SERIAL:?Set ESP32_SERIAL to the Pi device path}"
: "${UNO_SERIAL:?Set UNO_SERIAL to the Pi device path}"
: "${NANO_SERIAL:?Set NANO_SERIAL to the Pi device path}"
# Device paths go into a systemd command; reject shell/systemd metacharacters.
for device in "$ESP32_SERIAL" "$UNO_SERIAL" "$NANO_SERIAL"; do
 case "$device" in /dev/*) ;; *) echo 'Serial paths must start with /dev/' >&2; exit 1;; esac
 case "$device" in *[!a-zA-Z0-9_./:-]*) echo 'Unsupported character in serial path' >&2; exit 1;; esac
done
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ssh -o ConnectTimeout=8 "$pi_target" 'mkdir -p "$HOME/dead-channel"'
rsync -az "$project_dir/server.py" "$project_dir/web" "$pi_target:dead-channel/"
ssh "$pi_target" "sh -s -- '$ESP32_SERIAL' '$UNO_SERIAL' '$NANO_SERIAL'" <<'REMOTE'
set -eu
python3 -m py_compile "$HOME/dead-channel/server.py"
mkdir -p "$HOME/.config/systemd/user"
unit="$HOME/.config/systemd/user/dead-channel.service"
if [ -f "$unit" ]; then cp "$unit" "$unit.previous"; fi
cat > "$unit" <<UNIT
[Unit]
Description=Dead Channel local arcade and USB bridge
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 %h/dead-channel/server.py --serial $1 --lcd-serial $2 --keypad-serial $3
WorkingDirectory=%h/dead-channel
Restart=on-failure
RestartSec=3
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable dead-channel.service
systemctl --user restart dead-channel.service
systemctl --user --no-pager status dead-channel.service
REMOTE
