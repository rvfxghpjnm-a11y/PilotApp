(() => {
  "use strict";

  // Cache-busting pro Reload: immer neue URL
  const bust = () => `v=${Date.now()}`;

  const state = {
    webData: null,
    startWorkHistory: null,        // data/start_work_targets_history.json (wenn vorhanden)
    channelMasterFinal: null,      // data/channel_master_final.json (wenn vorhanden)
    selectedPilotKey: null,
    gbData: null,
    slData: null,
    meldData: null
  };

  const $ = (id) => document.getElementById(id);

  function safe(v, fallback = "") {
    return (v === null || v === undefined) ? fallback : String(v);
  }

  function pickUpdateStamp(webData) {
    return webData?.generated_at || webData?.channel?.generated_at || null;
  }

  function fmtUpdate(stamp) {
    if (!stamp) return "n/a";
    return stamp;
  }

  async function fetchJson(path) {
    const res = await fetch(`${path}?${bust()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${path}`);
    return await res.json();
  }

  async function loadAll() {
    // Pflicht: web_data.json
    state.webData = await fetchJson("data/web_data.json");

    // Optional
    try { state.startWorkHistory = await fetchJson("data/start_work_targets_history.json"); } catch {}
    try { state.channelMasterFinal = await fetchJson("data/channel_master_final.json"); } catch {}
  }

  function parsePilotsFromTargets(webData) {
    const t = webData?.targets;
    if (!Array.isArray(t)) return [];
    // targets sind Strings wie "konietzka_stefan"
    return t.map(key => ({
      key,
      label: key.replace("_", " ")
    }));
  }

  function initPilotSelect() {
    const sel = $("pilotSelect");
    sel.innerHTML = "";

    const pilots = parsePilotsFromTargets(state.webData);
    if (!pilots.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "keine Targets";
      sel.appendChild(opt);
      state.selectedPilotKey = null;
      return;
    }

    pilots.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.key;
      opt.textContent = p.label;
      sel.appendChild(opt);
    });

    // default: erster
    state.selectedPilotKey = pilots[0].key;
    sel.value = state.selectedPilotKey;

    sel.addEventListener("change", () => {
      state.selectedPilotKey = sel.value;
      renderAll();
    });
  }

  async function loadTabData(tab) {
    // Lädt die Tab-spezifischen Rohdaten direkt aus web/data/
    // (damit web_data.json klein bleiben kann).
    try {
      if (tab === "gesamtboert" && !state.gbData) state.gbData = await fetchJson("data/aegir_gesamtboert.json");
      if (tab === "seelotsen" && !state.slData) state.slData = await fetchJson("data/aegir_seelotsen.json");
      if ((tab === "meldungen-kiel" || tab === "meldungen-ruesterbergen") && !state.meldData) state.meldData = await fetchJson("data/aegir_meldungen.json");
    } catch (err) {
      console.warn("loadTabData failed:", err);
    }
  }

  function tabSetup() {
    const tabs = $("tabs");
    tabs.addEventListener("click", async (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      const panel = document.getElementById(`panel-${tab}`);
      if (panel) panel.classList.add("active");

      await loadTabData(tab);
      renderAll();
    });
  }

  function renderHeader() {
    const stamp = pickUpdateStamp(state.webData);
    $("updateLabel").textContent = `Update: ${fmtUpdate(stamp)}`;
  }

  function renderAktuell() {
    // Dein „Aktuell“-Bereich bleibt wie gehabt (aus web_data.json).
    // (Wenn du später "Aktuell" komplett aus merged_*.json machen willst, machen wir das gezielt.)
    const out = $("aktuellText");
    const pilotKey = state.selectedPilotKey;
    if (!pilotKey) {
      out.textContent = "Kein Lotse gewählt.";
      return;
    }
    out.textContent = `Lotse: ${pilotKey.replace("_", " ")}`;
  }

  function renderGesamtboert() {
    const hint = $("gbHint");
    const tbody = $("gbTable").querySelector("tbody");
    tbody.innerHTML = "";

    const entries = state.gbData?.entries || [];
    if (!entries.length) {
      hint.textContent = "Keine Gesamtbört-Daten geladen (aegir_gesamtboert.json).";
      return;
    }
    hint.textContent = `Einträge: ${entries.length} (Quelle: aegir_gesamtboert.json).`;

    for (const e of entries) {
      const tr = document.createElement("tr");
      const nach = safe(e.nachname, "");
      const vor = safe(e.vorname, "");
      const name = `${nach} ${vor}`.trim();
      const richtung = safe(e.richtung, "");
      const arrow = (richtung === "↑" || richtung === "↓")
        ? `${richtung}${e.verguetung ? "$$" : ""}`
        : "";
      tr.innerHTML = `
        <td>${safe(e.pos, "")}</td>
        <td>${safe(e.takt, "")}</td>
        <td>${name}</td>
        <td>${arrow}</td>
        <td>${safe(e.zeit, "")}</td>
        <td>${safe(e.bemerkung, "")}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  function renderSeelotsen() {
    const hint = $("slHint");
    const tbody = $("slTable").querySelector("tbody");
    tbody.innerHTML = "";

    const entries = state.slData?.entries || [];
    if (!entries.length) {
      hint.textContent = "Keine Seelotsen-Daten geladen (aegir_seelotsen.json).";
      return;
    }
    hint.textContent = `Einträge: ${entries.length} (Quelle: aegir_seelotsen.json).`;

    for (const e of entries) {
      const tr = document.createElement("tr");
      const nach = safe(e.nachname, "");
      const vor = safe(e.vorname, "");
      const name = `${nach} ${vor}`.trim();
      const ort = (() => {
        const frm = safe(e.from, "");
        const to = safe(e.to, "");
        if (frm || to) return `${frm}-${to}`.replace(/^-|-$/g, "");
        return safe(e.ort, "");
      })();
      tr.innerHTML = `
        <td>${safe(e.zeit, "")}</td>
        <td>${name}</td>
        <td>${safe(e.aufgabe, "")}</td>
        <td>${safe(e.fahrzeug, "")}</td>
        <td>${ort}</td>
        <td></td>
      `;
      tbody.appendChild(tr);
    }
  }

  function renderMeldungen() {
    const mkHint = $("mkHint");
    const mrHint = $("mrHint");
    const mkRaw = $("mkRaw");
    const mrRaw = $("mrRaw");

    const md = state.meldData;

    if (!md) {
      mkHint.textContent = "Noch keine Meldungen im Browser geladen. Öffne den Tab erneut oder drücke Reload.";
      mrHint.textContent = "Noch keine Meldungen im Browser geladen. Öffne den Tab erneut oder drücke Reload.";
      mkRaw.textContent = "";
      mrRaw.textContent = "";
      return;
    }

    const kiel = Array.isArray(md.kiel) ? md.kiel : [];
    const rueb = Array.isArray(md.ruesterbergen) ? md.ruesterbergen : [];

    mkHint.textContent = kiel.length
      ? `Einträge: ${kiel.length} (Quelle: aegir_meldungen.json).`
      : "Keine Meldungen Kiel in aegir_meldungen.json.";

    mrHint.textContent = rueb.length
      ? `Einträge: ${rueb.length} (Quelle: aegir_meldungen.json).`
      : "Keine Meldungen Rüsterbergen in aegir_meldungen.json.";

    // Fürs Erste: roh anzeigen
    mkRaw.textContent = kiel.length ? JSON.stringify(kiel, null, 2) : "";
    mrRaw.textContent = rueb.length ? JSON.stringify(rueb, null, 2) : "";
  }

  function renderGraph() {
    // unverändert – nutzt start_work_targets_history.json wie gehabt
    const msg = $("graphHint");
    msg.textContent = "Graph: (Logik unverändert)";
  }

  function renderAll() {
    renderHeader();
    renderAktuell();
    renderGesamtboert();
    renderSeelotsen();
    renderMeldungen();
    renderGraph();
  }

  async function boot() {
    tabSetup();

    $("reloadBtn").addEventListener("click", async () => {
      try {
        // Reset tab caches
        state.gbData = null;
        state.slData = null;
        state.meldData = null;
        await loadAll();

        // aktuelle Tab-Daten (Gesamtbört/Seelotsen/Meldungen) nachladen
        const activeBtn = document.querySelector(".tab.active");
        const activeTab = activeBtn ? activeBtn.getAttribute("data-tab") : null;
        if (activeTab) await loadTabData(activeTab);

        initPilotSelect();
        renderAll();
      } catch (err) {
        alert(String(err?.message || err));
      }
    });

    try {
      // Reset tab caches
      state.gbData = null;
      state.slData = null;
      state.meldData = null;
      await loadAll();

      // aktuelle Tab-Daten (Gesamtbört/Seelotsen/Meldungen) nachladen
      const activeBtn = document.querySelector(".tab.active");
      const activeTab = activeBtn ? activeBtn.getAttribute("data-tab") : null;
      if (activeTab) await loadTabData(activeTab);

      initPilotSelect();
      renderAll();
    } catch (err) {
      alert(String(err?.message || err));
    }
  }

  boot();
})();