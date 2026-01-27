# state/persist_state.py
# PilotApp v1 – FINAL
#
# Persistiert den aktuellen Status als JSON.

import json
from pathlib import Path


def persist_status(status: dict, status_path: Path) -> None:
    status_path.parent.mkdir(parents=True, exist_ok=True)

    with status_path.open("w", encoding="utf-8") as f:
        json.dump(status, f, ensure_ascii=False, indent=2)
