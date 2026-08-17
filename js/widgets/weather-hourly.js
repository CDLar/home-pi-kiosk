(function(){
  "use strict";
  const CONFIG = window.CONFIG;

  // simple line-art icons, single color (currentColor) so they inherit
  // the amber palette like everything else — no new colors introduced
  const CLOUD_PATH = "M7 18h9.5a3.75 3.75 0 0 0 .5-7.46 5.25 5.25 0 0 0-10.14-1.62A4.25 4.25 0 0 0 7 18z";

  function sunSVG(){
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/>
      <line x1="12" y1="2" x2="12" y2="4.6"/><line x1="12" y1="19.4" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="4.6" y2="12"/><line x1="19.4" y1="12" x2="22" y2="12"/>
      <line x1="4.9" y1="4.9" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.1" y2="19.1"/>
      <line x1="4.9" y1="19.1" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="19.1" y2="4.9"/>
    </svg>`;
  }
  function partlyCloudySVG(){
    return `<svg viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="7.5" r="3.2" fill="currentColor"/>
      <path d="M9 18h9a3.5 3.5 0 0 0 .4-6.98A4.9 4.9 0 0 0 9.3 9.6 4 4 0 0 0 9 18z" fill="currentColor" opacity="0.9"/>
    </svg>`;
  }
  function cloudSVG(extra){
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <path d="${CLOUD_PATH}" fill="currentColor" stroke="none"/>
      ${extra || ""}
    </svg>`;
  }
  function fogSVG(){
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="16" x2="17" y2="16"/>
    </svg>`;
  }
  function rainSVG(){
    return cloudSVG('<line x1="8" y1="19" x2="7" y2="22"/><line x1="12" y1="19" x2="11" y2="22"/><line x1="16" y1="19" x2="15" y2="22"/>');
  }
  function snowSVG(){
    return cloudSVG('<line x1="7.5" y1="19.5" x2="7.5" y2="21.5"/><line x1="6.5" y1="20.5" x2="8.5" y2="20.5"/>'
      + '<line x1="12" y1="19.5" x2="12" y2="21.5"/><line x1="11" y1="20.5" x2="13" y2="20.5"/>'
      + '<line x1="16.5" y1="19.5" x2="16.5" y2="21.5"/><line x1="15.5" y1="20.5" x2="17.5" y2="20.5"/>');
  }
  function thunderSVG(){
    return cloudSVG('<path d="M12.5 18.2 10 22.5h2.4l-1 3" fill="none"/>');
  }

  function iconFor(code){
    if (code === 0) return sunSVG();
    if (code === 1 || code === 2) return partlyCloudySVG();
    if (code === 45 || code === 48) return fogSVG();
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return rainSVG();
    if ([71,73,75,77,85,86].includes(code)) return snowSVG();
    if ([95,96,99].includes(code)) return thunderSVG();
    return cloudSVG(""); // overcast + fallback
  }

  // the hourly forecast, split off from the current-conditions weather
  // widget so it can occupy its own (wider) grid area
  window.KIOSK_WIDGETS = window.KIOSK_WIDGETS || [];
  window.KIOSK_WIDGETS.push({
    id: "weather-hourly",
    title: "HOURLY",
    bare: true,
    refreshMs: CONFIG.refreshMs,

    async fetch(){
      const url = "https://api.open-meteo.com/v1/forecast"
        + "?latitude=" + CONFIG.latitude
        + "&longitude=" + CONFIG.longitude
        + "&current=temperature_2m"
        + "&hourly=temperature_2m,weather_code"
        + "&timezone=" + encodeURIComponent(CONFIG.timezone)
        + "&forecast_days=1";
      const res = await fetch(url);
      if (!res.ok) throw new Error("open-meteo HTTP " + res.status);
      return res.json();
    },

    render(el, data){
      const cur = data.current;
      const hourly = data.hourly;

      // find next hours starting from current hour
      const nowIso = cur.time;
      let startIdx = hourly.time.indexOf(nowIso);
      if (startIdx === -1) startIdx = 0;
      const hrs = [];
      for (let i = startIdx; i < Math.min(startIdx + 8, hourly.time.length); i++){
        hrs.push({ time: hourly.time[i], temp: hourly.temperature_2m[i], code: hourly.weather_code[i] });
      }

      const pillsHTML = hrs.map(h => {
        const hourLabel = new Date(h.time).toLocaleTimeString("en-US", {
          hour:"numeric", hour12:true, timeZone: CONFIG.timezone
        }).replace(" ", "").toUpperCase();
        return `
          <div class="wx-pill">
            <span class="wx-pill-time">${hourLabel}</span>
            <span class="wx-pill-icon">${iconFor(h.code)}</span>
            <span class="wx-pill-temp">${Math.round(h.temp)}&deg;</span>
          </div>`;
      }).join("");

      el.innerHTML = `<div class="wx-hourly">${pillsHTML}</div>`;
    }
  });
})();
