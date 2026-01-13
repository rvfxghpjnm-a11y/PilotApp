// js/app.js
// ============================================================
// PILOTAPP – APP CONTROLLER (STEP 4: AUTO REFRESH + ERRORS)
// ============================================================

console.log("APP.JS LOADED");

import { renderWorkstartChart } from "./graph.js";

let currentPerson = null;
let currentHours = 24;
let autoRefresh = false;
let autoTimer = null;

// ------------------------------------------------------------
// LOCAL STORAGE KEYS
// ------------------------------------------------------------
const LS_PERSON = "pilotapp_current_person";
const LS_HOURS  = "pilotapp_current_hours";
const LS_AUTO   = "pilotapp_auto_refresh";

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
init();

function init() {
  restoreState();
  bindHourButtons();
  bindAutoRefresh();
  loadPersons();
}

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------
function restoreState() {
  const p = localStorage.getItem(LS_PERSON);
  const h = localStorage.getItem(LS_HOURS);
  const a = localStorage.getItem(LS_AUTO);

  if (h && !isNaN(h)) currentHours = Number(h);
  if (p) currentPerson = { key: p };
  if (a === "1") autoRefresh = true;
}

function saveState() {
  if (currentPerson?.key) {
    localStorage.setItem(LS_PERSON, currentPerson.key);
  }
  localStorage.setItem(LS_HOURS, String(currentHours));
  localStorage.setItem(LS_AUTO, autoRefresh ? "1" : "0");
}

// ------------------------------------------------------------
// ZEITFENSTER
// ------------------------------------------------------------
function bindAutoRefresh() {
  const btn = document.getElementById("autoBtn");
  if (!btn) return; // ✅ WICHTIG: Abbruch, wenn Button nicht da ist

  if (autoRefresh) enableAutoRefresh();

  btn.onclick = () => {
    autoRefresh ? disableAutoRefresh() : enableAutoRefresh();
  };
}

// ------------------------------------------------------------
// AUTO REFRESH
// ------------------------------------------------------------
function bindAutoRefresh() {
  const btn = document.getElementById("autoRefreshBtn");

  if (autoRefresh) enableAutoRefresh();

  btn.onclick = () => {
    autoRefresh ? disableAutoRefresh() : enableAutoRefresh();
  };
}

function enableAutoRefresh() {
  autoRefresh = true;
  saveState();

  document.getElementById("autoRefreshBtn").classList.add("active");

  autoTimer = setInterval(() => {
    if (currentPerson) loadGraph(true);
  }, 60_000); // 1 Minute
}

function disableAutoRefresh() {
  autoRefresh = false;
  saveState();

  document.getElementById("autoRefreshBtn").classList.remove("active");

  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

// ------------------------------------------------------------
// PERSONEN
// ------------------------------------------------------------
async function loadPersons() {
  const wrap = document.getElementById("persons");

  try {
    const res = await fetch("data/workstart_index.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Index nicht ladbar");

    const index = await res.json();
    wrap.innerHTML = "";

    index.persons.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.textContent = `${p.vorname} ${p.nachname}`;

      const active =
        (currentPerson && currentPerson.key === p.key) ||
        (!currentPerson && i === 0);

      if (active) {
        btn.classList.add("active");
        currentPerson = p;
      }

      btn.onclick = () => {
        document.querySelectorAll("#persons button")
          .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentPerson = p;
        saveState();
        loadGraph();
      };

      wrap.appendChild(btn);
    });

    if (currentPerson) loadGraph();

  } catch (err) {
    showError("Personen konnten nicht geladen werden");
    console.error(err);
  }
}

// ------------------------------------------------------------
// GRAPH
// ------------------------------------------------------------
async function loadGraph(silent = false) {
  if (!currentPerson?.file) return;

  try {
    hideError();

    const file = `data/${currentPerson.file}`;
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error("Workstart-Datei nicht ladbar");

    const data = await res.json();
    renderWorkstartChart(data.entries || [], currentHours);
    updateStatus();

  } catch (err) {
    if (!silent) showError("Workstart-Daten konnten nicht geladen werden");
    console.error(err);
  }
}

// ------------------------------------------------------------
// UI HELPERS
// ------------------------------------------------------------
function updateStatus() {
  document.getElementById("status").textContent =
    new Date().toLocaleTimeString("de-DE");
}

function showError(msg) {
  const box = document.getElementById("errorBox");
  box.textContent = msg;
  box.style.display = "block";
}

function hideError() {
  const box = document.getElementById("errorBox");
  box.style.display = "none";
}