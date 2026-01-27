# sources/wsv_queues.py
# PilotApp v2 – FINAL
#
# WSV Queue Abruf (mind-map-konform):
# - nutzt zentrale WSV-Session
# - KEIN Login hier
# - KEIN Parsing
# - KEINE Seiteneffekte
#
# Liefert reines JSON (aaData) je Queue.

from typing import Dict, List

from sources.wsv_session import get_wsv_session
from config.wsv import NOK_BASES, WSV_TIMEOUT


# ------------------------------------------------------------
# Queue-Definitionen (EXAKT laut Mind-Map)
# ------------------------------------------------------------

WSV_QUEUES = {
    # Kiel
    "kiel_innen":  "/VesselTableServlet?q=Q&tid=QUEUE_KIEL_INTERNAL",
    "kiel_aussen": "/VesselTableServlet?q=Q&tid=QUEUE_KIEL_EXTERNAL",

    # Brunsbüttel
    "brb_innen":   "/VesselTableServlet?q=Q&tid=QUEUE_BRB_INTERNAL",
    "brb_aussen":  "/VesselTableServlet?q=Q&tid=QUEUE_BRB_EXTERNAL",
}


class WsvQueueError(RuntimeError):
    pass


def fetch_queue(key: str) -> List[dict]:
    """
    Holt eine einzelne WSV-Queue als Roh-JSON (aaData).
    """
    if key not in WSV_QUEUES:
        raise KeyError(f"Unbekannte WSV-Queue: {key}")

    session = get_wsv_session()
    path = WSV_QUEUES[key]

    last_error = None

    for base in NOK_BASES:
        try:
            resp = session.get(
                base + path,
                timeout=WSV_TIMEOUT,
            )
            resp.raise_for_status()

            js = resp.json()
            if "aaData" in js:
                return js["aaData"]

        except Exception as exc:
            last_error = exc
            continue

    raise WsvQueueError(
        f"WSV Queue '{key}' konnte über keine Base geladen werden. "
        f"Letzter Fehler: {last_error}"
    )


def fetch_all_queues() -> Dict[str, List[dict]]:
    """
    Holt alle definierten WSV-Queues.
    """
    return {key: fetch_queue(key) for key in WSV_QUEUES}