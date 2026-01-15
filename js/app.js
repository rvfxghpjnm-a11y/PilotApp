/* =========================================================
   PilotApp – app.js
   Fokus: Short, Long & Graph STABIL + SICHTBAR
   ========================================================= */

import { renderWorkstartChart } from "./graph.js";

console.log("APP.JS LOADED");

// ---------------------------------------------------------
// STATE
// ---------------------------------------------------------
let boertFromDate = null;
let boertToDate   = null;
let currentPerson = null;
let currentView   = "short";
let currentHours  = 24;

// ---------------------------------------------------------
// DOM
// ---------------------------------------------------------
const personsEl = document.getElementById("persons");
const contentEl = document.getElementById("content");
const statusEl  = document.getElementById("status");
const boertRangeEl = document.getElementById("boertRange");
// ---------------------------------------------------------
// INIT
// ---------------------------------------------------------
init();

// Auto-Refresh alle 60 Sekunden
setInterval(() => {
  if (currentPerson) {
    renderView();
  }
}, 60000);

function init() {
  bindViewButtons();
  bindHourButtons();
  bindRefreshButton();
  loadPersons();
  bindBoertRangeButtons();
}

// ---------------------------------------------------------
// PERSONEN
// ---------------------------------------------------------
async function loadPersons() {
  try {
    const res = await fetch("data/workstart_index.json", { cache: "no-store" });
    const data = await res.json();
    console.log("DEBUG workstart_index:", data);
    // 🔑 Sicherstellen, dass key zu Dateinamen passt (nachname_vorname)
    data.persons.forEach(p => {
      if (!p.key && p.vorname && p.nachname) {
        p.key = `${p.nachname.toLowerCase()}_${p.vorname.toLowerCase()}`;
      }
    });
	
    personsEl.innerHTML = "";

    data.persons.forEach((p, idx) => {

      // 🔑 WICHTIG: key sicherstellen (Dateiname!)
      if (!p.key && p.vorname && p.nachname) {
        p.key = `${p.nachname.toLowerCase()}_${p.vorname.toLowerCase()}`;
      }

      const btn = document.createElement("button");
      btn.textContent = `${p.vorname} ${p.nachname}`;
      btn.onclick = (e) => selectPerson(p, e);

      if (idx === 0) {
        btn.classList.add("active");
        currentPerson = p;
      }

      personsEl.appendChild(btn);
    });
    
	
    const saved = loadAppState();

    if (saved) {
      const found = data.persons.find(p => p.key === saved.personKey);
      if (found) {
        currentPerson = found;
        currentView = saved.view || currentView;
      }
    }
	
	
    [...personsEl.children].forEach((btn, idx) => {
      btn.classList.toggle(
        "active",
        data.persons[idx].key === currentPerson?.key
      );
    });

    document.querySelectorAll("[data-view]").forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.view === currentView
      );
    });
	
	
	
    if (currentPerson) renderView();

  } catch (e) {
    personsEl.innerHTML = "<b>❌ Personen konnten nicht geladen werden</b>";
    console.error(e);
  }
}

function selectPerson(person, e) {
  currentPerson = person;
  saveAppState();
  [...personsEl.children].forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  renderView();
}

// ---------------------------------------------------------
// VIEW SWITCH
// ---------------------------------------------------------
function bindViewButtons() {
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("[data-view]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      saveAppState();
      renderView();
    };
  });
}






function renderView() {
  if (!currentPerson) {
    contentEl.textContent = "Bitte Person auswählen";
    return;
  }

  // Zeitfilter nur für Graph anzeigen
  const timeControls = document.getElementById("timeControls");
  if (currentView === "graph") {
    timeControls.style.display = "flex";
  } else {
    timeControls.style.display = "none";
  }
// Bört-Zeitraum nur im Bört-View anzeigen
  if (boertRangeEl) {
    boertRangeEl.style.display =
      currentView === "boert" ? "flex" : "none";
  }
  if (currentView === "short") loadShort();
  if (currentView === "long")  loadLong();
  if (currentView === "graph") loadGraph();
  if (currentView === "seelotse") loadSeelotse();
  if (currentView === "boert") loadBoert();
}

// ---------------------------------------------------------
// SHORT
// ---------------------------------------------------------
async function loadShort() {
  const res = await fetch(`data/${currentPerson.key}_short.json`, { cache: "no-store" });
  const data = await res.json();
  contentEl.innerHTML = `<pre>${data.short}</pre>`;
  statusEl.textContent = "Aktualisiert " + new Date().toLocaleTimeString("de-DE");
}

