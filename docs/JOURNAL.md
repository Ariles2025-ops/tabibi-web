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
