/* =========================================================
   PilotApp – app.js
   Fokus: Short & Long stabil
   ========================================================= */

console.log("APP.JS LOADED");

// ---------------------------------------------------------
// STATE
// ---------------------------------------------------------
let currentPerson = null;
let currentView = "short";
let currentHours = 24;
let autoRefresh = false;
let autoTimer = null;

// ---------------------------------------------------------
// DOM
// ---------------------------------------------------------
const personsEl = document.getElementById("persons");
const contentEl = document.getElementById("content");
const statusEl = document.getElementById("status");

// ---------------------------------------------------------
// INIT
// ---------------------------------------------------------
init();

function init() {
  bindViewButtons();
  bindHourButtons();
  bindAutoRefresh();
  loadPersons();
}

// ---------------------------------------------------------
// PERSONEN
// ---------------------------------------------------------
async function loadPersons() {
  try {
    const res = await fetch("data/workstart_index.json");
    const data = await res.json();

    personsEl.innerHTML = "";
    data.persons.forEach(p => {
      const btn = document.createElement("button");
      btn.textContent = `${p.vorname} ${p.nachname}`;
      btn.onclick = () => selectPerson(p);
      personsEl.appendChild(btn);
    });

  } catch (e) {
    personsEl.textContent = "Fehler beim Laden der Personen";
    console.error(e);
  }
}

function selectPerson(person) {
  currentPerson = person;
  [...personsEl.children].forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
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

  if (currentView === "short") loadShort();
  if (currentView === "long") loadLong();
  if (currentView === "graph") {
    contentEl.innerHTML = "<canvas id='chart'></canvas>";
    if (typeof loadGraph === "function") loadGraph();
  }
}

// ---------------------------------------------------------
// SHORT
// ---------------------------------------------------------
async function loadShort() {
  contentEl.innerHTML = "<h2>Short</h2><p>Lade Daten …</p>";

  try {
    const res = await fetch(`data/${currentPerson.key}_short.json`);
    const data = await res.json();

    contentEl.innerHTML = `
      <h2>Short</h2>
      <pre>${data.short}</pre>
    `;
  } catch (e) {
    contentEl.textContent = "Fehler beim Laden der Short-Daten";
    console.error(e);
  }
}

// ---------------------------------------------------------
// LONG
// ---------------------------------------------------------
async function loadLong() {
  contentEl.innerHTML = "<h2>Long</h2><p>Lade Long-Daten …</p>";

  try {
    const res = await fetch(`data/${currentPerson.key}_long.json`);
    const data = await res.json();

    contentEl.innerHTML = `
      <h2>Long</h2>
      <pre>${data.long}</pre>
    `;
  } catch (e) {
    contentEl.textContent = "Fehler beim Laden der Long-Daten";
    console.error(e);
  }
}

// ---------------------------------------------------------
// ZEITFILTER (nur Graph)
// ---------------------------------------------------------
function bindHourButtons() {
  document.querySelectorAll("[data-hours]").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("[data-hours]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentHours = Number(btn.dataset.hours);
      if (currentView === "graph" && typeof loadGraph === "function") loadGraph();
    };
  });
}

// ---------------------------------------------------------
// AUTO REFRESH (harmlos, blockiert nichts)
// ---------------------------------------------------------
function bindAutoRefresh() {
  const btn = document.getElementById("autoRefresh");
  if (!btn) return;

  btn.onclick = () => {
    autoRefresh = !autoRefresh;
    btn.classList.toggle("active", autoRefresh);

    if (autoRefresh) {
      autoTimer = setInterval(() => {
        if (currentView === "graph" && typeof loadGraph === "function") loadGraph();
      }, 60000);
    } else {
      clearInterval(autoTimer);
    }
  };
}