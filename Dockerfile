# Image de production du front web Tabibi.
# Etape 1 : construction du bundle Angular (npm ci puis ng build ; les tests tournent en CI, pas ici).
# Etape 2 : nginx sert les fichiers statiques. La configuration (API, Keycloak) n'est pas figee dans l'image :
#           docker/entrypoint.sh ecrit assets/config.json et la CSP a partir des variables d'environnement au
#           demarrage du conteneur, le meme build sert donc en recette comme en production.
# Construire : docker build -t tabibi-web .
# Lancer : docker run --rm -p 8088:80 -e TABIBI_API_URL=http://localhost:8080 tabibi-web  (voir README, Deploiement)

FROM node:20-alpine AS build
WORKDIR /build
# Pas de question ni de collecte d'usage du CLI Angular dans une construction non interactive.
ENV NG_CLI_ANALYTICS=false CI=true
# Les dependances d'abord : cette couche est reutilisee tant que package-lock.json ne change pas.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine
# envsubst (gettext) est fourni par l'image officielle ; le fichier de site par defaut est remplace au demarrage.
COPY nginx/default.conf.template /etc/nginx/tabibi/default.conf.template
COPY docker/entrypoint.sh /docker/entrypoint.sh
RUN chmod +x /docker/entrypoint.sh && rm -f /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/tabibi-web/browser /usr/share/nginx/html
# Le processus maitre reste root pour ecouter sur le port 80 (attendu par le Caddyfile de tabibi-backend : web:80)
# et lire la configuration ; les processus de travail tournent sous l'utilisateur nginx (directive user de
# /etc/nginx/nginx.conf). Voir README, « Deploiement ».
EXPOSE 80
# Sante : la page d'accueil repond (wget vient de busybox).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
ENTRYPOINT ["/docker/entrypoint.sh"]
