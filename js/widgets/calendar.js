(function(){
  "use strict";
  const CONFIG = window.CONFIG;

  // not a functional calendar — a simple always-on date/time display,
  // ticking every second like the old header clock used to
  function formatParts(now){
    const dow = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: CONFIG.timezone })
      .format(now).toUpperCase();
    const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: CONFIG.timezone })
      .format(now).toUpperCase();
    const day = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: CONFIG.timezone })
      .format(now);

    const time = new Intl.DateTimeFormat("en-US", {
      hour12: true, hour: "numeric", minute: "2-digit", timeZone: CONFIG.timezone
    }).format(now).replace(/\s*[AP]M$/i, "");

    return { dow, month, day, time };
  }

  window.KIOSK_WIDGETS = window.KIOSK_WIDGETS || [];
  window.KIOSK_WIDGETS.push({
    id: "calendar",
    title: "DATE",
    bare: true,
    refreshMs: CONFIG.clockTickMs,

    async fetch(){
      return { now: new Date() };
    },

    render(el, data){
      const p = formatParts(data.now);
      el.innerHTML = `
        <div class="cal-panel">
          <div class="cal-date-line">${p.dow}, ${p.month} ${p.day}</div>
          <div class="cal-time">${p.time}</div>
        </div>
      `;
    }
  });
})();
