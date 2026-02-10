(() => {
  "use strict";

  // Cache-busting pro Reload: immer neue URL
  const bust = () => `v=${Date.now()}`;

  const state = {
    webData: null,
    startWorkHistory: null,        // data/start_work_targets_history.json (wenn vorhanden)
    channelMasterFinal: null,      // data/channel_master_final.json (wenn vorhanden)
    selectedPilotKey: null
  };

  const $ = (id) => document.getElementById(id);

  const fmtUpdate = (s) => {
    if (!s) return "–";
    return String(s);
  };

  const safe = (v, fallback = "") => (v === undefined || v === null) ? fallback : v;

  const parsePilotsFromTargets = (webData) => {
    // web_data.json enthält: targets: ["konietzka_stefan", ...]
    const t = webData?.targets || [];
    // hübsch für Dropdown
    return t.map((key) => {
      const parts = key.split("_");
      const nachname = parts[0] ? (parts[0][0].toUpperCase() + parts[0].slice(1)) : key;
      const vorname = parts[1] ? (parts[1][0].toUpperCase() + parts[1].slice(1)) : "";
      return { key, label: `${nachname} ${vorname}`.trim() };
    });
  };

  const pickUpdateStamp = (webData) => {
    // In deinem web_data.json ist es NICHT oben, sondern z.B. in gesamtboert.generated_at / kanal.generated_at
    const candidates = [
      webData?.generated_at,
      webData?.gesamtboert?.generated_at,
      webData?.kanal?.generated_at,
      webData?.seelotsen?.generated_at
    ].filter(Boolean);

    // nimm den "spätesten" String (nicht perfekt, aber reicht bei deinen Formaten)
    candidates.sort();
    return candidates.length ? candidates[candidates.length - 1] : null;
  };

  async function fetchJson(path) {
    const res = await fetch(`${path}?${bust()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${path}`);
    return await res.json();
  }

  async function loadAll() {
    // Pflicht: web_data.json
    state.webData = await fetchJson("data/web_data.json");

    // Optional: diese liegen bei dir bereits in web/data/ (laut start_all output)
    // Wenn sie nicht existieren: sauber ignorieren.
    try { state.startWorkHistory = await fetchJson("data/start_work_targets_history.json"); } catch {}
    try { state.channelMasterFinal = await fetchJson("data/channel_master_final.json"); } catch {}
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

  function tabSetup() {
    const tabs = $("tabs");
    tabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      const panel = document.getElementById(`panel-${tab}`);
      if (panel) panel.classList.add("active");
    });
  }

  function renderHeader() {
    const stamp = pickUpdateStamp(state.webData);
    $("updateLabel").textContent = `Update: ${fmtUpdate(stamp)}`;
  }

  function findPilotInGesamtboert(pilotKey) {
    // web_data.json: gesamtboert.entries: [{pos, takt, name, arrow, time, bemerkung, key?}, ...]
    // Wir filtern grob nach "nachname_vorname" im key-Feld, falls vorhanden.
    const entries = state.webData?.gesamtboert?.entries || [];
    const hit = entries.find(e => (e?.pilot_key && e.pilot_key === pilotKey) || false);
    return hit || null;
  }

  function findPilotInSeelotsen(pilotKey) {
    // web_data.json: seelotsen.entries: [{time, name, task, vehicle, location, plus8}, ...]
    // Auch hier: wenn später pilot_key kommt, nutzen wir ihn. Sonst match per Name ist wacklig.
    const entries = state.webData?.seelotsen?.entries || [];
    // Wenn deine Pipeline keinen pilot_key liefert, können wir nur grob über Namen matchen:
    // pilotKey: nachname_vorname
    const [nachnameRaw, vornameRaw] = (pilotKey || "").split("_");
    const nachname = (nachnameRaw || "").toLowerCase();
    const vorname = (vornameRaw || "").toLowerCase();
    const hit = entries.find(e => {
      const n = String(e?.name || "").toLowerCase();
      return n.includes(nachname) && (vorname ? n.includes(vorname) : true);
    });
    return hit || null;
  }

  function renderAktuell() {
    const card = $("aktuellCard");
    const hint = $("aktuellHint");
    card.innerHTML = "";
    hint.textContent = "";

    const pilotKey = state.selectedPilotKey;
    if (!pilotKey) {
      card.textContent = "Keine Targets vorhanden.";
      return;
    }

    const inGB = findPilotInGesamtboert(pilotKey);
    const inSL = findPilotInSeelotsen(pilotKey);

    // Statuslogik (simpel, stabil, ohne “Magie”)
    if (inSL) {
      const task = safe(inSL.task, "Seelotse");
      const line1 = `<div style="font-size:28px;font-weight:900;">Seelotse</div>`;
      const line2 = `<div style="margin-top:6px;">
        <span class="badge ok">${safe(inSL.time, "--:--")}</span>
        <span class="badge">${safe(inSL.name, "")}</span>
        <span class="badge warn">${task}</span>
      </div>`;
      const line3 = `<div style="margin-top:10px;color:rgba(231,238,247,.85);">
        ${safe(inSL.vehicle, "")} · ${safe(inSL.location, "")}
        ${inSL.plus8 ? ` · <span class="badge">${safe(inSL.plus8)}</span>` : ""}
      </div>`;
      card.innerHTML = line1 + line2 + line3;
      hint.textContent = "Aktuell-Card basiert auf seelotsen/gesamtbört. WSV-Zusatz kommt erst rein, wenn er in JSON geliefert wird.";
      return;
    }

    if (inGB) {
      const line1 = `<div style="font-size:28px;font-weight:900;">Gesamtbört</div>`;
      const line2 = `<div style="margin-top:6px;">
        <span class="badge ok">Pos ${safe(inGB.pos, "?")}</span>
        <span class="badge">${safe(inGB.takt, "")}</span>
        <span class="badge">${safe(inGB.name, "")}</span>
        ${inGB.arrow ? `<span class="badge warn">${safe(inGB.arrow)}</span>` : ""}
        <span class="badge">${safe(inGB.time, "--:--")}</span>
      </div>`;
      const bem = safe(inGB.bemerkung, "");
      const line3 = bem ? `<div style="margin-top:10px;color:rgba(231,238,247,.85);">${bem}</div>` : "";
      card.innerHTML = line1 + line2 + line3;
      return;
    }

    card.innerHTML = `<div style="font-size:28px;font-weight:900;">Frei</div>`;
    hint.textContent = "Nicht in Seelotsen und nicht in Gesamtbört gefunden.";
  }

  function renderGesamtboert() {
    const hint = $("gbHint");
    const tbody = $("gbTable").querySelector("tbody");
    tbody.innerHTML = "";

    const entries = state.webData?.gesamtboert?.entries || [];
    if (!entries.length) {
      hint.textContent = "Keine Gesamtbört-Daten in web_data.json.";
      return;
    }
    hint.textContent = `Einträge: ${entries.length} (Quelle: web_data.json).`;

    for (const e of entries) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safe(e.pos, "")}</td>
        <td>${safe(e.takt, "")}</td>
        <td>${safe(e.name, "")}</td>
        <td>${safe(e.arrow, "")}</td>
        <td>${safe(e.time, "")}</td>
        <td>${safe(e.bemerkung, "")}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  function renderSeelotsen() {
    const hint = $("slHint");
    const tbody = $("slTable").querySelector("tbody");
    tbody.innerHTML = "";

    const entries = state.webData?.seelotsen?.entries || [];
    if (!entries.length) {
      hint.textContent = "Keine Seelotsen-Daten in web_data.json.";
      return;
    }
    hint.textContent = `Einträge: ${entries.length} (Quelle: web_data.json).`;

    for (const e of entries) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safe(e.time, "")}</td>
        <td>${safe(e.name, "")}</td>
        <td>${safe(e.task, "")}</td>
        <td>${safe(e.vehicle, "")}</td>
        <td>${safe(e.location, "")}</td>
        <td>${safe(e.plus8, "")}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  function renderMeldungen() {
    // Diese Tabs hängen davon ab, ob du Meldungen überhaupt nach web/data/ lieferst.
    // Wenn du aegir_meldungen.json in web/data kopierst, können wir hier sofort sinnvoll rendern.
    const mkHint = $("mkHint");
    const mrHint = $("mrHint");
    const mkRaw = $("mkRaw");
    const mrRaw = $("mrRaw");

    const wd = state.webData || {};

    // Wenn du später in web_data.json z.B. wd.meldungen_kiel / wd.meldungen_ruesterbergen einfügst, greift das automatisch.
    const kiel = wd.meldungen_kiel || null;
    const rueb = wd.meldungen_ruesterbergen || null;

    if (!kiel) {
      mkHint.textContent = "Noch keine Meldungen Kiel im geladenen JSON. Lösung: aegir_meldungen.json nach web/data/ kopieren ODER in web_data.json integrieren.";
      mkRaw.textContent = "";
    } else {
      mkHint.textContent = "Meldungen Kiel aus JSON geladen.";
      mkRaw.textContent = JSON.stringify(kiel, null, 2);
    }

    if (!rueb) {
      mrHint.textContent = "Noch keine Meldungen Rüsterbergen im geladenen JSON. Lösung: Quelle nach web/data/ liefern ODER in web_data.json integrieren.";
      mrRaw.textContent = "";
    } else {
      mrHint.textContent = "Meldungen Rüsterbergen aus JSON geladen.";
      mrRaw.textContent = JSON.stringify(rueb, null, 2);
    }
  }

  function renderGraph() {
    const hint = $("graphHint");
    const canvas = $("graphCanvas");
    const ctx = canvas.getContext("2d");

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const hist = state.startWorkHistory;
    if (!hist) {
      hint.textContent = "Keine start_work_targets_history.json gefunden. (Pipeline kopiert sie zwar, aber falls nicht vorhanden: Graph bleibt leer.)";
      // kleines “leer” Label
      ctx.font = "24px system-ui";
      ctx.fillText("Kein Graph-Datensatz", 40, 70);
      return;
    }

    // Erwartung (typisch): Objekt mit Targets/History. Wir zeichnen “best effort” ohne harte Annahmen.
    // Wir versuchen: hist[pilotKey] => array von {ts, value} oder ähnlichem.
    const key = state.selectedPilotKey;
    const series = hist?.[key] || hist?.targets?.[key] || null;

    if (!series || !Array.isArray(series) || series.length < 2) {
      hint.textContent = "Graph-Datenformat nicht erkannt oder zu wenig Daten für den gewählten Lotsen.";
      ctx.font = "24px system-ui";
      ctx.fillText("Graph: keine Serie", 40, 70);
      return;
    }

    hint.textContent = `Graph: ${series.length} Punkte (best effort).`;

    // Map y: versuche value/minutes etc.
    const values = series.map(p => {
      const v = p.value ?? p.minutes ?? p.pos ?? p.y ?? null;
      return (typeof v === "number") ? v : null;
    }).filter(v => v !== null);

    if (values.length < 2) {
      ctx.font = "24px system-ui";
      ctx.fillText("Graph: Werte fehlen", 40, 70);
      return;
    }

    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const pad = 50;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;

    // axes
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, pad + h);
    ctx.lineTo(pad + w, pad + h);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // line
    const n = values.length;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = pad + (i / (n - 1)) * w;
      const norm = (values[i] - minV) / (maxV - minV || 1);
      const y = pad + (1 - norm) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // labels
    ctx.font = "18px system-ui";
    ctx.fillText(`min: ${minV}`, pad, pad - 14);
    ctx.fillText(`max: ${maxV}`, pad + 160, pad - 14);
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
        await loadAll();
        initPilotSelect();
        renderAll();
      } catch (err) {
        alert(String(err?.message || err));
      }
    });

    try {
      await loadAll();
      initPilotSelect();
      renderAll();
    } catch (err) {
      alert(String(err?.message || err));
    }
  }

  boot();
})();