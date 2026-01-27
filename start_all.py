#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# start_all.py
# PilotApp v3 – ONLINE TEST (AEGIR OUTPUT READY)
#
# WICHTIG:
# - genau EIN Durchlauf
# - echte AEGIR-Requests
# - kein Polling
# - kein Push
# - stabil gegen leere Seelotsenliste
#
# Wenn hier etwas schiefgeht: abbrechen, nichts automatisieren.

import json
from pathlib import Path

from config.settings import DEBUG
from config.targets import TARGET_LOTSEN

# Integration
from processing.merge_sources import merge_sources

# Processing
from processing.calc_workstart import calc_workstart
from processing.calc_positions import calc_positions

# Core
from core.decide_state import decide_state
from core.build_status import build_status

# State
from state.load_previous import load_previous_status
from state.compare_state import compare_state
from state.persist_state import persist_status

# Output
from output.write_pilot import write_pilot_output


# -------------------------------------------------
# MODE
# -------------------------------------------------
MODE = "ONLINE"   # NUR für bewussten Einzeltest!

BASE_DIR = Path(__file__).resolve().parent
STATUS_DIR = BASE_DIR / "data" / "status"


def run_for_lotse(lotse: dict) -> None:
    if MODE != "ONLINE":
        raise RuntimeError("Diese start_all.py ist NUR für ONLINE-Test gedacht")

    # -------------------------------------------------
    # 1) echte Sources (AEGIR / optional WSV)
    # -------------------------------------------------
    merged = merge_sources()

    # -------------------------------------------------
    # 2) Processing
    # -------------------------------------------------
    merged = calc_workstart(merged)
    merged = calc_positions(merged, lotse)

    # -------------------------------------------------
    # 3) processed_data für Core (FACHLICH KORREKT)
    # -------------------------------------------------
    positions = merged.get("positions", {}).get("own", {})

    seelotsen_list = merged.get("aegir", {}).get("seelotsen") or []

    own_seelotse = None
    for e in seelotsen_list:
        if (
            e.get("nachname", "").lower() == lotse["nachname"].lower()
            and e.get("vorname", "").lower() == lotse["vorname"].lower()
        ):
            own_seelotse = e
            break

    seelotsen_typ = None
    if own_seelotse:
        fahrzeug = (own_seelotse.get("fahrzeug") or "").upper()
        if fahrzeug == "WL-SEE":
            seelotsen_typ = "Seebört"
        else:
            seelotsen_typ = own_seelotse.get("task")

    processed_data = {
        "in_gesamtboert": positions.get("position") is not None,
        "in_seelotsen": own_seelotse is not None,
        "seelotsen_typ": seelotsen_typ,
        "workstart": merged.get("workstart"),
        "positions": merged.get("positions"),
        "aegir_status": merged.get("aegir", {}).get("status"),
    }

    # -------------------------------------------------
    # 4) State
    # -------------------------------------------------
    status_path = STATUS_DIR / (
        f"status_{lotse['nachname'].lower()}_{lotse['vorname'].lower()}.json"
    )

    previous_status = load_previous_status(status_path)

    state_result = decide_state(processed_data)

    current_status = build_status(
        lotse=lotse,
        state_result=state_result,
        processed_data=processed_data,
        previous_status=previous_status,
    )

    diff = compare_state(previous_status, current_status)

    # -------------------------------------------------
    # 5) ZUSAMMENFÜHREN – SCHRITT 1 (AEGIR + POSITIONEN)
    # -------------------------------------------------
    current_status["aegir"] = merged.get("aegir", {})
    current_status["positions"] = merged.get("positions", {})

    persist_status(current_status, status_path)

    # -------------------------------------------------
    # 6) PILOT-OUTPUT (ZIELDATEI)
    # -------------------------------------------------
    write_pilot_output(
        base_dir=BASE_DIR,
        lotse=lotse,
        merged=merged,
        current_status=current_status,
    )

    # -------------------------------------------------
    # 7) Konsole (Kontrolle)
    # -------------------------------------------------
    print(
        f"Lotse: {lotse['nachname']} | "
        f"State: {state_result['state']} | "
        f"Sub: {state_result.get('substate')} | "
        f"Pos: {positions.get('position')} | "
        f"Arrow: {positions.get('arrow')} | "
        f"Changed: {diff['changed']}"
    )


def main() -> None:
    for lotse in TARGET_LOTSEN:
        run_for_lotse(lotse)


if __name__ == "__main__":
    main()