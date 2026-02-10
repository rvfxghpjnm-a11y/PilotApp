/* PilotApp v4 Web – app.js
   - Auto refresh
   - Remembers last selected lotse + view
   - iPad friendly rendering
   - Kanal: filter + sort + click row => modal with full JSON
*/

const DATA_BASE = "data"; // served from /PilotApp/
const FILES = {
  web: `${DATA_BASE}/web_data.json`,
  kanal: `${DATA_BASE}/channel_master_final.json`,
  graph: `${DATA_BASE}/start_work_targets_history.json`,

  // optional (only works if you also copy these into web/data/)
  gesamtboert: `${DATA_BASE}/aegir_gesamtboert.json`,
  seelotsen: `${DATA_BASE}/aegir_seelotsen.json`,
  meldungen: `${DATA_BASE}/aegir_meldungen.json`,
};

const LS_KEYS = {
  view: "pilotapp_view",
  lotse: "pilotapp_lotse",
  kanalFilter: "pilotapp_kanal_filter",
  kanalSort: "pilotapp_kanal_sort",
};

const REFRESH_MS = 30_000; // 30s; adjust later if you want
let refreshTimer = null;

let CACHE = {
  web: null,
  kanal: null,
  graph: null,
  gesamtboert: null,
  seelotsen: null,
  meldungen: null,
};

function $(id){ return document.getElementById(id); }

