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

  function buildCardDOM(widget){
    const card = document.createElement("section");
    card.className = "card";
    card.dataset.widget = widget.id;
    if (widget.span) card.dataset.span = widget.span;

    card.innerHTML = `
      <div class="card-titlebar">
        <span class="prompt">&gt;</span>
        <span class="title">${widget.title}</span>
        <span class="spacer"></span>
        <span class="updated" data-updated>--:--:--</span>
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
    refs.status.className = "status-dot" + (state === "online" ? " online" : state === "stale" ? " stale" : "");
  }

  function stampUpdated(refs){
    const now = new Date();
    const opts = { timeZone: CONFIG.timezone, hour12:false,
                    hour:"2-digit", minute:"2-digit", second:"2-digit" };
    refs.updated.textContent = new Intl.DateTimeFormat("en-GB", opts).format(now);
  }

  async function tick(widget, refs){
    try{
      const data = await widget.fetch();
      cache[widget.id] = data;
      widget.render(refs.body, data);
      setStatus(refs, "online");
      stampUpdated(refs);
    }catch(err){
      console.error("[" + widget.id + "]", err);
      const reason = diagnoseError(err);
      document.getElementById("status-left").textContent = "ERR: " + widget.id.toUpperCase() + " — " + reason;
      if (cache[widget.id]){
        widget.render(refs.body, cache[widget.id]);
      } else {
        refs.body.innerHTML =
          '<span class="placeholder err">FETCH FAILED</span>' +
          '<span class="placeholder err" style="font-size:11px;margin-top:6px;">' + reason + '</span>';
      }
      setStatus(refs, "stale");
    }finally{
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
