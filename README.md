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

## Tester
Tests unitaires Karma / Jasmine (`*.spec.ts` a cote de chaque fichier ; services avec `HttpTestingController`,
composants avec un service factice) :
```bash
npx ng test                                                    # Chrome, mode veille
npx ng test --watch=false --browsers=ChromeHeadless            # une passe, Chrome headless
npx ng test --watch=false --browsers=ChromeHeadlessCI          # idem sans bac a sable (CI, conteneur, execution en root)
CHROME_BIN=/chemin/vers/chrome npx ng test --watch=false --browsers=ChromeHeadlessCI   # Chrome hors du PATH
```
Le lanceur `ChromeHeadlessCI` (`ChromeHeadless` + `--no-sandbox --disable-gpu`) est defini dans `karma.conf.js`.
L'integration continue (`.github/workflows/ci.yml`, Node 20) enchaine `npm ci`, `ng build` et `ng test` headless ;
`package-lock.json` est versionne pour la reproductibilite. Le journal des versions est dans `docs/JOURNAL.md`.

## Prochaines etapes
- Nom du patient dans l'agenda et sur l'ordonnance (l'API n'expose que l'identifiant).
- SSR (Angular Universal) pour les pages publiques / SEO.

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
  la barre de navigation et les boutons sont masqués à l'impression).
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
- Infrastructure de test : Karma / Jasmine (`tsconfig.spec.json`, cible `test` d'`angular.json`, `karma.conf.js`
  avec le lanceur `ChromeHeadlessCI`), specs du service, des deux composants et test de fumée d'`AppComponent` ;
  workflow GitHub Actions.

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
