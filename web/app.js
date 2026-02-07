// PilotApp v4 – saubere View-Logik + korrekte JSON-Pfade

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fehler beim Laden von ${path}`);
  return res.json();
}

/* -------------------------
   TAB / VIEW STEUERUNG
-------------------------- */
function switchView(viewName) {
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
  });

  document.querySelectorAll(".tab").forEach(t => {
    t.classList.remove("active");
  });

  document.getElementById(`view-${viewName}`)?.classList.add("active");
  document.querySelector(`.tab[data-view="${viewName}"]`)?.classList.add("active");

  if (viewName === "lage") loadLage();
  if (viewName === "boert") loadBoert();
}

/* -------------------------
   LAGE
-------------------------- */
async function loadLage() {
  try {
    const data = await loadJSON("../output/lage.json");
    const lage = data.lage || {};

    setBlock("lage-ruesterbergen", lage.ruesterbergen?.lines);
    setBlock("lage-leuchtturm-kiel", lage.leuchtturm_kiel?.lines);
    setBlock("lage-holtenau", lage.holtenau?.lines);
  } catch (e) {
    console.error("Lage Fehler:", e);
  }
}

function setBlock(id, lines) {
  const el = document.getElementById(id);
  if (!el) return;

  el.innerHTML = "";

  if (!lines || lines.length === 0) {
    el.textContent = "– keine Meldungen –";
    return;
  }

  lines.forEach(l => {
    const p = document.createElement("div");
    p.className = "lage-line";
    p.textContent = l.text;
    el.appendChild(p);
  });
}

/* -------------------------
   GESAMTBÖRT
-------------------------- */
async function loadBoert() {
  const box = document.getElementById("boert-list");
  if (!box) return;

  box.textContent = "– wird geladen –";

  try {
    const data = await loadJSON("../output/aegir_gesamtboert.json");
    const entries = data.entries || [];

    box.innerHTML = "";

    entries.forEach(e => {
      const row = document.createElement("div");
      row.className = "boert-row";

      row.innerHTML = `
        <strong>#${e.pos}</strong> ${e.name}<br>
        <span class="muted">${e.revier} · ${new Date(e.time).toLocaleString("de-DE")} · TG ${e.tg}</span>
      `;

      box.appendChild(row);
    });

  } catch (e) {
    box.textContent = "Fehler beim Laden der Gesamtbört";
    console.error("Bört Fehler:", e);
  }
}

/* -------------------------
   INIT
-------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      switchView(btn.dataset.view);
    });
  });

  // Startansicht
  switchView("lage");
});