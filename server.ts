import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express, { Request, Response } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIGURATION_PAR_DEFAUT, ConfigurationApplication, configurationDepuisEnvironnement } from './src/app/config/config.service';
import { REPONSE_SERVEUR, ReponseServeur } from './src/app/seo/reponse-serveur';
import bootstrap from './src/main.server';

/**
 * Serveur node du front web (image Docker) : fichiers statiques du build et rendu cote serveur (SSR) des pages par
 * Angular, pour le referencement des pages publiques (annuaire, fiches des praticiens). La configuration (API,
 * Keycloak) vient des variables d'environnement, les memes que celles de docker/entrypoint.sh, qui ecrit aussi
 * assets/config.json pour le navigateur. Les en-tetes de securite sont poses ici (pas de reverse proxy suppose).
 */

/** Au-dela de ce delai (API lente), la page est envoyee sans rendu serveur : le navigateur la rend lui-meme. */
const DELAI_RENDU_MS = Number(process.env['TABIBI_SSR_DELAI_MS'] || 10_000);

/** Duree de vie du plan du site en memoire (l'annuaire est relu a l'API au plus une fois par heure). */
const DUREE_CACHE_SITEMAP_MS = 60 * 60 * 1000;

/** Delai maximal accorde a l'API pour la liste des praticiens du plan du site, avant repli sur les pages fixes. */
const DELAI_SITEMAP_MS = 5_000;

/** Pages publiques, toujours presentes dans le plan du site (meme si l'API ne repond pas). */
export const PAGES_PUBLIQUES = ['/', '/verifier'];

/**
 * Espaces reserves aux utilisateurs connectes (le serveur y rend l'etat « non connecte ») : exclus des robots.
 * Un `Disallow` est un prefixe : `/medecin/` et `/medecin$` (fin d'URL) ecartent l'espace medecin sans toucher aux
 * fiches publiques `/medecins/...` ; `/mes-` couvre mes rendez-vous, mes ordonnances, mes avis. Les pages
 * elles-memes portent aussi `robots noindex` (SeoService.definirPrivee).
 */
export const CHEMINS_PRIVES = [
  '/moi',
  '/mes-',
  '/ordonnances/',
  '/medecin/',
  '/medecin$',
  '/admin',
  '/secretaire',
  '/pharmacie',
  '/messagerie',
  '/notifications',
  '/dawini',
  '/avis',
  '/liste-attente',
  '/teleconsultations',
];

/** Origine (schema://hote[:port]) d'une URL pour la directive connect-src de la CSP ; vide si ce n'est pas une URL. */
function origine(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/**
 * En-tetes de securite, identiques sur les fichiers statiques et les pages rendues. La CSP autorise les styles
 * inline (composants Angular) et les appels XHR / fetch vers l'API et Keycloak (discovery, jetons) ; la
 * teleconsultation s'ouvre dans un autre onglet (Jitsi), la page n'a besoin ni de la camera ni du micro.
 */
export function entetesSecurite(config: Partial<ConfigurationApplication>): Record<string, string> {
  const connectSrc = [
    "'self'",
    origine(config.apiUrl || CONFIGURATION_PAR_DEFAUT.apiUrl),
    origine(config.keycloakIssuer || CONFIGURATION_PAR_DEFAUT.keycloakIssuer),
  ].filter((o) => o);
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':
      `default-src 'self'; connect-src ${connectSrc.join(' ')}; frame-ancestors 'none'; img-src 'self' data:; ` +
      "style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
  };
}

/**
 * Origine publique du site (schema://hote), pour les URL absolues de robots.txt et du plan du site : `DOMAINE`
 * (le `.env` de docker-compose.prod.yml, Caddy servant https://DOMAINE), sinon l'origine de la requete
 * (`trust proxy` : schema et hote lus dans X-Forwarded-*).
 */
export function origineSite(req: Pick<Request, 'protocol' | 'headers'>, env: Record<string, string | undefined> = process.env): string {
  const domaine = env['DOMAINE']?.trim();
  return domaine ? `https://${domaine}` : `${req.protocol}://${req.headers.host}`;
}

/** Contenu de robots.txt : tout est permis sauf les espaces prives ; renvoie vers le plan du site. */
export function robotsTxt(origine: string): string {
  return ['User-agent: *', ...CHEMINS_PRIVES.map((c) => `Disallow: ${c}`), `Sitemap: ${origine}/sitemap.xml`, ''].join('\n');
}

/** Plan du site XML a partir des chemins publics (pages fixes puis fiches des praticiens). */
export function sitemapXml(origine: string, chemins: string[]): string {
  const urls = chemins.map((c) => `  <url><loc>${echapperXml(origine + c)}</loc></url>`);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
}

