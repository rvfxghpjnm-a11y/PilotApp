# processing/calc_positions.py
# PilotApp v1 – FINAL
#
# Ermittelt Positionsinformationen und Pfeilrelationen.
# Verantwortung:
# - Ableitung der eigenen Position aus Gesamtbört
# - Erkennung von Pfeilen (UP/DOWN) und Vergütung
# - Vorbereitung der Daten für Push VG1
#
# Keine Zustandsentscheidung, kein Push, keine Datei-I/O.

from typing import Dict, Any, List, Optional


def _find_own_entry(gesamtboert: List[Dict], fullname: str) -> Optional[Dict]:
    for entry in gesamtboert:
        if entry.get("name") == fullname:
            return entry
    return None


def _classify_arrow(entry: Dict) -> Dict[str, Any]:
    arrow = entry.get("arrow")
    has_bonus = entry.get("has_bonus", False)

    result = {
        "arrow": arrow,              # 'UP' | 'DOWN' | None
        "has_bonus": bool(has_bonus),
        "is_good_arrow": False       # Bewertung erfolgt hier fachlich
    }

    # Gute-Pfeil-Logik (VG1-Grundlage):
    # - DOWN + Vergütung = gut
    # - UP ohne Vergütung = gut
    if arrow == "DOWN" and has_bonus:
        result["is_good_arrow"] = True
    elif arrow == "UP" and not has_bonus:
        result["is_good_arrow"] = True

    return result


def calc_positions(merged: Dict[str, Any], lotse: Dict[str, str]) -> Dict[str, Any]:
    """
    Ergänzt merged-Daten um Positions- und Pfeil-Informationen.

    Erwartet:
    - merged['aegir']['gesamtboert'] : Liste der Gesamtbört-Einträge
    - lotse {'vorname', 'nachname'}

    Ergänzt:
    merged['positions'] = {
        'own': {
            'position': int | None,
            'arrow': 'UP' | 'DOWN' | None,
            'has_bonus': bool,
            'is_good_arrow': bool
        },
        'raw_count': int
    }
    """

    gesamtboert = merged.get("aegir", {}).get("gesamtboert", []) or []
    fullname = f"{lotse.get('nachname')} {lotse.get('vorname')}"

    own_entry = _find_own_entry(gesamtboert, fullname)

    own_position = None
    arrow_info = {
        "arrow": None,
        "has_bonus": False,
        "is_good_arrow": False
    }

    if own_entry:
        own_position = own_entry.get("position")
        arrow_info = _classify_arrow(own_entry)

    merged["positions"] = {
        "own": {
            "position": own_position,
            **arrow_info
        },
        "raw_count": len(gesamtboert)
    }

    return merged
