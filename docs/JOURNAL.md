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

## v0.9.0 — Messagerie
- Reprise d'une ebauche non commitee (`MessagerieService` et `MesConversationsComponent`, coherents avec le
  controleur backend) ; ajout du fil, de la fiche, des routes, de la barre de navigation et des specs.
- `/messagerie` (`MesConversationsComponent`, PATIENT ou MEDECIN) : `GET /api/conversations`, tri par
  `dernierMessageLe` decroissant, interlocuteur (nom du medecin lu dans l'annuaire quand `patientId` est mon sujet,
  sinon « Patient » + huit premiers caracteres de l'identifiant), « Derniere activite le … », « n non lus » (classe
  `.conversation-non-lue`), etat vide avec lien vers l'annuaire, 403 : « reservee aux patients et aux medecins »,
  redirection vers la connexion si necessaire.
- `/messagerie/:id` (`ConversationComponent`) : le sujet du jeton vient de `RoleService.charger()` (`/api/moi`) ;
  la conversation est retrouvee dans `GET /api/conversations` (pas de lecture unitaire cote API) pour nommer
  l'interlocuteur ; fil `GET /api/conversations/{id}/messages` (classes `.message-moi` a droite / `.message-autre`
  a gauche, date, « lu » sur mes messages lus) ; textarea avec compteur « n / 2000 » (rouge au-dela), « Envoyer »
  desactive si vide, trop long ou envoi en cours ; envoi (`{ contenu }` nettoye) puis rechargement et champ vide ;
  400 : motif `{ erreur }` affiche, texte conserve ; 403 / 404 : message dedie sans champ de saisie ; relecture
  toutes les 30 s (`timer` + `switchMap`, `catchError` → `EMPTY`, abonnement ferme a la destruction et relance
  si l'identifiant de route change).
- Fiche du praticien : « Ecrire au medecin » (`POST /api/conversations { medecinId }`) puis `router.navigate`
  vers le fil ; 403 : « Vous devez avoir un rendez-vous avec ce medecin pour lui ecrire. » ; non connecte →
  connexion avec retour sur la fiche.
- Routes `/messagerie` et `/messagerie/:id` ; lien « Messagerie » (connectes) dans la barre de navigation.
- Tests (22 specs ajoutees, 107 au total) : service avec `HttpTestingController` (URL, methode, corps
  `{ medecinId }` / `{ contenu }`, 403 et 400 transmis, constante et abreviation), liste (tri et nom du medecin,
  libelle « Patient … » pour le medecin sans appel a l'annuaire, etat vide, redirection, 403), fil en `fakeAsync`
  (bulles selon l'auteur pour un patient puis pour un medecin, compteur et bouton, envoi puis rechargement,
  vide / trop long refuses, 400 sans rechargement, relecture a 30 s avec erreur passagere ignoree et arret a la
  destruction, 403 sans champ, redirection), fiche (bouton et navigation, 403, non connecte), barre de navigation.

## v0.10.0 — Avis
- `AvisService` : `deposer(rendezVousId, note, commentaire | null)` (`POST /api/avis`), `mes`, `synthese(medecinId)`
  (`GET /api/medecins/{id}/avis`, public), `signaler`, `pourModeration(statut?)` (`GET /api/admin/avis`), `masquer`,
  `retablir` ; `formaterMoyenne(moyenne, nombre)` → « 4,5 / 5 (12 avis) » (`toFixed(1)` puis virgule, sans dependance
  a la locale) ou « Aucun avis pour le moment » si la moyenne est null ou le nombre nul ; `libelleStatutAvis`
  (Publie, Signale, Masque).
- `/avis/nouveau/:rendezVousId` (`DeposerAvisComponent`) : identifiant lu dans `route.snapshot.paramMap` ; rappel du
  rendez-vous (retrouve dans `GET /api/rendezvous/mes`) et du praticien (annuaire), erreurs de ces lectures ignorees ;
  cinq boutons radio stylises (`.note` / `.note-choisie`, bouton natif masque, etiquette 1 a 5 avec `aria-label`
  « Note n sur 5 », aucun emoji), note obligatoire controlee cote client, commentaire avec compteur « n / 500 »
  (rouge et envoi bloque au-dela), commentaire nettoye et envoye null s'il est vide ; succes : formulaire remplace
  par la confirmation et le lien « Voir mes avis » ; 409 : « Vous avez deja donne votre avis pour ce rendez-vous. »
  (message fixe, le 409 « rendez-vous non honore » est hors du parcours normal puisque le bouton n'apparait que sur
  les HONORE) ; 400 / 403 : motif `{ erreur }` ; 404 : « Rendez-vous introuvable. » ; redirection si non connecte.
- `/mes-avis` (`MesAvisComponent`) : liste triee par `deposeLe` decroissant, nom du praticien lu une fois par
  identifiant, statut traduit, etat vide avec lien vers « Mes rendez-vous », 403 : « reservee aux patients ».
- « Mes rendez-vous » : `rendezVousNotes` (ensemble des `rendezVousId` de `GET /api/avis/mes`, lu seulement s'il y a un
  rendez-vous HONORE, echec ignore) ; lien « Donner mon avis » (`/avis/nouveau/:id`) ou mention « Avis donne ».
- `SyntheseAvisComponent` (`app-synthese-avis`, entree `medecinId` requise, rechargement dans `ngOnChanges`) :
  moyenne formatee et les cinq derniers avis (tri par date decroissante) ; erreur `{ erreur }` affichee ; place en bas
  de la fiche du praticien.
- `/medecin/avis` (`AvisMedecinComponent`, sous `medecinGuard`) : sujet du jeton via `RoleService.charger()` (profil
  illisible → message), `GET /api/medecins/{moi}/avis`, « Signaler » par avis (`POST /api/avis/{id}/signaler`) puis
  confirmation et rechargement ; 409 / 404 : motif affiche et rechargement ; 403 : « Cet avis ne vous concerne pas. ».
- `/admin/avis` (`ModerationAvisComponent`, sous `adminGuard`) : filtre SIGNALE par defaut (PUBLIE, MASQUE, tous =
  sans parametre), « Masquer » (sauf MASQUE) et « Retablir » (sauf PUBLIE), confirmation puis rechargement ;
  409 / 404 : motif affiche et rechargement ; 403 : « reservee a l'administrateur » ; etat vide par filtre.
- Routes `/avis/nouveau/:rendezVousId`, `/mes-avis`, `/medecin/avis` (medecinGuard), `/admin/avis` (adminGuard) ;
  liens « Mes avis », « Avis des patients », « Moderation des avis » dans la barre de navigation.
- Tests (38 specs ajoutees, 145 au total) : service avec `HttpTestingController` (URL, methode, corps avec
  commentaire ou null, parametre statut, 409 transmis), `formaterMoyenne` (virgule, 5,0, arrondi, aucun avis),
  libelles, depot (cinq notes et compteur, note obligatoire, envoi avec commentaire nettoye puis confirmation,
  commentaire null, 409, 400, redirection), mes avis (tri et praticien, etat vide, redirection et 403), mes
  rendez-vous (bouton sur les seuls HONORE sans avis, « Avis donne », pas de lecture des avis sans HONORE), synthese
  (format, aucun avis, rechargement au changement d'identifiant et erreur), fiche (synthese affichee), avis du
  medecin (lecture avec mon identifiant, signalement et rechargement, 409, aucun avis, profil illisible), moderation
  (filtre par defaut, boutons selon le statut, tous sans parametre, masquer, retablir, 409, etat vide, 403), barre de
  navigation.

## v0.11.0 — Dawini
- `RoleService.estPharmacie()` (role PHARMACIE du realm, autorite ROLE_PHARMACIE cote API) ; `pharmacieGuard` sur
  `/pharmacie`, calque sur `medecinGuard` (non connecte → connexion avec retour ; sans le role → `router.parseUrl('/')`).
- `DawiniService` : `publier`, `mesBesoins`, `cloturer`, `reponses`, `besoinsOuverts(wilaya)` (parametre `wilaya`),
  `repondre` ; `libelleStatutBesoin` (Ouverte, Cloturee), `formaterPrix` (« 850 DA », « 1 250 DA », milliers separes
  par une espace, chaine vide sans prix), `libelleReponses` (« 0 reponse », « 1 reponse », « 3 reponses »).
- `/dawini` (`MesDemandesComponent`, PATIENT) : formulaire (medicament et code de wilaya obligatoires, controles cote
  client ; l'annuaire ne porte aucune liste de wilayas dans le code, le code est donc saisi comme sur l'ecran de
  recherche ; commune et precision facultatives, omises du corps si vides, champs nettoyes) ; 201 : confirmation,
  formulaire vide et rechargement ; 400 : motif `{ erreur }` ; puis « Mes demandes » triees par `publieLe`
  decroissant avec statut, « n reponses » et lien vers `/dawini/:id` ; 403 : « reservee aux patients » ; redirection
  si non connecte.
- `/dawini/:id` (`ReponsesDemandeComponent`) : identifiant lu dans `route.snapshot.paramMap` ; la demande est retrouvee
  dans `GET /api/dawini/besoins/mes` (pas de lecture unitaire cote API), erreur ignoree ; reponses triees par
  `repondueLe` croissant (pharmacie, Disponible en vert / Indisponible en rouge, prix formate, commentaire, date) ;
  « Cloturer la demande » si OUVERT, la vue renvoyee remplace la demande ; 409 : motif affiche et demande rechargee ;
  403 / 404 : messages dedies ; etat vide « Aucune reponse pour le moment. ».
- `/pharmacie` (`EspacePharmacieComponent`, sous `pharmacieGuard`) : wilaya obligatoire (controle cote client, 400 de
  l'API affiche), demandes ouvertes triees par date decroissante, un formulaire par demande (`formulaires[id]`, cree a
  la lecture) : nom de la pharmacie commun a toutes les reponses, prerempli depuis `localStorage`
  (`tabibi.pharmacie.nom`, lecture et ecriture dans try/catch : navigation privee ou stockage bloque n'empechent
  rien), disponible oui / non par boutons radio (valeur booleenne), prix (`<input type="number">`, entier positif ou
  nul, `null` si vide), commentaire (`null` si vide) ; 201 : nom memorise, mention « Vous avez repondu a cette
  demande. » a la place du formulaire, confirmation et rechargement ; 409 / 404 : motif affiche et liste rechargee ;
  400 : motif ; 403 : « reservee aux pharmacies » ; etat vide apres recherche seulement.
- Routes `/dawini`, `/dawini/:id`, `/pharmacie` (pharmacieGuard) ; lien « Dawini » (connectes) et section
  « Espace pharmacie » (Demandes de medicaments) si `estPharmacie()` dans la barre de navigation.
- Tests (30 specs ajoutees, 175 au total) : RoleService (estPharmacie), pharmacieGuard (laisse passer, connexion avec
  l'URL, UrlTree '/'), service avec `HttpTestingController` (URL, methode, corps, parametre wilaya, patientId null,
  409 transmis) et formatage (prix, statut, accord des reponses), mes demandes (tri et libelles, refus sans medicament,
  publication avec champs nettoyes et facultatifs omis puis rechargement, 400 sans rechargement, etat vide et
  redirection), reponses (affichage et tri, cloture puis bouton retire, 409 rechargee, deja cloturee sans bouton et
  etat vide, 403 et redirection), espace pharmacie (wilaya obligatoire puis liste et formulaires, refus sans nom ou sans
  disponibilite, reponse envoyee avec nom memorise et formulaire remplace, nom prerempli et indisponibilite sans
  prix, 409 rechargee, 400 de la recherche et etat vide), barre de navigation (section pour PHARMACIE seulement).

## v0.12.0 — Configuration a l'execution
- Jusqu'ici chaque service codait en dur `http://localhost:8080` et `auth.config.ts` l'issuer Keycloak : un
  deploiement imposait de reconstruire. Desormais `src/assets/config.json` (`apiUrl`, `keycloakIssuer`,
  `keycloakClientId`) est lu a l'execution par `ConfigService` (`config/config.service.ts`), charge avant le
  demarrage par un `APP_INITIALIZER` (`useFactory` + `multi: true` : `provideAppInitializer` n'existe qu'a partir
  d'Angular 19, verifie dans @angular/core 18.2.14). Le fichier est remplace au deploiement dans
  `dist/tabibi-web/browser/assets/`, le build reste le meme partout.
- `ConfigService.charger()` : une seule lecture (les appels suivants renvoient la meme promesse), ne rejette jamais :
  fichier absent ou illisible → valeurs localhost par defaut avec `console.warn` ; champ manquant, vide ou non
  textuel → valeur par defaut de ce champ ; barre oblique finale retiree de `apiUrl` et `keycloakIssuer`.
- Les onze services HTTP injectent `ConfigService` et lisent `apiUrl` par un accesseur (`private get base()`),
  jamais a la construction, pour ne dependre d'aucun ordre d'initialisation. Les specs existantes restent inchangees :
  sans fichier charge, l'origine par defaut est celle qu'elles attendent.
- `auth.config.ts` : la constante `authConfig` devient `creerAuthConfig({ keycloakIssuer, keycloakClientId })` ;
  `requireHttps` est deduit de l'issuer (HTTPS exige des que l'issuer est en `https://`, HTTP local tolere en dev).
  `AuthService.initialiser()` attend `config.charger()` (immediat apres l'initializer, sinon au premier usage) avant
  `oauth.configure(...)` puis `loadDiscoveryDocumentAndTryLogin()` : l'OIDC n'est jamais configure avec des valeurs
  non chargees.
- `angular.json` : `assets` inclut `src/assets` (build et test). `index.html` gagne `<base href="/">` : sans lui, les
  chemins relatifs (`main.js`, `assets/config.json`) se resolvaient depuis la route courante et cassaient au
  rechargement d'une route profonde ; `ng build --base-href` permet un sous-chemin.
- README : section « Configuration » (config.json en dev, remplace au deploiement, repli, base href).
- Tests (9 specs ajoutees, 184 au total) : ConfigService (valeurs par defaut avant chargement, lecture par GET et
  exposition des trois champs, barre oblique et champs manquants, repli sur 404 avec avertissement et promesse
  resolue, lecture unique), `creerAuthConfig` (issuer et client, HTTP local sans HTTPS, HTTPS exige en deploiement),
  MoiService (URL construite sur l'origine de la configuration, origine localhost par defaut).

## v0.13.0 — Mon profil
- `ProfilService` (`moi/profil.service.ts`) : `monProfil` (`GET /api/moi/profil`, 404 `{ erreur }` tant que non
  renseigne), `enregistrer` (`PUT /api/moi/profil`) ; types `Profil` (`utilisateurId`, `nomComplet`, `telephone`,
  `dateNaissance` yyyy-MM-dd, `wilayaCode`, `langue`, `misAJourLe`) et `DemandeProfil` ; constantes reprises du
  domaine backend (`LONGUEUR_MIN_NOM` 2, `LONGUEUR_MAX_NOM` 120, `LONGUEUR_MAX_WILAYA` 4, `ANNEE_NAISSANCE_MIN` 1900,
  `LANGUES` fr / ar / kab / en avec leur libelle dans la langue elle-meme) ; `nettoyerProfil` (espaces retires,
  telephone sans espaces, facultatifs vides → null, langue vide → fr) ; `validerProfil(demande, aujourdHui)` renvoie
  le premier motif en francais ou null (nom 2..120, telephone `0` + 8 a 9 chiffres, date valide, passee et
  posterieure a 1900 — comparaison de chaines yyyy-MM-dd sur la date locale du navigateur, `aujourdHui` injectable
  pour les tests —, wilaya <= 4, langue connue) ; `libelleLangue`, `dateLocaleIso`.
- `/moi/profil` (`ProfilComponent`) : redirection vers la connexion si non connecte ; chargement (404 → formulaire
  vide avec la langue fr, autre erreur → motif sans formulaire) ; formulaire prerempli (nom, telephone `type="tel"`,
  date `type="date"` bornee a la veille et a 1901-01-01, wilaya, langue par `<select>`) ; a l'envoi, nettoyage puis
  validation cote client (message et pas d'appel) ; PUT puis « Profil enregistré. », formulaire recharge depuis la
  vue renvoyee et « Derniere mise a jour le … » ; 400 → motif `{ erreur }`, saisie conservee ; 401 → connexion.
- « Mon compte » (`/moi`) : lien « Mon profil » ; route `moi/profil` (aucun garde de role : tous les roles ont un
  profil, l'API exige seulement un jeton).
- Tests (19 specs ajoutees, 203 au total) : service avec `HttpTestingController` (GET, 404 transmis, PUT avec le
  corps complet, 400 transmis), `nettoyerProfil`, `validerProfil` (profil complet ou reduit au nom, bornes du nom,
  telephones refuses, date du jour / future / 1900 / invalide, wilaya et langue), formatage et libelles ; composant
  avec service factice (formulaire vide et quatre langues sur 404, preremplissage, refus cote client sans appel,
  enregistrement avec champs nettoyes et null puis confirmation, telephone sans espaces et date, 400 avec saisie
  conservee, erreur de chargement sans formulaire, redirection).

## v0.14.0 — Liste d'attente
- `ListeAttenteService` (`liste-attente/liste-attente.service.ts`) : `inscrire(medecinId)` (`POST
  /api/medecins/{id}/liste-attente`, sans corps, 201 ; 409 deja inscrit), `mes` (`GET /api/liste-attente/mes`),
  `retirer(id)` (`POST /api/liste-attente/{id}/retirer`, 204), `duMedecin` (`GET /api/medecin/liste-attente`) ;
  type `InscriptionAttente` (`id`, `patientId`, `medecinId`, `inscritLe`).
- Fiche du praticien (`FicheMedecinComponent`) : section « Liste d'attente » affichee une fois les creneaux lus,
  collee a l'etat vide (« Aucun creneau ne vous est propose ? ») ou plus bas s'il y a des creneaux (« Aucun creneau
  ne vous convient ? »), phrase « Vous serez notifie des qu'un creneau se libere. » ; `inscrire()` attend l'etat de
  connexion (non connecte → connexion avec retour sur la fiche) ; succes → message et lien « Voir mes listes
  d'attente », bouton retire ; 409 → « Vous etes deja inscrit sur cette liste. » traite comme un etat, pas comme une
  erreur (meme presentation, bouton retire) ; 403 → « Seul un compte patient… » ; 404 → « Praticien introuvable. » ;
  l'etat est remis a zero quand l'identifiant de route change.
- `/liste-attente` (`MesListesAttenteComponent`, PATIENT) : tri par `inscritLe` croissant, nom du praticien lu une
  fois par identifiant (echec ignore, lien generique), « Me retirer » retire la ligne sans relire la liste ; 404 au
  retrait (deja retiree ailleurs) → liste rechargee ; autre erreur → motif `{ erreur }` ; 403 → « reservee aux
  patients » ; etat vide avec lien vers l'annuaire ; redirection si non connecte.
- `/medecin/liste-attente` (`ListeAttenteMedecinComponent`, sous `medecinGuard`) : liste ordonnee (`<ol>`) du plus
  ancien au plus recent, « Patient » + identifiant abrege (`abregerIdentifiant`, huit caracteres : pas d'UUID complet
  a l'ecran) et date ; etat vide avec lien vers les disponibilites ; 403 / 401 comme les autres pages medecin.
- Routes `/liste-attente` et `/medecin/liste-attente` ; liens « Mes listes d'attente » (connectes) et « Liste
  d'attente » (espace medecin) dans la barre de navigation.
- Tests (16 specs ajoutees, 219 au total) : service avec `HttpTestingController` (URL, methode, corps nul, 204,
  409 transmis), fiche (inscription depuis l'etat sans creneau puis confirmation et lien, 409, non connecte puis 403),
  mes listes (tri et noms, retrait et ligne retiree, echec de retrait avec ligne conservee, etat vide et redirection,
  403), liste du medecin (tri et identifiants abreges, etat vide, 403 et 401), barre de navigation.

## v0.15.0 — Cabinet : secretaires et espace secretaire
- `RoleService.estSecretaire()` (role SECRETAIRE du realm, autorite ROLE_SECRETAIRE cote API) ; `secretaireGuard`
  sur `/secretaire`, calque sur `medecinGuard` (non connecte → connexion avec retour ; sans le role →
  `router.parseUrl('/')`). Defense en profondeur : l'API verifie le rattachement a chaque action.
- `SecretaireService` (`secretaire/secretaire.service.ts`) : `mesMedecins` (`GET /api/secretaire/medecins`),
  `agenda(medecinId)`, `ouvrirCreneau(medecinId, debut, dureeMinutes)` (`{ debut, dureeMinutes }`), `honorer`,
  `annuler` (`POST /api/secretaire/rendezvous/{id}/...`, sans corps) ; type `Rattachement` (`id`, `medecinId`,
  `secretaireId`, `creeLe`), bornes `DUREE_MIN_MINUTES` 5 / `DUREE_MAX_MINUTES` 120 (celles de `CreneauService`),
  `estUuid` (format d'un sujet Keycloak, casse indifferente). `MedecinService` : `annulerRendezVous`
  (`POST /api/medecin/rendezvous/{id}/annuler`), `secretaires`, `rattacherSecretaire(secretaireId)`
  (`{ secretaireId }`), `retirerSecretaire(id)` (204).
- `/medecin/secretaires` (`SecretairesComponent`, sous `medecinGuard`) : formulaire a un champ (identifiant du
  compte de la secretaire, explication « visible dans Mon compte », nettoye et mis en minuscules, refuse cote
  client s'il n'a pas la forme d'un UUID) ; 201 → confirmation, champ vide et rechargement ; 409 → motif et
  rechargement ; 400 (soi-meme) → motif ; liste des rattachements tries par `creeLe` croissant (identifiant complet
  en `<code>` : c'est la donnee que le medecin a saisie, pas une donnee de patient) avec « Retirer » apres
  `confirm()` puis rechargement ; 404 au retrait → rechargement ; etat vide ; 403 → « reservee aux medecins ».
- `/medecin/agenda` : « Annuler » (rouge, comme cote patient) sur les seuls CONFIRME, `confirm()` puis
  `annulerRendezVous` ; succes → message avec la date et rechargement ; 409 → `charger(motif)` (motif conserve
  pendant le rechargement, comme les candidatures) ; les messages de teleconsultation et d'annulation s'excluent.
- `/secretaire` (`EspaceSecretaireComponent`, sous `secretaireGuard`) : rattachements tries par date, nom des medecins
  lu une fois par identifiant dans l'annuaire (a defaut « Medecin » + identifiant abrege), `<select>` « Choisir un
  medecin » ; un seul rattachement → choisi d'office ; `choisir()` efface les messages et recharge l'agenda (une
  reponse tardive d'un autre medecin est ignoree) ; agenda trie par `debut`, « Patient » + identifiant abrege,
  « Marquer honore » et « Annuler » (confirm) sur les CONFIRME, succes → message date et rechargement, 409 / 404 →
  `chargerAgenda(motif)`, 403 → « Ce cabinet ne vous est pas rattache. » ; formulaire d'ouverture de creneau repris
  des disponibilites du medecin (datetime-local → `toISOString()`, futur, duree entiere 5..120 controlee cote
  client), 201 → « Creneau ouvert le … », 400 → motif ; sans rattachement : explication (communiquer son identifiant
  au medecin) ; 403 → « reservee aux secretaires ».
- « Mon compte » (`MoiComponent`) : « Identifiant du compte : … » (sujet de `/api/moi`) et bouton « Copier »
  (`navigator.clipboard.writeText` dans try/catch : contexte non securise ou permission refusee → « Copie
  impossible : selectionnez l'identifiant et copiez-le. »), phrase d'explication pour les secretaires.
- Routes `/secretaire` (secretaireGuard) et `/medecin/secretaires` (medecinGuard) ; lien « Mes secretaires »
  (espace medecin) et section « Espace secretaire » (Agenda du cabinet) si `estSecretaire()`.
- Tests (37 specs ajoutees, 256 au total) : RoleService (estSecretaire), secretaireGuard (laisse passer, connexion
  avec l'URL, UrlTree '/'), MedecinService (annulation sans corps et 409 transmis, secretaires, rattachement avec
  `{ secretaireId }`, retrait 204), SecretaireService (cabinets, agenda, creneau avec corps, honorer / annuler sans
  corps, 403 et 409 transmis, `estUuid` et bornes), secretaires (liste triee et explication, UUID refuse sans appel,
  rattachement nettoye puis rechargement, 409 recharge, 400 sans rechargement, retrait apres confirmation, etat vide
  et 403), agenda du medecin (bouton sur les seuls CONFIRME, annulation avec confirmation puis rechargement, 409
  recharge), espace secretaire (cabinet unique choisi d'office et actions sur les seuls CONFIRME, choix parmi
  plusieurs cabinets, honorer, annuler avec confirmation, 409 recharge, ouverture de creneau avec conversion ISO,
  duree hors bornes refusee et 400, sans rattachement et 403 d'agenda, 403 / 401 de la page), Mon compte
  (identifiant et copie confirmee, presse-papiers refuse, non connecte), barre de navigation (section pour
  SECRETAIRE seulement, lien « Mes secretaires »).

## v0.16.0 — Rappels de rendez-vous (administration)
- `AdminService.executerRappels()` : `POST /api/admin/rappels/executer` sans corps, lit `{ nombre }` (`map`) ;
  `libelleRappels` accorde le resultat (« 0 rappel envoye », « 1 rappel envoye », « 3 rappels envoyes »).
- `/admin` (`TableauDeBordAdminComponent`) : section « Rappels de rendez-vous » sous les compteurs, avec
  l'explication (rappel la veille de chaque rendez-vous confirme, envoi automatique toutes les heures, un seul
  rappel par rendez-vous : relancer a la main ne cree pas de doublon) et le bouton « Executer les rappels
  maintenant » (desactive pendant l'envoi) ; resultat en vert, remplace a chaque execution ; 403 → « Cette action
  est reservee a l'administrateur. » ; autre erreur → motif `{ erreur }` ; 401 → connexion. Les compteurs ne sont
  pas relus (les rappels ne les modifient pas).
- Tests (4 specs ajoutees, 260 au total) : service avec `HttpTestingController` (URL, POST sans corps, lecture de
  `{ nombre }`), `libelleRappels`, tableau de bord (execution puis « 3 rappels envoyes », seconde execution
  « 0 rappel envoye » qui remplace le premier resultat, echec avec motif et compteurs conserves).

## v0.16.1 — Correctif : duree maximale d'un creneau
- `DisponibilitesComponent` : `max="240"` laissait le medecin saisir une duree que l'API refuse (`CreneauService`
  borne 5..120, 400 sinon). Le champ prend desormais `[min]` / `[max]` sur `DUREE_MIN_MINUTES` / `DUREE_MAX_MINUTES`
  (constantes de `secretaire.service.ts`, deja utilisees par l'espace secretaire), le libelle annonce les bornes et le
  controle cote client refuse aussi une duree trop longue (« Indiquez une durée entre 5 et 120 minutes. »), comme dans
  `EspaceSecretaireComponent`.
- Tests (4 specs ajoutees, 264 au total) : `disponibilites.component.spec.ts` (attributs min / max et libelle, 180
  minutes refusees sans appel, ouverture de 120 minutes avec conversion ISO puis confirmation, motif d'un 400).

## v0.17.0 — Image Docker (nginx, configuration a l'execution)
- Jusqu'ici le front n'etait deployable qu'en copiant `dist/` a la main. `Dockerfile` multi-etapes : `node:20-alpine`
  (`npm ci --no-audit --no-fund`, `npm run build`, `NG_CLI_ANALYTICS=false`), puis `nginx:1.27-alpine` qui sert
  `dist/tabibi-web/browser` dans `/usr/share/nginx/html` sur le port 80 (celui du `reverse_proxy web:80` du
  Caddyfile de tabibi-backend), `EXPOSE 80`, `HEALTHCHECK` (`wget` busybox sur `/`), `ENTRYPOINT /docker/entrypoint.sh`.
- `docker/entrypoint.sh` (POSIX sh, `sh -n` et execution verifiees dans un bac a sable avec `dash`, `nginx` et
  `envsubst` factices — pas de daemon Docker sur le poste) : lit `TABIBI_API_URL`, `TABIBI_KEYCLOAK_ISSUER`,
  `TABIBI_KEYCLOAK_CLIENT_ID` ; sans elles, derive `https://api.$DOMAINE` et `https://auth.$DOMAINE/realms/tabibi`
  si `DOMAINE` est fourni (le `.env` du compose de production du backend), sinon les valeurs localhost ; nettoie
  (espaces, fins de ligne, barre oblique finale), avertit si une valeur n'est pas une URL `http(s)://`, ecrit
  `assets/config.json` avec un echappement JSON minimal (`\` et `"`), calcule `TABIBI_CSP_CONNECT_SRC` (`'self'` +
  origines de l'API et de Keycloak), genere `/etc/nginx/conf.d/default.conf` depuis
  `/etc/nginx/tabibi/default.conf.template` par `envsubst` limite a cette seule variable (les `$uri` de nginx
  restent intacts), puis `exec nginx -g 'daemon off;'`.
- `nginx/default.conf.template` : `listen 80`, `try_files $uri $uri/ /index.html`, `gzip on` (types textuels),
  `server_tokens off` ; `map $uri $tabibi_cache_control` (`no-store` pour `index.html` et `assets/config.json`,
  `public, max-age=31536000, immutable` pour les `*.js` / `*.css` a empreinte de la racine, `max-age=3600` sinon)
  applique par une seule directive `add_header` au niveau du serveur (un `add_header` dans un `location` ferait
  perdre ceux du parent) ; en-tetes `X-Content-Type-Options nosniff`, `X-Frame-Options DENY`,
  `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy camera=(), microphone=(), geolocation=()`
  (Jitsi s'ouvre dans un autre onglet) et `Content-Security-Policy` (`default-src 'self'`, `connect-src` calcule,
  `frame-ancestors 'none'`, `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'` pour les styles inline des
  composants, `script-src 'self'`, `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`), tous avec `always`.
- `angular.json` : `outputHashing: all` (les bundles sortaient sans empreinte, `main.js`, ce qui interdisait tout
  cache long) et `optimization.styles.inlineCritical: false` : l'inlining du CSS critique (Critters) ajoutait dans
  `index.html` un `onload="this.media='all'"` inline que `script-src 'self'` bloque, la feuille restant alors en
  `media="print"` ; la feuille de style fait 1,6 ko, l'optimisation n'apportait rien.
- Utilisateur : processus maitre root (port 80, lecture de la configuration), processus de travail sous `nginx` ;
  l'image `nginx-unprivileged` ecoute sur 8080 et exigerait de modifier le Caddyfile, choix documente dans le README.
- `.dockerignore` (`node_modules`, `dist`, `.angular`, `coverage`, `out-tsc`, `.git`, `.github`, `docs`, `*.md`).
- README : section « Deploiement » (image, variables, gabarit nginx, lancement local avec la remarque sur le port 4200
  du realm de developpement, coherence avec `docker-compose.prod.yml` : le service `web` doit recevoir `DOMAINE` ou
  les variables `TABIBI_*`), mention dans « Configuration ».
- Tests : inchanges (264 specs) ; `ng build` verifie avec les nouvelles options (`main-XXXXXXXX.js`, `index.html`
  sans script ni gestionnaire inline).

## v0.18.0 — Publication de l'image sur GHCR (CI)
- `.github/workflows/ci.yml` : `permissions: contents: read` au niveau du workflow ; le job `build-test` (npm ci,
  ng build, ng test headless) reste tel quel, sur chaque pull request et push ; nouveau job `image`, calque sur celui
  de tabibi-backend : `if: push && refs/heads/main`, `needs: build-test`, `permissions: packages: write`,
  `docker/setup-buildx-action@v3`, `docker/login-action@v3` sur ghcr.io avec `github.actor` / `GITHUB_TOKEN`,
  nom de l'image en minuscules `ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/tabibi-web` (celui qu'attend
  `docker-compose.prod.yml` : `ghcr.io/${ORG_GITHUB}/tabibi-web`, quel que soit le nom du depot),
  `docker/metadata-action@v5` (tags `latest` et `sha-<commit>`), `docker/build-push-action@v6` (`push: true`, cache
  `type=gha`). Le declencheur `push` garde `master` pour `build-test` ; l'image n'est publiee que depuis `main`.
- `.github/dependabot.yml` : npm (paquets `@angular/*` et `@angular-devkit/*` groupes en une seule pull request),
  github-actions et docker (images de base du Dockerfile), chaque semaine.
- README : badge CI (`<org>` a remplacer), section « Publication sur GHCR (CI) » (tags, paquet prive par defaut,
  `WEB_TAG=sha-xxxxxxx` dans le `.env` du backend), mention du job dans « Tester ».
- Tests : inchanges (264 specs) ; les fichiers YAML ont ete valides (chargement PyYAML), le workflow n'a pas ete
  execute ici.

## v0.19.0 — Rendu cote serveur (SSR) des pages publiques
- Pourquoi : le HTML servi ne contenait que `<app-root></app-root>` ; l'annuaire et les fiches des praticiens
  n'etaient pas lisibles par les moteurs de recherche. `ng add @angular/ssr@18` (`@angular/ssr` 18.2.21,
  `@angular/platform-server` 18.2.14, `express` 4, `@types/express`, `@types/node`), puis adaptation.
- `angular.json` : `server: src/main.server.ts`, `ssr.entry: server.ts`, `prerender: false` (le schematic met `true` :
  un prerendu a la construction appellerait l'API pendant `docker build`, figerait un annuaire vide dans
  `browser/index.html` et prerendrait aussi les pages privees) ; `serve.buildTarget` ajoute (`ng serve` echouait deja
  avant : « must have required property 'buildTarget' ») ; `tsconfig.app.json` : `types: ["node"]`, fichiers
  `main.server.ts` et `server.ts`. `package.json` : script `serve:ssr`.
- `src/main.server.ts` (`bootstrapApplication(AppComponent, config, context)`), `src/app/app.config.server.ts`
  (`provideServerRendering()` + `CONFIGURATION_SERVEUR` = `configurationDepuisEnvironnement(process.env)`).
- `app.config.ts` : `provideClientHydration()` (hydratation + cache de transfert HTTP des GET rendus, transmis dans
  `<script id="ng-state" type="application/json">`, non executable donc compatible CSP) ; `withFetch()`.
- `ConfigService` : jeton `CONFIGURATION_SERVEUR` (optionnel) : s'il est fourni, `charger()` l'applique sans HTTP
  (`appliquer()` factorise le nettoyage) ; `configurationDepuisEnvironnement(env)` lit `TABIBI_API_URL`,
  `TABIBI_KEYCLOAK_ISSUER`, `TABIBI_KEYCLOAK_CLIENT_ID`, sinon derive `https://api.DOMAINE` et
  `https://auth.DOMAINE/realms/tabibi` de `DOMAINE`, sinon laisse les valeurs par defaut s'appliquer.
- `AuthService` : `navigateur = isPlatformBrowser(PLATFORM_ID)` ; cote serveur `initialiser()` resout sans configurer
  l'OIDC (`creerAuthConfig` lit `window.location.origin`, `loadDiscoveryDocumentAndTryLogin` appellerait Keycloak et
  `sessionStorage`), `estConnecte()` est faux, `seConnecter()` (`initCodeFlow` → `location.href`) et
  `seDeconnecter()` sont sans effet. Consequence verifiee : `/moi` rend « Mon compte / Se connecter »,
  `/mes-rendez-vous`, `/notifications`, `/messagerie/:id` rendent « Redirection vers la page de connexion… », les
  gardes (`/medecin/agenda`, `/admin`) renvoient `false` et laissent la sortie vide, sans erreur serveur ; le
  navigateur rejoue tout apres l'hydratation. `RoleService` n'a rien a proteger : il passe par `auth.pret()` /
  `estConnecte()`. `OAuthService` lui-meme se construit sans `window` (`MemoryStorage`, verifie dans la lib 17.0.2).
- `ClocheNotificationsComponent` : `ngOnInit` sans effet hors navigateur (une minuterie `timer(0, 60 s)` garderait
  la zone instable et le rendu n'aboutirait jamais ; la cloche n'est de toute facon rendue que connecte). La relecture
  de `ConversationComponent` n'est lancee qu'une fois connecte, donc jamais cote serveur. `EspacePharmacieComponent` :
  `typeof localStorage` verifie avant lecture / ecriture (le try/catch suffisait, la verification est explicite).
- Gabarits audites pour l'hydratation (le navigateur reconstruit un HTML invalide, ce que l'hydratation ne tolere
  pas) : aucun bloc dans `<p>`, aucun `<table>` sans `<tbody>`, aucun `<a>` dans `<a>` (script sur les 40 gabarits).
- `server.ts` : `entetesSecurite(config)` (nosniff, DENY, Referrer-Policy, Permissions-Policy `camera=(),
  microphone=(), geolocation=()`, CSP avec `connect-src 'self'` + origines de l'API et de Keycloak via `new URL().origin`),
  posees par un middleware sur toutes les reponses ; `x-powered-by` desactive ; `trust proxy` ; `express.static` sur
  `*.*` avec `Cache-Control` par fichier (`no-store` pour `.html` et `assets/config.json`, `max-age=3600` pour
  `assets/`, un an `immutable` pour les bundles a empreinte), 404 texte si le fichier n'existe pas ; `**` :
  `CommonEngine.render` avec `inlineCriticalCss: false` (sinon le moteur reinjecte un `onload` inline bloque par
  `script-src 'self'`), `Cache-Control: no-store`, secours `index.csr.html` en cas d'erreur ou apres
  `TABIBI_SSR_DELAI_MS` (10 s ; verifie a 0,8 s face a une API repondant en 3 s : page sans rendu en 0,8 s, rendu
  tardif ignore), `PORT` (4000). Le bundle `server.mjs` est autonome (seuls `fs`, `path`, `url` sont importes).
- Dockerfile : etape `node:20-alpine` (npm ci, `ng build` avec `server.ts`), puis `node:20-alpine` executant
  `node dist/tabibi-web/server/server.mjs` (`ENV PORT=80 NODE_ENV=production`), utilisateur `node`
  (`setcap cap_net_bind_service=+ep /usr/local/bin/node`, libcap installe puis retire), `HEALTHCHECK` sur
  `/assets/config.json` (fichier statique : ni rendu ni appel a l'API toutes les 30 s), `ENTRYPOINT /app/entrypoint.sh`.
  nginx et `nginx/default.conf.template` retires : un seul processus sert les fichiers et rend les pages, la CSP
  vient d'express. `docker/entrypoint.sh` : memes calculs qu'avant (variables, `DOMAINE`, nettoyage, echappement),
  ecrit `dist/tabibi-web/browser/assets/config.json`, exporte `TABIBI_*` pour le serveur, `exec node`. Verifie dans
  un bac a sable (chemins remplaces) avec le vrai bundle : `config.json` ecrit et servi, CSP calculee, annuaire rendu.
- Verification de bout en bout (pas de daemon Docker) : `ng build` → `dist/tabibi-web/server/server.mjs` ;
  `PORT=4100 node dist/tabibi-web/server/server.mjs` ; `curl /` : « Trouver un praticien », formulaire,
  `ng-server-context="ssr"`, `ng-state` ; face a une API factice (`GET /api/medecins`, `/medecins/{id}`,
  `/creneaux`, `/avis`) : praticiens rendus avec leurs liens `/medecins/m1`, fiche avec creneaux et avis ;
  `/moi`, `/verifier`, `/mes-rendez-vous`, `/medecin/agenda`, `/admin`, `/messagerie/x1`, `/notifications` : 200
  sans erreur serveur ; en-tetes et caches controles ; Chromium headless (puppeteer-core) sur `/`, `/medecins/m1`,
  `/moi`, `/verifier` : aucune erreur `NG05xx`, aucune violation CSP, `ngh` retires apres hydratation, aucune
  requete API du navigateur sur une page rendue (cache de transfert), clic vers une fiche sans rechargement.
  `/annuaire` n'existe pas (l'annuaire est `/`) : une URL inconnue rend la coquille en 200 avec `NG04002` dans le
  journal, comme dans le navigateur (pas de route `**`).
- README : « Lancer » (`serve:ssr`), « Configuration » (serveur), « Deploiement » reecrit (image node, variables
  `PORT` et `TABIBI_SSR_DELAI_MS`, `server.ts`, note `host.docker.internal` pour le rendu serveur en local),
  section « Rendu cote serveur (SSR) » (pourquoi, comment, verification, limites), « Prochaines etapes » (titre et
  description par page, route `**`, `robots.txt`).
- Tests (7 specs ajoutees, 271 au total) : `ConfigService` avec `CONFIGURATION_SERVEUR` (aucune requete HTTP,
  nettoyage, defaut du client), `configurationDepuisEnvironnement` (variables explicites, derivation de `DOMAINE`,
  rien), `AuthService` (navigateur : configuration OIDC, discovery, `initCodeFlow` ; serveur : rien, jamais connecte),
  cloche cote serveur (ni lecture ni minuterie).

## v0.19.1 — Version alignee
- package.json / package-lock.json : version 0.19.x, alignee sur ce journal.

## v0.20.0 — SEO : titres, descriptions, page 404, robots et plan du site
- Pourquoi : les pages rendues par le serveur (v0.19.0) portaient toutes le titre « Tabibi », sans description ; une
  URL inconnue rendait la coquille en 200 ; pas de `robots.txt` ni de plan du site.
- `seo/seo.service.ts` (`SeoService`, `Title` + `Meta` d'Angular) : `definir({ titre, description?, canonique?,
  privee? })` → `<title>… | Tabibi</title>`, `<meta name="description">` (`DESCRIPTION_PAR_DEFAUT` sinon),
  `<link rel="canonical">` (origine de `document.location` + chemin, retire sans chemin, jamais duplique),
  `<meta name="robots" content="noindex, nofollow">` sur une page privee (retire sur une page publique) ;
  `definirPrivee(titre)` ; `introuvable(titre = 'Page introuvable')` pose en plus `statut = 404` sur
  `REPONSE_SERVEUR` (`seo/reponse-serveur.ts`, jeton optionnel : `@angular/ssr` 18.2 n'a pas de `tokens` — verifie
  dans node_modules, seul `CommonEngine` est exporte — le jeton est donc fourni par `server.ts`, objet `{ statut: 200 }`
  cree par requete, passe dans `providers` de `CommonEngine.render`, puis `res.status(reponse.statut)`).
- Pages : annuaire « Trouver un médecin en Algérie » (description, canonique `/`) ; verification « Vérifier une
  ordonnance » (canonique `/verifier`) ; fiche « Dr <nom>, <spécialité> à <ville> » (le « Dr » en tete de
  `nomComplet` n'est pas double), description « Prenez rendez-vous avec … : créneaux disponibles, avis des patients
  et liste d'attente sur Tabibi. », canonique `/medecins/<id>` ; « Fiche du praticien » tant que l'API n'a pas
  repondu ; 404 de l'API → « Praticien introuvable », `noindex`, statut 404. Les 28 autres pages (toutes reservees a
  un utilisateur connecte) appellent `definirPrivee(<h1>)` en tete de `ngOnInit` (`DisponibilitesComponent` gagne
  un `ngOnInit`).
- `page-introuvable/page-introuvable.component.ts` (`PageIntrouvableComponent`, route `**` en fin de
  `app.routes.ts`) : « Page introuvable », liens « Trouver un médecin » et « Vérifier une ordonnance »,
  `seo.introuvable()`.
- `server.ts` : `origineSite(req)` (`https://DOMAINE` sinon `protocol://host` de la requete, `trust proxy`) ;
  `robotsTxt(origine)` (`User-agent: *`, `Disallow` de `CHEMINS_PRIVES` : `/moi`, `/mes-`, `/ordonnances/`,
  `/medecin/`, `/medecin$`, `/admin`, `/secretaire`, `/pharmacie`, `/messagerie`, `/notifications`, `/dawini`,
  `/avis`, `/liste-attente`, `/teleconsultations` — `/medecin` seul aurait exclu les fiches `/medecins/...` —,
  `Sitemap: <origine>/sitemap.xml`) ; `sitemapXml(origine, chemins)` (`urlset` sitemaps.org, `loc` echappes) ;
  `creerListeFiches(apiUrl)` : `fetch` de `GET /api/medecins` (delai 5 s, `AbortSignal.timeout`), chemins
  `/medecins/<id>` gardes une heure en memoire, `[]` avec trace en cas d'erreur (repli sur `PAGES_PUBLIQUES` :
  `/`, `/verifier`) ; routes `GET /robots.txt` (`text/plain`) et `GET /sitemap.xml` (`application/xml`) declarees
  avant `express.static` (`*.*` les aurait prises pour des fichiers absents), `Cache-Control: public, max-age=3600`.
- Verifie (`ng build`, `PORT=4100 TABIBI_API_URL=http://localhost:4101 node dist/tabibi-web/server/server.mjs` face a
  une API factice de deux praticiens) : `/` → `<title>Trouver un médecin en Algérie | Tabibi</title>`, description,
  canonique `http://localhost:4100/`, pas de robots ; `/medecins/m1` → 200, « Dr Amina Belkacem, Généraliste à
  Alger | Tabibi », description, canonique ; `/medecins/inconnu-xyz` → **404**, « Praticien introuvable | Tabibi »,
  `noindex`, texte « Praticien introuvable. » ; `/page-inexistante` → **404**, « Page introuvable | Tabibi »,
  `noindex`, `<h1>Page introuvable</h1>` ; `/verifier` → titre et canonique ; `/mes-rendez-vous` → « Mes rendez-vous
  | Tabibi », `noindex` ; `/robots.txt` → 200 `text/plain`, les Disallow et `Sitemap: http://localhost:4100/sitemap.xml`
  (avec `DOMAINE=tabibi.dz` : `https://tabibi.dz/sitemap.xml`) ; `/sitemap.xml` → 200 `application/xml`, `/`,
  `/verifier`, `/medecins/m1`, `/medecins/m2` ; API injoignable → `/` et `/verifier` seulement, trace « Plan du site :
  liste des praticiens indisponible ».
- Limite : sous un garde de role (`/medecin/agenda`, `/admin`), aucun composant n'est rendu cote serveur, la page
  garde le titre « Tabibi » sans `noindex` (chemins exclus par `robots.txt`).
- README : « Deploiement » (`server.ts`, `DOMAINE`), « Rendu cote serveur » (limites), nouvelle section
  « Referencement (SEO) », « Prochaines etapes ». `package.json` 0.20.0.
- Tests (15 specs ajoutees, 286 au total) : `SeoService` (titre + suffixe, description, canonique, remplacement sans
  doublon, description par defaut et canonique retire, `definirPrivee` noindex puis retrait, `introuvable` 404, titre
  particulier, sans `REPONSE_SERVEUR`), `PageIntrouvableComponent` (message, liens, service appele, titre, noindex,
  statut 404), `AnnuaireComponent` (nouveau spec : recherche au chargement, liens, titre / description / canonique,
  criteres), `FicheMedecinComponent` (titre « Dr Amina Belkacem, Généraliste à Alger | Tabibi », description,
  canonique, indexable ; praticien inconnu → titre, noindex, 404), `MesNotificationsComponent` (titre, noindex).

## v0.21.0 — Tests de bout en bout (Playwright) sur une API simulee
- Pourquoi : les specs Karma testent chaque composant avec des services factices ; rien ne parcourait l'application
  reelle (build de production, rendu serveur, hydratation, navigation) dans un navigateur.
- `@playwright/test` 1.63.0 (`npm install --save-dev`). `playwright.config.ts` : `testDir: e2e`, `webServer` =
  `node dist/tabibi-web/server/server.mjs` avec `PORT=4300`, `TABIBI_API_URL=http://localhost:4301`,
  `TABIBI_KEYCLOAK_ISSUER=http://localhost:4301/realms/tabibi` (readiness sur `/assets/config.json`, fichier
  statique : ni rendu ni appel a l'API), `globalSetup: e2e/global-setup.ts`, projet `chromium` (`Desktop Chrome`,
  `chromiumSandbox: false`, `executablePath: CHROME_BIN` si defini — ici
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, Chrome 141, alors que Playwright 1.63 attend la revision 1243 :
  fonctionne), `locale fr-FR`, `timezoneId Africa/Algiers`, `trace: retain-on-failure`, `retries: 1` en CI, rapport
  `list` (+ `html` en CI).
- `e2e/api-simulee.ts` : serveur `node:http` (CORS ouvert, OPTIONS 204) — `GET /api/medecins` (deux praticiens,
  filtres `specialite`, `wilaya`, `q` sans accents), `/api/medecins/{id}` (404 sinon), `/creneaux` (trois creneaux
  dans deux jours, un pris), `/avis` (m1 : 4,5 / 5, deux avis ; m2 : aucun), `POST /api/creneaux/{id}/reserver`
  (201), `/api/moi`, `/api/rendezvous/mes`, `/api/notifications/*` (401 sans `Authorization: Bearer`),
  `/api/ordonnances/verifier/{code}` (`TBB-2026-0001` → `{ valide: true, emiseLe, statut: EMISE }`, sinon 404) ;
  issuer OIDC simule `/realms/tabibi` (decouverte conforme a la validation stricte d'angular-oauth2-oidc : tous
  les points de terminaison sous l'issuer, `certs` → `{ keys: [] }`, page HTML « Connexion simulée » sur
  `/protocol/openid-connect/auth`). Exporte `demarrerApiSimulee(port)`, `arreter`, `MEDECINS`,
  `CODE_ORDONNANCE_VALIDE`, `journal` des requetes ; lancable seul avec node 22+ (`node e2e/api-simulee.ts 4301`).
- `e2e/global-setup.ts` : ecrit `dist/tabibi-web/browser/assets/config.json` (`apiUrl`, `keycloakIssuer` simules,
  comme `docker/entrypoint.sh` : sans cela le navigateur, apres l'hydratation, appellerait `localhost:8080` et le
  cache de transfert, cle par URL, ne servirait a rien), demarre l'API simulee, la ferme au teardown. Le `webServer`
  demarre avant le `globalSetup` (ordre de Playwright), d'ou la readiness sur un fichier statique.
- `e2e/outils.ts` : `ouvrir(page, url)` = `page.goto` puis attente de `app-root:not([ngh])` (Angular retire
  l'attribut `ngh` une fois l'application hydratee). Sans cette attente, une saisie ou un clic sur le HTML rendu par
  le serveur, avant l'execution du JavaScript, est perdu : observe une fois sur « recherche par nom » (soumission
  native du formulaire, page rechargee, champ vide). Les pages qui redirigent vers l'issuer utilisent `page.goto`.
- Connexion simulee : angular-oauth2-oidc n'accepte pas un jeton fabrique (signature, issuer), et pre-remplir
  `sessionStorage` sans jeton valide ne connecte pas ; les tests couvrent donc les parcours publics et verifient que
  les pages privees rendent « Redirection vers la page de connexion… » (HTML du serveur, `noindex`) puis envoient le
  navigateur sur l'adresse d'autorisation de l'issuer simule (`client_id=tabibi-web`, `response_type=code`,
  `redirect_uri=http://localhost:4300`, `state` contenant la page de retour).
- Tests (16, tous verts ici en 9,4 s, un seul worker) : `recherche.spec.ts` (5 : chargement et filtre par
  specialite, recherche par nom, fiche avec deux boutons « Réserver », « 4,5 / 5 (2 avis) », dernier avis, liste
  d'attente, « Écrire au médecin », titre de la fiche ; fiche sans avis ; « Réserver » sans connexion → connexion
  simulee), `verification.spec.ts` (3 : code valide « émise le mardi 15 septembre 2026 à hh:30 (Émise). » — l'heure
  n'est pas figee, 09:30 UTC dans le HTML du serveur puis 10:30 Alger apres hydratation —, code inconnu, lien
  `?code=` rendu par le serveur), `navigation.spec.ts` (8 : 404 « Page introuvable » et retour a l'annuaire, praticien
  inconnu 404 — le texte est « Praticien introuvable. » ou le motif `{ erreur }` du 404 des creneaux, selon la reponse
  arrivee en dernier —, `robots.txt`, `sitemap.xml`, titres / descriptions / canoniques sans JavaScript, titre mis a
  jour en navigation cote client, page privee noindex puis connexion, « Mon compte » → « Se connecter »).
- `package.json` : script `e2e` (`ng build && playwright test`), version 0.21.0 ; `.gitignore` et `.dockerignore` :
  `test-results/`, `playwright-report/` (+ `e2e/`, `playwright.config.ts` hors du contexte Docker) ;
  `tsconfig.app.json` et `tsconfig.spec.json` ne compilent pas `e2e/` (listes explicites), `ng build` et `ng test`
  inchanges.
- CI : job `e2e` (Node 20, `npm ci`, `npx playwright install --with-deps chromium`, `npm run e2e`, rapport et
  `test-results/` joints en artefact si echec) ; `image` attend `build-test` et `e2e`. YAML valide (PyYAML), workflow
  non execute ici.
- README : section « Tests de bout en bout (Playwright) », « Prochaines etapes ».
- Verifie : `ng build` sans erreur, `ng test` 286 specs SUCCESS (inchangees), `CHROME_BIN=... npm run e2e` :
  16 passed (trois passes consecutives, puis `--workers=3`) ; aucun serveur node restant apres la fin (webServer et
  API simulee arretes par Playwright).


## v0.22.0 — Ordonnance imprimable (PDF)
- Pourquoi : le backend expose `GET /api/ordonnances/{id}/pdf` (`application/pdf`, `Content-Disposition: inline`,
  roles PATIENT ou MEDECIN) ; jusqu'ici la page de detail ne proposait que `window.print()`.
- `OrdonnanceService.pdf(id)` : `GET ${apiUrl}/api/ordonnances/${id}/pdf` avec `responseType: 'blob'` (le Bearer est
  ajoute par l'intercepteur comme pour tout appel `/api/`), renvoie le `Blob` recu.
- `/ordonnances/:id` (patient et medecin) : bouton « Télécharger le PDF » a cote de « Imprimer » (« Préparation du
  PDF… » et bouton desactive pendant l'appel) : le blob recu est propose au telechargement sous le nom
  `ordonnance-<code>.pdf` par un lien `<a download>` temporaire (`URL.createObjectURL`, clic programme, lien retire,
  `URL.revokeObjectURL` 10 s plus tard : un revoke immediat peut annuler le telechargement sur certains navigateurs) ;
  en cas d'echec, motif `{ erreur }` de l'API (le corps d'une erreur recue en `responseType: 'blob'` est un Blob JSON,
  lu par `motifErreurBlob`) ou « Impossible de générer le PDF de cette ordonnance. ». Garde SSR : `isPlatformBrowser`
  (ni Blob ni URL objet cote serveur ; la page y rend de toute facon l'etat « non connecte »).
- Tests (15 specs ajoutees, 301 au total) : `OrdonnanceService` (nouveau spec : `mes`, `parId`, `pdf` — URL et
  `responseType` blob —, `verifier` avec code encode, `emettre`) ; `OrdonnanceDetailComponent` (nouveau spec :
  affichage, retour patient / medecin, telechargement — `createObjectURL` avec le blob, lien `download`
  `ordonnance-TBB-2026-0001.pdf`, lien retire, `revokeObjectURL` apres 10 s (horloge Jasmine) —, motif `{ erreur }`
  d'un Blob JSON, message generique, `motifErreurBlob`, 404, 403, redirection vers la connexion, titre et noindex).
- README : v0.4.0 (bouton PDF), « Prochaines etapes ». `package.json` 0.22.0.
