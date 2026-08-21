(function(){
  "use strict";
  const CONFIG = window.CONFIG;
  const iconFor = window.WeatherIcons.iconFor;

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

  // current conditions only — the hourly forecast is its own widget
  // (js/widgets/weather-hourly.js) now that they no longer share a card
  window.KIOSK_WIDGETS = window.KIOSK_WIDGETS || [];
  window.KIOSK_WIDGETS.push({
    id: "weather",
    title: "WEATHER",
    bare: true,
    refreshMs: CONFIG.refreshMs,

    async fetch(){
      const url = "https://api.open-meteo.com/v1/forecast"
        + "?latitude=" + CONFIG.latitude
        + "&longitude=" + CONFIG.longitude
        + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day"
        + "&timezone=" + encodeURIComponent(CONFIG.timezone)
        + "&forecast_days=1";
      const res = await fetch(url);
      if (!res.ok) throw new Error("open-meteo HTTP " + res.status);
      return res.json();
    },

    render(el, data){
      const cur = data.current;
      el.innerHTML = `
        <div class="wx-main">
          <div class="wx-col-left">
            <div class="wx-temp">${Math.round(cur.temperature_2m)}<sup>°C</sup></div>
            <div class="wx-info">
              <div class="wx-cond">${wmoLabel(cur.weather_code)}</div>
              <div class="wx-sub">FEELS LIKE <b>${Math.round(cur.apparent_temperature)}°C</b></div>
              <div class="wx-sub">HUMIDITY <b>${Math.round(cur.relative_humidity_2m)}%</b></div>
              <div class="wx-sub">WIND <b>${Math.round(cur.wind_speed_10m)} KM/H</b></div>
            </div>
          </div>
          <div class="wx-col-right">
            <div class="wx-icon-big">${iconFor(cur.weather_code, cur.is_day === 1)}</div>
          </div>
        </div>
      `;
    }
  });
})();
