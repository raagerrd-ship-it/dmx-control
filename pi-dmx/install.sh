#!/usr/bin/env bash
# ============================================================================
# pi-dmx — one-shot installer for a fresh Raspberry Pi Zero 2 W.
#
# Idempotent. Re-run after code changes to rebuild + restart services.
# Expects to be run from the repo root: `sudo bash pi-dmx/install.sh`.
#
# This is a dedicated single-purpose appliance — everything runs as root
# so nothing gets in the way of ALSA / GPIO / serial / port 80.
# ============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash pi-dmx/install.sh" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BOOT_DIR="/boot/firmware"
[[ -d $BOOT_DIR ]] || BOOT_DIR="/boot"

echo "==> [1/9] apt packages"
apt-get update -qq
apt-get install -y --no-install-recommends \
  build-essential nodejs npm \
  alsa-utils gpiod libcap2-bin

echo "==> [2/9] /boot config — UART, Codec Zero, force_turbo"
CFG="$BOOT_DIR/config.txt"
touch "$CFG"
ensure_line() { grep -qxF "$1" "$CFG" || echo "$1" >> "$CFG"; }
ensure_line "enable_uart=1"
ensure_line "dtoverlay=disable-bt"
ensure_line "init_uart_clock=48000000"
# rpi-codeczero (not iqaudio-codec) — the generic IQaudIO overlay gives
# "I2S SYNC error" / EIO on capture with the Codec Zero on newer kernels.
sed -i '/^dtoverlay=iqaudio-codec$/d' "$CFG"
ensure_line "dtoverlay=rpi-codeczero"
ensure_line "force_turbo=1"
# HDMI audio off — keeps the codec as card 0 (card order is otherwise random)
sed -i 's/^dtoverlay=vc4-kms-v3d$/dtoverlay=vc4-kms-v3d,noaudio/' "$CFG"

echo "==> [3/9] /boot cmdline — isolate CPU3 for dmx-helper, drop serial console"
CMD="$BOOT_DIR/cmdline.txt"
if [[ -f $CMD ]]; then
  sed -i 's/console=serial0,115200 \?//g; s/console=ttyAMA0,115200 \?//g' "$CMD"
  if ! grep -q "isolcpus=3" "$CMD"; then
    sed -i '1 s/$/ isolcpus=3 nohz_full=3 rcu_nocbs=3/' "$CMD"
  fi
fi

echo "==> [4/9] disable Bluetooth stack + serial-getty"
systemctl disable --now hciuart bluetooth serial-getty@ttyAMA0 2>/dev/null || true

AP_SSID="${AP_SSID:-pi-dmx}"
AP_PASS="${AP_PASS:-}"                 # empty = open network (no password)
echo "==> [5/9] WiFi AP — SSID=$AP_SSID, gateway=192.168.4.1$([ -z "$AP_PASS" ] && echo ' (open)')"
# Bookworm ships NetworkManager. `ipv4.method shared` = NM runs its own
# dnsmasq for DHCP/DNS, so no separate hostapd/dnsmasq config needed.
if command -v nmcli >/dev/null; then
  AP_CON="pi-dmx-ap"
  nmcli con delete "$AP_CON" 2>/dev/null || true
  nmcli con add type wifi ifname wlan0 mode ap con-name "$AP_CON" \
    ssid "$AP_SSID" autoconnect yes
  nmcli con modify "$AP_CON" \
    802-11-wireless.band bg 802-11-wireless.channel 6 \
    ipv4.method shared ipv4.addresses 192.168.4.1/24 \
    ipv6.method disabled \
    connection.autoconnect-priority 100
  if [ -n "$AP_PASS" ]; then
    nmcli con modify "$AP_CON" \
      802-11-wireless-security.key-mgmt wpa-psk \
      802-11-wireless-security.psk "$AP_PASS"
  else
    nmcli con modify "$AP_CON" \
      802-11-wireless-security.key-mgmt "" \
      802-11-wireless-security.psk "" 2>/dev/null || true
  fi
  # CAPTIVE PORTAL: NM:s shared-dnsmasq laser /etc/NetworkManager/dnsmasq-shared.d/*.conf.
  # Peka ALLA domaner till gatewayen -> nar en telefon ansluter till AP:n landar OS:ens
  # internet-koll pa kontroll-sidan automatiskt (motorn 302:ar probe-URLerna till "/").
  # Galler bara AP/shared-interfacet; Pi:ns egen wifi-klient ar oberord.
  install -d /etc/NetworkManager/dnsmasq-shared.d
  printf '# Captive portal: alla domaner -> gateway sa OS-internet-kollen landar pa /.\naddress=/#/192.168.4.1\n' \
    > /etc/NetworkManager/dnsmasq-shared.d/captive.conf
  echo "  (AP-profil + captive-portal skapad — aktiveras vid reboot; patchad for fjarrinstall)"

