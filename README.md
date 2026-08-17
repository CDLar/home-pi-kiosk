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
setup-kiosk.sh          Pi provisioning + auto-update script
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
