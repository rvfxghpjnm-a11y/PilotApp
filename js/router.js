// js/router.js
// ============================================================
// PILOTAPP ROUTER – FINAL (PERSONS + VIEWS + GRAPH READY)
// ============================================================

import { state, setPerson, setView, restoreState } from "./state.js";

// ------------------------------------------------------------
// DOM
// ------------------------------------------------------------

const contentEl = document.getElementById("content");
const personButtonsEl = document.getElementById("personButtons");
const viewButtons = document.querySelectorAll(".view-buttons button");
const refreshBtn = document.getElementById("refreshBtn");
const refreshTimeEl = document.getElementById("refreshTime");

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  restoreState();
  await loadPersons();
  renderPersons();
  renderViews();
  loadCurrentView();
  updateRefreshTime();
});

// ------------------------------------------------------------
// LOAD PERSONS (AUS workstart_index.json)
// ------------------------------------------------------------

async function loadPersons() {
  try {
    const res = await fetch("data/workstart_index.json", { cache: "no-store" });
    if (!res.ok) throw new Error("index not found");

    const data = await res.json();
    state.persons = data.persons || [];

    // Fallback: erste Person automatisch setzen
    if (!state.currentPerson && state.persons.length > 0) {
      setPerson(state.persons[0].key);
    }

  } catch (err) {
    console.error("Fehler beim Laden der Personen:", err);
    state.persons = [];
  }
}

// ------------------------------------------------------------
// PERSON BUTTONS
// ------------------------------------------------------------

function renderPersons() {
  personButtonsEl.innerHTML = "";

  state.persons.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = `${p.vorname} ${p.nachname}`;
    btn.dataset.person = p.key;

    if (p.key === state.currentPerson) {
      btn.classList.add("active");
    }

    btn.onclick = () => {
      setPerson(p.key);
      renderPersons();
      loadCurrentView();
    };

    personButtonsEl.appendChild(btn);
  });
}

// ------------------------------------------------------------
// VIEW BUTTONS
// ------------------------------------------------------------

function renderViews() {
  viewButtons.forEach(btn => {
    const view = btn.dataset.view;

    btn.classList.toggle("active", view === state.currentView);

    btn.onclick = () => {
      setView(view);
      renderViews();
      loadCurrentView();
    };
  });
}

// ------------------------------------------------------------
// VIEW LOADER
// ------------------------------------------------------------

async function loadCurrentView() {
  if (!state.currentPerson) {
    contentEl.innerHTML = "<p>Keine Person ausgewählt</p>";
    return;
  }

  const view = state.currentView;
  const url = `views/${view}.html`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("View nicht ladbar");

    const html = await res.text();
    contentEl.innerHTML = html;

    // Person global für Graph / andere Views
    window.PILOTAPP_PERSON = state.currentPerson;

  } catch (err) {
    console.error(err);
    contentEl.innerHTML = `<p>Fehler beim Laden von ${view}</p>`;
  }
}

// ------------------------------------------------------------
// REFRESH
// ------------------------------------------------------------

refreshBtn.onclick = async () => {
  await loadPersons();
  renderPersons();
  renderViews();
  loadCurrentView();
  updateRefreshTime();
};

function updateRefreshTime() {
  refreshTimeEl.textContent = new Date().toLocaleTimeString("de-DE");
}