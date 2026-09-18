# tabibi-web

Front web Tabibi — **Angular 18** (composants standalone), connexion **Keycloak** (OIDC) et appel de l'API.

## Ce que fait cette premiere version
- Connexion via Keycloak (realm `tabibi`, client `tabibi-web`).
- Intercepteur qui ajoute le **JWT** sur chaque appel `/api/...`.
- Ecran d'accueil qui appelle `GET /api/moi` et affiche l'utilisateur + ses roles.

## Lancer
```bash
npm install
npm start          # http://localhost:4200
# necessite l'API (tabibi-backend) + Keycloak (docker compose up) en marche
```

## Prochaines etapes
- Recherche de medecins, fiche, reservation (parcours patient).
- SSR (Angular Universal) pour les pages publiques / SEO.

## v0.2.0 — Annuaire (web)
- Ecran d'accueil public : recherche de praticiens (specialite, wilaya, nom) via `GET /api/medecins`.
- `/moi` : compte utilisateur (connexion Keycloak).