function titleCaseNachname(nach){
  if(!nach) return "";
  const lower = String(nach).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function bust(url){
  const t = Date.now();
  return `${url}${url.includes("?") ? "&" : "?"}t=${t}`;
}

async function fetchJson(url){
  const res = await fetch(bust(url), { cache: "no-store" });
  if(!res.ok) throw new Error(`${res.status} ${res.statusText} – ${url}`);
  return await res.json();
}

function fmtIso(iso){
  if(!iso) return "";
  try{
    const d = new Date(iso);
    // de-DE time format
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const hh = String(d.getHours()).padStart(2,"0");
    const mi = String(d.getMinutes()).padStart(2,"0");
    return `${dd}.${mm} ${hh}:${mi}`;
  }catch(_){
    return String(iso);
  }
}

function badge(text, cls="info"){
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setLoading(text="lade…"){
  $("content").innerHTML = `<div class="card"><div class="cardHeader">
    <h2>${escapeHtml(text)}</h2>
    <div class="metaLine muted">PilotApp v4</div>
  </div></div>`;
}

/* ---------------- Modal ---------------- */
function ensureModal(){
  if(document.getElementById("modalBackdrop")) return;

  const el = document.createElement("div");
  el.id = "modalBackdrop";
  el.className = "modalBackdrop";
  el.innerHTML = `
    <div class="modal">
      <div class="modalHeader">
        <div class="modalTitle" id="modalTitle">Details</div>
        <button class="btn" id="modalClose">Schließen</button>
      </div>
      <div class="modalBody">
        <pre class="mono" id="modalPre"></pre>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  const close = () => { el.style.display = "none"; };
  document.getElementById("modalClose").addEventListener("click", close);
  el.addEventListener("click", (ev) => {
    if(ev.target === el) close();
  });
}

function openModal(title, obj){
  ensureModal();
  const el = document.getElementById("modalBackdrop");
  document.getElementById("modalTitle").textContent = title || "Details";
  document.getElementById("modalPre").textContent = JSON.stringify(obj, null, 2);
  el.style.display = "flex";
}

/* ---------------- Data bootstrap ---------------- */
async function loadCore(){
  // web_data is the “index” for dropdown etc.
  CACHE.web = await fetchJson(FILES.web);
  CACHE.kanal = await fetchJson(FILES.kanal);
  CACHE.graph = await fetchJson(FILES.graph);
}

function buildLotseDropdown(){
  const lotseSelect = $("lotseSelect");
  lotseSelect.innerHTML = "";

  // Ziellotsen kommen aus web_data.json -> targets[]
  // Erwartet: { targets: [ { vorname, nachname, key? } ... ] }
  const targets = CACHE.web?.targets || [];
  if(!Array.isArray(targets) || targets.length === 0){
    lotseSelect.innerHTML = `<option value="">(keine Ziellotsen)</option>`;
    return;
  }

  for(const t of targets){
    const nach = titleCaseNachname(t.nachname || t.name || t.key || "");
    const key = (t.key || t.nachname || nach).toUpperCase();
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = nach; // wie gewünscht: Konietzka
    lotseSelect.appendChild(opt);
  }

  const saved = localStorage.getItem(LS_KEYS.lotse);
  if(saved && [...lotseSelect.options].some(o => o.value === saved)){
    lotseSelect.value = saved;
  }else{
    lotseSelect.value = lotseSelect.options[0]?.value || "";
    localStorage.setItem(LS_KEYS.lotse, lotseSelect.value);
  }
}

function initControls(){
  const viewSelect = $("viewSelect");
  const lotseSelect = $("lotseSelect");
  const refreshBtn = $("refreshBtn");

  // restore view
  const savedView = localStorage.getItem(LS_KEYS.view);
  if(savedView && [...viewSelect.options].some(o => o.value === savedView)){
    viewSelect.value = savedView;
  }

  viewSelect.addEventListener("change", () => {
    localStorage.setItem(LS_KEYS.view, viewSelect.value);
    render();
  });

  lotseSelect.addEventListener("change", () => {
    localStorage.setItem(LS_KEYS.lotse, lotseSelect.value);
    render(); // affects graph & personal views later
  });

  refreshBtn.addEventListener("click", async () => {
    await refreshAll();
  });
}

async function refreshAll(){
  setLoading("aktualisiere…");
  try{
    await loadCore();
    buildLotseDropdown();
    await render();
  }catch(err){
    $("content").innerHTML = `<div class="card">
      <div class="cardHeader">
        <h2>Fehler beim Laden</h2>
        <div class="metaLine muted">${escapeHtml(String(err.message || err))}</div>
      </div>
      <div class="footerHint muted">Check: GitHub Pages Pfad + JSON unter /data/…</div>
    </div>`;
  }
}

/* ---------------- Renderers ---------------- */
function headerCard(title, rightMeta, kpisHtml=""){
  return `
  <div class="card">
    <div class="cardHeader">
      <h2>${escapeHtml(title)}</h2>
      <div class="metaLine">${escapeHtml(rightMeta || "")}</div>
    </div>
    ${kpisHtml ? `<div class="kpis">${kpisHtml}</div>` : ``}
  </div>`;
}

function renderKanal(){
  const ships = CACHE.kanal?.ships || [];
  const gen = CACHE.kanal?.generated_at ? fmtIso(CACHE.kanal.generated_at) : "";

  // filter + sort settings (stored)
  const filter = localStorage.getItem(LS_KEYS.kanalFilter) || "ALL";
  const sortKey = localStorage.getItem(LS_KEYS.kanalSort) || "rueb_eta";

  let filtered = ships;
  if(filter !== "ALL"){
    filtered = ships.filter(s => (s.status || "").toUpperCase() === filter);
  }

  filtered = [...filtered].sort((a,b) => {
    const av = a?.[sortKey] || "";
    const bv = b?.[sortKey] || "";
    return String(av).localeCompare(String(bv));
  });

  // build quick controls inline for kanal
  const filterButtons = ["ALL","NOK","FÖRDE","ELBE"].map(x => {
    const cls = (x === filter) ? "badge info" : "badge";
    return `<span class="${cls}" data-kanal-filter="${escapeHtml(x)}">${escapeHtml(x)}</span>`;
  }).join("");

  const sortButtons = [
    {k:"status", t:"Status"},
    {k:"rueb_eta", t:"RUEB-ETA"},
    {k:"lock_eta", t:"Schleuse-ETA"},
    {k:"name", t:"Name"},
  ].map(o => {
    const cls = (o.k === sortKey) ? "badge info" : "badge";
    return `<span class="${cls}" data-kanal-sort="${escapeHtml(o.k)}">${escapeHtml(o.t)}</span>`;
  }).join("");

  const kpis = `
    ${badge(`Schiffe: ${filtered.length}`, "info")}
    ${badge(`Stand: ${gen}`, "info")}
  `;

  let html = headerCard("Kanal", `Auto-Refresh ${Math.round(REFRESH_MS/1000)}s`, kpis);
  html += `
  <div class="card">
    <div class="cardHeader">
      <h2>Filter</h2>
      <div class="metaLine muted">Tippen: Filter/Sort</div>
    </div>
    <div class="kpis">${filterButtons}</div>
    <div style="height:10px"></div>
    <div class="kpis">${sortButtons}</div>
    <div class="footerHint muted">Tipp: Klick auf ein Schiff öffnet Details.</div>
  </div>
  `;

  html += `
  <div class="card">
    <div class="cardHeader">
      <h2>Liste</h2>
      <div class="metaLine muted">Sort: ${escapeHtml(sortKey)}</div>
    </div>
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Name</th>
            <th>RUEB-ETA</th>
            <th>Δ first→RUEB</th>
            <th>Schleuse-ETA</th>
            <th>Δ RUEB→Schleuse</th>
            <th>SOG</th>
            <th>Lat/Lon</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(s => {
            const status = (s.status || "").toUpperCase();
            const badgeCls = status === "NOK" ? "good" : (status === "FÖRDE" ? "warn" : "info");

            return `
            <tr class="rowClick" data-ship='${escapeHtml(JSON.stringify(s))}'>
              <td>${badge(status || "-", badgeCls)}</td>
              <td class="mono">${escapeHtml(s.name || "-")}</td>
              <td class="mono">${escapeHtml(fmtIso(s.rueb_eta) || "-")}</td>
              <td class="mono">${escapeHtml(s.delta_first_rueb_hm || "-")}</td>
              <td class="mono">${escapeHtml(fmtIso(s.lock_eta) || "-")}</td>
              <td class="mono">${escapeHtml(s.delta_rueb_lock_hm || "-")}</td>
              <td class="mono">${escapeHtml(s.track?.sog ?? "-")}</td>
              <td class="mono">${escapeHtml((s.track?.lat ?? "-") + " / " + (s.track?.lon ?? "-"))}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  $("content").innerHTML = html;

  // attach handlers
  document.querySelectorAll("[data-kanal-filter]").forEach(el => {
    el.addEventListener("click", () => {
      localStorage.setItem(LS_KEYS.kanalFilter, el.getAttribute("data-kanal-filter"));
      render();
    });
  });
  document.querySelectorAll("[data-kanal-sort]").forEach(el => {
    el.addEventListener("click", () => {
      localStorage.setItem(LS_KEYS.kanalSort, el.getAttribute("data-kanal-sort"));
      render();
    });
  });
  document.querySelectorAll("tr[data-ship]").forEach(tr => {
    tr.addEventListener("click", () => {
      try{
        const obj = JSON.parse(tr.getAttribute("data-ship"));
        openModal(obj.name || "Schiff", obj);
      }catch(_){}
    });
  });
}

async function renderGesamtboert(){
  setLoading("lade Gesamtbört…");

  try{
    if(!CACHE.gesamtboert) CACHE.gesamtboert = await fetchJson(FILES.gesamtboert);
  }catch(err){
    $("content").innerHTML = headerCard("Gesamtbört", "Keine Datei gefunden", badge("Fehlt: data/aegir_gesamtboert.json", "bad"))
      + `<div class="card"><div class="footerHint muted">
          Lösung: In start_all beim COPY TO WEB auch <span class="mono">output/aegir_gesamtboert.json</span> nach <span class="mono">web/data/aegir_gesamtboert.json</span> kopieren und pushen.
        </div></div>`;
    return;
  }

  const rows = CACHE.gesamtboert?.rows || CACHE.gesamtboert?.lotsen || CACHE.gesamtboert || [];
  const gen = CACHE.gesamtboert?.generated_at ? fmtIso(CACHE.gesamtboert.generated_at) : "";

  let html = headerCard("Gesamtbört", `Stand: ${gen}`, badge(`Einträge: ${Array.isArray(rows)?rows.length:"?"}`, "info"));
  html += `
  <div class="card">
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Pos</th>
            <th>Name</th>
            <th>Zeit</th>
            <th>Von</th>
            <th>Nach</th>
            <th>Schiff</th>
            <th>TG</th>
            <th>Bemerkung</th>
          </tr>
        </thead>
        <tbody>
          ${(Array.isArray(rows)?rows:[]).map(r => `
            <tr>
              <td class="mono">${escapeHtml(r.pos ?? r.nr ?? "-")}</td>
              <td>${escapeHtml(r.name ?? r.nachname ?? r.key ?? "-")}</td>
              <td class="mono">${escapeHtml(r.zeit ? fmtIso(r.zeit) : (r.zeit_raw || "-"))}</td>
              <td class="mono">${escapeHtml(r.von ?? "-")}</td>
              <td class="mono">${escapeHtml(r.nach ?? "-")}</td>
              <td>${escapeHtml(r.schiff ?? r.ship ?? "-")}</td>
              <td class="mono">${escapeHtml(r.tiefgang ?? "-")}</td>
              <td class="wrap">${escapeHtml(r.bemerkung ?? "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>`;
  $("content").innerHTML = html;
}

async function renderSeelotsen(){
  setLoading("lade Seelotsen…");

  try{
    if(!CACHE.seelotsen) CACHE.seelotsen = await fetchJson(FILES.seelotsen);
  }catch(err){
    $("content").innerHTML = headerCard("Seelotsen", "Keine Datei gefunden", badge("Fehlt: data/aegir_seelotsen.json", "bad"))
      + `<div class="card"><div class="footerHint muted">
          Lösung: In start_all beim COPY TO WEB auch <span class="mono">output/aegir_seelotsen.json</span> nach <span class="mono">web/data/aegir_seelotsen.json</span> kopieren und pushen.
        </div></div>`;
    return;
  }

  const rows = CACHE.seelotsen?.rows || CACHE.seelotsen?.ships || CACHE.seelotsen || [];
  const gen = CACHE.seelotsen?.generated_at ? fmtIso(CACHE.seelotsen.generated_at) : "";

  let html = headerCard("Abgeteilte Seelotsen", `Stand: ${gen}`, badge(`Einträge: ${Array.isArray(rows)?rows.length:"?"}`, "info"));
  html += `
  <div class="card">
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Uhrzeit</th>
            <th>Name</th>
            <th>Aufgabe</th>
            <th>Fahrzeug</th>
            <th>Ort</th>
          </tr>
        </thead>
        <tbody>
          ${(Array.isArray(rows)?rows:[]).map(r => `
            <tr>
              <td class="mono">${escapeHtml(r.zeit ?? r.time ?? "-")}</td>
              <td>${escapeHtml(r.nachname ?? r.name ?? "-")}</td>
              <td>${escapeHtml(r.aufgabe ?? r.task ?? r.rolle ?? "-")}</td>
              <td class="mono">${escapeHtml(r.fahrzeug ?? r.vehicle ?? "-")}</td>
              <td class="mono">${escapeHtml(r.ort ?? r.location ?? "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>`;
  $("content").innerHTML = html;
}

function renderGraph(){
  const hist = CACHE.graph?.history || [];
  const gen = CACHE.graph?.generated_at ? fmtIso(CACHE.graph.generated_at) : "";

  const lotseKey = localStorage.getItem(LS_KEYS.lotse) || "";

  // reduce to selected lotse
  const points = [];
  for(const h of hist){
    const ts = h.timestamp;
    for(const t of (h.targets || [])){
      const name = (t.name || "").toUpperCase();
      if(lotseKey && name !== lotseKey) continue;

      // only m1 for now (you can extend)
      if(t.m1){
        points.push({ x: ts, y: t.m1 });
      }
    }
  }

  let html = headerCard("Work Start Graph", `Stand: ${gen}`, badge(`Punkte: ${points.length}`, "info"));
  html += `<div class="card">
    <div class="footerHint muted">Aktuell: Graph als Liste (sauber + iPad-tauglich). Wenn du willst, bau ich dir daraus als nächsten Schritt ein kleines SVG-Diagramm.</div>
    <div class="tableWrap">
      <table>
        <thead><tr><th>Snapshot</th><th>Start (M1)</th></tr></thead>
        <tbody>
          ${points.slice(-250).map(p => `
            <tr>
              <td class="mono">${escapeHtml(fmtIso(p.x))}</td>
              <td class="mono">${escapeHtml(fmtIso(p.y))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  $("content").innerHTML = html;
}

async function renderMeldungen(){
  setLoading("lade Meldungen…");

  try{
    if(!CACHE.meldungen) CACHE.meldungen = await fetchJson(FILES.meldungen);
  }catch(err){
    $("content").innerHTML = headerCard("Meldungen", "Keine Datei gefunden", badge("Fehlt: data/aegir_meldungen.json", "bad"))
      + `<div class="card"><div class="footerHint muted">
          Lösung: In start_all beim COPY TO WEB auch <span class="mono">output/aegir_meldungen.json</span> nach <span class="mono">web/data/aegir_meldungen.json</span> kopieren und pushen.
        </div></div>`;
    return;
  }

  // structure can be dict with lists – just flatten
  const src = CACHE.meldungen || {};
  const all = [];
  for(const k of Object.keys(src)){
    if(Array.isArray(src[k])) all.push(...src[k].map(x => ({...x, _group:k})));
  }

  let html = headerCard("Meldungen", "", badge(`Einträge: ${all.length}`, "info"));
  html += `<div class="card">
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Gruppe</th>
            <th>Nr</th>
            <th>Zeit</th>
            <th>Schiff</th>
            <th>Von</th>
            <th>Nach</th>
            <th>Bemerkung</th>
          </tr>
        </thead>
        <tbody>
          ${all.map(r => `
            <tr>
              <td class="mono">${escapeHtml(r._group || "-")}</td>
              <td class="mono">${escapeHtml(r.nr ?? "-")}</td>
              <td class="mono">${escapeHtml(r.zeit ? fmtIso(r.zeit) : (r.zeit_raw || "-"))}</td>
              <td>${escapeHtml(r.schiff ?? "-")}</td>
              <td class="mono">${escapeHtml(r.von ?? "-")}</td>
              <td class="mono">${escapeHtml(r.nach ?? "-")}</td>
              <td class="wrap">${escapeHtml(r.bemerkung ?? "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>`;
  $("content").innerHTML = html;
}

async function render(){
  const view = $("viewSelect").value;

  if(view === "kanal"){
    renderKanal();
    return;
  }
  if(view === "graph"){
    renderGraph();
    return;
  }
  if(view === "gesamtboert"){
    await renderGesamtboert();
    return;
  }
  if(view === "seelotsen"){
    await renderSeelotsen();
    return;
  }
  if(view === "meldungen"){
    await renderMeldungen();
    return;
  }

  $("content").innerHTML = headerCard("Unbekannte Ansicht", view, badge("Check viewSelect Optionen", "warn"));
}

/* ---------------- Boot ---------------- */
async function boot(){
  ensureModal();

  // if your index.html doesn’t have a refresh button, create one
  if(!$("refreshBtn")){
    // minimal add-on: if missing, no crash
  }

  await refreshAll();
  initControls();

  if(refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    try{
      await loadCore();
      await render();
      // update subtitle time if present
      const sub = document.getElementById("subline");
      if(sub && CACHE.web?.generated_at){
        sub.textContent = `Stand: ${fmtIso(CACHE.web.generated_at)}`;
      }
    }catch(_){
      // don’t spam UI
    }
  }, REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", boot);