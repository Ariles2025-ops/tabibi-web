import { SPECIALITES_SEO, WILAYAS_SEO } from './referentiel-seo';

/**
 * Anciennes adresses de l'ancien site que Google affiche encore (/seo/<wilaya>-<specialite>, /index.html?specialty=...,
 * /about, /blog) : fonctions pures utilisees par server.ts pour repondre en 301 vers les pages actuelles, jamais en 404.
 */

const specialiteConnue = (slug: string) => SPECIALITES_SEO.find((s) => s.slug.toLowerCase() === slug.toLowerCase())?.slug;
const wilayaConnue = (slug: string) => WILAYAS_SEO.find((w) => w.slug.toLowerCase() === slug.toLowerCase())?.slug;

/**
 * Decoupe « <wilaya>-<specialite> » (ou l'inverse) en s'appuyant sur les listes connues : wilayas et specialites
 * contiennent des tirets (bordj-bou-arreridj, gastro-enterologue), le premier tiret ne suffit pas.
 */
export function decouperSeo(reste: string): { specialite?: string; wilaya?: string } {
  const parts = reste.replace(/\/+$/, '').split('-').filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    const gauche = parts.slice(0, i).join('-');
    const droite = parts.slice(i).join('-');
    const wilaya = wilayaConnue(gauche), specialite = specialiteConnue(droite);
    if (wilaya && specialite) return { specialite, wilaya };
    const wilaya2 = wilayaConnue(droite), specialite2 = specialiteConnue(gauche);
    if (wilaya2 && specialite2) return { specialite: specialite2, wilaya: wilaya2 };
  }
  // Combinaison inconnue : au moins la specialite si elle est reconnaissable (seule ou en tete / queue).
  const seule = specialiteConnue(parts.join('-'));
  if (seule) return { specialite: seule };
  for (let i = 1; i < parts.length; i++) {
    const s = specialiteConnue(parts.slice(0, i).join('-')) ?? specialiteConnue(parts.slice(i).join('-'));
    if (s) return { specialite: s };
  }
  return {};
}

/** Adresse actuelle d'une specialite et / ou d'une wilaya (page d'accueil si aucune des deux). */
export function adresseSpecialite(r: { specialite?: string; wilaya?: string }, prefixe = ''): string {
  if (!r.specialite) return prefixe || '/';
  return `${prefixe}/specialites/${r.specialite}${r.wilaya ? '/' + r.wilaya : ''}`;
}

/** /seo/<wilaya>-<specialite> et /ar/seo/... -> adresse actuelle ; null si le chemin n'est pas une ancienne adresse /seo/. */
export function redirectionSeo(chemin: string): string | null {
  const m = /^(\/ar)?\/seo\/([^/]+)\/?$/.exec(chemin);
  if (!m) return null;
  let reste = m[2];
  try { reste = decodeURIComponent(reste); } catch { /* garde le texte brut */ }
  return adresseSpecialite(decouperSeo(reste), m[1] ?? '');
}

/** /index.html?specialty=<s>&wilaya=<w> -> adresse actuelle (/ sans parametre reconnu). */
export function redirectionIndex(specialty: unknown, wilaya: unknown): string {
  const s = typeof specialty === 'string' ? specialiteConnue(specialty.trim()) : undefined;
  const w = typeof wilaya === 'string' ? wilayaConnue(wilaya.trim()) : undefined;
  return adresseSpecialite({ specialite: s, wilaya: s ? w : undefined });
}
