// js/state.js
// ============================================================
// PILOTAPP STATE – FINAL
// ============================================================

export const state = {
  persons: [],
  currentPerson: null,
  currentView: "short",
  lastRefresh: null
};

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

export async function initState() {
  // State aus localStorage wiederherstellen
  const savedPerson = localStorage.getItem("pilotapp_person");
  const savedView = localStorage.getItem("pilotapp_view");

  if (savedView) state.currentView = savedView;

  // Personen-Index laden
  try {
    const res = await fetch("data/workstart_index.json", {
      cache: "no-store"
    });

    if (!res.ok) throw new Error("index nicht ladbar");

    const index = await res.json();
    state.persons = index.persons || [];

    // Person setzen
    if (savedPerson && state.persons.find(p => p.key === savedPerson)) {
      state.currentPerson = savedPerson;
    } else if (state.persons.length > 0) {
      state.currentPerson = state.persons[0].key;
    }

    state.lastRefresh = new Date();

  } catch (err) {
    console.error("STATE INIT ERROR", err);
    state.persons = [];
    state.currentPerson = null;
  }
}

// ------------------------------------------------------------
// SETTER
// ------------------------------------------------------------

export function setPerson(key) {
  state.currentPerson = key;
  localStorage.setItem("pilotapp_person", key);
}

export function setView(view) {
  state.currentView = view;
  localStorage.setItem("pilotapp_view", view);
}