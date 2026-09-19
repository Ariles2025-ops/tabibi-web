#!/bin/sh
# Point d'entree de l'image tabibi-web (POSIX sh, busybox) :
#   1. ecrit /usr/share/nginx/html/assets/config.json (lu par ConfigService au demarrage de l'application) a partir
#      de TABIBI_API_URL, TABIBI_KEYCLOAK_ISSUER et TABIBI_KEYCLOAK_CLIENT_ID ;
#   2. genere /etc/nginx/conf.d/default.conf depuis le gabarit nginx (envsubst limite a ${TABIBI_CSP_CONNECT_SRC}) ;
#   3. lance nginx au premier plan.
# Sans variable : valeurs derivees de DOMAINE si docker-compose.prod.yml (tabibi-backend) le transmet
# (https://api.DOMAINE et https://auth.DOMAINE/realms/tabibi, comme le Caddyfile), sinon celles du poste de dev.
set -eu

RACINE_WEB=/usr/share/nginx/html
GABARIT_NGINX=/etc/nginx/tabibi/default.conf.template
CONF_NGINX=/etc/nginx/conf.d/default.conf

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

# Origine (schema://hote[:port]) d'une URL, pour la directive connect-src de la CSP ; vide si ce n'est pas une URL.
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

# connect-src de la CSP : la page elle-meme, l'API et Keycloak (discovery, jetons). Les doublons sont sans effet.
TABIBI_CSP_CONNECT_SRC="'self' $(origine "$api_url") $(origine "$keycloak_issuer")"
export TABIBI_CSP_CONNECT_SRC
envsubst '${TABIBI_CSP_CONNECT_SRC}' < "$GABARIT_NGINX" > "$CONF_NGINX"

echo "tabibi-web : API $api_url, Keycloak $keycloak_issuer (client $keycloak_client_id)"
exec nginx -g 'daemon off;'
