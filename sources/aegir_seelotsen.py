# sources/aegir_seelotsen.py
# PilotApp v3 – FINAL
#
# AEGIR – Abgeteilte Seelotsen
# - nutzt bestehende, funktionierende AEGIR-Session
# - KEINE Login-Logik
# - KEINE Seiteneffekte
# - robust gegen Layout-/Wrapper-Tabellen
#
# Liefert:
# [
#   {
#     "nachname": "...",
#     "vorname": "...",
#     "task": "...",        # Kanalbört / Seebört / Wachgänger
#     "fahrzeug": "...",    # z.B. WL-SEE
#     "zeit": "...",        # Zeit / ETA
#     "raw": "..."
#   },
#   ...
# ]

from typing import List, Dict
from bs4 import BeautifulSoup

from sources.aegir_session import get_aegir_session
from config.aegir import AEGIR_SEELOTSEN_URL, AEGIR_TIMEOUT


def _split_name(name_raw: str):
    """
    Erwartet: 'Nachname, Vorname'
    """
    if "," not in name_raw:
        return None, None
    nachname, vorname = name_raw.split(",", 1)
    return nachname.strip(), vorname.strip()


def fetch_seelotsen() -> List[Dict]:
    session = get_aegir_session()

    resp = session.get(AEGIR_SEELOTSEN_URL, timeout=AEGIR_TIMEOUT)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    result: List[Dict] = []

    # ---------------------------------------------------------
    # STRATEGIE:
    # - AEGIR-Seelotsen stehen in Tabellen mit >= 5 TDs
    # - Spaltenreihenfolge (realistisch, stabil):
    #   [Nr] [Name] [Zeit] [Aufgabe] [Fahrzeug]
    # - Header-/Layout-Tabellen haben < 5 TDs → werden ignoriert
    # ---------------------------------------------------------

    for tr in soup.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 5:
            continue

        cols = [td.get_text(strip=True) for td in tds[:5]]

        nr, name_raw, zeit, aufgabe, fahrzeug_raw = cols

        if "," not in name_raw:
            continue

        nachname, vorname = _split_name(name_raw)
        if not nachname or not vorname:
            continue

        # Fahrzeug ggf. mit Route "(A-B)" → nur Fahrzeugname
        fahrzeug = fahrzeug_raw
        if "(" in fahrzeug_raw:
            fahrzeug = fahrzeug_raw.split("(", 1)[0].strip()

        entry = {
            "nachname": nachname,
            "vorname": vorname,
            "task": aufgabe,
            "fahrzeug": fahrzeug,
            "zeit": zeit,
            "raw": " | ".join(cols),
        }

        result.append(entry)

    return result