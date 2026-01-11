// js/graph.js
// ============================================================
// WORKSTART GRAPH – FINAL (ZEIT GEGEN ZEIT)
// Y = Uhrzeit / Datum | X = Berechnungszeitpunkt
// ============================================================

let chart = null;
let currentHours = 24;

const canvas = document.getElementById("workstartChart");
if (!canvas) {
  console.error("Canvas workstartChart nicht gefunden");
  throw new Error("Graph kann nicht initialisiert werden");
}

// ------------------------------------------------------------
// TIME BUTTONS
// ------------------------------------------------------------

document.querySelectorAll(".time-buttons button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".time-buttons button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentHours = Number(btn.dataset.hours);
    loadGraph();
  };
});

// ------------------------------------------------------------
// LOAD
// ------------------------------------------------------------

loadGraph();

async function loadGraph() {
  if (!window.PILOTAPP_PERSON) {
    showError("Keine Person ausgewählt");
    return;
  }

  const file = `data/workstart_history_${window.PILOTAPP_PERSON}.json`;

  try {
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error("Workstart JSON nicht ladbar");

    const data = await res.json();
    buildChart(data.entries || []);

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
      t: parseTime(e.ts_calc),
      from_meldung: parseTime(e.from_meldung),
      calc_div3: parseTime(e.calc_div3),
      calc_div2: parseTime(e.calc_div2),
      real: parseTime(e.real_start)
    }))
    .filter(e => e.t && e.t.getTime() >= cutoff);

  if (!points.length) {
    showError("Keine Daten im gewählten Zeitfenster");
    return;
  }

  chart = new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        makeLine("from_meldung", points, "from_meldung", "#ffb300"),
        makeLine("calc_div3",    points, "calc_div3",    "#00c853"),
        makeLine("calc_div2",    points, "calc_div2",    "#e53935"),
        makePoints("real_start", points, "real",         "#ffffff")
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: "nearest",
        intersect: false
      },
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "dd.MM HH:mm",
            unit: "hour"
          },
          ticks: { color: "#ccc" }
        },
        y: {
          type: "time",
          time: {
            tooltipFormat: "dd.MM HH:mm",
            unit: "hour"
          },
          ticks: { color: "#ccc" }
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
// DATASETS
// ------------------------------------------------------------

function makeLine(label, points, field, color) {
  return {
    label,
    data: points
      .filter(p => p[field])
      .map(p => ({ x: p.t, y: p[field] })),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    tension: 0.25,
    pointRadius: 0
  };
}

function makePoints(label, points, field, color) {
  return {
    label,
    data: points
      .filter(p => p[field])
      .map(p => ({ x: p.t, y: p[field] })),
    borderColor: color,
    backgroundColor: color,
    pointRadius: 4,
    showLine: false
  };
}

// ------------------------------------------------------------
// HELFER
// ------------------------------------------------------------

function parseTime(str) {
  if (!str) return null;
  const d = new Date(str.replace(" ", "T"));
  return isNaN(d) ? null : d;
}

function showError(msg) {
  canvas.parentElement.innerHTML =
    `<div class="error-box">${msg}</div>`;
}