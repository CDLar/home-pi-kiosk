# home-pi-kiosk

An amber-on-charcoal dashboard for a Raspberry Pi kiosk display. No build step, no framework — plain HTML/CSS/JS, deployed by pointing Chromium's kiosk mode at a local file that auto-updates via `git pull`.

## Preview locally

Open [index.html](index.html) directly in a browser. All widgets fetch live data (Open-Meteo, TTC), so an internet connection is required even for local preview.

## Project layout

```
index.html            entry point — page shell, loads css/js in order
css/style.css          all styling (amber-on-charcoal theme)
js/config.js            location, timezone, refresh rate, transit stops
js/widget-engine.js      card rendering, fetch/refresh loop, error states
js/widgets/                one file per widget (weather, weather-hourly, calendar, transit-list)
js/bootstrap.js              mounts all registered widgets once loaded
setup-kiosk.sh          Pi provisioning script (install|update) — install enables autologin/boot launch; reboot to (re)start the kiosk
```

There's no header/clock — the display is 1024×600 (see [CLAUDE.md](CLAUDE.md) for the hardware target) and every pixel of vertical space is needed for the widgets themselves.

## Configuration

Edit [js/config.js](js/config.js) to change location, timezone, refresh interval, or the list of TTC stops tracked (`CONFIG.transit` is an array — the transit-list widget renders one row per entry, each showing its own `direction` label).

## Adding a widget

Each widget is a self-contained object registered onto a shared global array. Create `js/widgets/my-widget.js`:

```js
(function(){
  "use strict";
  const CONFIG = window.CONFIG;

  window.KIOSK_WIDGETS = window.KIOSK_WIDGETS || [];
  window.KIOSK_WIDGETS.push({
    id: "my-widget",
    title: "MY WIDGET",
    span: 1,              // 1, 2, or 3 grid columns
    bare: true,            // optional — plain content, no border/title bar (see weather.js)
    refreshMs: CONFIG.refreshMs,   // optional override

    async fetch(){
      // return whatever data render() needs; throw on failure
    },

    render(el, data){
      el.innerHTML = `...`;  // build the card body from data
    }
  });
})();
```

Then add `<script src="js/widgets/my-widget.js"></script>` to [index.html](index.html), before `js/bootstrap.js`. The engine handles polling, error/offline states, and stale-data fallback for you — see [js/widget-engine.js](js/widget-engine.js).

`span` places a widget via simple auto-flow (it just takes the next 1/2/3 open grid columns in DOM order). The four current widgets don't use it — each has a specific spot (weather+calendar stacked in column 1, the hourly forecast beside them, transit along the bottom), so they're positioned explicitly instead via `.card[data-widget="..."]{ grid-column; grid-row; }` rules in `css/style.css`. Use `span` for a simple new widget that can go wherever there's room next; add an explicit `[data-widget]` rule if it needs a specific spot.

## Pre-setup (starting from a freshly flashed Pi)

Do this once, before [setup-kiosk.sh](setup-kiosk.sh), on a fresh Raspberry Pi OS **Lite** (32-bit or 64-bit both work; Lite specifically — no desktop environment needed) flash.

1. **Flash + first boot.** Use Raspberry Pi Imager's advanced options (gear icon) to set hostname, enable SSH, and pre-configure Wi-Fi credentials before writing the card — avoids ever needing a monitor/keyboard on the Pi itself. Boot it, then SSH in.
2. **Update the OS** (`sudo apt update && sudo apt full-upgrade -y`) and reboot before installing anything else, so the kiosk stack installs against current packages.
3. **Install git** (`sudo apt install -y git`) — Raspberry Pi OS Lite doesn't ship it by default, and you need it to `git clone` this repo in the first place, before `setup-kiosk.sh install` gets a chance to install it as part of the kiosk stack.
4. **Free up RAM for Chromium** — the Zero 2 W only has 512MB total, and Chromium is the single biggest consumer on this device. Be conservative here: a few of these are easy to over-tighten and end up hurting the kiosk instead of helping it, since it's the display *and* its only remote-access path (SSH) sharing that same 512MB.
   - Disable `triggerhappy` (hotkey daemon) and `bluetooth` if you don't need them: `sudo systemctl disable triggerhappy bluetooth`. **Leave `avahi-daemon` enabled** — it's what lets you `ssh curtpi@<hostname>.local` without knowing the Pi's IP, and disabling it to save a few MB isn't worth losing that when something's already gone wrong with the display and you need to get back in.
   - **Leave the GPU memory split at its default** — don't lower it via `raspi-config`. This board uses the modern KMS driver (`dtoverlay=vc4-kms-v3d` in `config.txt`, already the default), where GPU memory is managed dynamically by the driver, not carved out of a static split the old "headless Pi" advice assumes; lowering it can starve Chromium's compositor instead of freeing RAM for it.
   - **Leave swap at the Lite default — don't disable it.** With Chromium alone regularly using 150–200MB+ on this device, swap is a safety buffer against an OOM kill mid-render, not just wasted SD wear; losing it trades a slow-but-recoverable slowdown for a hard crash.
5. **Chromium launch flags** — already baked into the `~/.xinitrc` that `setup-kiosk.sh install` writes, listed here so it's clear what's happening and why, in case you need to tune further for your specific Pi:
   - `--disk-cache-dir=/dev/null` — no disk cache; avoids wearing the SD card and avoids cache eating RAM/tmpfs.
   - `--disable-dev-shm-usage` — avoids `/dev/shm` memory pressure on a RAM-constrained board.
   - `--disable-sync --disable-default-apps --disable-component-update --disable-notifications --no-first-run` — strips background network/UI work unrelated to just rendering the dashboard.
   - `--js-flags="--max-old-space-size=128"` — caps the V8 heap so a leaking/growing tab gets recycled instead of slowly starving the whole Pi of RAM.
   - Deliberately **not** using `--disable-software-rasterizer`: it removes Chromium's software-rendering fallback, so if hardware-accelerated rendering ever hiccups on this board's KMS driver, the result is a blank screen with no fallback instead of a slower-but-working one. Given this setup has already hit a blank-screen issue once, that tradeoff isn't worth the RAM savings.

With that done, move on to [Deploying to a Raspberry Pi](#deploying-to-a-raspberry-pi) below.

## Deploying to a Raspberry Pi

`install` enables autologin + a boot-time kiosk launch. From then on, the kiosk starts and restarts solely via reboot (power loss, `sudo reboot`, etc.) — there's no SSH-triggered start/stop. Pulling dashboard updates is still manual: nothing auto-updates, you run `update` yourself whenever you want the latest version.

1. Clone this repo onto the Pi (you just need `setup-kiosk.sh` from it — `install` below clones the dashboard itself separately into `~/dashboard`):
   ```
   git clone https://github.com/CDLar/home-pi-kiosk.git
   cd home-pi-kiosk
   ```
2. Edit the `REPO_URL` / `BRANCH` variables at the top of `setup-kiosk.sh` if needed.
3. One-time install (packages + clone repo + write `~/.xinitrc` + enable autologin/boot launch; safe to re-run later):
   ```
   chmod +x setup-kiosk.sh
   ./setup-kiosk.sh install
   ```
4. Reboot to launch the kiosk:
   ```
   sudo reboot
   ```

### Pushing updates

After pushing changes to GitHub, SSH into the Pi and run:
```
./setup-kiosk.sh update
```
This pulls the latest commit and, if the kiosk is currently running, kills Chromium so the `~/.xinitrc` loop reopens it fresh with the new version — no reboot needed for a dashboard update (only `install` changes, like new packages, need a reboot).
