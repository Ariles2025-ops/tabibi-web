import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express, { Request, Response } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIGURATION_PAR_DEFAUT, ConfigurationApplication, configurationDepuisEnvironnement } from './src/app/config/config.service';
import bootstrap from './src/main.server';

/**
 * Serveur node du front web (image Docker) : fichiers statiques du build et rendu cote serveur (SSR) des pages par
 * Angular, pour le referencement des pages publiques (annuaire, fiches des praticiens). La configuration (API,
 * Keycloak) vient des variables d'environnement, les memes que celles de docker/entrypoint.sh, qui ecrit aussi
 * assets/config.json pour le navigateur. Les en-tetes de securite sont poses ici (pas de reverse proxy suppose).
 */

/** Au-dela de ce delai (API lente), la page est envoyee sans rendu serveur : le navigateur la rend lui-meme. */
const DELAI_RENDU_MS = Number(process.env['TABIBI_SSR_DELAI_MS'] || 10_000);

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
  const entetes = entetesSecurite(configurationDepuisEnvironnement(process.env));

  server.disable('x-powered-by');
  // Derriere Caddy : schema et adresse du client lus dans les en-tetes X-Forwarded-*.
  server.set('trust proxy', true);
  server.use((_req, res, next) => {
    res.set(entetes);
    next();
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

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        // Pas de CSS critique inline : l'attribut onload qu'il ajoute serait bloque par script-src 'self'.
        inlineCriticalCss: false,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => {
        clearTimeout(delai);
        if (repondu) return;
        repondu = true;
        res.type('html').send(html);
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
