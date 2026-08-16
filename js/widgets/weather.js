(function(){
  "use strict";
  const CONFIG = window.CONFIG;

  const WMO = {
    0:"CLEAR SKY", 1:"MOSTLY CLEAR", 2:"PARTLY CLOUDY", 3:"OVERCAST",
    45:"FOG", 48:"ICE FOG",
    51:"LIGHT DRIZZLE", 53:"DRIZZLE", 55:"DENSE DRIZZLE",
    56:"FREEZING DRIZZLE", 57:"FREEZING DRIZZLE",
    61:"LIGHT RAIN", 63:"RAIN", 65:"HEAVY RAIN",
    66:"FREEZING RAIN", 67:"FREEZING RAIN",
    71:"LIGHT SNOW", 73:"SNOW", 75:"HEAVY SNOW", 77:"SNOW GRAINS",
    80:"RAIN SHOWERS", 81:"RAIN SHOWERS", 82:"VIOLENT SHOWERS",
    85:"SNOW SHOWERS", 86:"SNOW SHOWERS",
    95:"THUNDERSTORM", 96:"THUNDERSTORM + HAIL", 99:"THUNDERSTORM + HAIL"
  };
  const wmoLabel = c => WMO[c] || "UNKNOWN";

  window.KIOSK_WIDGETS = window.KIOSK_WIDGETS || [];
  window.KIOSK_WIDGETS.push({
    id: "weather",
    title: "WEATHER",
    span: 2,
    refreshMs: CONFIG.refreshMs,

    async fetch(){
      const url = "https://api.open-meteo.com/v1/forecast"
        + "?latitude=" + CONFIG.latitude
        + "&longitude=" + CONFIG.longitude
        + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code"
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

      // find next 5 hours starting from current hour
      const nowIso = cur.time;
      let startIdx = hourly.time.indexOf(nowIso);
      if (startIdx === -1) startIdx = 0;
      const hrs = [];
      for (let i = startIdx; i < Math.min(startIdx + 5, hourly.time.length); i++){
        hrs.push({ time: hourly.time[i], temp: hourly.temperature_2m[i], code: hourly.weather_code[i] });
      }
      const temps = hrs.map(h => h.temp);
      const minT = Math.min(...temps, cur.temperature_2m);
      const maxT = Math.max(...temps, cur.temperature_2m);
      const range = Math.max(maxT - minT, 1);

      const hourlyHTML = hrs.map(h => {
        const hourLabel = new Date(h.time).toLocaleTimeString("en-US", {
          hour:"numeric", hour12:true, timeZone: CONFIG.timezone
        }).replace(" ", "").toUpperCase();
        const pct = Math.round(((h.temp - minT) / range) * 80) + 15; // 15-95%
        return `
          <div class="wx-hour">
            <span class="h-temp">${Math.round(h.temp)}°</span>
            <div class="h-bar-track"><div class="h-bar" style="height:${pct}%"></div></div>
            <span class="h-label">${hourLabel}</span>
          </div>`;
      }).join("");

      el.innerHTML = `
        <div class="wx-main">
          <div class="wx-temp">${Math.round(cur.temperature_2m)}<sup>°C</sup></div>
          <div class="wx-info">
            <div class="wx-cond">${wmoLabel(cur.weather_code)}</div>
            <div class="wx-sub">FEELS LIKE <b>${Math.round(cur.apparent_temperature)}°C</b></div>
            <div class="wx-sub">HUMIDITY <b>${Math.round(cur.relative_humidity_2m)}%</b> &nbsp;WIND <b>${Math.round(cur.wind_speed_10m)} KM/H</b></div>
          </div>
        </div>
        <div class="wx-hourly">${hourlyHTML}</div>
      `;
    }
  });
})();
