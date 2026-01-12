let chart = null;
let currentPerson = null;
let currentHours = 24;

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
loadPersons();

document.querySelectorAll("button[data-hours]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("button[data-hours]")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentHours = Number(btn.dataset.hours);
    if (currentPerson) loadGraph();
  };
});

// ------------------------------------------------------------
// PERSONEN LADEN
// ------------------------------------------------------------
async function loadPersons() {
  try {
    const res = await fetch("data/workstart_index.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Index nicht ladbar");
    const index = await res.json();

    const wrap = document.getElementById("persons");
    wrap.innerHTML = "";

    index.persons.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.textContent = `${p.vorname} ${p.nachname}`;
      btn.onclick = () => {
        document.querySelectorAll("#persons button")
          .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentPerson = p;
        loadGraph();
      };

      if (i === 0) {
        btn.classList.add("active");
        currentPerson = p;
      }

      wrap.appendChild(btn);
    });

    if (currentPerson) loadGraph();

  } catch (err) {
    document.getElementById("persons").innerHTML =
      `<div class="error">Personen konnten nicht geladen werden</div>`;
    console.error(err);
  }
}

// ------------------------------------------------------------
// GRAPH LADEN
// ------------------------------------------------------------
async function loadGraph() {
  try {
    const file = `data/${currentPerson.file}`;
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error("Workstart-Datei nicht ladbar");

    const data = await res.json();
    buildChart(data.entries || []);

    document.getElementById("status").textContent =
      new Date().toLocaleTimeString("de-DE");

  } catch (err) {
    console.error(err);
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
      x: toDate(e.ts_calc),
      from_meldung:     toDate(e.from_meldung),
      from_meldung_alt: toDate(e.from_meldung_alt),
      calc_div2:        toDate(e.calc_div2),
      calc_div3:        toDate(e.calc_div3)
    }))
    .filter(p => p.x && p.x.getTime() >= cutoff);

  const datasets = [
    makeDataset("Meldung", points, "from_meldung", "#fbbf24"),
    makeDataset("Meldung alt", points, "from_meldung_alt", "#60a5fa"),
    makeDataset("Calc /2", points, "calc_div2", "#ef4444"),
    makeDataset("Calc /3", points, "calc_div3", "#22c55e")
  ];

  chart = new Chart(document.getElementById("chart"), {
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
          time: { tooltipFormat: "dd.MM HH:mm" },
          ticks: { color: "#9ca3af" },
          grid: {
            color: ctx => {
              const d = new Date(ctx.tick.value);
              return d.getHours() === 0 ? "#334155" : "#1f2937";
            }
          }
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