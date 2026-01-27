# processing/merge_sources.py
# PilotApp v3 – FINAL (SIGNATURE-KORREKT)

from typing import Dict

from config.settings import ENABLE_WSV

# ------------------------------------------------------------
# AEGIR Sources (holen sich selbst die Session)
# ------------------------------------------------------------

from sources.aegir_gesamtboert import fetch_gesamtboert
from sources.aegir_seelotsen import fetch_seelotsen
from sources.aegir_status import fetch_status

# ------------------------------------------------------------
# WSV (optional)
# ------------------------------------------------------------

if ENABLE_WSV:
    from processing.wsv_parse_zulauf import parse_zulaeufe


def merge_sources() -> Dict:
    merged: Dict = {
        "aegir": {},
        "wsv": {},
    }

    # ---------------- AEGIR ----------------
    merged["aegir"]["gesamtboert"] = fetch_gesamtboert()
    merged["aegir"]["seelotsen"]   = fetch_seelotsen()
    merged["aegir"]["status"]      = fetch_status()

    # ---------------- WSV ------------------
    if ENABLE_WSV:
        merged["wsv"]["zulauf"] = parse_zulaeufe()
    else:
        merged["wsv"]["zulauf"] = {}

    return merged