function echapperXml(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * Chemins des fiches des praticiens (`GET /api/medecins`, sans jeton), en memoire pendant une heure ; si l'API
 * ne repond pas (ou pas a temps), le plan du site se limite aux pages fixes et la prochaine demande reessaie.
 */
function creerListeFiches(apiUrl: string): () => Promise<string[]> {
  let cache: { chemins: string[]; expire: number } | null = null;
  return async () => {
    if (cache && cache.expire > Date.now()) return cache.chemins;
    try {
      const reponse = await fetch(`${apiUrl}/api/medecins`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(DELAI_SITEMAP_MS),
      });
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      const medecins = (await reponse.json()) as { id?: unknown }[];
      const chemins = medecins
        .map((m) => m.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .map((id) => `/medecins/${encodeURIComponent(id)}`);
      cache = { chemins, expire: Date.now() + DUREE_CACHE_SITEMAP_MS };
      return chemins;
    } catch (erreur) {
      console.error('Plan du site : liste des praticiens indisponible, pages fixes seulement.', erreur);
      return [];
    }
  };
}

/** Politique de cache d'un fichier statique du build (voir aussi le no-store des pages rendues). */
function cacheControl(chemin: string): string {
  // Point d'entree et configuration a l'execution : remplaces a chaque deploiement, jamais mis en cache.
  if (chemin.endsWith('.html') || chemin.endsWith(`${sep}assets${sep}config.json`)) return 'no-store';
  // Autres fichiers de assets/ (sans empreinte) : cache court avec revalidation.
  if (chemin.includes(`${sep}assets${sep}`)) return 'public, max-age=3600';
  // Bundles a empreinte (main-XXXXXXXX.js, styles-XXXXXXXX.css) : un contenu different a un nom different.
  return 'public, max-age=31536000, immutable';
}

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  // Page sans rendu serveur (le navigateur rend tout), servie en secours : index.csr.html avec SSR, sinon index.html.
  const cheminCsr = [join(browserDistFolder, 'index.csr.html'), join(browserDistFolder, 'index.html')].find((c) => existsSync(c));
  const pageCsr = cheminCsr ? readFileSync(cheminCsr, 'utf-8') : '';
  const commonEngine = new CommonEngine();
  const configuration = configurationDepuisEnvironnement(process.env);
  const entetes = entetesSecurite(configuration);
  const listeFiches = creerListeFiches(configuration.apiUrl || CONFIGURATION_PAR_DEFAUT.apiUrl);

  server.disable('x-powered-by');
  // Derriere Caddy : schema et adresse du client lus dans les en-tetes X-Forwarded-*.
  server.set('trust proxy', true);
  server.use((_req, res, next) => {
    res.set(entetes);
    next();
  });

  // Robots et plan du site, generes (avant les fichiers statiques : ils n'existent pas dans le build).
  server.get('/robots.txt', (req: Request, res: Response) => {
    res.set('Cache-Control', 'public, max-age=3600').type('text/plain').send(robotsTxt(origineSite(req)));
  });
  server.get('/sitemap.xml', async (req: Request, res: Response) => {
    const fiches = await listeFiches();
    res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(sitemapXml(origineSite(req), [...PAGES_PUBLIQUES, ...fiches]));
  });

  // Fichiers du build (chemins avec extension) : bundles a empreinte en cache long, index et config jamais.
  // Un fichier introuvable est un 404, pas une page rendue (favicon, sondes de robots).
  server.get(
    '*.*',
    express.static(browserDistFolder, {
      index: false,
      redirect: false,
      setHeaders: (res, chemin) => res.set('Cache-Control', cacheControl(chemin)),
    }),
    (_req: Request, res: Response) => res.status(404).type('text').send('Introuvable'),
  );

  // Toutes les autres routes : rendu cote serveur par Angular. En cas d'echec ou de lenteur, la page est envoyee
  // sans rendu (comme sans SSR) plutot qu'une erreur 500 : l'application reste utilisable.
  server.get('**', (req: Request, res: Response) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    res.set('Cache-Control', 'no-store');
    let repondu = false;
    const secours = (motif: string, detail?: unknown) => {
      if (repondu) return;
      repondu = true;
      console.error(`Rendu serveur de ${originalUrl} abandonne (${motif}) : page sans rendu envoyee.`, detail ?? '');
      res.type('html').send(pageCsr);
    };
    const delai = setTimeout(() => secours(`plus de ${DELAI_RENDU_MS} ms`), DELAI_RENDU_MS);
    // Statut de la reponse, que l'application peut changer pendant le rendu (404 d'une page introuvable).
    const reponse: ReponseServeur = { statut: 200 };

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        // Pas de CSS critique inline : l'attribut onload qu'il ajoute serait bloque par script-src 'self'.
        inlineCriticalCss: false,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: REPONSE_SERVEUR, useValue: reponse },
        ],
      })
      .then((html) => {
        clearTimeout(delai);
        if (repondu) return;
        repondu = true;
        res.status(reponse.statut).type('html').send(html);
      })
      .catch((erreur) => {
        clearTimeout(delai);
        secours('erreur', erreur);
      });
  });

  return server;
}

function run(): void {
  const port = Number(process.env['PORT'] || 4000);
  const server = app();
  server.listen(port, () => {
    console.log(`tabibi-web : serveur node (SSR) a l'ecoute sur le port ${port}`);
  });
}

run();
