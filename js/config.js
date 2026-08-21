/* ============================================================
   CONFIG — edit this file to point the dashboard at your own
   location, transit stop, and refresh rate.
   ============================================================ */
window.CONFIG = {
  city: "Toronto",
  latitude: 43.6532,
  longitude: -79.3832,
  timezone: "America/Toronto",
  refreshMs: 45000,      // default refresh for widgets that don't override
  transitRefreshMs: 15000, // tighter refresh for transit — ETAs matter down to the wire
  clockTickMs: 1000,

  transit: [
    { agency: "ttc", route: "503", stopId: "2775", label: "KINGSTON RD AT DUNDAS ST E", direction: "W" },
    { agency: "ttc", route: "503", stopId: "2774", label: "KINGSTON RD AT DIXON AVE", direction: "E" },
    { agency: "ttc", route: "501", stopId: "6806", label: "QUEEN ST E AT KINGSTON RD", direction: "W" },
    { agency: "ttc", route: "501", stopId: "11845", label: "QUEEN ST E AT KINGSTON RD", direction: "E" },
    { agency: "ttc", route: "22", stopId: "11181", label: "EASTERN AVE AT QUEEN ST E", direction: "N" },
    { agency: "ttc", route: "22", stopId: "14644", label: "COXWELL STATION", direction: "S" }
  ]
};
