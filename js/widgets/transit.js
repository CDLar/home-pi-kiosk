(function () {
  "use strict";
  const CONFIG = window.CONFIG;

  // umoiq's "direction"/"message"/"route" fields are a bare object when
  // there's exactly one, an array when there are several, and absent
  // entirely when there's nothing — normalize all three shapes.
  function asArray(x) {
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
  }

  const DIRECTION_LABELS = { E: "EASTBOUND", W: "WESTBOUND", N: "NORTHBOUND", S: "SOUTHBOUND" };

  // direction titles look like "West - 503 Kingston Rd Replacement Bus
  // towards York via King" — pull out just the destination.
  function destinationFrom(title) {
    if (!title) return "";
    const towards = /towards\s+(.+)$/i.exec(title);
    if (towards) return towards[1].toUpperCase();
    const stripped = /^(?:East|West|North|South)\s*-\s*(.+)$/i.exec(title);
    return "→ " + (stripped ? stripped[1] : title).toUpperCase();
  }

  // a bus arriving very soon is the one thing worth calling out visually
  const URGENT_THRESHOLD_MINS = 5;

  async function fetchStop(stop) {
    const predUrl = "https://retro.umoiq.com/service/publicJSONFeed"
      + "?command=predictions"
      + "&a=" + encodeURIComponent(stop.agency)
      + "&r=" + encodeURIComponent(stop.route)
      + "&stopId=" + encodeURIComponent(stop.stopId);
    const res = await fetch(predUrl);
    if (!res.ok) throw new Error("umoiq predictions HTTP " + res.status);
    const json = await res.json();
    if (json.Error) throw new Error("umoiq error — " + (json.Error.content || "unknown"));

    const directions = asArray(json.predictions && json.predictions.direction);
    const arrivals = directions
      .flatMap(d => asArray(d.prediction))
      .map(p => parseInt(p.minutes, 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    return {
      stop, next: arrivals[0], then: arrivals[1],
      dest: destinationFrom(directions[0] && directions[0].title)
    };
  }

  function etaValue(mins, urgentEligible) {
    const urgent = urgentEligible && mins <= URGENT_THRESHOLD_MINS;
    return `<span class="tl-eta-num${urgent ? " tl-urgent" : ""}">${mins}<small>min</small></span>`;
  }

  function entryInner({ stop, next, then, dest }) {
    const direction = DIRECTION_LABELS[stop.direction] || stop.direction;
    // no "NEXT"/"THEN" labels — just the two numbers, separated by a
    // small dot, since the numbers themselves are already unmistakably
    // the point of this board
    let etaHTML;
    if (next === undefined) {
      etaHTML = '<span class="tl-none">NO BUSES</span>';
    } else if (then === undefined) {
      etaHTML = etaValue(next, true);
    } else {
      etaHTML = etaValue(next, true) + etaValue(then, false);
    }

    return `
      <div class="tl-entry-head">
        <span class="tl-route">${stop.route}</span>
        <div class="tl-dir-stack">
          <div class="tl-dir">${direction}</div>
          <div class="tl-dest">${dest}</div>
        </div>
      </div>
      <div class="tl-eta-row">${etaHTML}</div>`;
  }

  window.KIOSK_WIDGETS = window.KIOSK_WIDGETS || [];
  window.KIOSK_WIDGETS.push({
    id: "transit-list",
    bare: true,
    refreshMs: CONFIG.refreshMs,

    async fetch() {
      // one stop failing shouldn't take down the whole board — resolve
      // each independently and fall back to "no data" for that entry
      const results = await Promise.allSettled(CONFIG.transit.map(fetchStop));
      return results.map((r, i) =>
        r.status === "fulfilled" ? r.value : { stop: CONFIG.transit[i], next: undefined, dest: "" });
    },

    render(el, rows) {
      const entriesHTML = rows
        .map(row => `<div class="tl-entry">${entryInner(row)}</div>`)
        .join("");
      el.innerHTML = `<div class="tl-board">${entriesHTML}</div>`;
    }
  });
})();
