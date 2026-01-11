// js/app.js
// ============================================================
// PILOTAPP – CORE APP LOGIC (STEP 1: PERSONS + VIEWS STABLE)
// ============================================================

const DATA_INDEX_URL = "data/workstart_index.json";

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------
const state = {
  persons: [],
  currentPerson: null,
  currentView: "short",
};

// ------------------------------------------------------------
// DOM
// ------------------------------------------------------------
const personButtonsEl = document.getElementById("personButtons");
const contentEl = document.getElementById("content");
const viewButtons = document.querySelectorAll(".view-buttons button");
const refreshBtn = document.getElementById("refreshBtn");
const refreshTimeEl = document.getElementById("refreshTime");

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  restoreState();
  initApp();
});

// ------------------------------------------------------------
// MAIN INIT
// ------------------------------------------------------------
async function initApp() {
  try {
    await loadPersons();
    renderPersons();
    renderViews();
    loadCurrentView();
    updateRefreshTime();
  } catch (err) {
    showError("Initialisierung fehlgeschlagen", err);
  }
}

// ------------------------------------------------------------
// LOAD PERSONS (AUTOMATISCH)
// ------------------------------------------------------------
async function loadPersons() {
  const res = await fetch(DATA_INDEX_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("workstart_index.json nicht ladbar");
  }

  const data = await res.json();

  if (!Array.isArray(data.persons)) {
    throw new Error("Ungültiges Personenformat");
  }

  state.persons = data.persons;

  // Fallback: erste Person automatisch wählen
  if (!state.currentPerson && state.persons.length > 0) {
    state.currentPerson = state.persons[0].key;
    persistState();
  }
}

// ------------------------------------------------------------
// PERSON BUTTONS
// ------------------------------------------------------------
function renderPersons() {
  personButtonsEl.innerHTML = "";

  if (state.persons.length === 0) {
    personButtonsEl.innerHTML = "<span>Keine Personen gefunden</span>";
    return;
  }

  state.persons.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = `${p.vorname} ${p.nachname}`;
    btn.dataset.key = p.key;

    if (p.key === state.currentPerson) {
      btn.classList.add("active");
    }

    btn.onclick = () => {
      state.currentPerson = p.key;
      persistState();
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
      state.currentView = view;
      persistState();
      renderViews();
      loadCurrentView();
    };
  });
}

// ------------------------------------------------------------
// LOAD VIEW
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
    if (!res.ok) {
      throw new Error(`View ${view} nicht ladbar`);
    }

    const html = await res.text();
    contentEl.innerHTML = html;

    // Person-Key global verfügbar machen (für graph.js etc.)
    window.PILOTAPP_PERSON = state.currentPerson;

  } catch (err) {
    showError(`Fehler beim Laden der Ansicht: ${view}`, err);
  }
}

// ------------------------------------------------------------
// REFRESH
// ------------------------------------------------------------
refreshBtn.onclick = async () => {
  try {
    await initApp();
  } catch (err) {
    showError("Refresh fehlgeschlagen", err);
  }
};

// ------------------------------------------------------------
// STATE PERSISTENCE
// ------------------------------------------------------------
function persistState() {
  localStorage.setItem("pilotapp_person", state.currentPerson);
  localStorage.setItem("pilotapp_view", state.currentView);
}

function restoreState() {
  const p = localStorage.getItem("pilotapp_person");
  const v = localStorage.getItem("pilotapp_view");

  if (p) state.currentPerson = p;
  if (v) state.currentView = v;
}

// ------------------------------------------------------------
// UI HELPERS
// ------------------------------------------------------------
function updateRefreshTime() {
  const now = new Date();
  refreshTimeEl.textContent = now.toLocaleTimeString("de-DE");
}

function showError(msg, err) {
  console.error(msg, err);
  contentEl.innerHTML = `
    <div class="error-box">
      <strong>${msg}</strong>
      <pre>${err?.message || err}</pre>
    </div>
  `;
}