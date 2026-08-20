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

Do this once, before [setup-kiosk.sh](setup-kiosk.sh), on a fresh Raspberry Pi OS **Lite** flash.

1. Flash with Raspberry Pi Imager's advanced options (hostname, SSH, Wi-Fi) so you can SSH in without a monitor/keyboard.
2. `sudo apt update && sudo apt full-upgrade -y`, then reboot.
3. `sudo apt install -y git`
4. Optional: `sudo systemctl disable triggerhappy bluetooth`. Leave `avahi-daemon`, swap, and the GPU memory split at their defaults.
5. Chromium's launch flags (below) are already baked into the `~/.xinitrc` that `setup-kiosk.sh install` writes — nothing to do here, just for reference:
   - `--disk-cache-dir=/dev/null` — no disk cache
   - `--disable-dev-shm-usage` — avoids `/dev/shm` memory pressure
   - `--disable-sync --disable-default-apps --disable-component-update --disable-notifications --no-first-run` — strips background work
   - `--js-flags="--max-old-space-size=128"` — caps the V8 heap
   - `--disable-features=TranslateUI,site-per-process` — disables Site Isolation (not needed for one trusted page)
   - `--renderer-process-limit=1` — caps Chromium to one renderer process
   - `--no-memcheck` — skips the launcher script's low-RAM warning dialog (unclickable — this kiosk has no mouse/keyboard)
   - `--test-type` — suppresses other "unsupported configuration" warnings

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
