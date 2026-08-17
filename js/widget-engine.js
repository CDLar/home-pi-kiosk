/* ============================================================
   WIDGET ENGINE
   Each widget: { id, title, span, refreshMs, fetch(), render(el,data) }
   Widget files push their definition onto window.KIOSK_WIDGETS;
   bootstrap.js calls KioskEngine.mount() once every widget file
   has loaded.
   ============================================================ */
window.KioskEngine = (function(){
  "use strict";
  const CONFIG = window.CONFIG;
  const cache = {};
  const errors = {}; // widget.id -> reason, present only while that widget is failing

  function diagnoseError(err){
    const msg = (err && err.message) ? err.message : String(err);
    if (!navigator.onLine){
      return "DEVICE OFFLINE — CHECK WIFI/ETHERNET";
    }
    // system clock badly wrong (common on fresh Pi Lite installs w/ no RTC,
    // before NTP has synced) breaks TLS cert validation -> generic "Failed to fetch"
    if (new Date().getFullYear() < 2024){
      return "SYSTEM CLOCK WRONG (" + new Date().getFullYear() + ") — NTP NOT SYNCED YET";
    }
    if (/Failed to fetch|NetworkError|TypeError/i.test(msg)){
      return "NETWORK/DNS ERROR — CHECK CONNECTIVITY OR CLOCK";
    }
    if (/HTTP\s*[45]\d\d/.test(msg)){
      return "API ERROR — " + msg;
    }
    return msg.toUpperCase();
  }

  // most widgets render inside the standard bordered/titled card; a
  // widget can set `bare: true` to render as plain content directly on
  // the page background instead (no border, no title bar, no status
  // dot/updated stamp) — used for widgets that don't need their own
  // "container" to read clearly, e.g. weather sharing a row with air quality.
  // A carded widget can also set `showUpdated: false` to hide just the
  // last-updated timestamp while keeping the rest of the title bar.
  function buildCardDOM(widget){
    const card = document.createElement("section");
    card.className = "card" + (widget.bare ? " card-bare" : "");
    card.dataset.widget = widget.id;
    if (widget.span) card.dataset.span = widget.span;

    const updatedHTML = widget.showUpdated === false
      ? "" : `<span class="updated" data-updated>--:--:--</span>`;

    card.innerHTML = widget.bare
      ? `<div class="card-body" data-body><span class="placeholder">LOADING&hellip;</span></div>`
      : `
      <div class="card-titlebar">
        <span class="title">${widget.title}</span>
        <span class="spacer"></span>
        ${updatedHTML}
        <span class="status-dot" data-status></span>
      </div>
      <div class="card-body" data-body>
        <span class="placeholder">LOADING&hellip;</span>
      </div>
    `;
    document.getElementById("widget-grid").appendChild(card);
    return {
      body: card.querySelector("[data-body]"),
      status: card.querySelector("[data-status]"),
      updated: card.querySelector("[data-updated]")
    };
  }

  function setStatus(refs, state){
    if (!refs.status) return;
    refs.status.className = "status-dot" + (state === "online" ? " online" : state === "stale" ? " stale" : "");
  }

  function stampUpdated(refs){
    if (!refs.updated) return;
    const now = new Date();
    const opts = { timeZone: CONFIG.timezone, hour12:false,
                    hour:"2-digit", minute:"2-digit", second:"2-digit" };
    refs.updated.textContent = new Intl.DateTimeFormat("en-GB", opts).format(now);
  }

  // reflects CURRENT health, not just "the last error anyone ever saw" —
  // recomputed after every tick so a widget recovering clears its entry
  // and the bar goes back to "SYS OK" once nothing is failing
  function updateStatusBar(){
    const failingIds = Object.keys(errors);
    const el = document.getElementById("status-left");
    if (failingIds.length === 0){
      el.textContent = "SYS OK";
    } else {
      const id = failingIds[0];
      const suffix = failingIds.length > 1 ? " (+" + (failingIds.length - 1) + " more)" : "";
      el.textContent = "ERR: " + id.toUpperCase() + " — " + errors[id] + suffix;
    }
  }

  async function tick(widget, refs){
    try{
      const data = await widget.fetch();
      cache[widget.id] = data;
      widget.render(refs.body, data);
      setStatus(refs, "online");
      stampUpdated(refs);
      delete errors[widget.id];
    }catch(err){
      console.error("[" + widget.id + "]", err);
      const reason = diagnoseError(err);
      errors[widget.id] = reason;
      if (cache[widget.id]){
        widget.render(refs.body, cache[widget.id]);
      } else {
        refs.body.innerHTML =
          '<span class="placeholder err">FETCH FAILED</span>' +
          '<span class="placeholder err" style="font-size:11px;margin-top:6px;">' + reason + '</span>';
      }
      setStatus(refs, "stale");
    }finally{
      updateStatusBar();
      setTimeout(() => tick(widget, refs), widget.refreshMs || CONFIG.refreshMs);
    }
  }

  function mount(widgets){
    widgets.forEach(widget => {
      const refs = buildCardDOM(widget);
      tick(widget, refs);
    });
  }

  return { mount };
})();
