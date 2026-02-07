const DATA_URL    = "data/web_data.json";
const CHANNEL_URL = "data/channel_master_final.json";

let DATA = null;
let CHANNEL = null;

const lotseSelect = document.getElementById("lotseSelect");
const viewSelect  = document.getElementById("viewSelect");
const content     = document.getElementById("content");

init();

async function init(){
  await loadAll();
  buildLotseDropdown();
  render();

  setInterval(async ()=>{
    await loadAll();
    render();
  },120000);
}

async function loadAll(){
  DATA    = await fetch(DATA_URL+"?v="+Date.now()).then(r=>r.json());
  CHANNEL = await fetch(CHANNEL_URL+"?v="+Date.now()).then(r=>r.json());
}

function buildLotseDropdown(){
  lotseSelect.innerHTML="";
  DATA.targets.forEach(n=>{
    const o=document.createElement("option");
    o.value=n;
    o.textContent=n;
    lotseSelect.appendChild(o);
  });
}

lotseSelect.onchange = render;
viewSelect.onchange  = render;

function render(){
  const v=viewSelect.value;

  if(v==="kanal") renderKanal();
  if(v==="gesamtboert") renderGesamt();
  if(v==="seelotsen") renderSeelotsen();
  if(v==="graph") renderGraph();
}

/* =========================================================
   KANAL VIEW
========================================================= */

function renderKanal(){
  content.innerHTML="";

  const ships = CHANNEL.ships || [];

  // sort nach section + ETA
  ships.sort((a,b)=>{
    return (a.rueb_eta||"").localeCompare(b.rueb_eta||"");
  });

  const sections = {
    "SCHLEUSE":[],
    "KANAL":[],
    "ZULAUF":[],
    "ELBE":[],
    "SONST":[]
  };

  ships.forEach(s=>{
    const sec=(s.section||"SONST").toUpperCase();
    if(sections[sec]) sections[sec].push(s);
    else sections["SONST"].push(s);
  });

  Object.keys(sections).forEach(key=>{
    if(sections[key].length===0) return;

    const block=document.createElement("div");
    block.className="sectionBlock";

    const title=document.createElement("div");
    title.className="sectionTitle";
    title.textContent=key;
    block.appendChild(title);

    sections[key].forEach(ship=>{
      block.appendChild(shipRow(ship));
    });

    content.appendChild(block);
  });
}

function shipRow(ship){
  const row=document.createElement("div");
  row.className="shipRow";

  if(ship.direction==="EAST") row.classList.add("dir-east");
  if(ship.direction==="WEST") row.classList.add("dir-west");

  const left=document.createElement("div");
  left.className="shipLeft";

  const name=document.createElement("div");
  name.className="shipName";
  name.textContent=ship.name;

  const meta=document.createElement("div");
  meta.className="shipMeta";
  meta.textContent=
    (ship.display_location||"")+
    " · "+
    (ship.direction||"");

  left.appendChild(name);
  left.appendChild(meta);

  const right=document.createElement("div");
  right.className="shipRight";

  const eta=document.createElement("div");
  eta.className="shipEta";
  eta.textContent=ship.display_eta||"";

  const delta=document.createElement("div");
  delta.className="shipDelta";
  delta.textContent=ship.delta_rueb_lock_hm||"";

  right.appendChild(eta);
  right.appendChild(delta);

  row.appendChild(left);
  row.appendChild(right);

  row.onclick=()=>openModal(ship);

  return row;
}

/* =========================================================
   MODAL
========================================================= */

function openModal(ship){
  const m=document.createElement("div");
  m.className="modal";

  const i=document.createElement("div");
  i.className="modalInner";

  i.innerHTML=`
    <h2>${ship.name}</h2>

    <div class="modalRow"><span>Ort</span><span>${ship.display_location||""}</span></div>
    <div class="modalRow"><span>Richtung</span><span>${ship.direction||""}</span></div>
    <div class="modalRow"><span>ETA RÜB</span><span>${ship.rueb_eta||""}</span></div>
    <div class="modalRow"><span>ETA Schleuse</span><span>${ship.lock_eta||""}</span></div>
    <div class="modalRow"><span>Delta</span><span>${ship.delta_rueb_lock_hm||""}</span></div>
    <div class="modalRow"><span>Steuerer</span><span>${ship.canal_steerer||""}</span></div>

    <button onclick="this.closest('.modal').remove()">Schließen</button>
  `;

  m.appendChild(i);
  document.body.appendChild(m);
}

/* =========================================================
   GESAMTBÖRT
========================================================= */

function renderGesamt(){
  const name=lotseSelect.value;
  const data=DATA.lotsen[name];

  if(!data){
    content.innerHTML="keine daten";
    return;
  }

  content.innerHTML=`
  <div class="card">
    <h2>Gesamtbört</h2>
    Pos ${data.pos}
  </div>`;
}

function renderSeelotsen(){
  content.innerHTML="<div class='card'>Seelotsen folgt</div>";
}

function renderGraph(){
  content.innerHTML="<div class='card'>Graph folgt</div>";
}