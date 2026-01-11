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

export function setPerson(key) {
  state.currentPerson = key;
  localStorage.setItem("pilotapp_person", key);
}

export function setView(view) {
  state.currentView = view;
  localStorage.setItem("pilotapp_view", view);
}

export async function initState() {
  // Restore view/person
  const p = localStorage.getItem("pilotapp_person");
  const v = localStorage.getItem("pilotapp_view");
  if (p) state.currentPerson = p;
  if (v) state.currentView = v;

  // 🔑 PERSONEN AUS INDEX LADEN
  const res = await fetch("data/workstart_index.json", { cache: "no-store" });
  const data = await res.json();

  state.persons = data.persons || [];

  // Fallback: erste Person automatisch
  if (!state.currentPerson && state.persons.length > 0) {
    state.currentPerson = state.persons[0].key;
  }

  state.lastRefresh = new Date();
}