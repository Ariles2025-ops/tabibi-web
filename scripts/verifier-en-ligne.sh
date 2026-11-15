#!/usr/bin/env bash
# PORTE apres deploiement : echoue (exit 1) si le site en ligne n'est pas le commit attendu ou s'il est casse.
# Usage : scripts/verifier-en-ligne.sh [sha-attendu]   (par defaut : git rev-parse --short HEAD)
set -uo pipefail
SITE="https://tabibi.doctor"
ATTENDU="${1:-$(git rev-parse --short HEAD)}"
cb="cb=$(date +%s)"
echec=0
ok()  { echo "  OK   $1"; }
ko()  { echo "  ECHEC $1"; echec=1; }

# 1. Version en ligne = commit attendu (attend la fin du redemarrage, 3 min max).
for i in $(seq 1 60); do
  enligne="$(curl -fsS "$SITE/assets/version.txt?$cb" 2>/dev/null | tr -d '[:space:]')"
  [ "$enligne" = "$ATTENDU" ] && break
  sleep 3
done
[ "$enligne" = "$ATTENDU" ] && ok "version en ligne = $ATTENDU" || ko "version en ligne « $enligne » ≠ « $ATTENDU »"

# 2. 69 wilayas dans le referentiel servi.
n="$(curl -fsS "$SITE/assets/referentiel.json?$cb" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)["wilayas"]))' 2>/dev/null)"
[ "$n" = "69" ] && ok "69 wilayas" || ko "wilayas en ligne : ${n:-?} (69 attendues)"

# 3. Une page de referencement rend de vrais medecins cote serveur (> 0).
nb="$(curl -fsS "$SITE/specialites/medecin-generaliste/alger?$cb" | grep -o 'class="seo-med"' | wc -l | tr -d ' ')"
[ "${nb:-0}" -gt 0 ] && ok "page Generaliste a Alger : $nb medecins rendus" || ko "aucun medecin rendu sur /specialites/medecin-generaliste/alger"

# 4. Plan du site joignable.
curl -fsS "$SITE/sitemap.xml?$cb" | grep -q "<sitemapindex" && ok "plan du site" || ko "plan du site indisponible"

[ $echec -eq 0 ] && echo "PORTE VERTE" || { echo "PORTE ROUGE"; exit 1; }
