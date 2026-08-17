(function(){
  "use strict";
  document.getElementById("status-right").textContent =
    "REFRESH " + Math.round(window.CONFIG.refreshMs / 1000) + "s";
  window.KioskEngine.mount(window.KIOSK_WIDGETS || []);
})();
