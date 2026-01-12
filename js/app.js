// js/app.js
// ============================================================
// PILOTAPP – APP CONTROLLER (SPLIT STEP 3: STATE PERSISTENCE)
// ============================================================

import { renderWorkstartChart } from "./graph.js";

let currentPerson = null;
let currentHours = 24;

// ------------------------------------------------------------
// LOCAL STORAGE KEYS
// ------------------------------------------------------------
const LS_PERSON = "pilotapp_current_person";
const LS_HOURS  = "pilotapp_current_hours";

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
init();

function init() {
  restoreState();
  bindHourButtons();
  loadPersons();
}

// ------------------------------------------------------------
// STATE (RESTORE / SAVE)
// ------------------------------------------------------------
function restoreState() {
  const savedPerson = localStorage.getItem(LS_PERSON);
  const savedHours  = localStorage.getItem(LS_HOURS);

  if (savedHours && !isNaN(savedHours)) {
    currentHours = Number(savedHours);
  }

  if (savedPerson) {
    currentPerson = { key: savedPerson };
  }
}

function saveState() {
  if (currentPerson?.key) {
    localStorage.setItem(LS_PERSON, currentPerson.key);
  }
  localStorage.setItem(LS_HOURS, String(currentHours));
}

// ------------------------------------------------------------
// ZEITFENSTER BUTTONS
// ------------------------------------------------------------
function bindHourButtons() {
  document.querySelectorAll("button[data-hours]").forEach(btn => {
    const hours = Number(btn.dataset.hours);

    // Restore active state
    if (hours === currentHours) {
      btn.classList.add("active");
    }

    btn.onclick = () => {
      document.querySelectorAll("button[data-hours]")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      currentHours = hours;
      saveState();

      if (currentPerson) loadGraph();
    };
  });
}

// ------------------------------------------------------------
// PERSONEN LADEN
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
      btn.dataset.key = p.key;

      const isActive =
        (currentPerson && currentPerson.key === p.key) ||
        (!currentPerson && i === 0);

      if (isActive) {
        btn.classList.add("active");
        currentPerson = p;
      }

      btn.onclick = () => {
        setActivePerson(btn, p);
      };

      wrap.appendChild(btn);
    });

    if (currentPerson) loadGraph();

  } catch (err) {
    console.error(err);
    wrap.innerHTML =
      `<div class="error">Personen konnten nicht geladen werden</div>`;
  }
}

// ------------------------------------------------------------
// PERSON AKTIV SETZEN
// ------------------------------------------------------------
function setActivePerson(btn, person) {
  document.querySelectorAll("#persons button")
    .forEach(b => b.classList.remove("active"));

  btn.classList.add("active");
  currentPerson = person;
  saveState();
  loadGraph();
}

// ------------------------------------------------------------
// GRAPH LADEN
// ------------------------------------------------------------
async function loadGraph() {
  if (!currentPerson?.file) return;

  try {
    const file = `data/${currentPerson.file}`;
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error("Workstart-Datei nicht ladbar");

    const data = await res.json();
    renderWorkstartChart(data.entries || [], currentHours);

    updateStatusTime();

  } catch (err) {
    console.error(err);
  }
}

// ------------------------------------------------------------
// STATUS
// ------------------------------------------------------------
function updateStatusTime() {
  const el = document.getElementById("status");
  if (!el) return;

  el.textContent = new Date().toLocaleTimeString("de-DE");
}