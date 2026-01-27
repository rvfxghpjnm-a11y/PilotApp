# state/workstart_history.py
# PilotApp v1 – FINAL
#
# Führt eine einfache Historie der Arbeitsbeginn-Zeiten.

import json
from pathlib import Path
from datetime import datetime


def append_workstart(history_path: Path, workstart_time: str) -> None:
    history_path.parent.mkdir(parents=True, exist_ok=True)

    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "workstart": workstart_time
    }

    history = []
    if history_path.exists():
        try:
            with history_path.open("r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []

    history.append(entry)

    with history_path.open("w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
