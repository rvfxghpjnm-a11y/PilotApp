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
    if (!card && !hint) return;

    const key = state.selectedTarget;
    if (!key) {
      if (card) card.textContent = "Kein Ziellotse ausgewählt.";
      if (hint) hint.textContent = "";
      return;
    }

    const label = key.replace(/_/g, " ");
    let text = `Lotse: ${label}`;

    const gbEntries = Array.isArray(state.gbData?.entries) ? state.gbData.entries : [];
    const me = gbEntries.find(e => makeTargetKey(e.nachname, e.vorname) === key);
    if (me) {
      const richtung = safe(me.richtung, "");
      const arrow = (richtung === "↑" || richtung === "↓") ? `${richtung}${me.verguetung ? "$$" : ""}` : "";
      text = `${label} | Pos ${safe(me.pos, "?")} | Takt ${safe(me.takt, "?")}${arrow ? ` | ${arrow}` : ""}`;
      if (hint) hint.textContent = `${safe(me.zeit, "")} ${safe(me.bemerkung, "")}`.trim();
    } else {
      const seelotsen = Array.isArray(state.slData?.entries) ? state.slData.entries : [];
      const sl = seelotsen.find(e => makeTargetKey(e.nachname, e.vorname) === key);
      if (sl) {
        text = `${label} | ${safe(sl.aufgabe, "Am arbeiten")}`;
        if (hint) {
          const ort = [safe(sl.from, ""), safe(sl.to, "")].filter(Boolean).join("-");
          hint.textContent = [safe(sl.zeit, ""), safe(sl.fahrzeug, ""), ort].filter(Boolean).join(" | ");
        }
      } else {
        if (hint) hint.textContent = "Aktuell weder in Gesamtbört noch bei abgeteilten Lotsen gefunden.";
      }
    }

    if (card) card.textContent = text;
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
      <div class="hint">Abgeteilte Lotsen – ${entries.length} Einträge</div>
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

    const points = series
      .map((p, i) => ({ i, pos: Number(p.pos) }))
      .filter(p => Number.isFinite(p.pos));

    if (!points.length) {
      mount.innerHTML = `<div class="hint">History vorhanden, aber ohne nutzbare Positionswerte.</div>`;
      return;
    }

    const width = 900;
    const height = 260;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 35;
    const minPos = Math.min(...points.map(p => p.pos));
    const maxPos = Math.max(...points.map(p => p.pos));
    const span = Math.max(1, maxPos - minPos);
    const xStep = points.length === 1 ? 0 : (width - padL - padR) / (points.length - 1);

    const xy = points.map((p, idx) => {
      const x = padL + idx * xStep;
      const y = padT + ((maxPos - p.pos) / span) * (height - padT - padB);
      return { ...p, x, y };
    });

    const poly = xy.map(p => `${p.x},${p.y}`).join(" ");
    const circles = xy.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3"></circle>`).join("");

    const yTicks = 5;
    const grid = [];
    for (let i = 0; i <= yTicks; i++) {
      const v = minPos + ((maxPos - minPos) / yTicks) * i;
      const y = padT + ((maxPos - v) / span) * (height - padT - padB);
      grid.push(`<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#ddd" stroke-width="1"></line>`);
      grid.push(`<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11">${Math.round(v)}</text>`);
    }

    const last = series[series.length - 1];
    const meta = `Letzter Punkt: Pos ${safe(last.pos)} | ${esc(last.ts)}`;

    mount.innerHTML = `
      <div class="hint">Graph – ${esc(key.replace(/_/g, " "))} | ${series.length} Punkte</div>
      <svg viewBox="0 0 ${width} ${height}" class="graph-svg" style="width:100%;height:auto;max-height:320px;background:#fff;border:1px solid #ddd;border-radius:8px;">
        ${grid.join("")}
        <line x1="${padL}" y1="${height - padB}" x2="${width - padR}" y2="${height - padB}" stroke="#666"></line>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${height - padB}" stroke="#666"></line>
        <polyline fill="none" stroke="#1f6feb" stroke-width="2" points="${poly}"></polyline>
        ${circles}
      </svg>
      <div class="hint">${meta}</div>`;
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
      initTargetSelect();
      await switchTo(state.activeView || "boert");
    };
  }

  async function boot() {
    setupTabs();
    setupReload();
    await ensureCoreLoaded();
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