else
  echo "  ! NetworkManager not found — skipping AP setup." >&2
  echo "    Install NM or configure hostapd manually." >&2
fi

echo "==> [5/8] Codec Zero — route AUX line-in to capture"
# Working DA7212 register state: AUX IN (P1 header) routed to capture.
# Without this the codec never drives the I2S clocks (EIO on arecord/aplay).
install -Dm644 "$REPO_DIR/alsa/codec-zero-auxin.state" /etc/alsa/codec-zero-linein.state
# Both routings available for the UI input switch (aux = line via P1, mic = 3.5mm/onboard).
install -Dm644 "$REPO_DIR/alsa/codec-zero-auxin.state" /etc/alsa/codec-zero-aux.state
install -Dm644 "$REPO_DIR/alsa/codec-zero-mic.state" /etc/alsa/codec-zero-mic.state
install -Dm644 /dev/stdin /etc/systemd/system/codec-zero-linein.service <<'EOF_SVC'
[Unit]
Description=Codec Zero — AUX line-in routing
After=sound.target
[Service]
Type=oneshot
ExecStart=/bin/sh -c '[ -s /etc/alsa/codec-zero-linein.state ] && /usr/sbin/alsactl restore -f /etc/alsa/codec-zero-linein.state || true'
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
EOF_SVC
install -Dm644 /dev/stdin /etc/asound.conf <<'EOF_ASND'
pcm.!default {
  type asym
  capture.pcm "hw:0,0"
}
EOF_ASND

echo "==> [6/8] build + install dmx-helper (C sidecar)"
make -C "$REPO_DIR/dmx-helper" clean
make -C "$REPO_DIR/dmx-helper"
make -C "$REPO_DIR/dmx-helper" install
install -Dm644 "$REPO_DIR/dmx-helper/systemd/dmx-helper.service" \
  /etc/systemd/system/dmx-helper.service

echo "==> [7/8] build + install audio-dmx-engine (Node)"
cd "$REPO_DIR/engine"
npm ci --no-audit --no-fund
npm run build
mkdir -p /opt/audio-dmx-engine /var/lib/audio-dmx-engine
rsync -a --delete dist/ /opt/audio-dmx-engine/dist/
rsync -a --delete public/ /opt/audio-dmx-engine/public/
[ -d ../webapp ] && rsync -a --delete ../webapp/ /opt/audio-dmx-engine/webapp/
rsync -a --delete node_modules/ /opt/audio-dmx-engine/node_modules/
install -m644 package.json /opt/audio-dmx-engine/package.json
install -Dm644 systemd/audio-dmx-engine.service /etc/systemd/system/audio-dmx-engine.service
install -Dm644 systemd/cpu-performance.service /etc/systemd/system/cpu-performance.service

# Self-signed TLS so the phone mic (secure context) + wss work on the LAN/AP.
if [ ! -f /etc/audio-dmx/tls/cert.pem ]; then
  mkdir -p /etc/audio-dmx/tls
  openssl req -x509 -newkey rsa:2048 -keyout /etc/audio-dmx/tls/key.pem     -out /etc/audio-dmx/tls/cert.pem -days 3650 -nodes -subj "/CN=pi-dmx.local" 2>/dev/null
fi

echo "==> [8/8] enable + start services"
systemctl daemon-reload
systemctl enable --now cpu-performance codec-zero-linein dmx-helper audio-dmx-engine
# enable --now does not restart already-running units — force the new build live.
systemctl restart dmx-helper audio-dmx-engine

echo
echo "Done. Reboot once so /boot config + isolcpus take effect:"
echo "    sudo reboot"
echo
echo "After reboot, join WiFi '$AP_SSID' (password: $AP_PASS)"
echo "and open http://192.168.4.1/ from your phone."
