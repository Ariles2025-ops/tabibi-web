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

# 3b1. Donnees structurees : ItemList + MedicalWebPage dans le JSON-LD de /specialites/pediatre/setif.
ld_page="$(curl -fsS "$SITE/specialites/pediatre/setif?$cb")"
case "$ld_page" in *'"@type":"ItemList"'*) ok "JSON-LD ItemList sur /specialites/pediatre/setif" ;; *) ko "\"@type\":\"ItemList\" absent de /specialites/pediatre/setif" ;; esac
case "$ld_page" in *'"@type":"MedicalWebPage"'*) ok "JSON-LD MedicalWebPage sur /specialites/pediatre/setif" ;; *) ko "\"@type\":\"MedicalWebPage\" absent de /specialites/pediatre/setif" ;; esac

# 3b2. L'accueil arabe est rendu cote serveur.
accueil_ar="$(curl -fsS "$SITE/ar?$cb")"   # pas de « curl | grep -q » : avec pipefail, grep -q coupe curl (SIGPIPE) = faux echec
case "$accueil_ar" in *'lang="ar"'*) ok "accueil arabe (/ar)" ;; *) ko "accueil arabe absent" ;; esac

# 3b3. Referencement de la marque : les accueils FR et AR portent canonical, hreflang et JSON-LD Organization.
accueil_fr="$(curl -fsS "$SITE/?$cb")"
for page in fr ar; do
  if [ "$page" = fr ]; then html="$accueil_fr"; else html="$accueil_ar"; fi
  case "$html" in *'rel="canonical"'*) ok "accueil $page : balise canonical" ;; *) ko "accueil $page sans balise canonical" ;; esac
  case "$html" in *'"@type":"Organization"'*) ok "accueil $page : JSON-LD Organization" ;; *) ko "accueil $page sans JSON-LD Organization" ;; esac
done
titre_fr="$(printf '%s' "$accueil_fr" | tr '\n' ' ' | sed -n 's/.*<title[^>]*>\([^<]*\)<\/title>.*/\1/p')"
titre_ar="$(printf '%s' "$accueil_ar" | tr '\n' ' ' | sed -n 's/.*<title[^>]*>\([^<]*\)<\/title>.*/\1/p')"
case "$titre_fr" in *'Ndawik'*) ok "accueil FR : titre de marque (Ndawik)" ;; *) ko "accueil FR : le <title> doit contenir « Ndawik » (trouve : « ${titre_fr:-aucun <title>} »)" ;; esac
case "$titre_ar" in *'نداويك'*) ok "accueil AR : titre de marque (نداويك)" ;; *) ko "accueil AR : le <title> doit contenir « نداويك » (trouve : « ${titre_ar:-aucun <title>} »)" ;; esac

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

# 6b. Anciennes adresses de l'ancien site (Search Console) : 301 puis 200 (curl -L), jamais 404.
for chemin in /seo/tipaza-neurologue /seo/mostaganem-endocrinologue /seo/boumerdes-gastro-enterologue /seo/tipaza-gastro-enterologue \
  "/index.html?specialty=cardiologue&wilaya=alger" /index.html /about /blog /blog/ /ar/seo/tipaza-neurologue; do
  code="$(curl -sL -o /dev/null -w '%{http_code}' "$SITE$chemin")"
  [ "$code" = "200" ] && ok "$chemin (200)" || ko "$chemin repond HTTP $code (200 attendu)"
done

# 6c. Pages commune (specialite x wilaya x commune) : une commune connue rend >= 3 praticiens (200), une inconnue repond 404.
#     COMMUNE_TEST = specialite/wilaya/commune d'une page connue (au moins 3 praticiens).
COMMUNE_TEST="${COMMUNE_TEST:-cardiologue/alger/bab-ezzouar}"
for pre in "" "/ar"; do
  html="$(curl -sL "$SITE$pre/specialites/$COMMUNE_TEST?$cb")"
  nbc="$(printf '%s' "$html" | grep -o 'class="seo-med"' | wc -l | tr -d ' ')"
  [ "${nbc:-0}" -ge 3 ] && ok "${pre:-/fr} commune $COMMUNE_TEST : $nbc praticiens rendus" || ko "${pre:-/fr} commune $COMMUNE_TEST : ${nbc:-0} praticien(s) (3 attendus)"
  code="$(curl -s -o /dev/null -w '%{http_code}' "$SITE$pre/specialites/$COMMUNE_TEST?$cb")"
  [ "$code" = "200" ] && ok "$pre/specialites/$COMMUNE_TEST (200)" || ko "$pre/specialites/$COMMUNE_TEST repond HTTP $code (200 attendu)"
  code="$(curl -s -o /dev/null -w '%{http_code}' "$SITE$pre/specialites/cardiologue/alger/commune-inexistante-$cb")"
  [ "$code" = "404" ] && ok "404 sur commune inexistante ($pre)" || ko "commune inexistante ($pre) repond HTTP $code (404 attendu)"
done

# 7. robots.txt ferme les pages privees (pas de « curl | grep -q », voir 3b2).
robots="$(curl -fsS "$SITE/robots.txt?$cb")"
for regle in "Disallow: /bientot" "Disallow: /medecins/" "Disallow: /mes-"; do
  case "$robots" in *"$regle"*) ok "robots.txt : $regle" ;; *) ko "robots.txt sans « $regle »" ;; esac
done

[ $echec -eq 0 ] && echo "PORTE VERTE" || { echo "PORTE ROUGE"; exit 1; }
