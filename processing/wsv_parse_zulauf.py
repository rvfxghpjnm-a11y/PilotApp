# processing/wsv_parse_zulauf.py
# PilotApp v2 – FINAL
#
# WSV Zulauf Parser + First-Seen
# - nutzt sources.wsv_queues
# - mind-map-konform (4 Queues)
# - KEIN Login
# - KEIN Drive
# - KEIN Push

from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

from sources.wsv_queues import fetch_all_queues


# ------------------------------------------------------------
# Basis / Pfade
# ------------------------------------------------------------

APP_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = APP_DIR / "data" / "wsv"
DATA_DIR.mkdir(parents=True, exist_ok=True)


# ------------------------------------------------------------
# Hilfsfunktionen (1:1 aus v1, minimal angepasst)
# ------------------------------------------------------------

def pick(src: dict, *keys):
    for k in keys:
        v = src.get(k)
        if v not in (None, "", "--"):
            return v
    return None


def parse_ms(ms) -> Optional[datetime]:
    if ms in (None, "", "--"):
        return None
    try:
        return datetime.fromtimestamp(int(ms) / 1000)
    except Exception:
        return None


def fmt_delta_minutes(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


# ------------------------------------------------------------
# First-Seen State
# ------------------------------------------------------------

def _first_seen_path(queue_key: str) -> Path:
    return DATA_DIR / f"zulauf_first_seen_{queue_key}.json"


def load_first_seen(queue_key: str) -> Dict[str, str]:
    pf = _first_seen_path(queue_key)
    if pf.exists():
        try:
            return json.loads(pf.read_text("utf-8"))
        except Exception:
            pass
    return {}


def save_first_seen(queue_key: str, state: Dict[str, str]):
    pf = _first_seen_path(queue_key)
    pf.write_text(json.dumps(state, ensure_ascii=False, indent=2), "utf-8")


# ------------------------------------------------------------
# Parser
# ------------------------------------------------------------

def parse_zulaeufe() -> Dict[str, dict]:
    """
    Parst alle WSV-Zuläufe (4 Queues) inkl. First-Seen.
    Gibt strukturierte Ergebnisse zurück und schreibt JSON-Dateien.
    """
    raw = fetch_all_queues()
    now_dt = datetime.now()

    results: Dict[str, dict] = {}

    for queue_key, data in raw.items():
        first_seen = load_first_seen(queue_key)
        entries: List[dict] = []

        for s in data:
            name = s.get("pseudo__vessel__combinedName")
            if not name:
                continue

            eta_schleuse = parse_ms(s.get("sortable_eta"))
            if not eta_schleuse or eta_schleuse.year < 2020:
                continue

            eta_rueb = parse_ms(s.get("voyage__nok__etaRuesterbergen"))

            if name not in first_seen:
                first_seen[name] = now_dt.strftime("%Y-%m-%d %H:%M")

            first_seen_dt = datetime.strptime(first_seen[name], "%Y-%m-%d %H:%M")

            delta_rueb_schleuse = None
            delta_start_rueb = None

            if eta_rueb:
                delta_rueb_schleuse = fmt_delta_minutes(
                    abs(int((eta_rueb - eta_schleuse).total_seconds()) // 60)
                )
                delta_start_rueb = fmt_delta_minutes(
                    abs(int((eta_rueb - first_seen_dt).total_seconds()) // 60)
                )

            entries.append({
                # --- Basis ---
                "name": name,
                "eta_schleuse": eta_schleuse.strftime("%Y-%m-%d %H:%M"),
                "eta_rueb": eta_rueb.strftime("%Y-%m-%d %H:%M") if eta_rueb else None,
                "first_seen": first_seen[name],
                "delta_rueb_schleuse": delta_rueb_schleuse,
                "delta_start_rueb": delta_start_rueb,

                # --- Zusatz (wie v1, minimal) ---
                "ship_name": name,
                "vg": pick(s, "pseudo__voyage__nok__combinedTrafficGroup"),
                "length_m": pick(s, "vessel__user__length", "vessel__length"),
                "beam_m": pick(s, "vessel__user__width", "vessel__beam"),
                "draft_m": pick(s, "voyage__actualDraught"),
            })

        save_first_seen(queue_key, first_seen)

        out = {
            "generated_at": now_dt.strftime("%Y-%m-%d %H:%M"),
            "queue": queue_key,
            "entries": entries,
        }

        # Datei schreiben (lokal)
        pf = DATA_DIR / f"Zulauf_{queue_key}.json"
        pf.write_text(json.dumps(out, ensure_ascii=False, indent=2), "utf-8")

        results[queue_key] = out

    return results