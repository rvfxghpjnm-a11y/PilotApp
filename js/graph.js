// ============================================================
// GRAPH LOGIC – WORKSTART VERLAUF (STABIL, MODULSICHER)
// ============================================================

console.log("GRAPH.JS LOADED");

let chart = null;

export function renderWorkstartChart(entries, hours) {
  if (!window.Chart) {
    console.error("Chart.js nicht geladen (window.Chart fehlt)");
    return;
  }

  if (chart) chart.destroy();

  const now = Date.now();
  const cutoff = now - hours * 3600 * 1000;

  const points = entries
    .map(e => ({
      x: toDate(e.ts_calc),
      from_meldung:     toDate(e.from_meldung),
      from_meldung_alt: toDate(e.from_meldung_alt),
      calc_div2:        toDate(e.calc_div2),
      calc_div3:        toDate(e.calc_div3)
    }))
    .filter(p => p.x && p.x.getTime() >= cutoff);

  const datasets = [
    makeDataset("Meldung",     points, "from_meldung",     "#fbbf24"),
    makeDataset("Meldung alt", points, "from_meldung_alt", "#60a5fa"),
    makeDataset("Calc /2",     points, "calc_div2",        "#ef4444"),
    makeDataset("Calc /3",     points, "calc_div3",        "#22c55e")
  ];

  const ctx = document.getElementById("chart");
  if (!ctx) {
    console.error("Canvas #chart nicht gefunden");
    return;
  }

  chart = new window.Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      interaction: { mode: "nearest", intersect: false },
      scales: {
        x: {
          type: "time",
          time: { tooltipFormat: "dd.MM HH:mm" },
          ticks: { color: "#9ca3af" },
          grid: { color: "#1f2937" }
        },
        y: {
          type: "time",
          ticks: { color: "#9ca3af" },
          grid: { color: "#1f2937" }
        }
      },
      plugins: {
        legend: { labels: { color: "#e5e7eb" } }
      }
    }
  });
}

// ------------------------------------------------------------
// HELFER
// ------------------------------------------------------------
function toDate(v) {
  if (!v) return null;
  const d = new Date(v.replace(" ", "T"));
  return isNaN(d) ? null : d;
}

function makeDataset(label, points, key, color) {
  return {
    label,
    data: points
      .filter(p => p[key])
      .map(p => ({ x: p.x, y: p[key] })),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    tension: 0.2,
    pointRadius: 0
  };
}