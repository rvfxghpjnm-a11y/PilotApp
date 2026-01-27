# core/decide_state.py
# PilotApp v1 – FINAL
#
# Entscheidet den Hauptzustand des Ziellotsen.
# Diese Datei ist nach Freigabe für v1 eingefroren.
#
# Zustände:
# - FREI
# - GESAMTBÖRT
# - SEELOTSE
#
# Priorität:
# GESAMTBÖRT > SEELOTSE > FREI


def decide_state(processed_data: dict) -> dict:
    """
    Entscheidet den Zustand anhand vorbereiteter Daten.

    Erwartet in processed_data (minimal):
    - 'in_gesamtboert': bool
    - 'in_seelotsen': bool
    - 'seelotsen_typ': optional (KANAL / SEE / WACHGÄNGER)

    Rückgabe:
    {
        'state': 'GESAMTBÖRT' | 'SEELOTSE' | 'FREI',
        'substate': str | None
    }
    """

    # Default
    state = "FREI"
    substate = None

    # Höchste Priorität: Gesamtbört
    if processed_data.get("in_gesamtboert") is True:
        state = "GESAMTBÖRT"
        substate = None
        return {
            "state": state,
            "substate": substate
        }

    # Zweite Priorität: Seelotse
    if processed_data.get("in_seelotsen") is True:
        state = "SEELOTSE"
        substate = processed_data.get("seelotsen_typ")
        return {
            "state": state,
            "substate": substate
        }

    # Sonst: Frei
    return {
        "state": state,
        "substate": substate
    }
