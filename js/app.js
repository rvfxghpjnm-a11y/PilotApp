const lotseSelect = document.getElementById("lotseSelect");
const viewSelect  = document.getElementById("viewSelect");
const content     = document.getElementById("content");

let DATA = null;

async function loadData() {
  const res = await fetch("data/web_data.json?v=" + Date.now());
  DATA = await res.json();

  buildLotseDropdown();
  render();
}

function buildLotseDropdown() {
  lotseSelect.innerHTML = "";

  DATA.targets.forEach(n => {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    lotseSelect.appendChild(o);
  });
}

function render() {
  const view  = viewSelect.value;
  const lotse = lotseSelect.value;

  if (view === "gesamtboert") renderGesamtboert();
  if (view === "seelotsen")   renderSeelotsen();
  if (view === "kanal")       renderKanal();
  if (view === "graph")       renderGraph();
}

function renderGesamtboert() {
  const g = DATA.gesamtboert;

  if (!g || !g.entries) {
    content.innerHTML = "keine Daten";
    return;
  }

  let html = `<table>
  <tr>
    <th>Pos</th>
    <th>Name</th>
    <th>Takt</th>
    <th>Zeit</th>
  </tr>`;

  g.entries.forEach(e => {
    html += `<tr>
      <td>${e.pos}</td>
      <td>${e.nachname}</td>
      <td>${e.takt}</td>
      <td>${e.zeit}</td>
    </tr>`;
  });

  html += "</table>";
  content.innerHTML = html;
}

function renderSeelotsen() {
  const s = DATA.seelotsen;

  if (!s || !s.entries) {
    content.innerHTML = "keine Daten";
    return;
  }

  let html = "<ul>";

  s.entries.forEach(e => {
    html += `<li>${e.nachname} – ${e.zeit}</li>`;
  });

  html += "</ul>";
  content.innerHTML = html;
}

function renderKanal() {
  const k = DATA.kanal;

  if (!k || !k.ships) {
    content.innerHTML = "keine Daten";
    return;
  }

  let html = `<table>
  <tr>
    <th>Schiff</th>
    <th>ETA</th>
  </tr>`;

  k.ships.forEach(s => {
    html += `<tr>
      <td>${s.name}</td>
      <td>${s.eta}</td>
    </tr>`;
  });

  html += "</table>";
  content.innerHTML = html;
}

function renderGraph() {
  content.innerHTML = "Graph kommt später";
}

lotseSelect.addEventListener("change", render);
viewSelect.addEventListener("change", render);

loadData();
setInterval(loadData, 60000);