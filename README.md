# home-pi-kiosk

A terminal/CRT-styled dashboard for a Raspberry Pi kiosk display. No build step, no framework — plain HTML/CSS/JS, deployed by pointing Chromium's kiosk mode at a local file that auto-updates via `git pull`.

## Preview locally

Open [index.html](index.html) directly in a browser. All widgets fetch live data (Open-Meteo, TTC), so an internet connection is required even for local preview.

## Project layout

```
index.html            entry point — page shell, loads css/js in order
css/style.css          all styling (amber/CRT terminal theme)
js/config.js            location, timezone, refresh rate, transit stop
js/clock.js               header clock/date
js/widget-engine.js        card rendering, fetch/refresh loop, error states
js/widgets/                 one file per widget (weather, air-quality, transit)
js/bootstrap.js              mounts all registered widgets once loaded
setup-kiosk.sh          Pi provisioning + auto-update script
```

## Configuration

Edit [js/config.js](js/config.js) to change location, timezone, refresh interval, or the list of TTC stops tracked (`CONFIG.transit` is an array — one card is rendered per entry, each showing its own `direction` label).

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

## Deploying to a Raspberry Pi

1. Flash Raspberry Pi OS **Lite** (no desktop needed) and SSH in.
2. Copy [setup-kiosk.sh](setup-kiosk.sh) to the Pi (or `git clone` this repo and run it from there).
3. Edit the `REPO_URL` / `BRANCH` variables at the top if needed, then run:
   ```
   chmod +x setup-kiosk.sh && ./setup-kiosk.sh
   ```
4. Reboot (`sudo reboot`) — the Pi will autologin on tty1, start X, and launch Chromium in kiosk mode pointed at `index.html`.

### Pushing updates

After pushing changes to GitHub, SSH into the Pi and run:
```
~/dashboard-update.sh
```
This pulls the latest commit and kills Chromium; the kiosk loop in `~/.xinitrc` reopens it automatically with the new version.
