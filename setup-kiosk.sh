#!/usr/bin/env bash
# ============================================================
# Raspberry Pi Kiosk Dashboard — Setup
#
# The kiosk display is brought up solely via autologin + a boot-time
# `startx` — `install` configures that once, and after that a reboot
# (power loss, `sudo reboot`, etc.) is what starts/restarts the kiosk.
# There is no SSH-triggered start/stop and no cron/auto-update — pulling
# dashboard changes only happens when YOU run `update` by hand.
#
# Usage (SSH into the Pi, then):
#   chmod +x setup-kiosk.sh
#   ./setup-kiosk.sh install   # one-time: packages, repo clone, ~/.xinitrc, autologin+boot launch
#   ./setup-kiosk.sh update    # pulls latest dashboard changes from GitHub
#
# EDIT THESE FIRST:
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/CDLar/home-pi-kiosk.git"
BRANCH="main"
DASHBOARD_FILE="index.html"         # entry point INSIDE the repo
INSTALL_DIR="$HOME/dashboard"
DASHBOARD_PATH="$INSTALL_DIR/$DASHBOARD_FILE"

# ============================================================
# install — packages, repo clone, ~/.xinitrc, autologin + boot-time
# kiosk launch. Safe to re-run.
# ============================================================
cmd_install() {
  echo "==> Installing packages..."
  sudo apt update
  sudo apt install -y --no-install-recommends \
    xserver-xorg xinit openbox chromium unclutter git

  # The actual binary name varies by OS image — some ship it as
  # `chromium-browser`, current Raspberry Pi OS (trixie-based) only
  # provides `chromium`. Detect it once here instead of hardcoding
  # one name, so this doesn't silently break again on a future image.
  CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium || true)"
  if [ -z "$CHROMIUM_BIN" ]; then
    echo "ERROR: no chromium/chromium-browser binary found after install." >&2
    exit 1
  fi
  echo "    Using Chromium binary: $CHROMIUM_BIN"

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
  $CHROMIUM_BIN --kiosk --incognito --noerrdialogs --disable-infobars \\
    --disable-translate --disable-features=TranslateUI \\
    --disable-sync --disable-default-apps --disable-component-update \\
    --disable-dev-shm-usage \\
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
  echo "    Reboot to launch the kiosk: sudo reboot"
}

# ============================================================
# update — pull latest dashboard changes. Run by hand, as often
# (or rarely) as you like. Kills Chromium (not X) so the ~/.xinitrc
# loop reopens it fresh with the new files if the kiosk is running.
# ============================================================
cmd_update() {
  [ -d "$INSTALL_DIR/.git" ] || { echo "Not installed yet — run '$0 install' first."; exit 1; }
  cd "$INSTALL_DIR"
  BEFORE=$(git rev-parse HEAD)
  git fetch origin "$BRANCH" --quiet
  git reset --hard "origin/$BRANCH" --quiet
  AFTER=$(git rev-parse HEAD)
  if [ "$BEFORE" != "$AFTER" ]; then
    echo "Updated: $BEFORE -> $AFTER. Reloading kiosk..."
    pkill chromium 2>/dev/null || pkill chromium-browser 2>/dev/null || true
  else
    echo "Already up to date ($AFTER)."
  fi
}

case "${1:-}" in
  install) cmd_install ;;
  update)  cmd_update ;;
  *)
    echo "Usage: $0 {install|update}"
    echo "  install  - install packages, clone repo, write ~/.xinitrc, enable autologin + boot launch (one-time, safe to re-run)"
    echo "  update   - pull latest dashboard changes from GitHub and reload the kiosk if it's running"
    exit 1
    ;;
esac
