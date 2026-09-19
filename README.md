# tabibi-web

[![ci](https://github.com/<org>/tabibi-web/actions/workflows/ci.yml/badge.svg)](https://github.com/<org>/tabibi-web/actions/workflows/ci.yml)
(remplacer `<org>` par l'organisation GitHub qui heberge le depot)

Front web Tabibi — **Angular 18** (composants standalone), connexion **Keycloak** (OIDC) et appel de l'API.

## Ce que fait cette premiere version
- Connexion via Keycloak (realm `tabibi`, client `tabibi-web`).
- Intercepteur qui ajoute le **JWT** sur chaque appel `/api/...`.
- Ecran d'accueil qui appelle `GET /api/moi` et affiche l'utilisateur + ses roles.

## Lancer
```bash
npm install
npm start                          # http://localhost:4200 (ng serve, rendu cote serveur compris)
npm run build && npm run serve:ssr # http://localhost:4000 : le build de production servi par server.ts (SSR)
# necessite l'API (tabibi-backend) + Keycloak (docker compose up) en marche
```

## Configuration
Le build est le meme partout : l'application lit **`assets/config.json`** au demarrage (avant le rendu, via
`APP_INITIALIZER` et `ConfigService`) pour connaitre l'API et Keycloak :
```json
{
  "apiUrl": "http://localhost:8080",
  "keycloakIssuer": "http://localhost:8081/realms/tabibi",
  "keycloakClientId": "tabibi-web"
}
```
- En dev, le fichier versionne `src/assets/config.json` pointe sur l'API et le Keycloak locaux.
- Au deploiement, on **remplace `assets/config.json`** dans le dossier publie (`dist/tabibi-web/browser/assets/`) par
  les valeurs de l'environnement (recette, production), sans reconstruire. `apiUrl` et `keycloakIssuer` sont pris sans
  barre oblique finale ; HTTPS est exige par la couche OIDC des que l'issuer est en `https://`.
- Si le fichier est absent ou illisible, les valeurs localhost ci-dessus s'appliquent, avec un avertissement dans la
  console du navigateur ; un champ manquant ou vide est complete par sa valeur par defaut.
- `index.html` porte `<base href="/">` : les chemins relatifs (scripts, `assets/config.json`) se resolvent depuis la
  racine, y compris apres un rechargement sur une route profonde ; pour publier sous un sous-chemin,
  `npx ng build --base-href /tabibi/`.
- Avec l'image Docker (section « Deploiement »), ce fichier est ecrit au demarrage du conteneur a partir des variables
  d'environnement `TABIBI_API_URL`, `TABIBI_KEYCLOAK_ISSUER` et `TABIBI_KEYCLOAK_CLIENT_ID`.
- Cote serveur (rendu SSR, `server.ts`), le fichier n'est pas lu : `app.config.server.ts` fournit `CONFIGURATION_SERVEUR`
  a partir des memes variables d'environnement (`configurationDepuisEnvironnement`, `DOMAINE` derive `api.` / `auth.`),
  avec les memes valeurs par defaut.

## Tester
**Un seul outil de test dans tout le depot : Playwright.** Aucun `*.spec.ts` ne subsiste sous `src/` ; tous les
tests vivent dans `tests/`, et `playwright.config.ts` porte deux projets.

| Projet | Dossier | Execution | Ce qu'on y met |
| --- | --- | --- | --- |
| `logique` | `tests/logique/` | node, aucun navigateur | modules TypeScript **sans import Angular** : dictionnaires i18n, fonctions pures de formatage, de validation et de bornes (`*.formats.ts`) |
| `navigateur` | `tests/navigateur/` et `tests/parcours/` | Chromium | tout le reste : composants, appels HTTP, gardes de role, SEO, i18n rendue, parcours de bout en bout |

Playwright transpile le TypeScript et l'execute dans node : un module qui importe `@angular/core` (ou tout paquet
Angular, publie en ESM) ne s'y charge pas. Avant de mettre un module dans `logique`, verifier ses imports
(`grep -n "^import" <fichier>`) ; sinon, il se teste dans le navigateur.

```bash
npm run build && npm test          # le build de production, puis les deux projets
npm test                           # les tests seuls (le build de dist/ doit exister)
npm run test:logique               # les modules purs, en quelques secondes, sans navigateur
npm run test:navigateur            # Chromium seulement
npm run test:ui                    # mode interactif : rejouer un test pas a pas, inspecter le DOM
npx playwright test tests/navigateur/avis.spec.ts   # un seul fichier
npx playwright show-report         # rapport HTML (CI : joint au workflow en cas d'echec)
npx playwright show-trace test-results/<dossier>/trace.zip   # trace d'un echec (DOM, reseau, console)
CHROME_BIN=/chemin/vers/chrome npm test              # Chrome deja installe, au lieu du Chromium de Playwright
npx playwright install chromium                      # sinon, une fois (--with-deps en CI)
npm run verif:tests                # echoue s'il reste une spec sous src/ ou une dependance karma / jasmine
npm run verif:i18n                 # aucun libelle francais litteral dans un template
```

### Comment un test navigateur est ecrit
Le build de production est servi par `server.ts` (rendu cote serveur, port 4300) face a une **API simulee**
(`tests/api-simulee.ts`, petit serveur http node : deux praticiens, creneaux, avis, reservation 201, `/api/moi`,
notifications, verification d'ordonnance — code valide `TBB-2026-0001`) qui tient aussi lieu d'**issuer OIDC simule**
(document de decouverte et page « Connexion simulée »). `playwright.config.ts` declare le `webServer` ;
`globalSetup` (`tests/global-setup.ts`) reecrit `dist/tabibi-web/browser/assets/config.json` vers cette API (comme
`docker/entrypoint.sh` au deploiement) et demarre l'API simulee, arretee a la fin.

Les aides de `tests/outils/` remplacent ce que faisaient `TestBed` et `HttpTestingController` :
- `ouvrir(page, url)` : navigue et attend l'hydratation (`app-root` sans attribut `ngh`) avant toute interaction,
  sinon une saisie faite sur le HTML du serveur est perdue.
- `connecter(page, { sujet, roles })` : **connexion simulee, sans Keycloak reel**. `AuthService.estConnecte()` se
  reduit a `OAuthService.hasValidAccessToken()`, qui lit le stockage de session : un `access_token` quelconque et un
  `expires_at` futur suffisent a rendre l'application connectee. Les roles ne viennent pas du jeton mais de
  `GET /api/moi`, stubbe par l'aide. A appeler avant `ouvrir`.
- `stub(page, motif, reponse)` : repond a la place de l'API (200, 400, 403, 404, 409...), avec les en-tetes CORS
  qu'exige l'origine distincte de l'API simulee. Le dernier stub pose l'emporte : un test peut preciser un cas
  particulier apres un stub general.
- `requetes(page)` : journal des appels `/api/...` (methode, URL, parametres, corps, en-tetes) — c'est ainsi qu'on
  verifie « le service appelle la bonne URL avec le bon corps ». `attendre(motif, methode)` patiente jusqu'a l'appel.
- `accepterConfirmations(page)` / `refuserConfirmations(page)` : plusieurs actions destructrices passent par
  `confirm()`, que Playwright refuse par defaut.

Regle de conversion : chaque assertion doit avoir son equivalent **observable** a l'ecran ou dans la requete envoyee.
« 409 → message X » devient : stub 409, clic, `await expect(page.getByText('...')).toBeVisible()` ; « le service POST
`/api/avis` avec `{ note }` » devient : capture de la requete et `expect(corps.note).toBe(4)` ; « la garde renvoie a
l'accueil » devient : connexion avec un role insuffisant, navigation, `await expect(page).toHaveURL('/')`.

Deux pieges a connaitre :
- **Cache de transfert.** Les appels `GET` faits pendant le rendu serveur sont transmis au navigateur, qui ne les
  rejoue pas : sur une page publique, le premier chargement n'est pas interceptable. Pour tester une page publique
  avec des donnees choisies, l'atteindre par un clic depuis une autre page (navigation cote client) — voir
  `tests/navigateur/fiche-medecin.spec.ts`. Les pages privees ne sont pas concernees : le serveur les rend
  « non connecte » et n'appelle donc pas l'API.
- **Liaisons `[name]`.** Un nom calcule (`[name]="'nom-' + id"`) est pose en propriete, pas en attribut : le
  selecteur CSS `input[name=...]` ne le trouve pas. Reperer le champ par son libelle (`getByLabel`).

Les minuteries (relecture du fil toutes les 30 s, du compteur de notifications toutes les 60 s) sont avancees avec
`page.clock`, sans attendre reellement.

### Fichiers de test
- `tests/logique/` : `i18n.spec.ts` (dictionnaires : memes cles, aucun libelle vide, memes parametres
  d'interpolation ; `interpoler`, `traduireFr`, `langueDepuisCode`, `langueDepuisAcceptLanguage`),
  `config.spec.ts` (`normaliserConfiguration`, `configurationDepuisEnvironnement`), `auth-config.spec.ts`,
  `libelles.spec.ts` (statuts, moyennes, prix, accords, bornes, `estUuid`, `salleAccessible`), `profil.spec.ts`
  (`nettoyerProfil`, `validerProfil`, `dateLocaleIso`, `libelleLangue`).
- `tests/navigateur/` : un fichier par domaine (annuaire, fiche du praticien, rendez-vous, ordonnances, avis,
  messagerie, notifications, teleconsultation, dawini, listes d'attente, moi, profil, medecin, secretaire, admin),
  plus `barre-navigation`, `gardes`, `authentification`, `config`, `seo`, `i18n` et `page-introuvable`.
- `tests/parcours/` : les parcours publics de bout en bout (recherche, verification d'ordonnance, navigation et SEO,
  langues), qui ne stubbent rien et parlent a l'API simulee.

L'integration continue (`.github/workflows/ci.yml`, Node 20) enchaine `npm ci`, `npm run verif:tests`,
`npx playwright install --with-deps chromium`, `npm run build` et `npx playwright test` ; le rapport HTML est joint
au workflow en cas d'echec, et le job `image` attend ce job. `test-results/` et `playwright-report/` sont ignores par
git et Docker. `package-lock.json` est versionne pour la reproductibilite. Le journal des versions est dans
`docs/JOURNAL.md`.

## Deploiement

### Image Docker (`Dockerfile`)
Image multi-etapes : `node:20-alpine` construit les bundles navigateur et serveur (`npm ci`, `npm run build`,
empreintes dans les noms de fichiers : `outputHashing: all`), puis `node:20-alpine` execute
`node dist/tabibi-web/server/server.mjs` (express + moteur de rendu Angular, bundle autonome : pas de `node_modules`
dans l'image) sur le **port 80**, sous l'utilisateur `node` (capacite `cap_net_bind_service` posee sur le binaire
node ; Docker >= 20.10 ouvre de toute facon les ports < 1024 aux processus non root du conteneur).
La configuration n'est pas figee dans l'image : au demarrage du conteneur, `docker/entrypoint.sh` (POSIX sh) ecrit
`assets/config.json` pour le navigateur et exporte les memes variables pour le serveur de rendu (`process.env`), puis
lance node au premier plan. Le meme build sert donc en recette et en production.

| Variable | Defaut | Role |
|---|---|---|
| `TABIBI_API_URL` | `https://api.$DOMAINE` si `DOMAINE` est defini, sinon `http://localhost:8080` | origine de l'API (`apiUrl`), pour le navigateur et pour le rendu serveur |
| `TABIBI_KEYCLOAK_ISSUER` | `https://auth.$DOMAINE/realms/tabibi` si `DOMAINE` est defini, sinon `http://localhost:8081/realms/tabibi` | issuer OIDC (`keycloakIssuer`) |
| `TABIBI_KEYCLOAK_CLIENT_ID` | `tabibi-web` | client public OIDC (`keycloakClientId`) |
| `DOMAINE` | (aucun) | domaine public, celui du `.env` de `docker-compose.prod.yml` (tabibi-backend) : en derive les deux URL ci-dessus, avec les hotes `api.` et `auth.` du Caddyfile |
| `PORT` | `80` dans l'image (`4000` hors image) | port d'ecoute du serveur node |
| `TABIBI_SSR_DELAI_MS` | `10000` | au-dela, la page est envoyee sans rendu serveur (voir « Rendu cote serveur ») |
| `DOMAINE` (bis) | (aucun) | sert aussi d'origine publique (`https://DOMAINE`) aux URL absolues de `robots.txt` et `sitemap.xml` ; sinon l'origine de la requete (`X-Forwarded-*`) |

Les valeurs sont nettoyees (espaces, barre oblique finale) et echappees pour le JSON ; une valeur qui n'est pas une
URL `http(s)://` est signalee dans le journal du conteneur (l'application ne joindrait alors ni l'API ni Keycloak).

`server.ts` (express) :
- fichiers du build (chemins avec extension) : `no-store` sur `index.csr.html` et `assets/config.json` (remplaces a
  chaque deploiement), un an et `immutable` sur les bundles a empreinte (`main-XXXXXXXX.js`, `styles-XXXXXXXX.css`),
  une heure sur le reste de `assets/` ; fichier introuvable → 404 (pas de page rendue pour un favicon absent) ;
- `/robots.txt` et `/sitemap.xml` : generes (voir « Referencement (SEO) ») ;
- toute autre URL : page rendue par Angular (`no-store`), ou page sans rendu (`index.csr.html`, l'application se rend
  dans le navigateur comme avant) si le rendu echoue ou depasse `TABIBI_SSR_DELAI_MS` ; statut 404 quand la page
  rendue est introuvable (route `**`, praticien inconnu) ;
- en-tetes de securite sur toutes les reponses : `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  (la teleconsultation s'ouvre dans un autre onglet, sur Jitsi) et une `Content-Security-Policy` compatible Angular et
  Keycloak : `default-src 'self'; connect-src 'self' <origine de l'API> <origine de Keycloak>; frame-ancestors 'none';
  img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; object-src 'none';
  form-action 'self'`, les origines etant calculees au demarrage a partir des variables ci-dessus. Pour que
  `script-src 'self'` tienne, le CSS critique n'est inline ni au build (`optimization.styles.inlineCritical: false`)
  ni au rendu (`inlineCriticalCss: false`) : cette optimisation ajoute un `onload` inline sur la feuille de style ;
  l'etat de transfert (`<script id="ng-state" type="application/json">`) n'est pas un script executable ;
- `X-Powered-By` retire, `trust proxy` (schema et adresse du client lus dans `X-Forwarded-*` poses par Caddy) ;
  pas de compression dans node : Caddy compresse (`encode gzip`) ;
- `HEALTHCHECK` : `wget` sur `/assets/config.json` toutes les 30 s (fichier statique : ni rendu ni appel a l'API).

```bash
docker build -t tabibi-web .
# En local, face a l'API et au Keycloak de developpement (docker compose up dans tabibi-backend) :
docker run --rm -p 8088:80 -e TABIBI_API_URL=http://localhost:8080 \
  -e TABIBI_KEYCLOAK_ISSUER=http://localhost:8081/realms/tabibi tabibi-web
curl -sI http://localhost:8088/ | grep -i "content-security-policy\|cache-control"
curl -s http://localhost:8088/assets/config.json
curl -s http://localhost:8088/ | grep -o "Trouver un praticien"     # page rendue par le serveur
```
Le realm de developpement n'autorise que l'origine `http://localhost:4200` (redirections du client `tabibi-web`,
`TABIBI_CORS_ORIGINES` de l'API) : pour se connecter depuis le conteneur sans toucher au realm, publier sur ce port
(`-p 4200:80`, `ng serve` arrete), sinon ajouter `http://localhost:8088/*` au client et `http://localhost:8088` aux
origines CORS de l'API. Depuis le conteneur, `localhost:8080` designe le conteneur lui-meme : pour le rendu serveur
en local, donner l'adresse de l'hote (`http://host.docker.internal:8080` sur Docker Desktop, ou l'IP de la machine),
la meme pour le navigateur puisque `TABIBI_API_URL` sert aux deux. Le contexte de construction est reduit par
`.dockerignore` (`node_modules`, `dist`, `.angular`, `coverage`, `.git`, documentation).

### Publication sur GHCR (CI)
L'image officielle est publiee sur GitHub Container Registry par la CI (job `image` de `.github/workflows/ci.yml`) a
chaque push sur `main`, une fois le job `build-test` vert : `ghcr.io/<org>/tabibi-web:latest` et
`ghcr.io/<org>/tabibi-web:sha-<commit>` (tag fige, a preferer pour un deploiement reproductible :
`WEB_TAG=sha-xxxxxxx` dans le `.env` du backend). Le nom est force en minuscules (`<org>` = proprietaire du depot,
exigence de GHCR) ; l'authentification utilise le `GITHUB_TOKEN` du workflow (`permissions: packages: write`),
aucun secret a creer. Un paquet GHCR est prive par defaut : le rendre public dans les reglages du paquet, ou
`docker login ghcr.io` sur le serveur avec un jeton `read:packages`. Dependabot (`.github/dependabot.yml`) propose
chaque semaine les mises a jour npm (paquets Angular groupes), GitHub Actions et images de base du Dockerfile.

### Avec `docker-compose.prod.yml` (tabibi-backend)
Le service `web` y attend l'image `ghcr.io/${ORG_GITHUB}/tabibi-web:${WEB_TAG}` derriere Caddy (`https://DOMAINE` ->
`web:80`, l'API sur `https://api.DOMAINE`, Keycloak sur `https://auth.DOMAINE`). Pour que le front vise ces hotes,
le service doit recevoir soit `DOMAINE` (`environment: DOMAINE: ${DOMAINE}`, les URL sont derivees), soit les
trois variables `TABIBI_*` explicites ; sans rien, l'image retombe sur les valeurs localhost du poste de developpement.
Le client `tabibi-web` du realm de production (genere par `infra/keycloak/realm-production.py`) autorise deja
`https://DOMAINE/*`.

## Rendu cote serveur (SSR)
Pourquoi : les pages publiques (annuaire `/`, fiches `/medecins/:id`, verification `/verifier`) sont rendues en HTML
complet par le serveur, donc lisibles par les moteurs de recherche et affichees avant l'execution du JavaScript ;
sans cela, le HTML ne contenait que `<app-root></app-root>`.

Comment (Angular 18, `@angular/ssr`, `@angular/platform-server`, express) :
- `src/main.server.ts` et `src/app/app.config.server.ts` (`provideServerRendering()` + `CONFIGURATION_SERVEUR` lue dans
  `process.env`) ; `server.ts` (voir « Deploiement ») ; `angular.json` : `server`, `ssr.entry`, `prerender: false`
  (un prerendu a la construction appellerait l'API pendant `docker build` et figerait un annuaire vide) ;
  `ng build` produit `dist/tabibi-web/browser/` (dont `index.csr.html`, page sans rendu) et
  `dist/tabibi-web/server/server.mjs` ; `npm run serve:ssr` le lance (port `PORT`, 4000 par defaut) ; `ng serve` rend
  aussi cote serveur en developpement.
- `provideClientHydration()` dans `app.config.ts` : le navigateur reutilise le DOM rendu au lieu de le reconstruire,
  et les reponses `GET` obtenues pendant le rendu (annuaire, fiche, creneaux, avis) sont transmises dans
  `<script id="ng-state">` : le navigateur ne les redemande pas (cache de transfert HTTP). `withFetch()` sur
  `HttpClient`.
- Garde-fous : `AuthService` ne configure pas l'OIDC hors du navigateur (`isPlatformBrowser`), `estConnecte()` y est
  toujours faux, `seConnecter()` / `seDeconnecter()` sans effet ; les pages reservees rendent donc leur etat
  « Se connecter » ou « Redirection vers la page de connexion… » sans erreur, et les gardes de role
  (`/medecin`, `/admin`, ...) laissent la sortie vide, le navigateur rejouant la redirection apres l'hydratation ;
  `ConfigService` prend `CONFIGURATION_SERVEUR` au lieu de lire `assets/config.json` (chemin relatif sans sens hors du
  navigateur) ; la cloche de notifications ne lance pas sa minuterie cote serveur (elle empecherait le rendu de se
  terminer) ; l'espace pharmacie tolere l'absence de `localStorage`.
- Verifie : `ng build` puis `PORT=4100 node dist/tabibi-web/server/server.mjs` ; `curl -s http://localhost:4100/`
  contient « Trouver un praticien », le formulaire et, face a une API, les praticiens avec leurs liens ; hydratation
  controlee dans Chromium headless (aucune erreur `NG05xx`, aucune violation CSP, aucune requete API du navigateur
  sur une page rendue, navigation cote client sans rechargement).

Limites :
- Angular 18 n'a pas de mode de rendu par route : toutes les URL passent par le serveur, y compris les pages privees,
  qui rendent leur etat « non connecte » (sans donnee, avec `robots noindex`) ; une URL inconnue rend la page
  « Page introuvable » en 404 (route `**`).
- Le serveur appelle l'API avec la meme URL publique que le navigateur (`TABIBI_API_URL`) : c'est ce qui permet le
  cache de transfert (cle = URL). L'hote `api.DOMAINE` doit donc etre joignable depuis le conteneur ; le rendu attend
  l'API, avec le secours `TABIBI_SSR_DELAI_MS`.
- Les dates sont rendues avec le fuseau du serveur (UTC dans l'image) puis re-rendues par le navigateur dans le sien :
  l'hydratation ne compare pas le texte, aucune erreur, mais un court changement d'affichage est possible.
- Sous un garde de role (`/medecin/...`, `/admin/...`, `/secretaire`, `/pharmacie`), aucun composant n'est rendu cote
  serveur : la page garde le titre « Tabibi » sans `noindex` ; ces chemins sont exclus par `robots.txt`.

## Referencement (SEO)
- `SeoService` (`seo/seo.service.ts`, `Title` + `Meta` d'Angular) : `definir({ titre, description?, canonique?, privee? })`
  pose `<title>` (suffixe « | Tabibi »), `<meta name="description">` (description par defaut sinon),
  `<link rel="canonical">` (origine du document + chemin) et, pour une page privee, `<meta name="robots"
  content="noindex, nofollow">` ; `definirPrivee(titre)` ; `introuvable(titre?)` ajoute le statut HTTP 404 au rendu
  serveur via le jeton `REPONSE_SERVEUR` (`seo/reponse-serveur.ts`, objet `{ statut }` fourni par `server.ts` a chaque
  rendu puis relu apres ; Angular 18 n'expose pas la reponse express, `@angular/ssr/tokens` n'existe qu'en 19).
- Chaque composant de page appelle le service dans `ngOnInit` : annuaire « Trouver un médecin en Algérie »,
  verification « Vérifier une ordonnance », fiche « Dr <nom>, <spécialité> à <ville> » avec description (« Fiche du
  praticien » en attendant la reponse de l'API ; praticien inconnu → « Praticien introuvable », `noindex`, 404) ;
  toutes les pages reservees (mes rendez-vous, espaces medecin, secretaire, pharmacie, administration, messagerie,
  notifications, Dawini, avis, listes d'attente, teleconsultations, mon compte) sont `noindex`.
- Route `**` → `PageIntrouvableComponent` (`page-introuvable/`) : « Page introuvable », liens vers l'annuaire et la
  verification, 404 au rendu serveur.
- `server.ts` : `GET /robots.txt` (genere : `Disallow` des espaces prives — `/moi`, `/mes-`, `/ordonnances/`,
  `/medecin/` et `/medecin$` (les fiches `/medecins/...` restent permises), `/admin`, `/secretaire`, `/pharmacie`,
  `/messagerie`, `/notifications`, `/dawini`, `/avis`, `/liste-attente`, `/teleconsultations` — et
  `Sitemap: <origine>/sitemap.xml`) ; `GET /sitemap.xml` (`/`, `/verifier` puis `/medecins/<id>` pour chaque praticien
  de `GET ${apiUrl}/api/medecins`, liste gardee une heure en memoire, delai de 5 s ; si l'API ne repond pas, pages
  fixes seulement et nouvel essai a la demande suivante) ; les deux en `Cache-Control: public, max-age=3600`.
  L'origine des URL absolues est `https://DOMAINE` si la variable est definie, sinon celle de la requete.
- Verifie en SSR : `curl /` → `<title>Trouver un médecin en Algérie | Tabibi</title>`, description et canonique ;
  `/medecins/m1` → « Dr Amina Belkacem, Généraliste à Alger | Tabibi » ; `/medecins/inconnu-xyz` et
  `/page-inexistante` → statut 404, `noindex` ; `/mes-rendez-vous` → `noindex` ; `/robots.txt` et `/sitemap.xml`.

## Langues (francais, arabe, anglais)
L'interface est traduite **a l'execution** : un seul build sert les trois langues, rien n'est reconstruit par langue
et aucun rechargement n'est necessaire pour changer.
- `i18n/traduction.service.ts` : signal `langue` (`fr` | `ar` | `en`), `t(cle, params?)` (interpolation `{nom}`),
  `locale()` (locale Angular des dates : `fr`, `ar-DZ`, `en`), `dir()` (`rtl` en arabe). A chaque changement, le
  service pose `lang` et `dir` sur `<html>`, dans le navigateur comme au rendu serveur.
- Dictionnaires `i18n/fr.ts` (reference, ses cles definissent le type `ClesTraduction`), `i18n/ar.ts`, `i18n/en.ts` :
  les trois portent exactement les memes cles — le compilateur le verifie (`Record<ClesTraduction, string>`) et un
  test le verifie aussi (cles, libelles non vides, memes parametres d'interpolation).
- Choix initial : le choix memorise (`localStorage`, cle `tabibi.langue`, lu en try/catch) ; sinon, au rendu serveur,
  l'en-tete `Accept-Language` de la requete (jeton `LANGUE_SERVEUR` fourni par `server.ts`, `Vary: Accept-Language`
  sur les pages rendues) ; sinon `navigator.language` (`ar-*` → arabe, `en-*` → anglais, sinon francais).
- Selecteur dans la barre de navigation (**Français / العربية / English**) : le choix y est memorise. Apres connexion,
  la langue du profil (`GET /api/moi/profil`) initialise l'interface **si** l'utilisateur n'a pas choisi lui-meme
  (`choisieManuellement()`) ; une langue de profil non prise en charge (`kab`) laisse la langue detectee.
- Dans les templates : pipe standalone `t` (`{{ 'nav.annuaire' | t }}`, `{{ 'commun.minutes' | t:{ n: 30 } }}`) et
  pipe `dateLocale` (`{{ iso | dateLocale:'jourHeure' }}`, formats nommes `jourDateHeure`, `jourHeure`, `dateHeure`,
  `date`, `courtHeure`, eux-memes traduits). Les deux sont **impurs** : ils suivent le signal de langue. Dans le code,
  `TraductionService.t(...)` ; les fonctions de libelles partagees (statuts, compteurs : `libelleStatutRendezVous`,
  `libelleRappels`, `formaterMoyenne`, `formaterPrix`, `libelleReponses`, `validerProfil`…) prennent un `Traducteur`
  en dernier parametre, avec le francais par defaut.
- Ce qui n'est **pas** traduit : les donnees de l'API (nom du praticien, commentaire d'un avis, medicament) et les
  messages d'erreur `{ erreur }` renvoyes par le backend, affiches tels quels.
- Ecriture de droite a gauche : `styles.css` adapte les marges (proprietes logiques `margin-inline-start`,
  `padding-inline-start`) et inverse les bulles de la messagerie sous `[dir='rtl']` ; les identifiants et codes
  restent en `direction: ltr`.
- Referencement : les titres et descriptions passent par les cles `seo.*` ; `SeoService` reapplique la derniere
  definition a chaque changement de langue, et le serveur rend `<html lang="ar" dir="rtl">` avec le titre arabe quand
  le navigateur demande l'arabe.
- Controle : `npm run verif:i18n` (`outils/verifier-i18n.mjs`) echoue si un libelle francais litteral (lettre
  accentuee hors interpolation) reste dans le template d'un composant.

## Prochaines etapes
- Nom du patient dans l'agenda et sur l'ordonnance (l'API n'expose que l'identifiant).
- Tests de bout en bout des parcours connectes (Keycloak de test ou jeton de developpement accepte par l'API).
- Traduction des messages d'erreur du backend (ils arrivent en francais dans `{ erreur }`) et langue kabyle (`kab`),
  proposee dans le profil mais pas encore dans l'interface.

## v0.2.0 — Annuaire (web)
- Ecran d'accueil public : recherche de praticiens (specialite, wilaya, nom) via `GET /api/medecins`.
- `/moi` : compte utilisateur (connexion Keycloak).

## v0.3.0 — Réservation
- Barre de navigation (Accueil, Mes rendez-vous, Mon compte) ; chaque résultat de l'annuaire mène à la fiche du praticien.
- `/medecins/:id` : fiche du praticien (`GET /api/medecins/{id}`) et créneaux disponibles (`GET /api/medecins/{id}/creneaux`),
  bouton « Réserver » par créneau (`POST /api/creneaux/{id}/reserver`, rôle PATIENT). Non connecté → redirection Keycloak
  puis retour sur la fiche ; créneau déjà pris (409) → message « Ce créneau vient d'être pris ».
- `/mes-rendez-vous` : rendez-vous du patient (`GET /api/rendezvous/mes`) avec statut, date et bouton « Annuler »
  (`POST /api/rendezvous/{id}/annuler`). Redirige vers la connexion si l'utilisateur n'est pas connecté.
- `AuthService` : initialisation OIDC unique (lancée par `AppComponent`), `estConnecte()`, `seConnecter()`, `seDeconnecter()`.
- `RendezVousService` (`reserver`, `mes`, `annuler`) ; `AnnuaireService` gagne `medecin(id)` et `creneaux(id)`.
- Dates en français (`LOCALE_ID` = `fr`, `registerLocaleData`) : « jeudi 18 septembre à 14:30 ».

## v0.4.0 — Ordonnances
- `/mes-ordonnances` : ordonnances du patient (`GET /api/ordonnances/mes`, rôle PATIENT) — date d'émission, code de
  vérification et statut, les plus récentes d'abord ; chaque ligne mène au détail. Redirige vers la connexion si besoin.
- `/ordonnances/:id` : détail (`GET /api/ordonnances/{id}`) — praticien (nom lu dans l'annuaire), patient, lignes
  (médicament, posologie, durée), code de vérification affiché en grand et bouton « Imprimer » (`window.print()` ;
  la barre de navigation et les boutons sont masqués à l'impression). Depuis la v0.22.0, bouton « Télécharger le
  PDF » : `OrdonnanceService.pdf(id)` (`GET /api/ordonnances/{id}/pdf`, `responseType: 'blob'`, PATIENT ou MEDECIN)
  puis lien de téléchargement `ordonnance-<code>.pdf` (URL objet libérée ensuite) ; en cas d'échec, motif
  `{ erreur }` de l'API ou « Impossible de générer le PDF de cette ordonnance. » ; navigateur seulement (garde SSR).
- `/verifier` : page publique — saisie d'un code (`GET /api/ordonnances/verifier/{code}`) → « Ordonnance authentique,
  émise le … » ou « Code inconnu ». Accepte `?code=…` (lien depuis le détail d'une ordonnance).
- `OrdonnanceService` (`mes`, `parId`, `verifier`, `emettre`) ; composant `app-liste-ordonnances` partagé.
- Barre de navigation : « Mes ordonnances » (utilisateurs connectés) et « Vérifier une ordonnance » (public).

## v0.5.0 — Espace médecin
- `RoleService` : profil et rôles lus une seule fois sur `GET /api/moi` après connexion (`moi()`, `roles()`,
  `estMedecin()`, mis en cache) ; `/moi` réutilise ce cache.
- `medecinGuard` (`canActivate` sur `/medecin/...`) : non connecté → connexion Keycloak puis retour sur la page
  demandée ; connecté sans le rôle MEDECIN → redirection vers l'accueil.
- `/medecin/agenda` : rendez-vous du praticien (`GET /api/medecin/rendezvous`) — date, statut, identifiant du patient,
  bouton « Marquer honoré » (`POST /api/rendezvous/{id}/honorer`, si CONFIRME) et « Rédiger une ordonnance »
  (ouvre le formulaire prérempli).
- `/medecin/disponibilites` : ouverture d'un créneau — date et heure (`<input type="datetime-local">`, converties en
  ISO 8601 UTC) et durée en minutes → `POST /api/medecin/creneaux`, message de succès.
- `/medecin/ordonnance/nouvelle?patientId=&rendezVousId=` : formulaire à lignes dynamiques (ajouter / supprimer
  une ligne : médicament, posologie, durée) → `POST /api/ordonnances` puis redirection vers le détail.
- `/medecin/ordonnances` : ordonnances rédigées par le praticien (`GET /api/medecin/ordonnances`).
- `MedecinService` (`agenda`, `ouvrirCreneau`, `honorer`, `ordonnancesRedigees`) ; libellés de statut de
  rendez-vous partagés (« Honoré » ajouté, un rendez-vous honoré ne s'annule plus).
- Barre de navigation : section « Espace médecin » (Agenda, Disponibilités, Mes ordonnances rédigées), visible
  uniquement si `estMedecin()`.

## v0.6.0 — Notifications
- Cloche de notifications dans la barre de navigation (utilisateurs connectés) : lien « Notifications (n) » avec le
  nombre de non lues (`GET /api/notifications/non-lues/nombre`), relu toutes les 60 s (`timer` + `switchMap`,
  arrêt à la destruction du composant), au clic et après chaque marquage lu ; une erreur de l'API laisse le
  dernier compteur connu.
- `/notifications` : boîte de réception (`GET /api/notifications/mes`), les plus récentes d'abord, non lues mises
  en avant (fond teinté, sujet en vert), bouton « Marquer comme lue » (`POST /api/notifications/{id}/lue`) et
  « Tout marquer comme lu » (`POST /api/notifications/toutes-lues`) ; état vide « Aucune notification pour le
  moment. ». Redirige vers la connexion si l'utilisateur n'est pas connecté.
- `NotificationService` (`mesNotifications`, `nombreNonLues`, `marquerLue`, `toutMarquerLu`, flux `changements$`).
- Infrastructure de test de l'époque (Karma / Jasmine, `karma.conf.js`, cible `test` d'`angular.json`) : specs du
  service, des deux composants et test de fumée d'`AppComponent` ; workflow GitHub Actions.
  **Retirée en v0.24.0** : tous les tests sont passés à Playwright, voir la section « Tester ».

## v0.7.0 — Téléconsultation
- `/teleconsultations` : téléconsultations du patient (`GET /api/teleconsultations/mes`, rôle PATIENT), les plus
  récentes d'abord, avec le praticien (nom lu dans l'annuaire), la date du rendez-vous lié (lue dans
  `GET /api/rendezvous/mes`) et le statut. Tant que `consentementPatientLe` est `null`, un encart de consentement
  explicite est affiché — « En rejoignant cette téléconsultation, vous acceptez qu'elle se déroule en vidéo via un
  service tiers (Jitsi Meet). Aucun enregistrement n'est réalisé par Tabibi. » — avec le bouton « Je donne mon
  consentement » (`POST /api/teleconsultations/{id}/consentir`) ; la vue renvoyée porte alors `lienSalle` et le lien
  « Rejoindre la téléconsultation » (`target="_blank" rel="noopener"`) apparaît, uniquement si le statut est
  PLANIFIEE ou EN_COURS. Redirige vers la connexion si besoin.
- `/medecin/teleconsultations` (sous `medecinGuard`) : téléconsultations du praticien (`GET /api/medecin/teleconsultations`),
  boutons « Démarrer » (`POST .../demarrer`, désactivé avec la mention « En attente du consentement du patient » tant que
  le patient n'a pas consenti), « Terminer » (`POST .../terminer`, si EN_COURS), « Annuler » (`POST .../annuler`, si
  PLANIFIEE, avec confirmation) et lien « Ouvrir la salle » ; un 409 affiche le motif `{ erreur }` et recharge la liste.
- `/medecin/agenda` : bouton « Proposer une téléconsultation » sur les rendez-vous CONFIRME
  (`POST /api/medecin/teleconsultations { rendezVousId }`), message de confirmation avec la date du rendez-vous ;
  409 (rendez-vous non confirmé ou téléconsultation déjà planifiée) → motif `{ erreur }` affiché.
- `TeleconsultationService` (`mes`, `parId`, `consentir`, `planifier`, `duMedecin`, `demarrer`, `terminer`, `annuler`),
  `salleAccessible()` ; libellés `libelleStatutTeleconsultation` (Planifiée, En cours, Terminée, Annulée).
- Barre de navigation : « Mes téléconsultations » (utilisateurs connectés) et « Téléconsultations » dans l'espace médecin.

## v0.8.0 — Administration
- `RoleService.estAdmin()` (rôle ADMIN lu sur `/api/moi`) ; `adminGuard` (`canActivate` sur `/admin/...`, même modèle
  que `medecinGuard`) : non connecté → connexion Keycloak puis retour sur la page demandée ; connecté sans le rôle
  ADMIN → redirection vers l'accueil. L'autorisation réelle reste côté API (`/api/admin/**` verrouillé).
- `/admin` : tableau de bord (`GET /api/admin/statistiques`) — trois compteurs : candidatures en attente, validées,
  refusées — et lien vers l'examen des candidatures.
- `/admin/candidatures` : candidatures des médecins (`GET /api/admin/candidatures?statut=`), filtre par statut
  (En attente par défaut, Validées, Refusées, Toutes) ; pour une candidature en attente : bouton « Valider »
  (`POST /api/admin/candidatures/{id}/valider`, le praticien est publié dans l'annuaire et prévenu) et champ
  « Motif du refus » obligatoire + bouton « Refuser » (`POST .../refuser { motif }`) ; message de confirmation puis
  rechargement ; 409 / 404 (déjà traitée) → motif `{ erreur }` affiché et liste rechargée ; 400 → motif affiché.
- `/medecin/candidature` (sous `medecinGuard`) : dernière candidature du praticien (`GET /api/medecin/candidature`,
  404 = aucune) avec son statut (En attente, Validée + lien vers la fiche, Refusée + motif) ; formulaire de dépôt
  (`POST /api/medecin/candidature`) uniquement s'il n'y a aucune candidature ou si la dernière est refusée (prérempli
  dans ce cas) : nom complet, numéro d'inscription à l'ordre, spécialité (code + libellé), wilaya (code + libellé),
  ville, téléphone ; validation côté client des champs obligatoires (nom, spécialité, wilaya, numéro d'ordre) ;
  409 (candidature déjà en attente ou validée) → motif affiché et candidature rechargée ; 400 → motif affiché.
- `AdminService` (`candidatures`, `valider`, `refuser`, `statistiques`), types `Candidature`, `DemandeCandidature`,
  `StatistiquesAdministration`, libellés `libelleStatutCandidature` ; `MedecinService` gagne `deposerCandidature`
  et `maCandidature`.
- Barre de navigation : section « Administration » (Tableau de bord, Candidatures) visible uniquement si `estAdmin()` ;
  « Ma candidature » dans l'espace médecin.

## v0.9.0 — Messagerie
- `/messagerie` : mes conversations (`GET /api/conversations`, rôle PATIENT ou MEDECIN), la plus récente activité
  d'abord, avec l'interlocuteur (nom du médecin lu dans l'annuaire pour le patient ; « Patient » suivi d'un
  identifiant abrégé pour le médecin), la date de dernière activité et « n non lus » (ligne mise en avant) ;
  état vide avec lien vers l'annuaire. Redirige vers la connexion si l'utilisateur n'est pas connecté.
- `/messagerie/:id` : fil de la conversation (`GET /api/conversations/{id}/messages`, du plus ancien au plus récent ;
  la lecture marque lus les messages reçus) — mes messages en bulles à droite (identifiant du sujet lu sur `/api/moi`),
  ceux de l'autre participant à gauche, date de chaque message, mention « lu » sur mes messages lus ; champ de
  saisie avec compteur « n / 2000 », bouton « Envoyer » désactivé si le texte est vide ou dépasse 2000 caractères ;
  `POST /api/conversations/{id}/messages { contenu }` puis rechargement du fil ; 400 → motif `{ erreur }` affiché
  (le texte est conservé) ; 403 → « Cette conversation ne vous concerne pas. » ; 404 → « Conversation introuvable. ».
  Le fil est relu toutes les 30 s tant que la page est ouverte (arrêt à la destruction du composant).
- Fiche du praticien : bouton « Écrire au médecin » (`POST /api/conversations { medecinId }`, 201 créée ou 200
  existante) puis navigation vers le fil ; 403 → « Vous devez avoir un rendez-vous avec ce médecin pour lui écrire. » ;
  non connecté → connexion Keycloak puis retour sur la fiche.
- `MessagerieService` (`ouvrir`, `mesConversations`, `messages`, `envoyer`), types `Conversation`, `Message`,
  `LONGUEUR_MAX_MESSAGE`, `abregerIdentifiant`.
- Barre de navigation : « Messagerie » (utilisateurs connectés).

## v0.10.0 — Avis
- `/avis/nouveau/:rendezVousId` : dépôt d'un avis par le patient (`POST /api/avis { rendezVousId, note, commentaire }`,
  201) — rappel du rendez-vous et du praticien (lus dans `GET /api/rendezvous/mes` et l'annuaire), note de 1 à 5 par
  cinq boutons radio stylisés (obligatoire : « Choisissez une note de 1 à 5. »), commentaire facultatif avec compteur
  « n / 500 » ; confirmation « Merci, votre avis a été enregistré. » avec lien vers « Mes avis » ; 409 → « Vous avez
  déjà donné votre avis pour ce rendez-vous. » ; 400 / 403 → motif `{ erreur }` ; 404 → « Rendez-vous introuvable. ».
  Redirige vers la connexion si l'utilisateur n'est pas connecté.
- `/mes-avis` : mes avis (`GET /api/avis/mes`, rôle PATIENT), les plus récents d'abord — note « n / 5 », statut
  (Publié, Signalé, Masqué), date, praticien (nom lu dans l'annuaire, lien vers sa fiche), commentaire ; état vide
  avec lien vers « Mes rendez-vous ».
- « Mes rendez-vous » : sur un rendez-vous HONORE, bouton « Donner mon avis » (lien vers `/avis/nouveau/:id`) ou
  mention « Avis donné » si un avis existe déjà (`GET /api/avis/mes`, lu seulement s'il y a un rendez-vous honoré).
- Fiche du praticien : synthèse publique `app-synthese-avis` (`GET /api/medecins/{id}/avis`, sans jeton) —
  « 4,5 / 5 (12 avis) » au format français (virgule) ou « Aucun avis pour le moment », puis les cinq derniers avis
  anonymes (note, date, commentaire).
- `/medecin/avis` (sous `medecinGuard`) : avis publics reçus par le praticien (`GET /api/medecins/{moi}/avis`, « moi »
  étant le sujet du jeton lu sur `/api/moi`), moyenne et bouton « Signaler » (`POST /api/avis/{id}/signaler`) :
  l'avis quitte la vue publique, message de confirmation puis rechargement ; 409 / 404 → motif `{ erreur }` affiché
  et liste rechargée ; 403 → « Cet avis ne vous concerne pas. ».
- `/admin/avis` (sous `adminGuard`) : modération (`GET /api/admin/avis?statut=`), filtre par statut (Signalés par
  défaut, Publiés, Masqués, Tous), note, statut, date, commentaire, identifiants du médecin, du patient et du
  rendez-vous ; « Masquer » (`POST /api/admin/avis/{id}/masquer`, sauf si déjà masqué) et « Rétablir »
  (`POST .../retablir`, sauf si déjà publié) ; confirmation puis rechargement ; 409 / 404 → motif affiché et liste
  rechargée.
- `AvisService` (`deposer`, `mes`, `synthese`, `signaler`, `pourModeration`, `masquer`, `retablir`), types `Avis`,
  `AvisPublic`, `SyntheseAvis`, `AvisAdmin`, `formaterMoyenne`, `libelleStatutAvis`, bornes `NOTE_MIN`, `NOTE_MAX`,
  `LONGUEUR_MAX_COMMENTAIRE`.
- Barre de navigation : « Mes avis » (utilisateurs connectés), « Avis des patients » (espace médecin),
  « Modération des avis » (administration).

## v0.11.0 — Dawini
- `RoleService.estPharmacie()` (rôle PHARMACIE lu sur `/api/moi`) ; `pharmacieGuard` (`canActivate` sur `/pharmacie`, même
  modèle que `medecinGuard`) : non connecté → connexion Keycloak puis retour sur la page demandée ; connecté sans le
  rôle → redirection vers l'accueil. L'autorisation réelle reste côté API.
- `/dawini` : demandes de médicaments du patient — formulaire de publication (`POST /api/dawini/besoins
  { medicament, wilayaCode, commune, precision }`) : médicament et code de wilaya obligatoires (contrôle côté client :
  « Indiquez le médicament recherché et le code de votre wilaya. » ; l'annuaire n'ayant pas de liste de wilayas, le
  code est saisi), commune et précision facultatives ; confirmation puis rechargement ; 400 → motif `{ erreur }`.
  Puis « Mes demandes » (`GET /api/dawini/besoins/mes`), les plus récentes d'abord : médicament, statut (Ouverte,
  Clôturée), wilaya, commune, date, « n réponses » ; chaque demande mène à ses réponses. Redirige vers la connexion
  si l'utilisateur n'est pas connecté.
- `/dawini/:id` : réponses des pharmacies (`GET /api/dawini/besoins/{id}/reponses`, les plus anciennes d'abord) —
  pharmacie, Disponible / Indisponible, prix « 850 DA » (« 1 250 DA »), commentaire, date ; la demande (retrouvée
  dans mes demandes) est rappelée avec son statut ; bouton « Clôturer la demande » si elle est OUVERT
  (`POST /api/dawini/besoins/{id}/cloturer`), confirmation ; 409 (déjà clôturée) → motif affiché et demande
  rechargée ; 403 → « Cette demande ne vous appartient pas. » ; 404 → « Demande introuvable. ».
- `/pharmacie` (sous `pharmacieGuard`) : espace pharmacie — code de wilaya (obligatoire) puis demandes ouvertes de la
  wilaya (`GET /api/dawini/besoins?wilaya=`, sans identité de patient), les plus récentes d'abord ; pour chaque demande,
  un formulaire de réponse (`POST /api/dawini/besoins/{id}/reponses { nomPharmacie, disponible, prixDa, commentaire }`) :
  nom de la pharmacie (obligatoire, mémorisé dans `localStorage` — clé `tabibi.pharmacie.nom` — pour être prérempli
  à la visite suivante, lecture et écriture protégées par try/catch), disponible oui / non (obligatoire), prix en DA
  (entier positif ou nul) et commentaire facultatifs ; confirmation « Réponse envoyée pour « … » : le patient est
  prévenu. », le formulaire est remplacé par « Vous avez répondu à cette demande. » et la liste rechargée ; 409 / 404
  (demande clôturée ou déjà répondue) → motif `{ erreur }` affiché et liste rechargée ; 400 → motif affiché ;
  403 → « Cette page est réservée aux pharmacies. ».
- `DawiniService` (`publier`, `mesBesoins`, `cloturer`, `reponses`, `besoinsOuverts`, `repondre`), types `Besoin`,
  `DemandeBesoin`, `Reponse`, `DemandeReponse`, `libelleStatutBesoin`, `formaterPrix`, `libelleReponses`.
- Barre de navigation : « Dawini » (utilisateurs connectés) et section « Espace pharmacie » (Demandes de médicaments)
  visible uniquement si `estPharmacie()`.

## v0.12.0 — Configuration à l'exécution
- `ConfigService` (`config/config.service.ts`) : charge `assets/config.json` une seule fois avant le démarrage
  (`APP_INITIALIZER`, Angular 18.2 n'ayant pas `provideAppInitializer`) et expose `apiUrl`, `keycloakIssuer`,
  `keycloakClientId` ; repli sur les valeurs localhost (avertissement console) si le fichier est absent ou illisible,
  champ manquant ou vide complété par sa valeur par défaut, barre oblique finale retirée des URL.
- Tous les services HTTP construisent leurs URL sur `config.apiUrl` (plus aucune origine codée en dur) ;
  `creerAuthConfig(config)` (`auth/auth.config.ts`) remplace la constante : `AuthService.initialiser()` attend la
  configuration avant d'appliquer l'OIDC (`requireHttps` déduit de l'issuer).
- `angular.json` : `src/assets` publié (build et test) ; `index.html` : `<base href="/">`.
- Voir la section « Configuration » ci-dessus pour le déploiement.

## v0.13.0 — Mon profil
- `/moi/profil` : mon profil (`GET /api/moi/profil`, 404 = jamais renseigné → formulaire vide ; `PUT /api/moi/profil
  { nomComplet, telephone, dateNaissance, wilayaCode, langue }`), pour tout utilisateur connecté — nom complet
  (obligatoire, 2 à 120 caractères), téléphone (algérien, 9 à 10 chiffres commençant par 0, espaces tolérés puis
  retirés), date de naissance (`<input type="date">`, dans le passé et après 1900), code de wilaya (4 caractères au
  plus), langue par liste (Français, العربية, Taqbaylit, English) ; validation côté client identique aux règles du
  backend, message « Profil enregistré. », mention « Dernière mise à jour le … » ; 400 → motif `{ erreur }` affiché,
  saisie conservée. Redirige vers la connexion si l'utilisateur n'est pas connecté.
- « Mon compte » (`/moi`) : lien « Mon profil ».
- `ProfilService` (`monProfil`, `enregistrer`), types `Profil`, `DemandeProfil`, `LANGUES`, `nettoyerProfil`,
  `validerProfil`, `libelleLangue`, `dateLocaleIso`.

## v0.14.0 — Liste d'attente
- Fiche du praticien : encart « Liste d'attente » sous les créneaux (mis en avant quand aucun créneau n'est
  disponible) — « Vous serez notifié dès qu'un créneau se libère. » et bouton « M'inscrire sur la liste d'attente »
  (`POST /api/medecins/{id}/liste-attente`, rôle PATIENT, 201) ; confirmation avec lien vers mes listes d'attente ;
  409 → « Vous êtes déjà inscrit sur cette liste. » ; 403 → « Seul un compte patient peut s'inscrire… » ; non
  connecté → connexion Keycloak puis retour sur la fiche.
- `/liste-attente` : mes listes d'attente (`GET /api/liste-attente/mes`), les plus anciennes d'abord, avec le nom du
  praticien (annuaire, lien vers sa fiche) et la date d'inscription ; bouton « Me retirer »
  (`POST /api/liste-attente/{id}/retirer`, 204) ; état vide avec lien vers l'annuaire. Redirige vers la connexion
  si l'utilisateur n'est pas connecté.
- `/medecin/liste-attente` (sous `medecinGuard`) : patients en attente chez le praticien
  (`GET /api/medecin/liste-attente`), du plus ancien au plus récent, identifiant abrégé et date d'inscription ;
  état vide avec lien vers les disponibilités.
- `ListeAttenteService` (`inscrire`, `mes`, `retirer`, `duMedecin`), type `InscriptionAttente`.
- Barre de navigation : « Mes listes d'attente » (utilisateurs connectés), « Liste d'attente » (espace médecin).

## v0.15.0 — Cabinet : secrétaires et espace secrétaire
- `RoleService.estSecretaire()` (rôle SECRETAIRE lu sur `/api/moi`) ; `secretaireGuard` (`canActivate` sur
  `/secretaire`, même modèle que `medecinGuard`) : non connecté → connexion Keycloak puis retour sur la page
  demandée ; connecté sans le rôle → redirection vers l'accueil. L'autorisation réelle reste côté API (chaque action
  exige un rattachement au cabinet du médecin).
- `/medecin/secretaires` (sous `medecinGuard`) : secrétaires rattachées à mon cabinet (`GET /api/medecin/secretaires`),
  rattachement par l'identifiant Keycloak du compte de la secrétaire — champ « Identifiant du compte de votre
  secrétaire (visible dans Mon compte) », contrôle du format UUID côté client — (`POST /api/medecin/secretaires
  { secretaireId }`, 201 ; 409 déjà rattachée → motif affiché et liste rechargée ; 400 soi-même → motif), retrait
  avec confirmation (`POST /api/medecin/secretaires/{id}/retirer`, 204) ; la secrétaire est prévenue par l'API.
- `/medecin/agenda` : bouton « Annuler » sur les rendez-vous CONFIRME (confirmation, `POST
  /api/medecin/rendezvous/{id}/annuler`) : le créneau est de nouveau proposé et le patient prévenu ; 409 (plus
  confirmé) → motif `{ erreur }` affiché et agenda rechargé.
- `/secretaire` (sous `secretaireGuard`) : espace secrétaire — choix du médecin parmi mes rattachements
  (`GET /api/secretaire/medecins`, nom lu dans l'annuaire, choisi d'office s'il n'y en a qu'un), puis son agenda
  (`GET /api/secretaire/medecins/{medecinId}/rendezvous`) avec « Marquer honoré » et « Annuler » (confirmation) sur
  les CONFIRME (`POST /api/secretaire/rendezvous/{id}/honorer | annuler` ; 409 → motif affiché et agenda rechargé ;
  403 → « Ce cabinet ne vous est pas rattaché. ») et formulaire d'ouverture de créneau (`<input type="datetime-local">`
  converti en ISO 8601 UTC, durée de 5 à 120 minutes contrôlée côté client → `POST
  /api/secretaire/medecins/{medecinId}/creneaux { debut, dureeMinutes }`, 400 → motif affiché).
- « Mon compte » (`/moi`) : identifiant du compte (sujet du jeton) avec bouton « Copier » (`navigator.clipboard`,
  message de repli si la copie est refusée), à communiquer au médecin pour le rattachement.
- `SecretaireService` (`mesMedecins`, `agenda`, `ouvrirCreneau`, `honorer`, `annuler`), type `Rattachement`,
  bornes `DUREE_MIN_MINUTES` / `DUREE_MAX_MINUTES`, `estUuid` ; `MedecinService` gagne `annulerRendezVous`,
  `secretaires`, `rattacherSecretaire`, `retirerSecretaire`.
- Barre de navigation : « Mes secrétaires » (espace médecin) et section « Espace secrétaire » (Agenda du cabinet),
  visible uniquement si `estSecretaire()`.

## v0.16.0 — Rappels de rendez-vous (administration)
- `/admin` : section « Rappels de rendez-vous » — bouton « Exécuter les rappels maintenant »
  (`POST /api/admin/rappels/executer`, rôle ADMIN) : envoie tout de suite les rappels des rendez-vous confirmés des
  24 prochaines heures (un seul rappel par rendez-vous, comme le planificateur horaire du backend) et affiche
  « n rappel(s) envoyé(s) » (« 0 rappel envoyé », « 3 rappels envoyés ») ; erreur → motif `{ erreur }` affiché.
- `AdminService.executerRappels()` (lit `{ nombre }`), `libelleRappels`.

## v0.16.1 — Correctif : durée maximale d'un créneau
- `/medecin/disponibilites` : la durée d'un créneau est bornée à **5..120 minutes** comme dans l'API (le champ acceptait
  jusqu'à 240 et l'API répondait 400) ; libellé « Durée (minutes, de 5 à 120) », contrôle côté client « Indiquez une
  durée entre 5 et 120 minutes. », bornes `DUREE_MIN_MINUTES` / `DUREE_MAX_MINUTES` partagées avec l'espace secrétaire.

## v0.17.0 — Image Docker
- `Dockerfile` multi-etapes (`node:20-alpine` puis `nginx:1.27-alpine`, port 80), `docker/entrypoint.sh` (configuration
  a l'execution : `assets/config.json` et CSP depuis `TABIBI_API_URL`, `TABIBI_KEYCLOAK_ISSUER`,
  `TABIBI_KEYCLOAK_CLIENT_ID` ou `DOMAINE`), `nginx/default.conf.template` (routage Angular, cache, gzip, en-tetes de
  securite), `.dockerignore`. Build avec empreintes (`outputHashing: all`) et sans CSS critique inline (CSP).
- Voir la section « Deploiement » ci-dessus.

## v0.18.0 — Publication de l'image (CI)
- `.github/workflows/ci.yml` : job `image` (push sur `main` seulement, apres `build-test`) qui construit le
  `Dockerfile` et publie `ghcr.io/<org>/tabibi-web` avec les tags `latest` et `sha-<commit>` (`docker/login-action`
  avec `GITHUB_TOKEN`, `docker/metadata-action`, `docker/build-push-action`, cache GitHub Actions).
- `.github/dependabot.yml` (npm, GitHub Actions, Docker, hebdomadaire) ; badge CI dans ce README.

## v0.19.0 — Rendu cote serveur (SSR)
- `@angular/ssr` 18, `server.ts` (express : fichiers statiques, rendu Angular avec secours sans rendu, en-tetes de
  securite et CSP), `main.server.ts`, `app.config.server.ts` ; `provideClientHydration()` et `withFetch()` ;
  garde-fous serveur (`AuthService`, `ConfigService` avec `CONFIGURATION_SERVEUR`, cloche, espace pharmacie) ;
  image Docker `node:20-alpine` executant `server.mjs` sur le port 80 sous l'utilisateur `node` (nginx retire).
- `ng serve` : `buildTarget` manquant dans `angular.json` (npm start echouait), corrige.
- Voir les sections « Rendu cote serveur (SSR) » et « Deploiement ».

## v0.20.0 a v0.22.0
- Voir `docs/JOURNAL.md` (referencement, tests de bout en bout Playwright, ordonnance en PDF).

## v0.23.0 — Interface en francais, arabe et anglais (RTL)
- Traduction a l'execution des ecrans patient, medecin, secretaire, pharmacie et administration ; selecteur de langue
  dans la barre de navigation ; arabe de droite a gauche (`dir="rtl"`), au rendu serveur comme dans le navigateur.
- Voir la section « Langues (francais, arabe, anglais) » ci-dessus.
