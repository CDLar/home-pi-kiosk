#!/usr/bin/env bash
# ============================================================
# Raspberry Pi Kiosk Dashboard — Setup & Auto-Update
#
# Run this once via SSH on the Pi:
#   chmod +x setup-kiosk.sh && ./setup-kiosk.sh
#
# EDIT THESE FIRST:
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/CDLar/home-pi-kiosk.git"
BRANCH="main"
DASHBOARD_FILE="kiosk.html"         # path to the file INSIDE the repo
INSTALL_DIR="$HOME/dashboard"

# ============================================================
# 1. Install the minimal kiosk stack (no desktop environment needed)
# ============================================================
echo "==> Installing packages..."
sudo apt update
sudo apt install -y --no-install-recommends \
  xserver-xorg xinit openbox chromium-browser unclutter git

# ============================================================
# 2. Clone (or update) the dashboard repo
# ============================================================
echo "==> Fetching dashboard repo..."
if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" pull
else
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

DASHBOARD_PATH="$INSTALL_DIR/$DASHBOARD_FILE"

# ============================================================
# 3. Kiosk launcher — loops so a crash or a forced-quit (used by the
#    auto-updater below) just reopens the browser instead of leaving
#    a black screen
# ============================================================
echo "==> Writing ~/.xinitrc..."
cat > "$HOME/.xinitrc" <<EOF
xset -dpms
xset s off
xset s noblank
unclutter -idle 0.5 -root &
openbox-session &

while true; do
  chromium-browser --kiosk --incognito --noerrdialogs --disable-infobars \\
    --disable-translate --disk-cache-dir=/dev/null \\
    "file://$DASHBOARD_PATH"
  sleep 2
done
EOF

# ============================================================
# 4. Autologin on tty1 + auto-start X on login
# ============================================================
echo "==> Enabling console autologin..."
sudo raspi-config nonint do_boot_behaviour B2

if ! grep -qxF 'if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then startx; fi' "$HOME/.bash_profile" 2>/dev/null; then
  echo 'if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then startx; fi' >> "$HOME/.bash_profile"
fi

# ============================================================
# 5. Manual update helper — run this by hand over SSH any time
#    you've pushed changes to GitHub. It pulls the latest commit
#    and kills chromium so the .xinitrc loop reopens it fresh.
# ============================================================
echo "==> Installing manual update helper (~/dashboard-update.sh)..."
UPDATE_SCRIPT="$HOME/dashboard-update.sh"
cat > "$UPDATE_SCRIPT" <<EOF
#!/usr/bin/env bash
cd "$INSTALL_DIR" || exit 1
BEFORE=\$(git rev-parse HEAD)
git fetch origin "$BRANCH" --quiet
git reset --hard "origin/$BRANCH" --quiet
AFTER=\$(git rev-parse HEAD)
if [ "\$BEFORE" != "\$AFTER" ]; then
  echo "Updated: \$BEFORE -> \$AFTER. Reloading kiosk..."
  pkill chromium-browser 2>/dev/null || pkill chromium 2>/dev/null || true
else
  echo "Already up to date (\$AFTER)."
fi
EOF
chmod +x "$UPDATE_SCRIPT"

echo ""
echo "==> Setup complete."
echo "    - Dashboard file: $DASHBOARD_PATH"
echo "    - Reboot to launch automatically: sudo reboot"
echo "    - Or test right now without rebooting: startx"
echo "    - After pushing changes to GitHub, SSH in and run:"
echo "          ~/dashboard-update.sh"
