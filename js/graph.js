// js/graph.js
console.log("graph.js LOADED");

const canvas = document.getElementById("workstartChart");
if (!canvas) {
  alert("Canvas NICHT gefunden");
} else {
  alert("Canvas gefunden");
}

if (typeof Chart === "undefined") {
  alert("Chart.js NICHT geladen");
} else {
  alert("Chart.js OK");
}

const ctx = canvas.getContext("2d");

new Chart(ctx, {
  type: "line",
  data: {
    labels: ["A", "B", "C"],
    datasets: [{
      label: "TEST",
      data: [1, 5, 3],
      borderColor: "red",
      borderWidth: 2
    }]
  },
  options: {
    responsive: true
  }
});