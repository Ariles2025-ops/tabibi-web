import { slugifier } from './referentiel-seo';

/** Seuil : une page commune n'existe (200, sitemap, liens) qu'avec au moins 3 praticiens (pas de page vide). */
export const MIN_PRATICIENS_COMMUNE = 3;

export interface Commune { slug: string; nom: string; medecins: number; }

/** Slug de commune : minuscules, sans accents, tirets. « ALGER », « Alger » et « alger  » donnent le meme slug. */
export function slugCommune(ville: string | null | undefined): string {
  return (ville || '').trim() ? slugifier(ville as string).replace(/^praticien$/, '') : '';
}

/** Ville exploitable : non vide et differente de la wilaya (« Alger » dans la wilaya d'Alger n'est pas une commune). */
function communeValide(ville: string | null | undefined, wilayaSlug: string, wilayaNoms: string[]): boolean {
  const s = slugCommune(ville);
  return !!s && s !== wilayaSlug && !wilayaNoms.some((n) => slugCommune(n) === s);
}

/** Libelle d'affichage : l'ecriture la plus frequente ; « ALGER » en capitales devient « Alger ». */
function libelle(variantes: string[]): string {
  const freq = new Map<string, number>();
  for (const v of variantes) freq.set(v.trim(), (freq.get(v.trim()) || 0) + 1);
  let meilleur = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  if (meilleur === meilleur.toUpperCase() && meilleur !== meilleur.toLowerCase()) {
    meilleur = meilleur.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());
  }
  return meilleur;
}

/** Communes d'une liste de praticiens d'une meme wilaya, avec au moins `min` praticiens (ordre alphabetique). */
export function communesDe(
  medecins: { ville: string }[], wilayaSlug: string, wilayaNoms: string[], min = MIN_PRATICIENS_COMMUNE,
): Commune[] {
  const groupes = new Map<string, string[]>();
  for (const m of medecins) {
    if (!communeValide(m.ville, wilayaSlug, wilayaNoms)) continue;
    const s = slugCommune(m.ville);
    groupes.set(s, [...(groupes.get(s) || []), m.ville]);
  }
  return [...groupes.entries()]
    .filter(([, v]) => v.length >= min)
    .map(([slug, v]) => ({ slug, nom: libelle(v), medecins: v.length }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}
