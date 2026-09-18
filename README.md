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
