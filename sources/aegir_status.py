# sources/aegir_status.py
# PilotApp v3 – FINAL
#
# AEGIR Status ("oberer Kopf")
# - nutzt zentrale AEGIR-Session
# - genau EIN Request
# - keine Login-Logik
# - robust gegen Login-Seiten

from bs4 import BeautifulSoup

from sources.aegir_session import get_aegir_session
from config.aegir import AEGIR_STATUS_URL, AEGIR_TIMEOUT


def fetch_status() -> dict:
    """
    Ruft den AEGIR-Statusbereich ab (oberer Kopf).
    Gibt immer ein Dict zurück, auch bei Login-Fehlern.
    """
    session = get_aegir_session()

    resp = session.get(AEGIR_STATUS_URL, timeout=AEGIR_TIMEOUT)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    text = soup.get_text(" ", strip=True)

    return {
        "text": text,
        "raw": resp.text,
    }