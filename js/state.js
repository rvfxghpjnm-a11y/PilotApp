/* Global state + persistence */
export const state = {
  person: localStorage.getItem("pilotapp_person"),
  mode: localStorage.getItem("pilotapp_mode") || "short",
  view: localStorage.getItem("pilotapp_view") || "short", // short | long | graph
};

export function saveState() {
  if (state.person) localStorage.setItem("pilotapp_person", state.person);
  localStorage.setItem("pilotapp_mode", state.mode);
  localStorage.setItem("pilotapp_view", state.view);
}
