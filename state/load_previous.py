# state/load_previous.py
# PilotApp v1 – FINAL
#
# Lädt den vorherigen Status eines Ziellotsen.
# Keine Logik, kein Fallback außer None.

import json
from pathlib import Path


def load_previous_status(status_path: Path) -> dict | None:
    if not status_path.exists():
        return None

    try:
        with status_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None
