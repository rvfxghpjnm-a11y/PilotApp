# sources/wsv_session.py
# PilotApp v2 – FINAL
#
# Zentrale WSV-Session:
# - genau EIN Login
# - genau EINE Session
# - Failover über mehrere WSV-Basen
# - KEINE Queue-Logik
# - KEINE Fachlogik
#
# Diese Datei ist der EINZIGE Ort mit WSV-Login-Logik.

import requests
from typing import List

from config.wsv import (
    NOK_BASES,
    NOK_USER,
    NOK_PASS,
    WSV_TIMEOUT,
)


class WsvLoginError(RuntimeError):
    pass


def get_wsv_session() -> requests.Session:
    """
    Baut eine authentifizierte WSV-Session auf.
    Probiert alle NOK_BASES der Reihe nach (Failover).
    Gibt die erste funktionierende Session zurück.
    """
    last_error = None

    for base in NOK_BASES:
        session = requests.Session()
        try:
            # 1) Initiale Seite laden (JSF / Cookie-Init)
            session.get(
                f"{base}/faces/nokweb/index.xhtml",
                timeout=WSV_TIMEOUT,
            )

            # 2) Login (JSF Security)
            resp = session.post(
                f"{base}/faces/nokweb/j_security_check",
                data={
                    "j_username": NOK_USER,
                    "j_password": NOK_PASS,
                },
                timeout=WSV_TIMEOUT,
                allow_redirects=True,
            )

            # 3) Minimaler Erfolgscheck
            if not session.cookies:
                raise WsvLoginError(
                    f"WSV Login ohne Cookies bei Base {base}"
                )

            # Erfolg → Session ist gültig
            return session

        except Exception as exc:
            last_error = exc
            continue

    raise WsvLoginError(
        f"WSV Login fehlgeschlagen für alle Basen: {NOK_BASES}. "
        f"Letzter Fehler: {last_error}"
    )