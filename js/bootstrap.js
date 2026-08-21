(function(){
  "use strict";
  const CONFIG = window.CONFIG;
  // transit polls faster than weather (see CONFIG.transitRefreshMs) — show
  // both rates so this can't silently go stale again if either changes
  const rates = [...new Set([CONFIG.transitRefreshMs, CONFIG.refreshMs])]
    .sort((a, b) => a - b)
    .map(ms => Math.round(ms / 1000) + "s");
  document.getElementById("status-right").textContent = "REFRESH " + rates.join("/");
  window.KioskEngine.mount(window.KIOSK_WIDGETS || []);
})();
