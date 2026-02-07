const REFRESH_MS = 60000

let DATA = {}
let CHANNEL = {}
let HISTORY = {}

const lotseSelect = document.getElementById("lotseSelect")
const viewSelect  = document.getElementById("viewSelect")
const content     = document.getElementById("content")

// -----------------------------------
// LOAD DATA
// -----------------------------------

async function loadAll() {
  DATA = await fetch("data/web_data.json?v=" + Date.now()).then(r=>r.json())
  CHANNEL = await fetch("data/channel_master_final.json?v=" + Date.now()).then(r=>r.json())
  HISTORY = await fetch("data/start_work_targets_history.json?v=" + Date.now()).then(r=>r.json())

  initUI()
  render()
}

// -----------------------------------
// INIT UI
// -----------------------------------

function initUI() {

  // Lotse Dropdown
  lotseSelect.innerHTML = ""
  DATA.lotsen.forEach(l=>{
    const o=document.createElement("option")
    o.value=l.key
    o.textContent=l.name
    lotseSelect.appendChild(o)
  })

  // gespeicherte Auswahl
  const savedLotse = localStorage.getItem("lotse")
  if(savedLotse) lotseSelect.value = savedLotse

  const savedView = localStorage.getItem("view")
  if(savedView) viewSelect.value = savedView

  lotseSelect.onchange = ()=>{
    localStorage.setItem("lotse", lotseSelect.value)
    render()
  }

  viewSelect.onchange = ()=>{
    localStorage.setItem("view", viewSelect.value)
    render()
  }
}

// -----------------------------------
// RENDER
// -----------------------------------

function render(){
  const view = viewSelect.value

  if(view==="boert") renderBoert()
  if(view==="seelotsen") renderSeelotsen()
  if(view==="graph") renderGraph()
  if(view==="kanal") renderKanal()
}

// -----------------------------------
// BOERT
// -----------------------------------

function renderBoert(){
  content.innerHTML=""

  DATA.boert.forEach(e=>{
    const div=document.createElement("div")
    div.className="card"
    div.innerHTML=`
      <b>${e.name}</b><br>
      Pos: ${e.pos}<br>
      Start M1: ${e.start_work_m1 ?? "-"}
    `
    content.appendChild(div)
  })
}

// -----------------------------------
// SEELLOTSEN
// -----------------------------------

function renderSeelotsen(){
  content.innerHTML=""
  DATA.seelotsen.forEach(e=>{
    const div=document.createElement("div")
    div.className="card"
    div.textContent=e.name
    content.appendChild(div)
  })
}

// -----------------------------------
// GRAPH
// -----------------------------------

function renderGraph(){
  content.innerHTML="<div class='card'>Graph kommt hier</div>"
}

// -----------------------------------
// KANAL
// -----------------------------------

function renderKanal(){
  content.innerHTML=""
  CHANNEL.ships.forEach(s=>{
    const div=document.createElement("div")
    div.className="card"
    div.innerHTML=`
      <b>${s.name}</b><br>
      RÜB ETA: ${s.rueb_eta ?? "-"}<br>
      Schleuse: ${s.lock_eta ?? "-"}<br>
      Δ: ${s.delta_rueb_lock_hm ?? "-"}
    `
    content.appendChild(div)
  })
}

// -----------------------------------

loadAll()
setInterval(loadAll, REFRESH_MS)