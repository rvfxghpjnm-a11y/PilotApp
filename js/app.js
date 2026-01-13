/* =========================================================
   PilotApp – app.js
   Fokus: Short, Long & Graph STABIL
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

// ---------------------------------------------------------
// INIT
// ---------------------------------------------------------
init();

function init() {
  bindViewButtons();
  bindHourButtons();
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
    personsEl.textContent = "Fehler beim Laden der Personen";
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

  if (currentView === "short") loadShort();
  if (currentView === "long")  loadLong();
  if (currentView === "graph") loadGraph();
}

// ---------------------------------------------------------
// SHORT
// ---------------------------------------------------------
async function loadShort() {
  const res = await fetch(`data/${currentPerson.key}_short.json`);
  const data = await res.json();
  contentEl.innerHTML = `<pre>${data.short}</pre>`;
}

// ---------------------------------------------------------
// LONG
// ---------------------------------------------------------
async function loadLong() {
  const res = await fetch(`data/${currentPerson.key}_long.json`);
  const data = await res.json();
  contentEl.innerHTML = `<pre>${data.long}</pre>`;
}

// ---------------------------------------------------------
// GRAPH  ✅ FIX HIER
// ---------------------------------------------------------
async function loadGraph() {
  contentEl.innerHTML = `<canvas id="chart"></canvas>`;

  // 🔴 WICHTIG: exakt der Dateiname aus workstart_index.json
  const res = await fetch(`data/${currentPerson.file}`, { cache: "no-store" });
  const data = await res.json();

  renderWorkstartChart(data.entries || [], currentHours);

  statusEl.textContent = new Date().toLocaleTimeString("de-DE");
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