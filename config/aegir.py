# config/aegir.py
# PilotApp v2 – FINAL
#
# AEGIR KONFIGURATION
# Diese Datei basiert 1:1 auf pilotapp_config.py (v1),
# OHNE Platzhalter, OHNE Interpretation, OHNE Änderungen.
#
# Quelle der Wahrheit:
# - LOGIN_URL
# - URLS_AEGIR
# - AEGIR_USER / AEGIR_PASS
#
# Diese Datei ist bewusst explizit und eigenständig,
# damit PilotAppv2 KEINE versteckten Abhängigkeiten zu v1 hat.

# ------------------------------------------------------------
# Zugangsdaten
# ------------------------------------------------------------

AEGIR_USER = "skonietzka"
AEGIR_PASS = "skonietzka2024"

# ------------------------------------------------------------
# Login
# ------------------------------------------------------------

AEGIR_LOGIN_URL = "https://nok2.aegir-pms.com/aegir/j_spring_security_check"

# ------------------------------------------------------------
# Endpunkte
# ------------------------------------------------------------

AEGIR_GESAMTBOERT_URL = "https://nok2.aegir-pms.com/aegir/board?boardId=-1"
AEGIR_SEELOTSEN_URL  = "https://nok2.aegir-pms.com/aegir/workingPilots"
AEGIR_STATUS_URL     = "https://nok2.aegir-pms.com/aegir/board?boardId=-1"

# ------------------------------------------------------------
# Optional / später
# ------------------------------------------------------------

AEGIR_MELDUNGEN_KIEL_URL         = "https://nok2.aegir-pms.com/aegir/trips?region=TRIPS_AREA_1"
AEGIR_MELDUNGEN_RUESTERBERGEN_URL = "https://nok2.aegir-pms.com/aegir/trips?region=TRIPS_AREA_2"

# ------------------------------------------------------------
# Timeout
# ------------------------------------------------------------

AEGIR_TIMEOUT = 15
