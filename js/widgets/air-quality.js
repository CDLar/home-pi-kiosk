(function(){
  "use strict";
  const CONFIG = window.CONFIG;

  // US AQI breakpoints (EPA). Mapped onto the amber/red palette rather
  // than introducing new colors: good/moderate stay amber, anything
  // "unhealthy" or worse goes red so it reads as an alert at a glance.
  function aqiBand(aqi){
    if (aqi <= 50)  return { label: "GOOD",                    color: "var(--amber-bright)" };
    if (aqi <= 100) return { label: "MODERATE",                color: "var(--amber-bright)" };
    if (aqi <= 150) return { label: "UNHEALTHY (SENSITIVE)",   color: "var(--amber)" };
    if (aqi <= 200) return { label: "UNHEALTHY",                color: "var(--red)" };
    if (aqi <= 300) return { label: "VERY UNHEALTHY",           color: "var(--red)" };
    return               { label: "HAZARDOUS",                  color: "var(--red)" };
  }

  window.KIOSK_WIDGETS = window.KIOSK_WIDGETS || [];
  window.KIOSK_WIDGETS.push({
    id: "air-quality",
    title: "AIR QUALITY",
    span: 1,
    refreshMs: CONFIG.refreshMs,

    async fetch(){
      const url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        + "?latitude=" + CONFIG.latitude
        + "&longitude=" + CONFIG.longitude
        + "&current=us_aqi,pm2_5,pm10,ozone"
        + "&timezone=" + encodeURIComponent(CONFIG.timezone);
      const res = await fetch(url);
      if (!res.ok) throw new Error("open-meteo air quality HTTP " + res.status);
      return res.json();
    },

    render(el, data){
      const cur = data.current;
      const band = aqiBand(cur.us_aqi);

      el.innerHTML = `
        <div class="aq-main">
          <div class="aq-value" style="color:${band.color}">${Math.round(cur.us_aqi)}</div>
          <div class="aq-info">
            <div class="aq-cond" style="color:${band.color}">${band.label}</div>
            <div class="aq-sub">PM2.5 <b>${cur.pm2_5.toFixed(1)} &micro;g/m&sup3;</b></div>
            <div class="aq-sub">PM10 <b>${cur.pm10.toFixed(1)} &micro;g/m&sup3;</b> &nbsp;OZONE <b>${Math.round(cur.ozone)} &micro;g/m&sup3;</b></div>
          </div>
        </div>
      `;
    }
  });
})();
