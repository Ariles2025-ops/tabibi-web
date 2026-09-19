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

## v0.8.0 — Administration
- `RoleService.estAdmin()` (role ADMIN du realm, autorite ROLE_ADMIN cote API) ; `adminGuard` sur `/admin/...`, calque
  sur `medecinGuard` : non connecte → connexion Keycloak avec retour sur la page demandee ; connecte sans le role →
  `router.parseUrl('/')`. Defense en profondeur : la garde n'est qu'un confort d'interface, l'API verrouille `/api/admin/**`.
- `/admin` (`TableauDeBordAdminComponent`) : trois tuiles (libelle + valeur) pour `GET /api/admin/statistiques`
  (candidatures en attente / validees / refusees), lien vers les candidatures ; 403 : « Cette page est reservee a
  l'administrateur. ».
- `/admin/candidatures` (`CandidaturesAdminComponent`) : filtre par statut (EN_ATTENTE par defaut, VALIDEE, REFUSEE,
  toutes = sans parametre), fiche de chaque candidature (nom, specialite, ville et wilaya, numero d'ordre, telephone,
  dates de depot et de traitement, motif de refus) ; « Valider » et « Refuser » avec champ de motif obligatoire (bouton
  desactive tant qu'il est vide, controle aussi a l'envoi) ; message de confirmation puis rechargement ; 409 / 404 :
  motif `{ erreur }` affiche et liste rechargee ; 400 : motif affiche.
- `/medecin/candidature` (`CandidatureMedecinComponent`, sous `medecinGuard`) : `GET /api/medecin/candidature` (404 =
  aucune → formulaire) ; statut affiche (En attente : « en cours d'examen » ; Validee : lien vers la fiche
  `/medecins/{medecinId}` ; Refusee : motif et formulaire de nouveau depot prerempli) ; formulaire avec les huit champs,
  validation cote client des obligatoires (nom complet, specialite, wilaya, numero d'ordre, comme le domaine backend),
  champs nettoyes (trim) ; 201 : candidature affichee en attente ; 409 : motif affiche et candidature rechargee ;
  400 : motif affiche ; 403 : « reservee aux medecins ».
- `AdminService` (`candidatures(statut?)`, `valider`, `refuser(id, motif)`, `statistiques`), types `Candidature`,
  `DemandeCandidature`, `StatistiquesAdministration`, `libelleStatutCandidature` (En attente, Validee, Refusee) ;
  `MedecinService.deposerCandidature` et `maCandidature`.
- Routes `/admin` et `/admin/candidatures` (adminGuard), `/medecin/candidature` (medecinGuard) ; section
  « Administration » de la barre de navigation si `estAdmin()`, lien « Ma candidature » dans l'espace medecin.
- Tests (41 specs ajoutees, 85 au total) : adminGuard (admin laisse passer, non connecte → connexion avec l'URL,
  sans le role → UrlTree '/'), RoleService (estAdmin / estMedecin, profil lu une fois, non connecte, echec puis nouvel
  essai), AdminService et MedecinService (candidature) avec `HttpTestingController` (URL, parametre statut, corps
  `{ motif }`, 409 / 404 transmis, libelles), tableau de bord (trois compteurs, zeros, 403, 401), candidatures
  (filtre par defaut, refusees avec motif sans bouton, toutes sans parametre, valider, refuser avec motif, motif vide
  bloque, 409 recharge, 400 sans rechargement, etat vide, 403), candidature du medecin (formulaire si 404, validation
  cote client, depot avec champs nettoyes, validee avec lien, refusee avec formulaire prerempli, 409 recharge, 400
  garde le formulaire, 403), barre de navigation (section Administration pour ADMIN seulement).
