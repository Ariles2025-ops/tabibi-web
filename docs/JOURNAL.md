# Journal des fonctionnalites (front web)

Chaque version correspond a un commit `feat(...)`. Le detail des ecrans est dans le README ; l'API appelee est
decrite dans le README et le journal de tabibi-backend.

## v0.1.0 — Socle
- Angular 18 standalone, signaux ; connexion Keycloak (angular-oauth2-oidc, realm `tabibi`, client `tabibi-web`) ;
  intercepteur qui joint le JWT aux appels `/api/...` ; ecran `/api/moi`.

## v0.2.0 — Annuaire
- Recherche publique de praticiens (specialite, wilaya, nom) sur `GET /api/medecins` ; `/moi`.

## v0.3.0 — Reservation
- Fiche du praticien et creneaux (`/medecins/:id`), reservation d'un creneau (409 : « Ce creneau vient d'etre pris »),
  `/mes-rendez-vous` avec annulation ; `AuthService` (initialisation OIDC unique) ; dates en francais.

## v0.4.0 — Ordonnances
- `/mes-ordonnances`, `/ordonnances/:id` (impression), `/verifier` (page publique) ; `OrdonnanceService`.

## v0.5.0 — Espace medecin
- `RoleService` (roles lus sur `/api/moi`, `estMedecin()`), `medecinGuard` ; agenda, disponibilites, redaction
  d'ordonnance, ordonnances redigees ; section « Espace medecin » de la barre de navigation.

## v0.6.0 — Notifications
- Cloche dans la barre de navigation (`app-cloche-notifications`, utilisateurs connectes seulement) : lien
  « Notifications (n) » avec le nombre de non lues, relu toutes les 60 s (`timer(0, 60 s)` + `switchMap`, abonnement
  ferme a la destruction), au clic et apres chaque marquage lu (flux `NotificationService.changements$`) ; une erreur
  de l'API laisse le dernier compteur connu (`catchError` → `EMPTY`, le flux ne casse pas).
- `/notifications` (`MesNotificationsComponent`) : boite de reception, les plus recentes d'abord, non lues mises en
  avant (classes `.notification-non-lue` / `.notification-lue`), « Marquer comme lue » (la ligne est remplacee par la
  notification renvoyee) et « Tout marquer comme lu » (puis rechargement), etat vide « Aucune notification pour le
  moment. », erreurs `{ erreur }` affichees, redirection vers la connexion si necessaire.
- `NotificationService` : `mesNotifications`, `nombreNonLues` (lit `{ nombre }`), `marquerLue`, `toutMarquerLu`.
- Infrastructure de test, absente jusqu'ici : devDependencies jasmine / karma (dont `karma-coverage`, exige par le
  lanceur d'Angular), `tsconfig.spec.json`, cible `test` d'`angular.json` (polyfills `zone.js/testing`),
  `karma.conf.js` avec le lanceur `ChromeHeadlessCI` (`--no-sandbox --disable-gpu`, execution en root / conteneur) ;
  `package-lock.json` versionne ; workflow GitHub Actions (Node 20 : `npm ci`, `ng build`, `ng test` headless) ;
  `coverage/` ignore par git.
- Tests (18 specs) : service avec `HttpTestingController` (URL, methode, corps nul, lecture de `{ nombre }`,
  signal de changement apres succes seulement), boite de reception avec service factice (tri, classes lue / non lue,
  bouton uniquement sur les non lues, tout marquer lu puis rechargement, etat vide, redirection si non connecte),
  cloche (compteur affiche / masque a zero, relecture a 60 s, au clic et sur `changements$`, arret a la destruction,
  compteur conserve en cas d'erreur), test de fumee d'`AppComponent` (liens publics, cloche seulement si connecte,
  section « Espace medecin » selon le role).
