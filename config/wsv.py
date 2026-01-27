# config/wsv.py
# PilotApp v2 – FINAL
#
# Zentrale WSV-Konfiguration
# Quelle: v1 WSV-Parser (unverändert übernommen)

# ------------------------------------------------------------
# Zugangsdaten (WSV / NOK)
# ------------------------------------------------------------

NOK_USER = "LOT_skonietzka"
NOK_PASS = "Mary!Jane2024"

# ------------------------------------------------------------
# WSV Basen (Failover!)
# ------------------------------------------------------------

NOK_BASES = [
    "https://smv-whv.mvt.wsv.bund.de/nok",
    "https://smv-brb.mvt.wsv.bund.de/nok",
]

# ------------------------------------------------------------
# Timeout (Sekunden)
# ------------------------------------------------------------

WSV_TIMEOUT = 10