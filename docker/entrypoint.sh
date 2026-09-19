#!/bin/sh
# Point d'entree de l'image tabibi-web (POSIX sh, busybox, utilisateur node) :
#   1. calcule la configuration (API, Keycloak) : TABIBI_API_URL, TABIBI_KEYCLOAK_ISSUER et TABIBI_KEYCLOAK_CLIENT_ID
#      si elles sont fournies, sinon derivees de DOMAINE (docker-compose.prod.yml de tabibi-backend : https://api.DOMAINE
#      et https://auth.DOMAINE/realms/tabibi, comme le Caddyfile), sinon celles du poste de developpement ;
#   2. ecrit dist/tabibi-web/browser/assets/config.json, lu par le navigateur au demarrage (ConfigService) ;
#   3. exporte les memes variables pour le serveur de rendu (server.ts les lit dans process.env : configuration cote
#      serveur et en-tetes de securite), puis lance node au premier plan.
set -eu

RACINE_WEB=/app/dist/tabibi-web/browser
SERVEUR=/app/dist/tabibi-web/server/server.mjs

if [ -n "${DOMAINE:-}" ]; then
  api_defaut="https://api.${DOMAINE}"
  issuer_defaut="https://auth.${DOMAINE}/realms/tabibi"
else
  api_defaut="http://localhost:8080"
  issuer_defaut="http://localhost:8081/realms/tabibi"
fi

# Espaces et fins de ligne retires ; barre oblique finale retiree (ConfigService le ferait aussi).
nettoyer() {
  printf '%s' "$1" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#/*$##'
}

api_url=$(nettoyer "${TABIBI_API_URL:-$api_defaut}")
keycloak_issuer=$(nettoyer "${TABIBI_KEYCLOAK_ISSUER:-$issuer_defaut}")
keycloak_client_id=$(printf '%s' "${TABIBI_KEYCLOAK_CLIENT_ID:-tabibi-web}" | tr -d '\r\n')

# Origine (schema://hote[:port]) d'une URL ; vide si ce n'est pas une URL http(s).
origine() {
  printf '%s' "$1" | sed -n -E 's#^(https?://[^/[:space:]]+).*$#\1#p'
}

for url in "$api_url" "$keycloak_issuer"; do
  if [ -z "$(origine "$url")" ]; then
    echo "tabibi-web : « $url » n'est pas une URL http(s) : l'application ne pourra joindre ni l'API ni Keycloak." >&2
  fi
done

# Echappement JSON minimal (barre oblique inverse et guillemet) : ces valeurs sont des URL et un identifiant.
echapper_json() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

mkdir -p "$RACINE_WEB/assets"
cat > "$RACINE_WEB/assets/config.json" <<EOF
{
  "apiUrl": "$(echapper_json "$api_url")",
  "keycloakIssuer": "$(echapper_json "$keycloak_issuer")",
  "keycloakClientId": "$(echapper_json "$keycloak_client_id")"
}
EOF

export TABIBI_API_URL="$api_url" TABIBI_KEYCLOAK_ISSUER="$keycloak_issuer" TABIBI_KEYCLOAK_CLIENT_ID="$keycloak_client_id"
echo "tabibi-web : API $api_url, Keycloak $keycloak_issuer (client $keycloak_client_id), port ${PORT:-4000}"
exec node "$SERVEUR"
