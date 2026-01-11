(() => {

  const canvas = document.getElementById("workstartChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const HOURS_DEFAULT = 24;

  let hours = HOURS_DEFAULT;

  // -----------------------------
  // Helpers
  // -----------------------------
  function parseTime(ts) {
    if (!ts) return null;
    return new Date(ts.replace(" ", "T"));
  }

  function minutesFromMidnight(d) {
    return d.getHours() * 60 + d.getMinutes();
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawLine(points, color) {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    points.forEach((p, i) => {
      const x = p.x;
      const y = p.y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }

  // -----------------------------
  // Load data
  // -----------------------------
  async function loadData() {
    const state = window.AppState;
    if (!state.person) return [];

    const fn = `workstart_history_${state.person.nachname}_${state.person.vorname}.json`;

    const res = await fetch(`data/${fn}?_=${Date.now()}`);
    if (!res.ok) return [];

    const json = await res.json();
    return json.entries || [];
  }

  // -----------------------------
  // Render
  // -----------------------------
  async function render() {
    clear();

    const entries = await loadData();
    if (!entries.length) return;

    const now = new Date();
    const cutoff = new Date(now.getTime() - hours * 3600 * 1000);

    const filtered = entries.filter(e => {
      const t = parseTime(e.ts_calc);
      return t && t >= cutoff;
    });

    if (filtered.length < 2) return;

    const margin = 40;
    const w = canvas.width - margin * 2;
    const h = canvas.height - margin * 2;

    const xs = filtered.map((_, i) => margin + i * (w / (filtered.length - 1)));

    function mapTimes(key) {
      return filtered
        .map((e, i) => {
          const d = parseTime(e[key]);
          if (!d) return null;
          return {
            x: xs[i],
            y: margin + h - (minutesFromMidnight(d) / 1440) * h
          };
        })
        .filter(Boolean);
    }

    drawLine(mapTimes("from_meldung"), "#00c853");
    drawLine(mapTimes("from_meldung_alt"), "#ffd600");
    drawLine(mapTimes("calc_div2"), "#2979ff");
    drawLine(mapTimes("calc_div3"), "#d500f9");
  }

  // -----------------------------
  // Buttons
  // -----------------------------
  document.querySelectorAll("[data-hours]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-hours]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      hours = parseInt(btn.dataset.hours, 10);
      render();
    });
  });

  render();

})();