// ---------------------------------------------------------
// LONG
// ---------------------------------------------------------
async function loadLong() {
  const res = await fetch(`data/${currentPerson.key}_long.json`, { cache: "no-store" });
  const data = await res.json();
  contentEl.innerHTML = `<pre>${data.long}</pre>`;
  statusEl.textContent = "Aktualisiert " + new Date().toLocaleTimeString("de-DE");
}

// ---------------------------------------------------------
// GRAPH
// ---------------------------------------------------------
async function loadGraph() {
  contentEl.innerHTML = `
    <div style="padding:8px; font-size:13px; opacity:.8">
      Lade Graph für <b>${currentPerson.key}</b><br>
      Datei: <code>${currentPerson.file}</code>
    </div>
    <canvas id="workstartChart" style="height:520px"></canvas>
  `;

  try {
    const res = await fetch(`data/${currentPerson.file}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Fetch fehlgeschlagen");

    const data = await res.json();

    if (!Array.isArray(data.entries) || data.entries.length === 0) {
      contentEl.insertAdjacentHTML(
        "afterbegin",
        "<div style='color:#f87171'>❌ Keine Einträge in workstart_history</div>"
      );
      return;
    }

    renderWorkstartChart(data.entries, currentHours);
    statusEl.textContent = "Aktualisiert " + new Date().toLocaleTimeString("de-DE");

  } catch (err) {
    contentEl.insertAdjacentHTML(
      "afterbegin",
      `<div style="color:#f87171">❌ Graph-Fehler: ${err.message}</div>`
    );
    console.error(err);
  }
}

// ---------------------------------------------------------
// ZEITFILTER
// ---------------------------------------------------------
function bindHourButtons() {
  document.querySelectorAll("[data-hours]").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("[data-hours]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentHours = Number(btn.dataset.hours);
      if (currentView === "graph") loadGraph();
    };
  });
}

function bindRefreshButton() {
  const refreshBtn = document.getElementById("refreshNow");
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      renderView();
    };
  }
}



function bindBoertRangeButtons() {
  const fromEl = document.getElementById("boertFrom");
  const toEl   = document.getElementById("boertTo");
  const apply  = document.getElementById("boertApply");
  const reset  = document.getElementById("boertReset");

  if (!apply || !reset) return;

  apply.onclick = () => {
    boertFromDate = fromEl.value ? new Date(fromEl.value) : null;
    boertToDate   = toEl.value   ? new Date(toEl.value)   : null;
    loadBoert(); // 🔑 Filter anwenden
  };

  reset.onclick = () => {
    fromEl.value = "";
    toEl.value   = "";
    boertFromDate = null;
    boertToDate   = null;
    loadBoert(); // 🔑 zurück zur Gesamtansicht
  };
}
// ---------------------------------------------------------
// SEELOTSE VIEW
// ---------------------------------------------------------
async function loadSeelotse() {
  try {
    const res = await fetch(`data/${currentPerson.key}_seelotse.json`, { cache: "no-store" });
    const data = await res.json();
    
    let html = '<div style="max-width: 1200px;">';
    
    // Header Section
    html += '<div class="view-header">';
    html += '<div class="view-title">Seelotse</div>';
    html += '<div class="badges-row">';
    
    // Status Badge
    if (data.status === "in_seelotse") {
      html += '<span class="badge success">✓ In Seelotse</span>';
    } else {
      html += '<span class="badge gray">Nicht in Seelotse</span>';
    }
    
    // Gruppen Badges
    if (data.gruppen) {
      html += `<span class="badge info">Kanal: ${data.gruppen.kanal}</span>`;
      html += `<span class="badge info">Wach: ${data.gruppen.wach}</span>`;
      html += `<span class="badge info">See: ${data.gruppen.see}</span>`;
    }
    
    html += '</div>';
    html += `<div class="meta-info">Generiert: ${formatDateTime(data.generated_at)}</div>`;
    html += '</div>';
    
    // Lotsen Liste
    if (data.lotsen && data.lotsen.length > 0) {
      html += '<div class="section-header">Lotsen</div>';
      
      data.lotsen.forEach((lotse, idx) => {
        const targetClass = lotse.is_target ? ' target' : '';
        html += `<div class="lotse-item${targetClass}" data-lotse="${idx}">`;
        html += '<div class="lotse-header">';
        html += `<div class="lotse-nr">${lotse.nr || '—'}</div>`;
        html += `<div class="lotse-name">${escapeHtml(lotse.name)}</div>`;
        html += `<div class="lotse-info">${escapeHtml(lotse.aufgabe || '')}</div>`;
        html += `<div class="lotse-info">${escapeHtml(lotse.fahrzeug || '')}</div>`;
        html += `<div class="lotse-info">${escapeHtml(lotse.route || '')}</div>`;
        html += '<span class="expand-icon">▼</span>';
        html += '</div>';
        
        // Details (expandable)
        html += '<div class="lotse-details">';
        if (lotse.times) {
          html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-top: 8px;">';
          if (lotse.times.eta_schleuse) {
            html += `<div class="detail-row"><div class="detail-label">ETA Schleuse:</div><div class="detail-value">${lotse.times.eta_schleuse}</div></div>`;
          }
          if (lotse.times.eta_rueb) {
            html += `<div class="detail-row"><div class="detail-label">ETA Rüb:</div><div class="detail-value">${lotse.times.eta_rueb}</div></div>`;
          }
          if (lotse.times.delta_rueb_schleuse) {
            html += `<div class="detail-row"><div class="detail-label">Δ Rüb-Schleuse:</div><div class="detail-value">${lotse.times.delta_rueb_schleuse}</div></div>`;
          }
          if (lotse.times.delta_start_rueb) {
            html += `<div class="detail-row"><div class="detail-label">Δ Start-Rüb:</div><div class="detail-value">${lotse.times.delta_start_rueb}</div></div>`;
          }
          html += '</div>';
        } else {
          html += '<div class="detail-row" style="color: #9ca3af;">Keine Zeitinformationen verfügbar</div>';
        }
        if (lotse.time) {
          html += `<div class="detail-row"><div class="detail-label">Zeit:</div><div class="detail-value">${escapeHtml(lotse.time)}</div></div>`;
        }
        html += '</div>';
        
        html += '</div>';
      });
    }
    
    // Rüsterbergen
    if (data.ruesterbergen && data.ruesterbergen.length > 0) {
      html += '<div class="section-header">Rüsterbergen - Kommende Schiffe</div>';
      html += '<div class="ruesterbergen-list">';
      
      data.ruesterbergen.forEach(ship => {
        html += '<div class="ruesterbergen-item">';
        html += `<div class="ruesterbergen-eta">${escapeHtml(ship.eta_rueb || '—')}</div>`;
        html += `<div class="ruesterbergen-ship">${escapeHtml(ship.ship || '—')}</div>`;
        html += `<div class="ruesterbergen-gruppe">Q${escapeHtml(ship.q_gruppe || '—')}</div>`;
        html += `<div class="ruesterbergen-route">${escapeHtml(ship.route || '—')}</div>`;
        html += '</div>';
      });
      
      html += '</div>';
    }
    
    html += '</div>';
    
    contentEl.innerHTML = html;
    
    // Add click handlers for expandable items
    document.querySelectorAll('.lotse-item').forEach(item => {
      item.querySelector('.lotse-header').addEventListener('click', () => {
        item.classList.toggle('expanded');
      });
    });
    
    statusEl.textContent = "Aktualisiert " + new Date().toLocaleTimeString("de-DE");
    
  } catch (err) {
    contentEl.innerHTML = `<div class="error">❌ Seelotse-Fehler: ${err.message}</div>`;
    console.error(err);
  }
}

// ---------------------------------------------------------
// BÖRT VIEW
// ---------------------------------------------------------
async function loadBoert() {
  try {
    const res = await fetch(`data/${currentPerson.key}_boert.json`, { cache: "no-store" });
    const data = await res.json();
    

    let filteredLotsen = data.lotsen || [];

    const filterActive = Boolean(boertFromDate || boertToDate);

    if (filterActive) {
      const fromTs = boertFromDate ? boertFromDate.getTime() : null;
      const toTs   = boertToDate   ? boertToDate.getTime()   : null;

      filteredLotsen = filteredLotsen.filter(lotse => {
        if (!lotse.times) return false;

        return Object.values(lotse.times).some(val => {
          if (!val) return false;

          const d = parseLotseTime(val);
          if (!d) return false;

          const ts = d.getTime();

          if (fromTs && ts < fromTs) return false;
          if (toTs   && ts > toTs)   return false;

          return true;
        });
      });
    }

	
    let filteredTauschpartner = Array.isArray(data.tauschpartner)
      ? data.tauschpartner.filter(tp =>
          filteredLotsen.some(l =>
            l.pos === tp.pos
          )
        )
      : [];
	
	
    const totalLotsen = (data.lotsen || []).length;
    const shownLotsen = filteredLotsen.length;
    
	
    let html = '<div style="max-width: 1200px;">';
    
    // Header with Status
    html += '<div class="view-header">';
    html += '<div class="view-title">Bört</div>';
    html += '<div class="badges-row">';
    html += `<div class="meta-info">
      ${filterActive ? "🔎 Filter aktiv – " : ""}
      Anzeige ${shownLotsen} von ${totalLotsen} Lotsen
    </div>`;
	
	
    if (data.status === "boert") {
      html += '<span class="badge success">✓ Im Bört</span>';
    } else {
      html += '<span class="badge gray">Nicht im Bört</span>';
    }
    
    html += '</div>';
    html += `<div class="meta-info">Generiert: ${formatDateTime(data.generated_at)}</div>`;
    html += '</div>';
    
    // Person Card (Always visible)
    if (data.person || data.target) {
      const p = data.person || data.target;
      html += '<div class="person-card">';
      html += `<div class="person-name">${escapeHtml(p.vorname)} ${escapeHtml(p.nachname)}</div>`;
      html += `<div class="person-pos">Position ${p.pos}</div>`;
      if (p.takt) {
        html += `<div class="person-takt">Takt: ${escapeHtml(p.takt)}</div>`;
      }
      
      // Times
      if (p.times) {
        html += '<div class="times-grid">';
        if (p.times.from_meldung) {
          html += `<div class="time-item"><div class="time-label">von Meldung</div><div class="time-value">${escapeHtml(p.times.from_meldung)}</div></div>`;
        }
        if (p.times.calc_div2) {
          html += `<div class="time-item"><div class="time-label">calc div2</div><div class="time-value">${escapeHtml(p.times.calc_div2)}</div></div>`;
        }
        if (p.times.calc_div3) {
          html += `<div class="time-item"><div class="time-label">calc div3</div><div class="time-value">${escapeHtml(p.times.calc_div3)}</div></div>`;
        }
        if (p.times.from_meldung_alt) {
          html += `<div class="time-item"><div class="time-label">von Meldung alt</div><div class="time-value">${escapeHtml(p.times.from_meldung_alt)}</div></div>`;
        }
        html += '</div>';
      }
      
      if (p.bemerkung) {
        html += `<div style="margin-top: 12px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 14px;">📝 ${escapeHtml(p.bemerkung)}</div>`;
      }
      
      html += '</div>';
    }
    
    // Tauschpartner
    if (filteredTauschpartner.length > 0) {
      html += '<div class="section-header">Tauschpartner</div>';
      html += '<div class="tauschpartner-grid">';

      filteredTauschpartner.forEach(tp => {
        let cardClass = 'tauschpartner-card';
        if (tp.verguetung) {
          cardClass += ' verguetung';
        } else if (tp.arrow === '↑' || tp.richtung === '↑') {
          cardClass += ' arrow-up';
        } else if (tp.arrow === '↓' || tp.richtung === '↓') {
          cardClass += ' arrow-down';
        }

        html += `<div class="${cardClass}">`;
        html += `<div class="tauschpartner-name">${escapeHtml(tp.vorname)} ${escapeHtml(tp.nachname)}</div>`;
        html += `<div class="tauschpartner-info">Pos ${tp.pos}</div>`;
        html += '</div>';
      });

      html += '</div>';
    } else {
      html += '<div class="section-header">Tauschpartner</div>';
      html += '<div style="opacity:.6; padding:8px">Keine Tauschpartner gefunden</div>';
    }

	
    
    // Lotsen Liste (expandable)
    if (filteredLotsen.length > 0) {
      html += '<div class="section-header">Alle Lotsen</div>';
      
      filteredLotsen.forEach((lotse, idx) => {
        const targetClass = lotse.is_target ? ' target' : '';
        html += `<div class="lotse-item${targetClass}" data-lotse="${idx}">`;
        html += '<div class="lotse-header">';
        html += `<div class="lotse-nr">${lotse.pos}</div>`;
        html += `<div class="lotse-name">${escapeHtml(lotse.vorname)} ${escapeHtml(lotse.nachname)}</div>`;
        
        // Arrow
        if (lotse.arrow) {
          const arrowClass = lotse.arrow.includes('↑') ? 'arrow-up' : (lotse.arrow.includes('↓') ? 'arrow-down' : '');
          html += `<div class="lotse-info"><span class="${arrowClass}">${escapeHtml(lotse.arrow)}</span></div>`;
        }
        
        // From Meldung time
        if (lotse.times && lotse.times.from_meldung) {
          html += `<div class="lotse-info">${escapeHtml(lotse.times.from_meldung)}</div>`;
        }
        
        // Verguetung
        if (lotse.verguetung) {
          html += '<div class="lotse-info"><span class="verguetung">$$</span></div>';
        }
        
        html += '<span class="expand-icon">▼</span>';
        html += '</div>';
        
        // Details (expandable)
        html += '<div class="lotse-details">';
        if (lotse.times) {
          html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-top: 8px;">';
          if (lotse.times.from_meldung) {
            html += `<div class="detail-row"><div class="detail-label">von Meldung:</div><div class="detail-value">${escapeHtml(lotse.times.from_meldung)}</div></div>`;
          }
          if (lotse.times.calc_div2) {
            html += `<div class="detail-row"><div class="detail-label">calc div2:</div><div class="detail-value">${escapeHtml(lotse.times.calc_div2)}</div></div>`;
          }
          if (lotse.times.calc_div3) {
            html += `<div class="detail-row"><div class="detail-label">calc div3:</div><div class="detail-value">${escapeHtml(lotse.times.calc_div3)}</div></div>`;
          }
          if (lotse.times.from_meldung_alt) {
            html += `<div class="detail-row"><div class="detail-label">von Meldung alt:</div><div class="detail-value">${escapeHtml(lotse.times.from_meldung_alt)}</div></div>`;
          }
          html += '</div>';
        }
        if (lotse.bemerkung) {
          html += `<div class="detail-row"><div class="detail-label">Bemerkung:</div><div class="detail-value">${escapeHtml(lotse.bemerkung)}</div></div>`;
        }
        html += '</div>';
        
        html += '</div>';
      });
    }
    
    html += '</div>';
    
    contentEl.innerHTML = html;
    
    // Add click handlers for expandable items
    document.querySelectorAll('.lotse-item').forEach(item => {
      item.querySelector('.lotse-header').addEventListener('click', () => {
        item.classList.toggle('expanded');
      });
    });
    
    statusEl.textContent = "Aktualisiert " + new Date().toLocaleTimeString("de-DE");
    
  } catch (err) {
    contentEl.innerHTML = `<div class="error">❌ Bört-Fehler: ${err.message}</div>`;
    console.error(err);
  }
}

// ---------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('de-DE');
  } catch {
    return dateStr;
  }
}


function getLotseRelevantDate(lotse) {
  if (!lotse || !lotse.times) return null;

  const val =
    lotse.times.from_meldung_alt ||
    lotse.times.from_meldung ||
    lotse.times.calc_div2 ||
    lotse.times.calc_div3;

  if (!val) return null;

  // Erwartet z.B. "Mi23:00"
  const m = val.match(/^([A-Z][a-z])(\d{2}):(\d{2})$/);
  if (!m) return null;

  const wdMap = { Mo:1, Di:2, Mi:3, Do:4, Fr:5, Sa:6, So:0 };
  const wdTarget = wdMap[m[1]];
  const hh = Number(m[2]);
  const mm = Number(m[3]);

  const now = new Date();
  const d = new Date(now);

  // auf richtigen Wochentag springen
  const diff =
    (wdTarget - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hh, mm, 0, 0);

  // falls Zeit in Zukunft liegt, aber logisch gestern war → zurück
  if (d.getTime() - now.getTime() > 12 * 3600 * 1000) {
    d.setDate(d.getDate() - 7);
  }

  return d;
}


function parseLotseTime(val) {
  const m = val.match(/^([A-Z][a-z])(\d{2}):(\d{2})$/);
  if (!m) return null;

  const wdMap = { Mo:1, Di:2, Mi:3, Do:4, Fr:5, Sa:6, So:0 };
  const wdTarget = wdMap[m[1]];
  if (wdTarget === undefined) return null;

  const hh = Number(m[2]);
  const mm = Number(m[3]);

  const now = new Date();
  const d = new Date(now);

  const diff = (wdTarget - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hh, mm, 0, 0);

  // ❌ KEIN automatisches Zurückspringen um 7 Tage
// Zeiten dürfen bis +36h in der Zukunft liegen
  if (d.getTime() - now.getTime() > 36 * 3600 * 1000) {
    return null;
  }
  

  return d;
}


// ---------------------------------------------------------
// STATE PERSISTENCE (localStorage)
// ---------------------------------------------------------
function saveAppState() {
  if (!currentPerson) return;

  localStorage.setItem("pilotapp_state", JSON.stringify({
    personKey: currentPerson.key,
    view: currentView
  }));
}

function loadAppState() {
  try {
    const raw = localStorage.getItem("pilotapp_state");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}