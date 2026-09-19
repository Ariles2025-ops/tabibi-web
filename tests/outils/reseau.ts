import { Page, Request, Route } from '@playwright/test';

/**
 * Simulation et observation des appels a l'API depuis le navigateur. Remplace ce que les specs Karma faisaient
 * avec `HttpTestingController` (verifier l'URL, la methode et le corps envoyes) et avec des services factices
 * (repondre 200, 400, 403, 404 ou 409) : ici la vraie application appelle la vraie couche HTTP, et
 * `page.route` intercepte l'appel avant le reseau.
 */

/** Reponse fabriquee : statut (200 par defaut), corps serialise en JSON, en-tetes supplementaires. */
export interface ReponseSimulee {
  statut?: number;
  corps?: unknown;
  entetes?: Record<string, string>;
}

/** Reponse calculee a partir de la requete (utile pour repondre selon l'identifiant ou les parametres). */
export type FabriqueReponse = (requete: Request) => ReponseSimulee | Promise<ReponseSimulee>;

/**
 * L'API simulee est sur une autre origine que la page (4301 contre 4300) : une reponse fabriquee doit porter les
 * en-tetes CORS, sinon le navigateur la refuse avant qu'Angular ne la voie.
 */
const ENTETES_CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'Authorization, Content-Type',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

/**
 * Repond a la place de l'API pour les URL correspondant au motif. Le dernier stub pose l'emporte (Playwright
 * essaie les routes de la plus recente a la plus ancienne) : un test peut donc preciser un cas particulier
 * apres un stub general.
 */
export async function stub(page: Page, motif: string | RegExp, reponse: ReponseSimulee | FabriqueReponse): Promise<void> {
  await page.route(motif, async (route: Route) => {
    // Requete preliminaire CORS : rien a simuler, seuls les en-tetes comptent.
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: ENTETES_CORS });
      return;
    }
    const valeur = typeof reponse === 'function' ? await reponse(route.request()) : reponse;
    await route.fulfill({
      status: valeur.statut ?? 200,
      contentType: 'application/json; charset=utf-8',
      headers: { ...ENTETES_CORS, ...(valeur.entetes ?? {}) },
      body: JSON.stringify(valeur.corps ?? null),
    });
  });
}

/** Appel observe : methode, URL complete, chemin, parametres de requete et corps (JSON si possible). */
export interface RequeteCapturee {
  methode: string;
  url: string;
  chemin: string;
  parametres: URLSearchParams;
  corps: unknown;
  /** En-tetes envoyes (noms en minuscules) : sert a verifier le jeton pose par l'intercepteur. */
  entetes: Record<string, string>;
}

/** Journal des appels a l'API faits par la page, dans l'ordre. */
export class JournalRequetes {
  readonly toutes: RequeteCapturee[] = [];

  /** Appels dont l'URL correspond au motif (sous-chaine ou expression reguliere) et, au besoin, a la methode. */
  filtrer(motif: string | RegExp, methode?: string): RequeteCapturee[] {
    return this.toutes.filter(
      (r) =>
        (typeof motif === 'string' ? r.url.includes(motif) : motif.test(r.url)) &&
        (!methode || r.methode === methode.toUpperCase()),
    );
  }

  /** Vrai si au moins un appel correspond. */
  contient(motif: string | RegExp, methode?: string): boolean {
    return this.filtrer(motif, methode).length > 0;
  }

  /**
   * Attend le premier appel correspondant et le renvoie (les evenements reseau arrivent apres le clic qui les
   * declenche : attendre evite une assertion prematuree). Leve au-dela du delai.
   */
  async attendre(motif: string | RegExp, methode = 'GET', delaiMs = 10_000): Promise<RequeteCapturee> {
    const fin = Date.now() + delaiMs;
    for (;;) {
      const trouvees = this.filtrer(motif, methode);
      if (trouvees.length) return trouvees[0];
      if (Date.now() > fin) {
        throw new Error(
          `Aucun appel ${methode} correspondant a ${motif} en ${delaiMs} ms. Appels vus : ` +
            (this.toutes.map((r) => `${r.methode} ${r.chemin}`).join(', ') || 'aucun'),
        );
      }
      await new Promise((resoudre) => setTimeout(resoudre, 50));
    }
  }

  /** Le dernier appel correspondant (apres l'avoir attendu). */
  async attendreDernier(motif: string | RegExp, methode = 'GET', delaiMs = 10_000): Promise<RequeteCapturee> {
    await this.attendre(motif, methode, delaiMs);
    const trouvees = this.filtrer(motif, methode);
    return trouvees[trouvees.length - 1];
  }

  vider(): void {
    this.toutes.length = 0;
  }
}

/**
 * Commence a noter les appels `/api/...` de la page (a poser avant la navigation). Les appels stubbes sont
 * notes eux aussi : `page.on('request')` precede l'interception.
 */
export function requetes(page: Page): JournalRequetes {
  const journal = new JournalRequetes();
  page.on('request', (requete) => {
    const url = requete.url();
    if (!url.includes('/api/') || requete.method() === 'OPTIONS') return;
    const analysee = new URL(url);
    journal.toutes.push({
      methode: requete.method(),
      url,
      chemin: analysee.pathname,
      parametres: analysee.searchParams,
      corps: corpsJson(requete),
      entetes: requete.headers(),
    });
  });
  return journal;
}

/** Corps de la requete : objet si c'est du JSON, texte brut sinon, null s'il n'y en a pas. */
function corpsJson(requete: Request): unknown {
  const brut = requete.postData();
  if (brut === null || brut === undefined || brut === '') return null;
  try {
    return JSON.parse(brut);
  } catch {
    return brut;
  }
}
