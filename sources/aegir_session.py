# sources/aegir_session.py
# PilotApp v3 – FINAL
#
# ZENTRALE AEGIR SESSION
# - genau EIN Login
# - genau EINE Session
# - basiert 1:1 auf funktionierendem Alt-Skript
#
# WICHTIG:
# - initialer GET ist notwendig (JSESSIONID)
# - danach POST auf j_spring_security_check
# - keine weiteren Tricks

import requests

from config.aegir import (
    AEGIR_USER,
    AEGIR_PASS,
    AEGIR_LOGIN_URL,
    AEGIR_TIMEOUT,
)


class AegirLoginError(RuntimeError):
    pass


def get_aegir_session() -> requests.Session:
    """
    Baut eine authentifizierte AEGIR-Session auf.

    Ablauf (bewiesen funktionierend):
    1) GET /aegir        -> Session + Cookies
    2) POST Login        -> Auth
    """

    session = requests.Session()

    # 1) Initialer GET (wichtig für JSESSIONID)
    try:
        session.get(
            "https://nok2.aegir-pms.com/aegir",
            timeout=AEGIR_TIMEOUT,
        )
    except Exception as exc:
        raise AegirLoginError(
            f"AEGIR Initial-GET fehlgeschlagen: {exc}"
        ) from exc

    # 2) Login
    try:
        resp = session.post(
            AEGIR_LOGIN_URL,
            data={
                "j_username": AEGIR_USER,
                "j_password": AEGIR_PASS,
            },
            timeout=AEGIR_TIMEOUT,
        )
    except Exception as exc:
        raise AegirLoginError(
            f"AEGIR Login-POST fehlgeschlagen: {exc}"
        ) from exc

    # 3) Validierung
    if "Benutzername und/oder Passwort ist falsch" in resp.text:
        raise AegirLoginError("AEGIR Login abgelehnt (Credentials falsch)")

    if not session.cookies:
        raise AegirLoginError("AEGIR Login ohne Session-Cookies")

    return session