(function () {
  "use strict";
  const CONFIG = window.CONFIG;
  const iconFor = window.WeatherIcons.iconFor;

  // the hourly forecast, split off from the current-conditions weather
  // widget so it can occupy its own (wider) grid area
  window.KIOSK_WIDGETS = window.KIOSK_WIDGETS || [];
  window.KIOSK_WIDGETS.push({
    id: "weather-hourly",
    title: "HOURLY",
    bare: true,
    refreshMs: CONFIG.refreshMs,

    async fetch() {
      const url = "https://api.open-meteo.com/v1/forecast"
        + "?latitude=" + CONFIG.latitude
        + "&longitude=" + CONFIG.longitude
        + "&current=temperature_2m"
        + "&hourly=temperature_2m,weather_code,is_day,precipitation_probability"
        + "&timezone=" + encodeURIComponent(CONFIG.timezone)
        + "&forecast_days=2";
      const res = await fetch(url);
      if (!res.ok) throw new Error("open-meteo HTTP " + res.status);
      return res.json();
    },

    render(el, data) {
      const cur = data.current;
      const hourly = data.hourly;

      // start at the hour *after* the current one — "next 6 hours beyond
      // now," not the current hour itself. Open-Meteo's ISO timestamps
      // (no offset, all in CONFIG.timezone) sort lexicographically same
      // as chronologically, so a plain string compare finds it without
      // needing Date parsing/timezone handling.
      const nowIso = cur.time;
      let startIdx = hourly.time.findIndex(t => t > nowIso);
      if (startIdx === -1) startIdx = 0;
      const hrs = [];
      for (let i = startIdx; i < Math.min(startIdx + 6, hourly.time.length); i++) {
        hrs.push({
          time: hourly.time[i], temp: hourly.temperature_2m[i],
          code: hourly.weather_code[i], isDay: hourly.is_day[i] === 1,
          precip: hourly.precipitation_probability[i]
        });
      }

      const pillsHTML = hrs.map(h => {
        const hourLabel = new Date(h.time).toLocaleTimeString("en-US", {
          hour: "numeric", hour12: true, timeZone: CONFIG.timezone
        }).replace(" ", "").toUpperCase();
        // 0% -> pale, 100% -> deep — the actual colors live in CSS
        // (--blue-pale/--blue-vivid), this just supplies the mix ratio
        const precipT = Math.max(0, Math.min(1, h.precip / 100));
        return `
          <div class="wx-pill">
            <span class="wx-pill-time">${hourLabel}</span>
            <span class="wx-pill-icon">${iconFor(h.code, h.isDay)}</span>
            <div class="wx-pill-stat">
              <span class="wx-pill-temp">${Math.round(h.temp)}&deg;</span>
              <span class="wx-pill-precip" style="--precip-t:${precipT}">${h.precip}%</span>
            </div>
          </div>`;
      }).join("");

      el.innerHTML = `<div class="wx-hourly">${pillsHTML}</div>`;
    }
  });
})();
