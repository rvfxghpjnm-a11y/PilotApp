/* =========================================================
   PilotApp – app.js
   Fokus: Short, Long & Graph STABIL + SICHTBAR
   ========================================================= */

import { renderWorkstartChart } from "./graph.js";

console.log("APP.JS LOADED");

// ---------------------------------------------------------
// STATE
// ---------------------------------------------------------
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
}

// ---------------------------------------------------------
// PERSONEN
// ---------------------------------------------------------
async function loadPersons() {
  try {
    const res = await fetch("data/workstart_index.json", { cache: "no-store" });
    const data = await res.json();

    personsEl.innerHTML = "";

    data.persons.forEach((p, idx) => {
      const btn = document.createElement("button");
      btn.textContent = `${p.vorname} ${p.nachname}`;
      btn.onclick = (e) => selectPerson(p, e);

      if (idx === 0) {
        btn.classList.add("active");
        currentPerson = p;
      }

      personsEl.appendChild(btn);
    });

    if (currentPerson) renderView();

  } catch (e) {
    personsEl.innerHTML = "<b>❌ Personen konnten nicht geladen werden</b>";
    console.error(e);
  }
}

function selectPerson(person, e) {
  currentPerson = person;
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
    const fromInput = document.getElementById("boertFrom")?.value;
    const toInput   = document.getElementById("boertTo")?.value;

    const fromDate = fromInput ? new Date(fromInput) : null;
    const toDate   = toInput   ? new Date(toInput)   : null;
    
    let filteredLotsen = data.lotsen || [];

    if (fromDate || toDate) {
      filteredLotsen = filteredLotsen.filter(lotse => {
        const d = getLotseRelevantDate(lotse);
        if (!d) return false;

        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;

        return true;
      });
    }
	
	
	
    let html = '<div style="max-width: 1200px;">';
    
    // Header with Status
    html += '<div class="view-header">';
    html += '<div class="view-title">Bört</div>';
    html += '<div class="badges-row">';
    
    if (data.status === "boert") {
      html += '<span class="badge success">✓ Im Bört</span>';
    } else {
      html += '<span class="badge gray">Nicht im Bört</span>';
    }
    
    html += '</div>';
    html += `<div class="meta-info">Generiert: ${formatDateTime(data.generated_at)}</div>`;
    html += '</div>';
    
    // Person Card (Always visible)
    if (data.person) {
      const p = data.person;
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
    if (data.tauschpartner && data.tauschpartner.length > 0) {
      html += '<div class="section-header">Tauschpartner</div>';
      html += '<div class="tauschpartner-grid">';
      
      data.tauschpartner.forEach(tp => {
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
        html += '<div class="tauschpartner-info">';
        html += `Pos ${tp.pos}`;
        if (tp.arrow) {
          const arrowClass = tp.arrow.includes('↑') ? 'arrow-up' : (tp.arrow.includes('↓') ? 'arrow-down' : '');
          html += ` <span class="${arrowClass}">${escapeHtml(tp.arrow)}</span>`;
        }
        if (tp.verguetung) {
          html += ' <span class="verguetung">$$</span>';
        }
        html += '</div>';
        
        // Times
        if (tp.times) {
          html += '<div style="margin-top: 8px; font-size: 13px;">';
          if (tp.times.from_meldung) {
            html += `<div style="color: #9ca3af;">von Meldung: <span style="color: #e6edf3;">${escapeHtml(tp.times.from_meldung)}</span></div>`;
          }
          if (tp.times.calc_div2) {
            html += `<div style="color: #9ca3af;">calc div2: <span style="color: #e6edf3;">${escapeHtml(tp.times.calc_div2)}</span></div>`;
          }
          html += '</div>';
        }
        
        if (tp.bemerkung) {
          html += `<div style="margin-top: 8px; font-size: 12px; color: #fbbf24;">📝 ${escapeHtml(tp.bemerkung)}</div>`;
        }
        
        html += '</div>';
      });
      
      html += '</div>';
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
    lotse.times.calc_div2;

  if (!val) return null;

  // erwartet Format wie "Mo10:30" oder "Di13:45"
  const m = val.match(/(\d{2}:\d{2})$/);
  if (!m) return null;

  const [hh, mm] = m[1].split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);

  return d;
}


const boertResetBtn = document.getElementById("boertReset");
if (boertResetBtn) {
  boertResetBtn.onclick = () => {
    const from = document.getElementById("boertFrom");
    const to   = document.getElementById("boertTo");

    if (from) from.value = "";
    if (to)   to.value = "";

    if (currentView === "boert") {
      loadBoert();
    }
  };
}