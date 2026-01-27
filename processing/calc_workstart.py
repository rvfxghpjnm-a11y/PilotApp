# processing/calc_workstart.py
# PilotApp v1 – FINAL
#
# Berechnet Arbeitsbeginn-Zeiten aus integrierten Daten.
# Verantwortung:
# - Ableitung von Workstart je Lotse
# - keine Zustandsentscheidung
# - keine Push-Logik
#
# Annahmen:
# - Daten kommen aus merge_sources()
# - Falls keine Workstart-Info vorhanden ist, wird None gesetzt

from typing import Dict, Any
from datetime import datetime


def calc_workstart(merged: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ergänzt die integrierten Daten um Workstart-Informationen.

    Rückgabe:
    merged (mutiert) mit zusätzlichem Schlüssel:
    merged['workstart']
    """

    workstart = None

    # Beispiel: Ableitung aus AEGIR Seelotsen (ETA / Abteilungszeit)
    seelotsen = merged.get("aegir", {}).get("seelotsen", [])
    if seelotsen:
        # defensiv: erster gefundener Eintrag
        eta = seelotsen[0].get("eta")
        if eta:
            workstart = eta

    merged["workstart"] = workstart
    merged["workstart_generated_at"] = datetime.utcnow().isoformat()

    return merged
