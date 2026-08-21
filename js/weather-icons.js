(function(){
  "use strict";

  // simple line-art icons, single color (currentColor) so they inherit
  // the amber palette like everything else — no new colors introduced.
  // Shared by weather.js (large, current-conditions icon) and
  // weather-hourly.js (small, per-pill icon).
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
  function moonSVG(){
    // classic crescent — a circle occluded by an offset circle
    return `<svg viewBox="0 0 24 24" fill="none">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
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

  // WMO codes alone don't distinguish day/night — code 0 is just "clear
  // sky," at 2am or 2pm — so clear/partly-clear icons also need a
  // separate is_day flag, or they'd show a sun at midnight
  function iconFor(code, isDay){
    if (code === 0) return isDay ? sunSVG() : moonSVG();
    if (code === 1 || code === 2) return isDay ? partlyCloudySVG() : moonSVG();
    if (code === 45 || code === 48) return fogSVG();
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return rainSVG();
    if ([71,73,75,77,85,86].includes(code)) return snowSVG();
    if ([95,96,99].includes(code)) return thunderSVG();
    return cloudSVG(""); // overcast + fallback
  }

  window.WeatherIcons = { iconFor };
})();
