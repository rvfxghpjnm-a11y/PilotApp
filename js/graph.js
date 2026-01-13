// ============================================================
// GRAPH LOGIC – WORKSTART VERLAUF (KORREKT & LESBAR)
// ============================================================

let chart = null;

export function renderWorkstartChart(entries, hours) {
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

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: { datasets },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      spanGaps: false, // ⛔ verhindert senkrechte Linien

      interaction: {
        mode: "nearest",
        intersect: false
      },

      scales: {
        // ----------------------------------------------------
        // X = Berechnungszeit
        // ----------------------------------------------------
        x: {
          type: "time",
          time: {
            tooltipFormat: "dd.MM.yyyy HH:mm"
          },
          ticks: {
            color: "#9ca3af"
          },
          grid: {
            color: "#1f2937"
          }
        },

        // ----------------------------------------------------
        // Y = prognostizierter Arbeitsbeginn
        // ----------------------------------------------------
        y: {
          type: "time",
          ticks: {
            color: "#9ca3af",

            // 🔒 ZWINGENDES FORMAT (Datum + Uhrzeit)
            callback: value => {
              const d = new Date(value);
              return d.toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              });
            }
          },
          grid: {
            color: "#1f2937" // ❌ keine Mitternachts-Sonderlinie
          }
        }
      },

      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb"
          }
        },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: ` +
              new Date(ctx.parsed.y).toLocaleString("de-DE")
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
  let last = null;

  const data = points.map(p => {
    if (!p[key]) return null;

    // ⛔ Brich Linie bei Tageswechsel
    if (last && Math.abs(p[key] - last) > 12 * 3600 * 1000) {
      last = p[key];
      return null;
    }

    last = p[key];
    return { x: p.x, y: p[key] };
  });

  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    tension: 0.2,
    pointRadius: 0
  };
}