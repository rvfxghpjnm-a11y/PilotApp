/* PilotApp v4 – Web UI (B: modern) */

const DATA_DIR = "data";
const REFRESH_MS = 60_000; // Auto-Refresh
const LS_KEYS = {
  lotse: "pilotappv4_last_lotse",
  view:  "pilotappv4_last_view",
};

const el = (id) => document.getElementById(id);

function bust(url){
  const t = Date.now();
  return `${url}?t=${t}`;
}

async function fetchJSON(path){
  const res = await fetch(bust(path), { cache: "no-store" });
  if(!res.ok) throw new Error(`${res.status} ${res.statusText} – ${path}`);
  return await res.json();
}

function setStatus(text){
  el("statusLine").textContent = text;
}

function saveSelection(){
  localStorage.setItem(LS_KEYS.lotse, el("lotseSelect").value);
  localStorage.setItem(LS_KEYS.view, el("viewSelect").value);
}

function loadSelection(){
  const lotse = localStorage.getItem(LS_KEYS.lotse);
  const view  = localStorage.getItem(LS_KEYS.view);
  return { lotse, view };
}

/* ---------- Datenquellen (konkret) ----------
   - Ziellotsen-Dropdown: data/targets.json   (wird von start_all erzeugt/kopiert)
   - Gesamtbört:          data/merged_<nachname>_<vorname>.json
   - Seelotsen:           data/aegir_seelotsen.json
   - Kanal:               data/channel_master_final.json
   - Meldungen Kiel:      data/aegir_meldungen.json
   - Graph:               data/start_work_history_targets.json
------------------------------------------------ */

function renderCard(title, innerHtml){
  return `<section class="card">
    <h2>${title}</h2>
    ${innerHtml}
  </section>`;
}

function fmtIso(iso){
  if(!iso) return "";
  // iso kann "2026-02-07T19:43:39+01:00" sein
  // wir zeigen HH:MM
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : iso;
}

function hmBadge(hm){
  if(!hm) return `<span class="badge warn">–</span>`;
  // hm kann "-00:27" sein
  const neg = hm.startsWith("-");
  const cls = neg ? "bad" : "good";
  return `<span class="badge ${cls} mono">${hm}</span>`;
}

function table(headers, rowsHtml){
  const thead = headers.map(h => `<th>${h}</th>`).join("");
  return `<div class="tableWrap"><table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table></div>`;
}

/* -------- Views -------- */

async function viewKanal(){
  const data = await fetchJSON(`${DATA_DIR}/channel_master_final.json`);
  const ships = data.ships || data.channel || data.ships || [];
  const rows = ships.map(s => {
    const sog = s?.track?.sog ?? "";
    return `<tr>
      <td class="mono">${s.name ?? ""}</td>
      <td class="mono">${fmtIso(s.rueb_eta) || "–"}</td>
      <td class="mono">${fmtIso(s.lock_eta) || "–"}</td>
      <td>${hmBadge(s.delta_first_rueb_hm)}</td>
      <td>${hmBadge(s.delta_rueb_lock_hm)}</td>
      <td class="mono">${sog}</td>
    </tr>`;
  }).join("");

  const html = table(
    ["Schiff", "RÜB", "Schleuse", "Δ first→RÜB", "Δ RÜB→Schl", "SOG"],
    rows || `<tr><td colspan="6" class="muted">keine Daten</td></tr>`
  );

  return renderCard(
    `Kanal · ${data.generated_at ? data.generated_at.replace("T"," ").slice(0,16) : ""}`,
    html
  );
}

async function viewGesamtboert(target){
  // target.file ist z.B. "merged_konietzka_stefan.json"
  const data = await fetchJSON(`${DATA_DIR}/${target.file}`);
  const entries = data.entries || data.gesamtboert || data.items || [];
  const rows = entries.map(e => {
    const name = e.nachname || e.name || "";
    const takt = e.takt ?? "";
    const zeit = e.zeit ? String(e.zeit).replace("  CET", "") : "";
    const bemerkung = e.bemerkung ?? "";
    return `<tr>
      <td class="mono">${e.pos ?? ""}</td>
      <td>${name}</td>
      <td class="mono">${takt}</td>
      <td class="mono">${zeit}</td>
      <td>${bemerkung}</td>
    </tr>`;
  }).join("");

  const html = table(
    ["Pos", "Name", "Takt", "Zeit", "Bemerkung"],
    rows || `<tr><td colspan="5" class="muted">keine Daten</td></tr>`
  );

  return renderCard(
    `Gesamtbört · ${data.generated_at ? data.generated_at.replace("T"," ").slice(0,16) : ""}`,
    html
  );
}

