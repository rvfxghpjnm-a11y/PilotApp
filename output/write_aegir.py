# output/write_aegir.py
# PilotApp v3 – FINAL
#
# Schreibt den vollständigen AEGIR-Zustand für einen Ziellotsen
# in eine JSON-Datei unter output/
#
# - überschreibend
# - keine Seiteneffekte
# - reine Ausgabe
# - robust gegen fehlende Teilbereiche

import json
from pathlib import Path
from datetime import datetime
from typing import Dict


def write_aegir_output(
    base_dir: Path,
    lotse: Dict,
    merged: Dict,
) -> None:
    """
    Schreibt output/aegir_<Nachname>_<Vorname>.json
    """

    output_dir = base_dir / "output"
    output_dir.mkdir(exist_ok=True)

    nachname = lotse["nachname"]
    vorname = lotse["vorname"]

    out_path = output_dir / f"aegir_{nachname}_{vorname}.json"

    # -----------------------------
    # AEGIR Daten
    # -----------------------------
    aegir = merged.get("aegir", {})

    gesamtboert = aegir.get("gesamtboert") or []
    seelotsen = aegir.get("seelotsen") or []
    status = aegir.get("status")

    # -----------------------------
    # Ziellotse in Seelotsen markieren
    # -----------------------------
    seelotsen_marked = []

    for entry in seelotsen:
        is_target = (
            entry.get("nachname") == nachname
            and entry.get("vorname") == vorname
        )

        e = dict(entry)
        e["is_target"] = is_target
        seelotsen_marked.append(e)

    # -----------------------------
    # State / Processing Infos
    # -----------------------------
    state = merged.get("state")
    workstart = merged.get("workstart")
    positions = merged.get("positions")

    # -----------------------------
    # Finale Struktur
    # -----------------------------
    out = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "lotse": {
            "vorname": vorname,
            "nachname": nachname,
        },
        "state": state,
        "workstart": workstart,
        "positions": positions,
        "aegir": {
            "status": status,
            "gesamtboert": gesamtboert,
            "seelotsen": seelotsen_marked,
        },
    }

    out_path.write_text(
        json.dumps(out, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )