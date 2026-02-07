let DATA = null;
let HISTORY = null;

const refreshInterval = 120000; // 2 Minuten

// ----------------------------
// LOAD
// ----------------------------
async function loadData() {
    const res = await fetch("data/web_data.json?v=" + Date.now());
    DATA = await res.json();

    const res2 = await fetch("data/start_work_targets_history.json?v=" + Date.now());
    HISTORY = await res2.json();

    initUI();
}

setInterval(loadData, refreshInterval);
loadData();

// ----------------------------
// UI
// ----------------------------
function initUI() {
    const lotseSelect = document.getElementById("lotseSelect");
    const viewSelect = document.getElementById("viewSelect");

    lotseSelect.innerHTML = "";

    DATA.lotsen.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.key;
        opt.textContent = l.name;
        lotseSelect.appendChild(opt);
    });

    const savedLotse = localStorage.getItem("lotse");
    if (savedLotse) lotseSelect.value = savedLotse;

    const savedView = localStorage.getItem("view");
    if (savedView) viewSelect.value = savedView;

    render();
}

document.getElementById("lotseSelect").addEventListener("change", () => {
    localStorage.setItem("lotse", lotseSelect.value);
    render();
});

document.getElementById("viewSelect").addEventListener("change", () => {
    localStorage.setItem("view", viewSelect.value);
    render();
});

// ----------------------------
// RENDER
// ----------------------------
function render() {
    const lotseKey = document.getElementById("lotseSelect").value;
    const view = document.getElementById("viewSelect").value;
    const container = document.getElementById("content");

    container.innerHTML = "";

    if (view === "kanal") {
        renderKanal(container);
        return;
    }

    const lotse = DATA.lotsen.find(l => l.key === lotseKey);
    if (!lotse) return;

    if (view === "gesamtboert") renderGesamtboert(container, lotse);
    if (view === "seelotsen") renderSeelotsen(container, lotse);
    if (view === "graph") renderGraph(container, lotseKey);
}

// ----------------------------
// VIEWS
// ----------------------------
function renderGesamtboert(container, lotse) {
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(lotse, null, 2);
    container.appendChild(pre);
}

function renderSeelotsen(container, lotse) {
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(lotse.seelotsen || {}, null, 2);
    container.appendChild(pre);
}

function renderKanal(container) {
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(DATA.channel, null, 2);
    container.appendChild(pre);
}

function renderGraph(container, lotseKey) {
    if (!HISTORY) return;

    const rows = HISTORY.history.map(h => {
        const t = h.targets.find(x => x.name === lotseKey);
        if (!t) return null;
        return `${h.timestamp} → ${t.m1}`;
    }).filter(Boolean);

    const pre = document.createElement("pre");
    pre.textContent = rows.join("\n");
    container.appendChild(pre);
}