async function viewSeelotsen(){
  const data = await fetchJSON(`${DATA_DIR}/aegir_seelotsen.json`);
  const entries = data.entries || data.seelotsen || data.items || [];
  const lis = entries.map(e => {
    // wenn deine Struktur anders ist, sieht man hier direkt was ankommt – ohne zu zerlegen
    const t = e.time || e.uhrzeit || e.abt || e.zeit || "";
    const n = e.nachname || e.name || "";
    const extra = [e.fahrzeug, e.ort, e.aufgabe].filter(Boolean).join(" · ");
    return `<li><span class="mono">${t}</span> <b>${n}</b> <span class="muted">${extra}</span></li>`;
  }).join("");

  return renderCard(
    `Abgeteilte Seelotsen · ${data.generated_at ? data.generated_at.replace("T"," ").slice(0,16) : ""}`,
    `<ul class="list">${lis || `<li class="muted">keine Daten</li>`}</ul>`
  );
}

async function viewMeldungenKiel(){
  const data = await fetchJSON(`${DATA_DIR}/aegir_meldungen.json`);
  const entries = data.entries || data.meldungen || data.items || [];
  const lis = entries.map(e => {
    const t = e.time || e.uhrzeit || e.zeit || "";
    const txt = e.text || e.raw || JSON.stringify(e);
    return `<li><span class="mono">${t}</span> <span>${txt}</span></li>`;
  }).join("");

  return renderCard(
    `Meldungen Kiel · ${data.generated_at ? data.generated_at.replace("T"," ").slice(0,16) : ""}`,
    `<ul class="list">${lis || `<li class="muted">keine Daten</li>`}</ul>`
  );
}

async function viewGraph(){
  // Das ist bewusst sauber vorbereitet, aber du wolltest Graph „später“:
  // Hier zeigen wir schon mal, ob die History-Datei existiert und Daten enthält.
  try{
    const data = await fetchJSON(`${DATA_DIR}/start_work_history_targets.json`);
    const hist = data.history || [];
    const last = hist.length ? hist[hist.length-1] : null;
    const msg = last
      ? `<div class="muted">Letzter Punkt: <span class="mono">${last.timestamp}</span> (Targets: ${last.targets?.length ?? 0})</div>
         <div class="muted">Graph-Rendering bauen wir als nächstes (Canvas/SVG).</div>`
      : `<div class="muted">History-Datei da, aber leer.</div>`;
    return renderCard("Work Start Graph", msg);
  }catch(e){
    return renderCard("Work Start Graph", `<div class="muted">Noch keine History-Datei im Web: <span class="mono">data/start_work_history_targets.json</span></div>`);
  }
}

/* -------- Targets / Dropdown -------- */

async function loadTargets(){
  // Datei soll vom Pipeline-Runner erzeugt werden:
  // web/data/targets.json
  const data = await fetchJSON(`${DATA_DIR}/targets.json`);
  // erwartet: { "targets":[ {"label":"KONIETZKA","file":"merged_konietzka_stefan.json"}, ... ] }
  if(!data.targets || !Array.isArray(data.targets)) throw new Error("targets.json ohne 'targets'[]");
  return data.targets;
}

function fillLotseSelect(targets){
  const sel = el("lotseSelect");
  sel.innerHTML = targets.map(t => `<option value="${t.label}">${t.label}</option>`).join("");
  const saved = loadSelection().lotse;
  if(saved && targets.some(t => t.label === saved)) sel.value = saved;
  else sel.value = targets[0]?.label ?? "";
}

async function render(){
  saveSelection();

  const view = el("viewSelect").value;
  const lotseLabel = el("lotseSelect").value;

  setStatus("lädt…");
  const content = el("content");

  try{
    const targets = await loadTargets();
    const target = targets.find(t => t.label === lotseLabel) || targets[0];

    let html = "";
    if(view === "kanal") html = await viewKanal();
    else if(view === "gesamtboert") html = await viewGesamtboert(target);
    else if(view === "seelotsen") html = await viewSeelotsen();
    else if(view === "graph") html = await viewGraph();
    else if(view === "meldungen_kiel") html = await viewMeldungenKiel();
    else html = renderCard("Unbekannte Ansicht", `<div class="muted">${view}</div>`);

    content.innerHTML = html;

    const ts = new Date().toLocaleTimeString("de-DE", {hour:"2-digit", minute:"2-digit"});
    setStatus(`aktualisiert ${ts}`);
  }catch(err){
    content.innerHTML = renderCard("Fehler", `<div class="mono">${String(err.message || err)}</div>`);
    setStatus("Fehler");
  }
}

async function init(){
  // Targets zuerst – weil LotseSelect nur Ziellotsen zeigen soll
  try{
    const targets = await loadTargets();
    fillLotseSelect(targets);
  }catch(e){
    // Ohne targets.json bist du blind – dann ist klar warum Dropdown „zu viele“ zeigt.
    el("content").innerHTML = renderCard(
      "targets.json fehlt",
      `<div class="muted">
        Lege <span class="mono">web/data/targets.json</span> an (wird gleich von start_all erzeugt, siehe unten).
      </div>`
    );
  }

  // saved view
  const savedView = loadSelection().view;
  if(savedView) el("viewSelect").value = savedView;

  el("lotseSelect").addEventListener("change", render);
  el("viewSelect").addEventListener("change", render);
  el("refreshBtn").addEventListener("click", render);

  await render();
  setInterval(render, REFRESH_MS);
}

init();