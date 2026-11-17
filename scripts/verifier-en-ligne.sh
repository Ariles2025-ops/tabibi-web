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

# 3b. La version arabe rend aussi de vrais medecins cote serveur.
nbar="$(curl -fsS "$SITE/ar/specialites/medecin-generaliste/alger?$cb" | grep -o 'class="seo-med"' | wc -l | tr -d ' ')"
[ "${nbar:-0}" -gt 0 ] && ok "page arabe : $nbar medecins rendus" || ko "aucun medecin rendu sur /ar/specialites/medecin-generaliste/alger"

# 3b2. L'accueil arabe est rendu cote serveur.
accueil_ar="$(curl -fsS "$SITE/ar?$cb")"   # pas de « curl | grep -q » : avec pipefail, grep -q coupe curl (SIGPIPE) = faux echec
case "$accueil_ar" in *'lang="ar"'*) ok "accueil arabe (/ar)" ;; *) ko "accueil arabe absent" ;; esac

# 3c. Anti-copie : la liste complete des fiches n'est pas publique.
code="$(curl -s -o /dev/null -w '%{http_code}' "https://api.tabibi.doctor/api/medecins/plan?$cb")"
[ "$code" = "404" ] && ok "liste complete des fiches fermee au public (404)" || ko "liste complete des fiches accessible depuis Internet (HTTP $code)"

# 4. Plan du site joignable.
plan="$(curl -fsS "$SITE/sitemap.xml?$cb")"
case "$plan" in *"<sitemapindex"*) ok "plan du site" ;; *) ko "plan du site indisponible" ;; esac

# 5. Vraie 404 (pas de soft 404) : adresse inconnue et specialite inexistante.
for chemin in "/nimportequoi-$cb" "/specialites/specialite-inexistante"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$SITE$chemin")"
  [ "$code" = "404" ] && ok "404 sur $chemin" || ko "$chemin repond HTTP $code (404 attendu)"
done

# 6. Pages publiques : suppression de compte et pages legales (URL de la Play Console), index des wilayas, aide, pharmacies.
#    curl -L suit la redirection 301 des pages legales sans .html.
for chemin in /supprimer-mon-compte /legal/confidentialite /legal/mentions-legales /legal/cgu /wilayas /aide /ar/aide /specialites/pharmacie/alger; do
  code="$(curl -sL -o /dev/null -w '%{http_code}' "$SITE$chemin?$cb")"
  [ "$code" = "200" ] && ok "$chemin (200)" || ko "$chemin repond HTTP $code (200 attendu)"
done

# 7. robots.txt ferme les pages privees (pas de « curl | grep -q », voir 3b2).
robots="$(curl -fsS "$SITE/robots.txt?$cb")"
for regle in "Disallow: /bientot" "Disallow: /medecins/" "Disallow: /mes-"; do
  case "$robots" in *"$regle"*) ok "robots.txt : $regle" ;; *) ko "robots.txt sans « $regle »" ;; esac
done

[ $echec -eq 0 ] && echo "PORTE VERTE" || { echo "PORTE ROUGE"; exit 1; }
