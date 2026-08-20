#!/usr/bin/env bash
# ============================================================
# Raspberry Pi Kiosk Dashboard — Setup
#
# `install` enables autologin + boot-time kiosk launch, so the display
# self-recovers after a reboot or power loss without you having to SSH
# in. Everything else — installing/reinstalling, pulling dashboard
# updates, and manually starting/stopping the display between reboots
# — only happens when YOU run the corresponding command over SSH. No
# cron, no auto-update, no background polling.
#
# Usage (SSH into the Pi, then):
#   chmod +x setup-kiosk.sh
#   ./setup-kiosk.sh install   # one-time: packages, repo clone, ~/.xinitrc, autologin+boot launch
#   ./setup-kiosk.sh update    # pulls latest dashboard changes from GitHub
#   ./setup-kiosk.sh start     # (re)launches X + Chromium kiosk without rebooting
#   ./setup-kiosk.sh stop      # kills the kiosk (X + Chromium)
#
# EDIT THESE FIRST:
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/CDLar/home-pi-kiosk.git"
BRANCH="main"
DASHBOARD_FILE="index.html"         # entry point INSIDE the repo
INSTALL_DIR="$HOME/dashboard"
DASHBOARD_PATH="$INSTALL_DIR/$DASHBOARD_FILE"
KIOSK_LOG="$HOME/kiosk.log"

# ============================================================
# install — packages, repo clone, ~/.xinitrc, autologin + boot-time
# kiosk launch. Safe to re-run.
# ============================================================
cmd_install() {
  echo "==> Installing packages..."
  sudo apt update
  sudo apt install -y --no-install-recommends \
    xserver-xorg xinit xserver-xorg-legacy openbox chromium-browser unclutter git

  # systemd-logind only grants VT (/dev/tty0) access to a session logged
  # into a real console (seat0) — autologin below covers boot, but this
  # also lets `start`/`stop` work from a plain SSH session (e.g. right
  # after install, or between reboots) without hitting "Cannot open
  # /dev/tty0 (Permission denied)".
  echo "==> Allowing X to start from an SSH session too, not just the console..."
  sudo tee /etc/X11/Xwrapper.config > /dev/null <<'WRAPPEREOF'
allowed_users=anybody
needs_root_rights=yes
WRAPPEREOF

  echo "==> Fetching dashboard repo..."
  if [ -d "$INSTALL_DIR/.git" ]; then
    echo "    Already cloned at $INSTALL_DIR — use '$0 update' to pull changes."
  else
    git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi

  echo "==> Writing ~/.xinitrc..."
  # Chromium flags are tuned for the Pi Zero 2 W's 512MB RAM — see README
  # "Pre-setup" section for the reasoning behind each one.
  cat > "$HOME/.xinitrc" <<EOF
xset -dpms
xset s off
xset s noblank
unclutter -idle 0.5 -root &
openbox-session &

while true; do
  chromium-browser --kiosk --incognito --noerrdialogs --disable-infobars \\
    --disable-translate --disable-features=TranslateUI \\
    --disable-sync --disable-default-apps --disable-component-update \\
    --disable-software-rasterizer --disable-dev-shm-usage \\
    --disk-cache-dir=/dev/null --disable-notifications \\
    --no-first-run --password-store=basic \\
    --js-flags="--max-old-space-size=128" \\
    "file://$DASHBOARD_PATH"
  sleep 2
done
EOF

  echo "==> Enabling console autologin + boot-time kiosk launch..."
  sudo raspi-config nonint do_boot_behaviour B2

  if ! grep -qxF 'if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then startx; fi' "$HOME/.bash_profile" 2>/dev/null; then
    echo 'if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then startx; fi' >> "$HOME/.bash_profile"
  fi

  echo ""
  echo "==> Install complete."
  echo "    - Reboot to launch the kiosk automatically from now on: sudo reboot"
  echo "    - Or test right now without rebooting: $0 start"
}

# ============================================================
# update — pull latest dashboard changes. Run by hand, as often
# (or rarely) as you like.
# ============================================================
cmd_update() {
  [ -d "$INSTALL_DIR/.git" ] || { echo "Not installed yet — run '$0 install' first."; exit 1; }
  cd "$INSTALL_DIR"
  BEFORE=$(git rev-parse HEAD)
  git fetch origin "$BRANCH" --quiet
  git reset --hard "origin/$BRANCH" --quiet
  AFTER=$(git rev-parse HEAD)
  if [ "$BEFORE" != "$AFTER" ]; then
    echo "Updated: $BEFORE -> $AFTER"
    if pgrep -x chromium-browser >/dev/null 2>&1 || pgrep -x chromium >/dev/null 2>&1; then
      echo "Kiosk is running — run '$0 stop' then '$0 start' to load the new version."
    fi
  else
    echo "Already up to date ($AFTER)."
  fi
}

# ============================================================
# start — launch X + the kiosk loop, detached from the SSH session
# so closing the SSH connection doesn't kill the display.
# ============================================================
cmd_start() {
  [ -f "$HOME/.xinitrc" ] || { echo "Not installed yet — run '$0 install' first."; exit 1; }
  if pgrep -x Xorg >/dev/null 2>&1 || pgrep -x X >/dev/null 2>&1; then
    echo "Kiosk already appears to be running. Use '$0 stop' first if you want to restart it."
    exit 1
  fi
  echo "==> Starting kiosk (detached) — logging to $KIOSK_LOG"
  setsid startx > "$KIOSK_LOG" 2>&1 < /dev/null &
  disown
  sleep 1
  echo "==> Started. Use '$0 stop' to end it."
}

# ============================================================
# stop — kill the kiosk (Chromium + X). Doesn't come back on its own
# until you run `start` again or reboot — this is a deliberate manual
# override, not a toggle the boot-time launch will undo.
# ============================================================
cmd_stop() {
  echo "==> Stopping kiosk..."
  pkill chromium-browser 2>/dev/null || pkill chromium 2>/dev/null || true
  pkill -x Xorg 2>/dev/null || pkill -x X 2>/dev/null || true
  echo "==> Stopped."
}

case "${1:-}" in
  install) cmd_install ;;
  update)  cmd_update ;;
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  *)
    echo "Usage: $0 {install|update|start|stop}"
    echo "  install  - install packages, clone repo, write ~/.xinitrc, enable autologin + boot launch (one-time, safe to re-run)"
    echo "  update   - pull latest dashboard changes from GitHub"
    echo "  start    - launch the kiosk display now, without rebooting"
    echo "  stop     - kill the kiosk display (stays off until 'start' or a reboot)"
    exit 1
    ;;
esac
