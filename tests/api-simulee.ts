import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';

/**
 * API simulee pour les tests de bout en bout (Playwright) : un petit serveur http node qui repond comme
 * tabibi-backend sur les routes utilisees par les parcours publics (annuaire, fiche, creneaux, avis, verification
 * d'ordonnance) et par les pages privees rendues « non connecte » (moi, rendez-vous, notifications).
 *
 * Connexion simulee : Keycloak n'est pas la. Le serveur tient aussi lieu d'issuer OIDC (`/realms/tabibi`) : il
 * sert le document de decouverte et une page « Connexion simulée » a l'adresse d'autorisation, ce qui permet de
 * verifier qu'une page privee envoie bien le visiteur vers la page de connexion. Aucun jeton n'est delivre ici :
 * les parcours connectes passent par `tests/outils/connexion.ts`, qui pose un jeton dans le stockage de session
 * avant le chargement de la page (`AuthService.estConnecte()` ne lit rien d'autre).
 *
 * Lancement direct (node 22+, ou via Playwright qui transpile le TypeScript) : `node e2e/api-simulee.ts [port]`.
 */

export const PORT_API_SIMULEE = 4301;

/** Code de verification connu de l'API simulee ; tout autre code repond 404. */
export const CODE_ORDONNANCE_VALIDE = 'TBB-2026-0001';

export const MEDECINS = [
  {
    id: 'm1',
    nomComplet: 'Dr Amina Belkacem',
    specialiteSlug: 'generaliste',
    specialiteFr: 'Généraliste',
    wilayaCode: '16',
    wilayaFr: 'Alger',
    ville: 'Alger',
  },
  {
    id: 'm2',
    nomComplet: 'Dr Karim Meziane',
    specialiteSlug: 'cardiologue',
    specialiteFr: 'Cardiologue',
    wilayaCode: '31',
    wilayaFr: 'Oran',
    ville: 'Oran',
  },
];

/** Creneaux dans le futur (l'affichage ne filtre pas sur la date, mais restons realistes). */
function creneaux(medecinId: string) {
  const base = Date.now() + 2 * 24 * 60 * 60 * 1000;
  return [
    { id: `${medecinId}-c1`, medecinId, debut: new Date(base).toISOString(), dureeMinutes: 30, disponible: true },
    { id: `${medecinId}-c2`, medecinId, debut: new Date(base + 3600_000).toISOString(), dureeMinutes: 20, disponible: true },
    { id: `${medecinId}-c3`, medecinId, debut: new Date(base + 7200_000).toISOString(), dureeMinutes: 30, disponible: false },
  ];
}

const AVIS = {
  m1: {
    moyenne: 4.5,
    nombre: 2,
    avis: [
      { id: 'a1', note: 5, commentaire: 'Très bon accueil, explications claires.', deposeLe: '2026-09-10T10:00:00Z' },
      { id: 'a2', note: 4, commentaire: null, deposeLe: '2026-09-01T10:00:00Z' },
    ],
  },
  m2: { moyenne: null, nombre: 0, avis: [] },
};

/** Requetes recues, pour les assertions (methode et chemin). */
export const journal: string[] = [];

function json(res: ServerResponse, statut: number, corps: unknown): void {
  res.writeHead(statut, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corps));
}

