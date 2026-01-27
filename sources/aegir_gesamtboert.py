# sources/aegir_gesamtboert.py
# PilotApp v3 – FINAL
#
# AEGIR Gesamtbört – ONLINE
# - nutzt zentrale AEGIR-Session
# - genau EIN Request
# - keine Login-Logik
# - keine Fachlogik außerhalb Parsing

from typing import List, Dict
from bs4 import BeautifulSoup

from sources.aegir_session import get_aegir_session
from config.aegir import AEGIR_GESAMTBOERT_URL, AEGIR_TIMEOUT


def fetch_gesamtboert() -> List[Dict]:
    """
    Ruft die AEGIR-Gesamtbört einmalig ab und gibt strukturierte Rohdaten zurück.
    """
    session = get_aegir_session()

    resp = session.get(AEGIR_GESAMTBOERT_URL, timeout=AEGIR_TIMEOUT)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    rows = soup.find_all("tr")

    result: List[Dict] = []

    for row in rows:
        cols = [c.get_text(strip=True) for c in row.find_all("td")]
        if len(cols) < 6:
            continue

        pos = cols[0]
        if not pos.isdigit():
            continue

        entry = {
            "position": int(pos),
            "raw": " | ".join(cols),
            "cols": cols,
        }

        result.append(entry)

    return result