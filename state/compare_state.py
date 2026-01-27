# state/compare_state.py
# PilotApp v3 – FINAL
#
# Vergleicht alten und neuen Status
# Grundlage für "Changed"-Erkennung

from typing import Dict


def compare_state(previous: Dict | None, current: Dict) -> Dict:
    """
    Vergleicht alten und neuen Status.
    """

    if not previous:
        return {
            "changed": True,
            "from": None,
            "to": {
                "state": current.get("state"),
                "substate": current.get("substate"),
            },
        }

    prev_state = previous.get("state")
    prev_sub   = previous.get("substate")

    curr_state = current.get("state")
    curr_sub   = current.get("substate")

    changed = (prev_state != curr_state) or (prev_sub != curr_sub)

    return {
        "changed": changed,
        "from": {
            "state": prev_state,
            "substate": prev_sub,
        },
        "to": {
            "state": curr_state,
            "substate": curr_sub,
        },
    }