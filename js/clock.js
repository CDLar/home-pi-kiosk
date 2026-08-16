(function(){
  "use strict";
  const CONFIG = window.CONFIG;

  document.getElementById("brand-city").textContent = CONFIG.city.toUpperCase();
  document.getElementById("status-right").textContent =
    "REFRESH " + Math.round(CONFIG.refreshMs / 1000) + "s";

  function updateClock(){
    const now = new Date();
    const opts = { timeZone: CONFIG.timezone, hour12:false,
                    hour:"2-digit", minute:"2-digit", second:"2-digit" };
    document.getElementById("clock-time").textContent =
      new Intl.DateTimeFormat("en-GB", opts).format(now);

    const dopts = { timeZone: CONFIG.timezone, weekday:"short",
                     month:"short", day:"2-digit" };
    document.getElementById("clock-date").textContent =
      new Intl.DateTimeFormat("en-US", dopts).format(now).toUpperCase();
  }
  updateClock();
  setInterval(updateClock, CONFIG.clockTickMs);
})();
