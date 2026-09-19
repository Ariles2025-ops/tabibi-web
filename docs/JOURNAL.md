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

## v0.7.0 — Teleconsultation
- Choix : la salle video est celle du backend (Jitsi Meet, lien `lienSalle` non devinable) ; le front n'embarque aucun SDK,
  le lien s'ouvre dans un nouvel onglet (`target="_blank" rel="noopener"`) et n'est propose que si le statut est PLANIFIEE
  ou EN_COURS (`salleAccessible()`). Le consentement du patient est explicite : encart avec le texte « En rejoignant
  cette teleconsultation, vous acceptez qu'elle se deroule en video via un service tiers (Jitsi Meet). Aucun
  enregistrement n'est realise par Tabibi. » et bouton « Je donne mon consentement » tant que `consentementPatientLe`
  vaut null ; le lien n'existe pas avant (l'API ne le remet qu'apres consentement).
- `/teleconsultations` (`MesTeleconsultationsComponent`, PATIENT) : liste les plus recentes d'abord, praticien (nom lu dans
  l'annuaire), date du rendez-vous lie (lue dans `GET /api/rendezvous/mes`, a defaut la date de proposition), statut,
  date du consentement ; consentement (`POST /api/teleconsultations/{id}/consentir`, la vue renvoyee remplace la
  ligne), 409 : motif affiche et liste rechargee ; 403 : « Cette page est reservee aux patients. » ; redirection vers la
  connexion si necessaire ; etat vide.
- `/medecin/teleconsultations` (`TeleconsultationsMedecinComponent`, sous `medecinGuard`) : liste
  (`GET /api/medecin/teleconsultations`), date du rendez-vous lie (lue dans l'agenda), « Demarrer » desactive tant que
  le patient n'a pas consenti avec la mention « En attente du consentement du patient », « Terminer » (EN_COURS),
  « Annuler » (PLANIFIEE, confirmation), lien « Ouvrir la salle » ; un 409 affiche le motif `{ erreur }` et recharge.
- `/medecin/agenda` : « Proposer une teleconsultation » sur un rendez-vous CONFIRME (`POST /api/medecin/teleconsultations
  { rendezVousId }`), confirmation avec la date du rendez-vous et lien vers les teleconsultations ; 409 affiche le motif.
- `TeleconsultationService` (`mes`, `parId`, `consentir`, `planifier`, `duMedecin`, `demarrer`, `terminer`, `annuler`) ;
  `statut-teleconsultation.ts` (Planifiee, En cours, Terminee, Annulee ; statut inconnu affiche tel quel).
- Routes `/teleconsultations` et `/medecin/teleconsultations` ; liens « Mes teleconsultations » (connectes) et
  « Teleconsultations » (espace medecin) dans la barre de navigation.
- Tests (26 specs ajoutees, 44 au total) : service avec `HttpTestingController` (URL, methode, corps `{ rendezVousId }`
  ou nul, transmission du `{ erreur }` d'un 409, `salleAccessible`), libelles, page patient avec services factices (encart
  de consentement affiche sans lien, lien affiche apres consentement avec href / rel, lien direct si deja consenti mais
  pas une fois terminee, 409 affiche et rechargement, etat vide, redirection, 403), page medecin (« Demarrer » desactive
  + mention, lien de salle et demarrage apres consentement, terminer, annuler avec confirmation, 409, etat vide), agenda
  (bouton sur les seuls CONFIRME, planification et confirmation, 409), barre de navigation (nouveaux liens).
