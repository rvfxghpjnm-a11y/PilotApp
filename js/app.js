let DATA = null;
let CURRENT = null;

async function loadData(){
  const r = await fetch("data/web_data.json?"+Date.now());
  DATA = await r.json();

  // ---------- FIX generated ----------
  const gen =
    DATA.generated_at ||
    DATA.gesamtboert?.generated_at ||
    DATA.seelotsen?.generated_at ||
    "";

  document.getElementById("generated").innerText =
    "Update: " + gen;

  buildLotseSelect();
  renderAll();
}

function buildLotseSelect(){
  const sel = document.getElementById("lotseSelect");
  sel.innerHTML = "";

  DATA.targets.forEach(t=>{
    const o = document.createElement("option");
    o.value = t.toUpperCase();
    o.textContent = t;
    sel.appendChild(o);
  });

  sel.onchange = ()=>{
    CURRENT = sel.value.toUpperCase();
    renderAll();
  };

  CURRENT = DATA.targets[0].toUpperCase();
}

function findBoert(){
  return DATA.gesamtboert.entries.find(
    e => e.nachname.toUpperCase() === CURRENT
  );
}

function findSee(){
  return DATA.seelotsen.entries.find(
    e => e.nachname.toUpperCase() === CURRENT
  );
}

function renderAktuell(){
  const div = document.getElementById("aktuell");
  div.innerHTML = "";

  const boert = findBoert();
  const see   = findSee();

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

function renderAll(){
  renderAktuell();
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