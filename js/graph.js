// js/graph.js
// ============================================================
// WORKSTART GRAPH – FINAL (ZEIT ↔ ZEIT)
// ============================================================

let chart = null;
let currentHours = 24;

const canvas = document.getElementById("workstartChart");
if (!canvas) {
  console.error("Canvas workstartChart nicht gefunden");
}

// ------------------------------------------------------------
// BUTTONS (3 / 6 / 12 / 24)
// ------------------------------------------------------------

document.querySelectorAll(".time-buttons button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".time-buttons button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentHours = Number(btn.dataset.hours);
    loadGraph();
  });
});

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

loadGraph();

// ------------------------------------------------------------
// LOAD
// ------------------------------------------------------------

async function loadGraph() {
  if (!window.PILOTAPP_PERSON) {
    showError("Keine Person ausgewählt");
    return;
  }

  const file = `data/workstart_history_${window.PILOTAPP_PERSON}.json`;

  try {
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error("Workstart JSON nicht ladbar");

    const json = await res.json();
    buildChart(json.entries || []);

  } catch (err) {
    console.error(err);
    showError("Workstart-Daten konnten nicht geladen werden");
  }
}

// ------------------------------------------------------------
// CHART
// ------------------------------------------------------------

function buildChart(entries) {
  if (chart) chart.destroy();

  const now = Date.now();
  const cutoff = now - currentHours * 3600 * 1000;

  const points = entries
    .map(e => ({
      x: parseTime(e.ts_calc),
      meldung: parseTime(e.from_meldung),
      div2: parseTime(e.calc_div2),
      div3: parseTime(e.calc_div3),
      real: parseTime(e.real_start)
    }))
    .filter(p => p.x && p.x.getTime() >= cutoff);

  if (!points.length) {
    showError("Keine Daten im gewählten Zeitfenster");
    return;
  }

  chart = new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        makeDataset("Meldung", points, "meldung", "#ffb300"),
        makeDataset("Div / 3", points, "div3", "#00c853"),
        makeDataset("Div / 2", points, "div2", "#e53935"),
        makeDataset("Real", points, "real", "#ffffff", true)
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: "nearest", intersect: false },
      scales: {
        x: {
          type: "time",
          time: { unit: "hour" },
          ticks: { color: "#ccc" },
          title: {
            display: true,
            text: "Berechnungszeit",
            color: "#ccc"
          }
        },
        y: {
          type: "time",
          time: {
            unit: "hour",
            displayFormats: { hour: "HH:mm" }
          },
          ticks: { color: "#ccc" },
          title: {
            display: true,
            text: "Uhrzeit (0–24h)",
            color: "#ccc"
          }
        }
      },
      plugins: {
        legend: {
          labels: { color: "#ccc" }
        }
      }
    }
  });
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function makeDataset(label, points, key, color, pointsOnly = false) {
  return {
    label,
    data: points
      .filter(p => p[key])
      .map(p => ({ x: p.x, y: p[key] })),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    tension: 0.2,
    pointRadius: pointsOnly ? 4 : 0,
    showLine: !pointsOnly
  };
}

function parseTime(str) {
  if (!str) return null;
  const d = new Date(str.replace(" ", "T"));
  return isNaN(d) ? null : d;
}

function showError(msg) {
  canvas.parentElement.innerHTML =
    `<div class="error-box">${msg}</div>`;
}