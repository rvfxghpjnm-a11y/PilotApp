// ============================================================
// GRAPH LOGIC – WORKSTART VERLAUF (STABIL & NACHVOLLZIEHBAR)
// ============================================================

let chart = null;

// ------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------
export function renderWorkstartChart(entries, hours) {
  if (chart) chart.destroy();

  const now = Date.now();
  const cutoff = now - hours * 3600 * 1000;

  const points = entries
    .map(e => ({
      x: toDate(e.ts_calc),                // Zeitpunkt der Berechnung
      from_meldung:     toDate(e.from_meldung),
      from_meldung_alt: toDate(e.from_meldung_alt),
      calc_div2:        toDate(e.calc_div2),
      calc_div3:        toDate(e.calc_div3)
    }))
    .filter(p => p.x && p.x.getTime() >= cutoff);

  if (!points.length) {
    document.getElementById("content").innerHTML =
      "<p>Keine Daten im gewählten Zeitraum</p>";
    return;
  }

  const datasets = [
    makeDataset("Meldung",       points, "from_meldung",     "#fbbf24"),
    makeDataset("Meldung alt",   points, "from_meldung_alt", "#60a5fa"),
    makeDataset("Calc /2",       points, "calc_div2",        "#ef4444"),
    makeDataset("Calc /3",       points, "calc_div3",        "#22c55e")
  ];

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "nearest",
        intersect: false
      },

      scales: {
        // ----------------------------------------------------
        // X-ACHSE = Berechnungszeitpunkt
        // ----------------------------------------------------
        x: {
          type: "time",
          time: {
            tooltipFormat: "dd.MM.yyyy HH:mm",
            displayFormats: {
              hour: "HH:mm",
              day: "dd.MM"
            }
          },
          ticks: {
            color: "#9ca3af"
          },
          grid: {
            color: "#1f2937"
          }
        },

        // ----------------------------------------------------
        // Y-ACHSE = prognostizierter Arbeitsbeginn (Datum+Zeit)
        // ----------------------------------------------------
        y: {
          type: "time",
          time: {
            tooltipFormat: "dd.MM.yyyy HH:mm",
            displayFormats: {
              hour: "dd.MM HH:mm",
              day: "dd.MM.yyyy"
            }
          },
          ticks: {
            color: "#9ca3af"
          },
          grid: {
            color: "#1f2937"   // ❌ keine Mitternachts-Sonderlinie mehr
          }
        }
      },

      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb"
          }
        }
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