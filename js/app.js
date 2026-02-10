let DATA = null;
let CURRENT = null;

async function loadData(){
  const r = await fetch("data/web_data.json?"+Date.now());
  DATA = await r.json();

  document.getElementById("generated").innerText =
    "Update: " + DATA.generated_at;

  buildLotseSelect();
  renderAll();
}

function buildLotseSelect(){
  const sel = document.getElementById("lotseSelect");
  sel.innerHTML = "";

  DATA.targets.forEach(t=>{
    const o = document.createElement("option");
    o.value = t;
    o.textContent = t;
    sel.appendChild(o);
  });

  sel.onchange = ()=>{
    CURRENT = sel.value;
    renderAll();
  };

  CURRENT = DATA.targets[0];
}

function renderAll(){
  renderAktuell();
  renderBoert();
  renderSeelotsen();
}

function renderAktuell(){
  const div = document.getElementById("aktuell");
  div.innerHTML = "";

  const boert = DATA.gesamtboert.entries.find(
    e=>e.nachname.toUpperCase()===CURRENT
  );

  const see = DATA.seelotsen.entries.find(
    e=>e.nachname.toUpperCase()===CURRENT
  );

  const card = document.createElement("div");
  card.className="actionCard";

  if(see){
    card.innerHTML = `
      <h1>Seelotse</h1>
      <div>${see.aufgabe}</div>
      <div>${see.fahrzeug}</div>
      <div>${see.zeit}</div>
    `;
  }
  else if(boert){
    card.innerHTML = `
      <h1>Gesamtbört</h1>
      <div>Pos ${boert.pos}</div>
      <div>Takt ${boert.takt}</div>
      <div>${boert.was}</div>
    `;
  }
  else{
    card.innerHTML = `<h1>Frei</h1>`;
  }

  div.appendChild(card);
}

function renderBoert(){
  const div = document.getElementById("boert");
  div.innerHTML = "";

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Pos</th>
        <th>Name</th>
        <th>Takt</th>
        <th>Info</th>
      </tr>
    </thead>
  `;

  const tb = document.createElement("tbody");

  DATA.gesamtboert.entries.forEach(e=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.pos}</td>
      <td>${e.nachname}</td>
      <td>${e.takt}</td>
      <td>${e.bemerkung||""}</td>
    `;
    tb.appendChild(tr);
  });

  table.appendChild(tb);
  div.appendChild(table);
}

function renderSeelotsen(){
  const div = document.getElementById("seelotsen");
  div.innerHTML = "";

  DATA.seelotsen.entries.forEach(e=>{
    const row = document.createElement("div");
    row.className="card";
    row.innerHTML = `
      <b>${e.nachname}</b>
      ${e.aufgabe}
      ${e.fahrzeug}
      ${e.zeit}
    `;
    div.appendChild(row);
  });
}

document.getElementById("reloadBtn").onclick=loadData;

document.querySelectorAll(".tab").forEach(t=>{
  t.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));

    t.classList.add("active");
    document.getElementById(t.dataset.tab).classList.add("active");
  }
});

loadData();