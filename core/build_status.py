# core/build_status.py
# PilotApp v3 – FINAL
#
# Baut den finalen Status pro Ziellotse
# -> EINZIGE Quelle der Wahrheit für App-Zustand

from typing import Dict


def build_status(
    lotse: dict,
    state_result: Dict,
    processed_data: Dict,
    previous_status: Dict | None = None,
) -> Dict:
    """
    Baut den finalen Status-Datensatz für einen Ziellotsen.
    """

    status: Dict = {
        "lotse": {
            "vorname": lotse["vorname"],
            "nachname": lotse["nachname"],
        },

        # -------------------------
        # STATE (führend)
        # -------------------------
        "state": state_result.get("state"),
        "substate": state_result.get("substate"),

        # -------------------------
        # AEGIR (relevant, konsolidiert)
        # -------------------------
        "aegir": {
            "in_gesamtboert": processed_data.get("in_gesamtboert"),
            "in_seelotsen": processed_data.get("in_seelotsen"),
            "seelotsen_typ": processed_data.get("seelotsen_typ"),
            "workstart": processed_data.get("workstart"),
            "status_text": (
                processed_data.get("aegir_status", {}) or {}
            ).get("text"),
        },

        # -------------------------
        # POSITIONS (für Push / Anzeige)
        # -------------------------
        "positions": processed_data.get("positions"),

    }

    # -------------------------
    # Vorheriger Zustand (optional)
    # -------------------------
    if previous_status:
        status["previous_state"] = previous_status.get("state")
        status["previous_substate"] = previous_status.get("substate")

    return status