function html(res: ServerResponse, statut: number, corps: string): void {
  res.writeHead(statut, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(corps);
}

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function traiter(req: IncomingMessage, res: ServerResponse, issuer: string): void {
  const url = new URL(req.url ?? '/', issuer);
  const chemin = url.pathname;
  const methode = req.method ?? 'GET';
  journal.push(`${methode} ${chemin}${url.search}`);

  // Le navigateur (origine du serveur SSR) appelle l'API et l'issuer directement : CORS ouvert.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (methode === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Issuer OIDC simule (connexion simulee) : decouverte, cles et page d'autorisation.
  if (chemin === '/realms/tabibi/.well-known/openid-configuration') {
    return json(res, 200, {
      issuer: `${issuer}/realms/tabibi`,
      authorization_endpoint: `${issuer}/realms/tabibi/protocol/openid-connect/auth`,
      token_endpoint: `${issuer}/realms/tabibi/protocol/openid-connect/token`,
      userinfo_endpoint: `${issuer}/realms/tabibi/protocol/openid-connect/userinfo`,
      end_session_endpoint: `${issuer}/realms/tabibi/protocol/openid-connect/logout`,
      jwks_uri: `${issuer}/realms/tabibi/protocol/openid-connect/certs`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
    });
  }
  if (chemin === '/realms/tabibi/protocol/openid-connect/certs') return json(res, 200, { keys: [] });
  if (chemin === '/realms/tabibi/protocol/openid-connect/auth') {
    return html(
      res,
      200,
      '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Connexion simulée</title></head>' +
        '<body><h1>Connexion simulée</h1><p>Keycloak n\'est pas disponible dans les tests de bout en bout.</p></body></html>',
    );
  }

  // Annuaire public.
  if (chemin === '/api/medecins' && methode === 'GET') {
    const specialite = url.searchParams.get('specialite');
    const wilaya = url.searchParams.get('wilaya');
    const q = url.searchParams.get('q');
    const resultats = MEDECINS.filter(
      (m) =>
        (!specialite || m.specialiteSlug === specialite) &&
        (!wilaya || m.wilayaCode === wilaya) &&
        (!q || sansAccents(m.nomComplet).includes(sansAccents(q))),
    );
    return json(res, 200, resultats);
  }
  const fiche = chemin.match(/^\/api\/medecins\/([^/]+)(\/creneaux|\/avis)?$/);
  if (fiche && methode === 'GET') {
    const medecin = MEDECINS.find((m) => m.id === fiche[1]);
    if (!medecin) return json(res, 404, { erreur: 'Praticien introuvable' });
    if (fiche[2] === '/creneaux') return json(res, 200, creneaux(medecin.id));
    if (fiche[2] === '/avis') return json(res, 200, AVIS[medecin.id as keyof typeof AVIS]);
    return json(res, 200, medecin);
  }

  // Reservation (le front ne l'appelle que connecte ; 201 comme l'API).
  const reservation = chemin.match(/^\/api\/creneaux\/([^/]+)\/reserver$/);
  if (reservation && methode === 'POST') {
    return json(res, 201, { id: 'r1', medecinId: reservation[1].split('-')[0], debut: new Date().toISOString(), statut: 'CONFIRME' });
  }

  // Pages privees : sans jeton, l'API repond 401 ; le front n'appelle ces routes que connecte.
  const jeton = (req.headers.authorization ?? '').startsWith('Bearer ');
  if (chemin === '/api/moi') {
    return jeton ? json(res, 200, { sujet: 'p1', nom: 'Patient Test', roles: ['PATIENT'] }) : json(res, 401, { erreur: 'Non authentifié' });
  }
  if (chemin === '/api/rendezvous/mes') return jeton ? json(res, 200, []) : json(res, 401, { erreur: 'Non authentifié' });
  if (chemin === '/api/notifications/non-lues/nombre') return jeton ? json(res, 200, { nombre: 0 }) : json(res, 401, { erreur: 'Non authentifié' });
  if (chemin.startsWith('/api/notifications/')) return jeton ? json(res, 200, []) : json(res, 401, { erreur: 'Non authentifié' });

  // Verification publique d'une ordonnance.
  const verification = chemin.match(/^\/api\/ordonnances\/verifier\/([^/]+)$/);
  if (verification && methode === 'GET') {
    const code = decodeURIComponent(verification[1]);
    return code === CODE_ORDONNANCE_VALIDE
      ? json(res, 200, { valide: true, emiseLe: '2026-09-15T09:30:00Z', statut: 'EMISE' })
      : json(res, 404, { valide: false, emiseLe: null, statut: null });
  }

  json(res, 404, { erreur: `Route simulée inconnue : ${methode} ${chemin}` });
}

/** Demarre l'API simulee sur le port donne ; resout avec le serveur (a fermer avec `arreter`). */
export function demarrerApiSimulee(port = PORT_API_SIMULEE): Promise<Server> {
  const issuer = `http://localhost:${port}`;
  const serveur = createServer((req, res) => traiter(req, res, issuer));
  return new Promise((resoudre, rejeter) => {
    serveur.once('error', rejeter);
    serveur.listen(port, () => resoudre(serveur));
  });
}

export function arreter(serveur: Server): Promise<void> {
  return new Promise((resoudre) => serveur.close(() => resoudre()));
}

// Lancement direct : `node e2e/api-simulee.ts 4301` (node 22+, transpilation native du TypeScript). Charge par
// Playwright (globalSetup), process.argv[1] est la ligne de commande de Playwright : rien ne demarre ici.
if (process.argv[1]?.endsWith('api-simulee.ts')) {
  const port = Number(process.argv[2] || PORT_API_SIMULEE);
  demarrerApiSimulee(port).then(() => console.log(`API simulée Tabibi à l'écoute sur http://localhost:${port}`));
}
