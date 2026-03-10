(() => {
  "use strict";

  const CACHE_BUST = () => `ts=${Date.now()}`;

  const state = {
    activeView: null,
    selectedTarget: null,
    webData: null,
    history: null,
    gbData: null,
    slData: null,
    meldData: null,
  };

  const VIEW_MAP = {
    boert: "boert",
    gesamtboert: "boert",
    "gesamtbört": "boert",
    seelotsen: "seelotsen",
    abgeteilte: "seelotsen",
    abgeteilte_lotsen: "seelotsen",
    meld_kiel: "meld_kiel",
    meldungen_kiel: "meld_kiel",
    "meldungen-kiel": "meld_kiel",
    meld_rueb: "meld_rueb",
    meldungen_rueb: "meld_rueb",
    meldungen_ruesterbergen: "meld_rueb",
    "meldungen-rüsterbergen": "meld_rueb",
    "meldungen-ruesterbergen": "meld_rueb",
    graph: "graph",
    grafik: "graph",
  };

  const GRAPH_SERIES = [
    { key: "m1", label: "m1", color: "#7aa2ff" },
    { key: "m2", label: "m2", color: "#ffb86c" },
    { key: "m3", label: "m3", color: "#50fa7b" },
    { key: "m4", label: "m4", color: "#ff79c6" },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function safe(v, fallback = "") {
    return v === null || v === undefined ? fallback : String(v);
  }

  function esc(v) {
    return safe(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizePart(s) {
    return safe(s)
      .trim()
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[\s.,\-_/]+/g, "");
  }

  function makeTargetKey(nachname, vorname) {
    const nach = normalizePart(nachname);
    const vor = normalizePart(vorname);
    if (nach && vor) return `${nach}_${vor}`;
    return nach || vor || "";
  }

  function canonicalView(raw) {
    const key = safe(raw).trim().toLowerCase();
    return VIEW_MAP[key] || key || "boert";
  }

  async function fetchJson(path) {
    const res = await fetch(`${path}?${CACHE_BUST()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${path}`);
    return await res.json();
  }

  async function ensureCoreLoaded() {
    if (!state.webData) {
      try {
        state.webData = await fetchJson("data/web_data.json");
      } catch (err) {
        console.warn("web_data.json konnte nicht geladen werden:", err);
        state.webData = {};
      }
    }

    if (!state.history) {
      try {
        state.history = await fetchJson("data/start_work_targets_history.json");
      } catch (err) {
        console.warn("start_work_targets_history.json konnte nicht geladen werden:", err);
        state.history = { targets: {} };
      }
    }
  }

  async function ensureViewData(view) {
    if (view === "boert" && !state.gbData) {
      state.gbData = await fetchJson("data/aegir_gesamtboert.json");
    }
    if (view === "seelotsen" && !state.slData) {
      state.slData = await fetchJson("data/aegir_seelotsen.json");
    }
    if ((view === "meld_kiel" || view === "meld_rueb") && !state.meldData) {
      state.meldData = await fetchJson("data/aegir_meldungen.json");
    }
  }

  function extractTargets() {
    const out = [];
    const seen = new Set();

    const source = Array.isArray(state.webData?.targets) ? state.webData.targets : [];
    for (const item of source) {
      let key = "";
      let label = "";

      if (typeof item === "string") {
        key = item;
        label = item.replace(/_/g, " ");
      } else if (item && typeof item === "object") {
        key = item.key || "";
        label = item.label || item.name || key.replace(/_/g, " ");
      }

      if (key && !seen.has(key)) {
        seen.add(key);
        out.push({ key, label });
      }
    }

    const histTargets = state.history?.targets && typeof state.history.targets === "object"
      ? Object.keys(state.history.targets)
      : [];

    for (const key of histTargets) {
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ key, label: key.replace(/_/g, " ") });
      }
    }

    return out;
  }

  function initTargetSelect() {
    const select = $("pilotSelect");
    if (!select) return;

    const targets = extractTargets();
    select.innerHTML = "";

    if (!targets.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "keine Targets";
      select.appendChild(opt);
      state.selectedTarget = null;
      return;
    }

    for (const t of targets) {
      const opt = document.createElement("option");
      opt.value = t.key;
      opt.textContent = t.label;
      select.appendChild(opt);
    }

    if (!state.selectedTarget || !targets.find(t => t.key === state.selectedTarget)) {
      state.selectedTarget = targets[0].key;
    }

    select.value = state.selectedTarget;
    select.onchange = () => {
      state.selectedTarget = select.value;
      renderAktuell();
      renderGraph();
    };
  }

  function panelCandidates(view) {
    switch (view) {
      case "boert":
        return ["panel-boert", "panel-gesamtboert"];
      case "seelotsen":
        return ["panel-seelotsen", "panel-abgeteilte", "panel-abgeteilte_lotsen"];
      case "meld_kiel":
        return ["panel-meld_kiel", "panel-meldungen_kiel", "panel-meldungen-kiel"];
      case "meld_rueb":
        return ["panel-meld_rueb", "panel-meldungen_rueb", "panel-meldungen_ruesterbergen", "panel-meldungen-ruesterbergen"];
      case "graph":
        return ["panel-graph", "panel-grafik"];
      default:
        return [`panel-${view}`];
    }
  }

  function getPanel(view) {
    for (const id of panelCandidates(view)) {
      const panel = $(id);
      if (panel) return panel;
    }
    return null;
  }

  function getMount(view) {
    const panel = getPanel(view);
    if (!panel) return null;
    let mount = panel.querySelector(".view-mount");
    if (!mount) {
      mount = document.createElement("div");
      mount.className = "view-mount";
      panel.appendChild(mount);
    }
    return mount;
  }

  function activateView(view) {
    state.activeView = view;

    document.querySelectorAll(".tab").forEach(btn => {
      const btnView = canonicalView(btn.getAttribute("data-tab"));
      btn.classList.toggle("active", btnView === view);
    });

    document.querySelectorAll(".panel").forEach(panel => {
      panel.classList.remove("active");
    });

    const panel = getPanel(view);
    if (panel) panel.classList.add("active");
  }

  function setUpdateLabel() {
    const stamps = [
      state.webData?.generated_at,
      state.gbData?.generated_at,
      state.slData?.generated_at,
      state.meldData?.generated_at,
      state.history?.generated_at,
    ].filter(Boolean);

    const latest = stamps.length ? stamps[0] : "—";
    const label = $("updateLabel");
    if (label) label.textContent = `Update: ${latest}`;
  }

  function renderAktuell() {
    const card = $("aktuellCard");
    const hint = $("aktuellHint");

    if (!card || !hint) return;

    const key = state.selectedTarget;
    if (!key) {
      card.textContent = "Kein Ziellotse ausgewählt.";
      hint.textContent = "";
      return;
    }

    const label = key.replace(/_/g, " ");

    const gbEntries = Array.isArray(state.gbData?.entries) ? state.gbData.entries : [];
    const meGb = gbEntries.find(e => makeTargetKey(e.nachname, e.vorname) === key);

    if (meGb) {
      const richtung = safe(meGb.richtung, "");
      const arrow = (richtung === "↑" || richtung === "↓")
        ? `${richtung}${meGb.verguetung ? "$$" : ""}`
        : "";

      card.textContent =
        `${label} | Gesamtbört | Pos ${safe(meGb.pos, "?")} | Takt ${safe(meGb.takt, "?")}${arrow ? ` | ${arrow}` : ""}`;

      hint.textContent =
        [safe(meGb.zeit, ""), safe(meGb.bemerkung, "")]
          .filter(Boolean)
          .join(" | ");

      return;
    }

    const slEntries = Array.isArray(state.slData?.entries) ? state.slData.entries : [];
    const meSl = slEntries.find(e => makeTargetKey(e.nachname, e.vorname) === key);

    if (meSl) {
      const ort = [safe(meSl.from, ""), safe(meSl.to, "")]
        .filter(Boolean)
        .join("-") || safe(meSl.ort, "");

      card.textContent =
        `${label} | Abgeteilter Seelotse | ${safe(meSl.aufgabe, "Am arbeiten")}`;

      hint.textContent =
        [safe(meSl.zeit, ""), safe(meSl.fahrzeug, ""), ort]
          .filter(Boolean)
          .join(" | ");

      return;
    }

    card.textContent = `${label} | Aktuell nicht im Dienstbild gefunden`;
    hint.textContent = "Weder in Gesamtbört noch bei abgeteilten Seelotsen gefunden.";
  }

  function renderBoert() {
    const mount = getMount("boert");
    if (!mount) return;

    const entries = Array.isArray(state.gbData?.entries) ? state.gbData.entries : [];
    if (!entries.length) {
      mount.innerHTML = `<div class="hint">Keine Gesamtbört-Daten geladen.</div>`;
      return;
    }

    const rows = entries.map(e => {
      const name = `${safe(e.nachname)} ${safe(e.vorname)}`.trim();
      const richtung = safe(e.richtung, "");
      const arrow = (richtung === "↑" || richtung === "↓") ? `${richtung}${e.verguetung ? "$$" : ""}` : "";
      return `
        <tr>
          <td>${esc(e.pos)}</td>
          <td>${esc(e.takt)}</td>
          <td>${esc(name)}</td>
          <td>${esc(arrow)}</td>
          <td>${esc(e.zeit)}</td>
          <td>${esc(e.bemerkung)}</td>
        </tr>`;
    }).join("");

    mount.innerHTML = `
      <div class="hint">Gesamtbört – ${entries.length} Einträge</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Takt</th>
            <th>Name</th>
            <th>Pfeil</th>
            <th>Zeit</th>
            <th>Bemerkung</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function renderSeelotsen() {
    const mount = getMount("seelotsen");
    if (!mount) return;

    const entries = Array.isArray(state.slData?.entries) ? state.slData.entries : [];
    if (!entries.length) {
      mount.innerHTML = `<div class="hint">Keine abgeteilten Lotsen geladen.</div>`;
      return;
    }

    const rows = entries.map(e => {
      const name = `${safe(e.nachname)} ${safe(e.vorname)}`.trim();
      const ort = [safe(e.from, ""), safe(e.to, "")].filter(Boolean).join("-") || safe(e.ort, "");
      return `
        <tr>
          <td>${esc(e.zeit)}</td>
          <td>${esc(name)}</td>
          <td>${esc(e.aufgabe)}</td>
          <td>${esc(e.fahrzeug)}</td>
          <td>${esc(ort)}</td>
        </tr>`;
    }).join("");

    mount.innerHTML = `
      <div class="hint">Abgeteilte Seelotsen – ${entries.length} Einträge</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Zeit</th>
            <th>Name</th>
            <th>Aufgabe</th>
            <th>Fahrzeug</th>
            <th>Ort</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function renderMeldList(view) {
    const mount = getMount(view);
    if (!mount) return;

    const list = view === "meld_kiel"
      ? (Array.isArray(state.meldData?.kiel) ? state.meldData.kiel : [])
      : (Array.isArray(state.meldData?.ruesterbergen) ? state.meldData.ruesterbergen : []);

    const title = view === "meld_kiel" ? "Meldungen Kiel" : "Meldungen Rüsterbergen";

    if (!list.length) {
      mount.innerHTML = `<div class="hint">${title}: keine Daten geladen.</div>`;
      return;
    }

    const rows = list.map(e => {
      const ship = safe(e.schiff || e.name || e.vessel || "");
      const fromTo = [safe(e.von, ""), safe(e.nach, "")].filter(Boolean).join(" → ");
      const depth = safe(e.tiefgang || e.tiefe || "");
      const nr = safe(e.nr || e.pos || "");
      const q = safe(e.q_schiffgruppe || e.q_gruppe || "");
      const qty = safe(e.anzahl || "");
      const remark = safe(e.bemerkung || "");
      return `
        <tr>
          <td>${esc(nr)}</td>
          <td>${esc(e.zeit)}</td>
          <td>${esc(ship)}</td>
          <td>${esc(fromTo)}</td>
          <td>${esc(depth)}</td>
          <td>${esc(q)}</td>
          <td>${esc(qty)}</td>
          <td>${esc(remark)}</td>
        </tr>`;
    }).join("");

    mount.innerHTML = `
      <div class="hint">${title} – ${list.length} Einträge</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Nr</th>
            <th>Zeit</th>
            <th>Schiff</th>
            <th>Von/Nach</th>
            <th>Tiefgang</th>
            <th>Q</th>
            <th>Anzahl</th>
            <th>Bemerkung</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function parseIsoToDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatHm(minutesAbsolute) {
    let minutes = Math.round(minutesAbsolute) % 1440;
    if (minutes < 0) minutes += 1440;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function normalizeSeriesMidnight(values) {
    if (!values.length) return values;
    const out = [values[0]];
    for (let i = 1; i < values.length; i++) {
      let v = values[i];
      const prev = out[i - 1];

      while (v - prev > 720) v -= 1440;
      while (prev - v > 720) v += 1440;

      out.push(v);
    }
    return out;
  }

  function buildGraphSeries(historySeries, key) {
    const raw = historySeries.map(p => {
      const d = parseIsoToDate(p[key]);
      if (!d) return null;
      return d.getHours() * 60 + d.getMinutes();
    });

    if (raw.some(v => v === null)) return null;
    return normalizeSeriesMidnight(raw);
  }

  function renderGraph() {
    const mount = getMount("graph");
    if (!mount) return;

    const key = state.selectedTarget;
    if (!key) {
      mount.innerHTML = `<div class="hint">Kein Ziellotse ausgewählt.</div>`;
      return;
    }

    const series = Array.isArray(state.history?.targets?.[key]) ? state.history.targets[key] : [];
    if (!series.length) {
      mount.innerHTML = `<div class="hint">Für ${esc(key.replace(/_/g, " "))} gibt es aktuell keine History-Punkte.</div>`;
      return;
    }

    const prepared = GRAPH_SERIES.map(def => ({
      ...def,
      values: buildGraphSeries(series, def.key)
    })).filter(s => Array.isArray(s.values) && s.values.length);

    if (!prepared.length) {
      mount.innerHTML = `<div class="hint">Keine nutzbaren m1–m4 Zeitwerte vorhanden.</div>`;
      return;
    }

    const width = 980;
    const height = 380;
    const padL = 60;
    const padR = 24;
    const padT = 28;
    const padB = 46;

    const allValues = prepared.flatMap(s => s.values);
    const minY = Math.min(...allValues);
    const maxY = Math.max(...allValues);
    const ySpan = Math.max(30, maxY - minY);

    const xCount = Math.max(...prepared.map(s => s.values.length));
    const xStep = xCount <= 1 ? 0 : (width - padL - padR) / (xCount - 1);

    function xForIndex(i) {
      return padL + i * xStep;
    }

    function yForValue(v) {
      return padT + ((maxY - v) / ySpan) * (height - padT - padB);
    }

    const grid = [];
    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
      const v = minY + (ySpan / tickCount) * i;
      const y = yForValue(v);
      grid.push(`<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#2b3240" stroke-width="1"></line>`);
      grid.push(`<text x="${padL - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#aab2bf">${formatHm(v)}</text>`);
    }

    const xLabels = [];
    for (let i = 0; i < xCount; i++) {
      const x = xForIndex(i);
      xLabels.push(`<text x="${x}" y="${height - 14}" text-anchor="middle" font-size="11" fill="#aab2bf">${i + 1}</text>`);
    }

    const lines = prepared.map(s => {
      const pts = s.values.map((v, i) => `${xForIndex(i)},${yForValue(v)}`).join(" ");
      const circles = s.values.map((v, i) =>
        `<circle cx="${xForIndex(i)}" cy="${yForValue(v)}" r="3.5" fill="${s.color}"></circle>`
      ).join("");

      return `
        <polyline fill="none" stroke="${s.color}" stroke-width="2.5" points="${pts}"></polyline>
        ${circles}
      `;
    }).join("");

    const legend = prepared.map((s, i) => {
      const x = 18 + i * 120;
      return `
        <line x1="${x}" y1="14" x2="${x + 22}" y2="14" stroke="${s.color}" stroke-width="3"></line>
        <text x="${x + 30}" y="18" font-size="12" fill="#d7dbe3">${esc(s.label)}</text>
      `;
    }).join("");

    const latestText = prepared.map(s => {
      const last = s.values[s.values.length - 1];
      return `${s.label}: ${formatHm(last)}`;
    }).join(" | ");

    mount.innerHTML = `
      <div class="hint">Graph – ${esc(key.replace(/_/g, " "))} | ${series.length} Punkte</div>
      <svg viewBox="0 0 ${width} ${height}" style="
        width:100%;
        height:auto;
        max-height:420px;
        background:#141922;
        border:1px solid #2b3240;
        border-radius:10px;
      ">
        ${grid.join("")}
        <line x1="${padL}" y1="${height - padB}" x2="${width - padR}" y2="${height - padB}" stroke="#6b7280"></line>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${height - padB}" stroke="#6b7280"></line>
        ${xLabels.join("")}
        ${lines}
        ${legend}
      </svg>
      <div class="hint" style="margin-top:10px;">${esc(latestText)}</div>
      <div class="hint">X-Achse = letzte History-Punkte | Y-Achse = Uhrzeit</div>
    `;
  }

  function renderAll() {
    setUpdateLabel();
    renderAktuell();
    renderBoert();
    renderSeelotsen();
    renderMeldList("meld_kiel");
    renderMeldList("meld_rueb");
    renderGraph();
  }

  async function switchTo(view) {
    const logicalView = canonicalView(view);
    activateView(logicalView);
    await ensureViewData(logicalView);
    renderAll();
  }

  function setupTabs() {
    const tabs = $("tabs");
    if (!tabs) return;

    tabs.addEventListener("click", async (ev) => {
      const btn = ev.target.closest(".tab");
      if (!btn) return;
      await switchTo(btn.getAttribute("data-tab"));
    });
  }

  function setupReload() {
    const btn = $("reloadBtn");
    if (!btn) return;

    btn.onclick = async () => {
      state.webData = null;
      state.history = null;
      state.gbData = null;
      state.slData = null;
      state.meldData = null;

      await ensureCoreLoaded();
      await ensureViewData("boert");
      await ensureViewData("seelotsen");
      initTargetSelect();
      await switchTo(state.activeView || "boert");
    };
  }

  async function boot() {
    setupTabs();
    setupReload();
    await ensureCoreLoaded();
    await ensureViewData("boert");
    await ensureViewData("seelotsen");
    initTargetSelect();

    const activeTabBtn = document.querySelector(".tab.active");
    const initialView = activeTabBtn
      ? activeTabBtn.getAttribute("data-tab")
      : (document.querySelector(".tab")?.getAttribute("data-tab") || "boert");

    await switchTo(initialView);
  }

  boot().catch(err => {
    console.error(err);
    alert(String(err?.message || err));
  });
})();