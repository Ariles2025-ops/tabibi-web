# Image de production du front web Tabibi.
# Etape 1 : construction des bundles Angular, navigateur et serveur (npm ci puis ng build ; les tests tournent en CI).
# Etape 2 : node sert les fichiers statiques et rend les pages cote serveur (SSR, server.ts) sur le port 80.
#           La configuration (API, Keycloak) n'est pas figee dans l'image : docker/entrypoint.sh ecrit
#           assets/config.json pour le navigateur et passe les memes variables au serveur, au demarrage du
#           conteneur ; le meme build sert donc en recette comme en production.
# Construire : docker build -t tabibi-web .
# Lancer : docker run --rm -p 8088:80 -e TABIBI_API_URL=http://localhost:8080 tabibi-web  (voir README, Deploiement)

FROM node:26-alpine AS build
WORKDIR /build
# Pas de question ni de collecte d'usage du CLI Angular dans une construction non interactive.
ENV NG_CLI_ANALYTICS=false CI=true
# Les dependances d'abord : cette couche est reutilisee tant que package-lock.json ne change pas.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY angular.json tsconfig.json tsconfig.app.json server.ts ./
COPY src ./src
RUN npm run build

FROM node:26-alpine
ENV NODE_ENV=production PORT=80
WORKDIR /app
# Le bundle serveur est autonome (Angular et express y sont inclus) : ni package.json ni node_modules ici.
COPY --chown=node:node docker/entrypoint.sh /app/entrypoint.sh
COPY --from=build --chown=node:node /build/dist/tabibi-web /app/dist/tabibi-web
# Port 80 (celui du reverse_proxy web:80 du Caddyfile de tabibi-backend) sans etre root : capacite de liaison aux
# ports privilegies posee sur le binaire node (Docker >= 20.10 ouvre deja les ports < 1024 aux processus non root
# dans le conteneur ; la capacite couvre les autres moteurs). libcap ne sert qu'a la poser, puis est retire.
RUN apk add --no-cache --virtual .setcap libcap \
 && setcap 'cap_net_bind_service=+ep' /usr/local/bin/node \
 && apk del .setcap \
 && chmod +x /app/entrypoint.sh
USER node
EXPOSE 80
# Sante : un fichier statique (sans rendu ni appel a l'API) ; wget vient de busybox.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:80/assets/config.json || exit 1
ENTRYPOINT ["/app/entrypoint.sh"]
