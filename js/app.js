(() => {
  "use strict";

  const bust = () => `v=${Date.now()}`;

  const state = {
    webData: null,
    selectedPilotKey: null,
    gbData: null,
    slData: null,
    meldData: null
  };

  function el(id) { return document.getElementById(id); }

  function setText(id, text) {
    const e = el(id);
    if (!e) return false;
    e.textContent = text;
    return true;
  }

  function safe(v, fallback = "") {
    return (v === null || v === undefined) ? fallback : String(v);
  }

  async function fetchJson(path) {
    const res = await fetch(`${path}?${bust()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${path}`);
    return await res.json();
  }

  async function loadWebData() {
    state.webData = await fetchJson("data/web_data.json");
  }

  // targets können sein:
  // 1) ["konietzka_stefan", ...]
  // 2) [{key:"konietzka_stefan",label:"Konietzka Stefan",rolle:"..."}, ...]
  function parsePilotsFromTargets(webData) {
    const t = webData?.targets;
    if (!Array.isArray(t)) return [];

    if (t.length && typeof t[0] === "object" && t[0] !== null) {
      return t
        .filter(x => x && x.key)
        .map(x => ({ key: x.key, label: x.label || x.key.replace("_", " ") }));
    }

    return t.map(key => ({ key, label: String(key).replace("_", " ") }));
  }

  function initPilotSelect() {
    const sel = el("pilotSelect");
    if (!sel) return;

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

    for (const p of pilots) {
      const opt = document.createElement("option");
      opt.value = p.key;
      opt.textContent = p.label;
      sel.appendChild(opt);
    }

    state.selectedPilotKey = pilots[0].key;
    sel.value = state.selectedPilotKey;

    sel.addEventListener("change", () => {
      state.selectedPilotKey = sel.value;
      renderAktuell();
    });
  }

  async function loadTabData(tab) {
    try {
      if (tab === "gesamtboert" && !state.gbData) state.gbData = await fetchJson("data/aegir_gesamtboert.json");
      if (tab === "seelotsen" && !state.slData) state.slData = await fetchJson("data/aegir_seelotsen.json");
      if ((tab === "meld_kiel" || tab === "meld_rueb") && !state.meldData) state.meldData = await fetchJson("data/aegir_meldungen.json");
    } catch (err) {
      console.warn("loadTabData failed:", err);
    }
  }

  function tabSetup() {
    const tabs = el("tabs");
    if (!tabs) return;

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
    const stamp = state.webData?.generated_at || state.webData?.channel?.generated_at || null;
    setText("updateLabel", `Update: ${stamp || "—"}`);
  }

  function renderAktuell() {
    const key = state.selectedPilotKey;
    const card = el("aktuellCard");
    const hint = el("aktuellHint");

    if (card) card.textContent = key ? `Lotse: ${key.replace("_", " ")}` : "Kein Lotse gewählt.";
    if (hint) hint.textContent = "";
  }

  function renderGesamtboert() {
    const hintEl = el("gbHint");
    const table = el("gbTable");
    const tbody = table?.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const entries = state.gbData?.entries || [];

    if (hintEl) hintEl.textContent = entries.length
      ? `Einträge: ${entries.length} (Quelle: aegir_gesamtboert.json).`
      : "Keine Gesamtbört-Daten geladen (aegir_gesamtboert.json).";

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
    const hintEl = el("slHint");
    const table = el("slTable");
    const tbody = table?.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const entries = state.slData?.entries || [];

    if (hintEl) hintEl.textContent = entries.length
      ? `Einträge: ${entries.length} (Quelle: aegir_seelotsen.json).`
      : "Keine Seelotsen-Daten geladen (aegir_seelotsen.json).";

    for (const e of entries) {
      const tr = document.createElement("tr");
      const nach = safe(e.nachname, "");
      const vor = safe(e.vorname, "");
      const name = `${nach} ${vor}`.trim();
      const frm = safe(e.from, "");
      const to = safe(e.to, "");
      const ort = (frm || to) ? `${frm}-${to}`.replace(/^-|-$/g, "") : safe(e.ort, "");
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
    const mkHint = el("mkHint");
    const mrHint = el("mrHint");
    const mkRaw = el("mkRaw");
    const mrRaw = el("mrRaw");

    if (!state.meldData) {
      if (mkHint) mkHint.textContent = "Noch keine Meldungen geladen.";
      if (mrHint) mrHint.textContent = "Noch keine Meldungen geladen.";
      if (mkRaw) mkRaw.textContent = "";
      if (mrRaw) mrRaw.textContent = "";
      return;
    }

    const kiel = Array.isArray(state.meldData.kiel) ? state.meldData.kiel : [];
    const rueb = Array.isArray(state.meldData.ruesterbergen) ? state.meldData.ruesterbergen : [];

    if (mkHint) mkHint.textContent = kiel.length ? `Einträge: ${kiel.length}` : "Keine Meldungen Kiel.";
    if (mrHint) mrHint.textContent = rueb.length ? `Einträge: ${rueb.length}` : "Keine Meldungen Rüsterbergen.";

    if (mkRaw) mkRaw.textContent = kiel.length ? JSON.stringify(kiel, null, 2) : "";
    if (mrRaw) mrRaw.textContent = rueb.length ? JSON.stringify(rueb, null, 2) : "";
  }

  function renderAll() {
    renderHeader();
    renderAktuell();
    renderGesamtboert();
    renderSeelotsen();
    renderMeldungen();
  }

  async function boot() {
    tabSetup();

    const reloadBtn = el("reloadBtn");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", async () => {
        state.gbData = null; state.slData = null; state.meldData = null;
        await loadWebData();

        // aktive Tab-Daten nachladen
        const activeBtn = document.querySelector(".tab.active");
        const activeTab = activeBtn ? activeBtn.getAttribute("data-tab") : null;
        if (activeTab) await loadTabData(activeTab);

        initPilotSelect();
        renderAll();
      });
    }

    await loadWebData();

    const activeBtn = document.querySelector(".tab.active");
    const activeTab = activeBtn ? activeBtn.getAttribute("data-tab") : null;
    if (activeTab) await loadTabData(activeTab);

    initPilotSelect();
    renderAll();
  }

  boot().catch(err => alert(String(err?.message || err)));
})();