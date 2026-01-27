# output/write_pilot.py
# PilotApp v3 – FINAL
#
# Vereinheitlichte Ziellotsen-Ausgabe
# - KEINE Logik
# - KEINE Berechnung
# - NUR Zusammenführung
# - eine Datei = ein Lotse

from pathlib import Path
from datetime import datetime
import json


def write_pilot_output(
    base_dir: Path,
    lotse: dict,
    merged: dict,
    current_status: dict,
) -> Path:
    output_dir = base_dir / "output"
    output_dir.mkdir(exist_ok=True)

    filename = f"pilot_{lotse['nachname'].lower()}_{lotse['vorname'].lower()}.json"
    path = output_dir / filename

    data = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "lotse": {
            "vorname": lotse["vorname"],
            "nachname": lotse["nachname"],
        },

        # ---------------- Fachlicher Zustand ----------------
        "state": current_status.get("state"),
        "substate": current_status.get("substate"),
        "changed": current_status.get("changed"),

        # ---------------- AEGIR ----------------
        "aegir": {
            "status": merged.get("aegir", {}).get("status"),
            "gesamtboert": merged.get("aegir", {}).get("gesamtboert"),
            "seelotsen": merged.get("aegir", {}).get("seelotsen"),
        },

        # ---------------- Berechnete Daten ----------------
        "positions": merged.get("positions"),
        "workstart": merged.get("workstart"),

        # ---------------- Meta ----------------
        "sources": ["AEGIR"],
    }

    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    return path