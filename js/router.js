/* Simple view router */
import { state, saveState } from "./state.js";

export async function loadView(viewName) {
  state.view = viewName;
  saveState();

  const main = document.querySelector("main");
  if (!main) return;

  let path = "";
  if (viewName === "short") path = "views/short.html";
  else if (viewName === "long") path = "views/long.html";
  else return;

  const res = await fetch(path, { cache: "no-store" });
  const html = await res.text();
  main.innerHTML = html;
}
