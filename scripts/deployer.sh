#!/usr/bin/env bash
# Deploiement du site web Tabibi (Angular SSR) sur le serveur Oracle, puis PORTE de verification en ligne.
# Usage : scripts/deployer.sh        (depuis la racine de tabibi-web, arbre propre et tests verts)
# Ce qui est deploye = le commit HEAD (git archive), jamais les fichiers locaux non commites
# (config.json local, proxy.conf.local.json restent hors du deploiement).
set -euo pipefail
SERVEUR="ubuntu@129.151.227.16"
CLE="$HOME/.ssh/ma3lem_oracle"
SITE="https://tabibi.doctor"
SHA="$(git rev-parse --short HEAD)"

git archive HEAD src angular.json package.json package-lock.json server.ts tsconfig.json tsconfig.app.json > /tmp/tabibi-web.tar
scp -q -i "$CLE" /tmp/tabibi-web.tar "$SERVEUR:/tmp/"
ssh -i "$CLE" "$SERVEUR" "sudo tar -xf /tmp/tabibi-web.tar -C /srv/tabibi/web \
  && echo '$SHA' | sudo tee /srv/tabibi/web/src/assets/version.txt >/dev/null \
  && cd /srv/tabibi/backend && sudo docker compose -p tabibi -f docker-compose.prod.yml -f /srv/tabibi/override.yml up -d --build web 2>&1 | tail -1"

echo "Deploiement de $SHA lance ; verification en ligne…"
scripts/verifier-en-ligne.sh "$SHA"
