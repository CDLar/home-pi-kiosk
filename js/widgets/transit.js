(function(){
  "use strict";
  const CONFIG = window.CONFIG;

  // umoiq's "direction"/"message"/"route" fields are a bare object when
  // there's exactly one, an array when there are several, and absent
  // entirely when there's nothing — normalize all three shapes.
  function asArray(x){
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
  }

  const DIRECTION_LABELS = { E: "EASTBOUND", W: "WESTBOUND", N: "NORTHBOUND", S: "SOUTHBOUND" };

  // direction titles look like "West - 503 Kingston Rd Replacement Bus
  // towards York via King" — pull out just the destination so the card
  // can show where the bus is actually headed, not just the compass
  // direction we already show in the title bar.
  function destinationFrom(title){
    if (!title) return "";
    const towards = /towards\s+(.+)$/i.exec(title);
    if (towards) return "→ " + towards[1].toUpperCase();
    const stripped = /^(?:East|West|North|South)\s*-\s*(.+)$/i.exec(title);
    return (stripped ? stripped[1] : title).toUpperCase();
  }

  window.KIOSK_WIDGETS = window.KIOSK_WIDGETS || [];

  // one widget per configured stop, so multiple directions/stops on the
  // same route can be tracked side by side
  CONFIG.transit.forEach(stop => {
    window.KIOSK_WIDGETS.push({
      id: "transit-" + stop.stopId,
      title: "ROUTE " + stop.route + " — " + (DIRECTION_LABELS[stop.direction] || stop.direction),
      span: 1,
      refreshMs: CONFIG.refreshMs,

      async fetch(){
        const predUrl = "https://retro.umoiq.com/service/publicJSONFeed"
          + "?command=predictions"
          + "&a=" + encodeURIComponent(stop.agency)
          + "&r=" + encodeURIComponent(stop.route)
          + "&stopId=" + encodeURIComponent(stop.stopId);
        // the messages endpoint's own r= filter is unreliable (errors on
        // some valid route tags), so fetch the agency-wide list and
        // filter client-side instead
        const msgUrl = "https://retro.umoiq.com/service/publicJSONFeed"
          + "?command=messages&a=" + encodeURIComponent(stop.agency);

        const [predRes, msgRes] = await Promise.all([fetch(predUrl), fetch(msgUrl)]);
        if (!predRes.ok) throw new Error("umoiq predictions HTTP " + predRes.status);
        const predJson = await predRes.json();
        if (predJson.Error) throw new Error("umoiq error — " + (predJson.Error.content || "unknown"));

        // alerts are supplementary — never let a parsing hiccup here
        // fail the whole widget
        let alertText = null;
        try{
          if (msgRes.ok){
            const msgJson = await msgRes.json();
            const match = asArray(msgJson.route).find(r => r.tag === stop.route);
            const msgs = match && asArray(match.message);
            if (msgs && msgs.length) alertText = msgs[0].text;
          }
        }catch(e){ /* ignore — alertText stays null */ }

        return { predictions: predJson.predictions, alertText };
      },

      render(el, data){
        const directions = asArray(data.predictions && data.predictions.direction);
        const arrivals = directions
          .flatMap(d => asArray(d.prediction))
          .map(p => parseInt(p.minutes, 10))
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b)
          .slice(0, 4);

        const dest = destinationFrom(directions[0] && directions[0].title);

        const alertHTML = data.alertText
          ? `<div class="tr-alert">⚠ ${data.alertText}</div>` : "";
        const destHTML = dest ? `<div class="tr-dest">${dest}</div>` : "";

        if (arrivals.length === 0){
          el.innerHTML = alertHTML + destHTML + '<span class="placeholder">NO BUSES SCHEDULED</span>';
          return;
        }

        const arrivalsHTML = arrivals.map((mins, i) => `
          <div class="tr-arrival">
            <span class="tr-mins">${mins}</span>
            <span class="tr-unit">MIN${i === 0 ? " — NEXT" : ""}</span>
          </div>`).join("");

        el.innerHTML = alertHTML + destHTML + `<div class="tr-list">${arrivalsHTML}</div>`;
      }
    });
  });
})();
