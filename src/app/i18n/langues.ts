/**
 * Langues de l'interface et deduction de la langue demandee, sans aucune dependance Angular : ce module est
 * importe tel quel par les tests du projet `logique` (Playwright transpile le TypeScript et l'execute dans node,
 * ou un paquet Angular ne se charge pas). `TraductionService` le reexporte, les imports existants ne changent pas.
 */

/** Langues de l'interface : francais (par defaut), arabe (droite a gauche) et anglais. */
export type Langue = 'fr' | 'ar' | 'en';

export const LANGUES_INTERFACE: ReadonlyArray<{ code: Langue; libelle: string }> = [
  { code: 'fr', libelle: 'Français' },
  { code: 'ar', libelle: 'العربية' },
  { code: 'en', libelle: 'English' },
];

export const LANGUE_PAR_DEFAUT: Langue = 'fr';

/** Cle localStorage du choix manuel de langue (selecteur de la barre de navigation). */
export const CLE_STOCKAGE_LANGUE = 'tabibi.langue';

/**
 * Locale Angular (dates) de chaque langue : `LOCALE_ID` reste `fr`, mais le pipe `dateLocale` prend celle de la
 * langue courante. `ar-DZ` : noms des mois en usage en Algerie (جانفي، فيفري…) et chiffres latins.
 */
export const LOCALES: Record<Langue, string> = { fr: 'fr', ar: 'ar-DZ', en: 'en' };

/** `fr-FR` → fr, `ar-DZ` → ar, `en-GB` → en ; null si la langue n'est pas prise en charge (kab, es…). */
export function langueDepuisCode(code: string | null | undefined): Langue | null {
  const base = (code ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return base === 'fr' || base === 'ar' || base === 'en' ? base : null;
}

/**
 * Premiere langue prise en charge d'un en-tete `Accept-Language` (« ar-DZ,ar;q=0.9,fr;q=0.8 » → ar), par ordre de
 * preference (`q`) ; francais si l'en-tete est absent ou ne cite aucune langue connue.
 */
export function langueDepuisAcceptLanguage(entete: string | null | undefined): Langue {
  if (!entete) return LANGUE_PAR_DEFAUT;
  const candidats = entete
    .split(',')
    .map((partie, index) => {
      const [code, ...params] = partie.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const poids = q ? Number(q.slice(2)) : 1;
      return { code, poids: Number.isNaN(poids) ? 0 : poids, index };
    })
    .filter((c) => c.poids > 0)
    .sort((a, b) => b.poids - a.poids || a.index - b.index);
  for (const c of candidats) {
    const langue = langueDepuisCode(c.code);
    if (langue) return langue;
  }
  return LANGUE_PAR_DEFAUT;
}
