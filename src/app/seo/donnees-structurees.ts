import { SLUG_PHARMACIE } from './referentiel-seo';

/** Ecrit (ou remplace) un bloc JSON-LD dans le <head> ; `donnees` null retire le bloc. */
export function ecrireJsonLd(doc: Document, id: string, donnees: object | null): void {
  let script = doc.head.querySelector<HTMLScriptElement>(`script#${id}`);
  if (!donnees) { script?.remove(); return; }
  if (!script) {
    script = doc.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    doc.head.appendChild(script);
  }
  // « < » echappe pour qu'un nom ne puisse jamais fermer la balise <script>.
  script.textContent = JSON.stringify(donnees).replace(/</g, '\\u003c');
}

/** Type schema.org selon la specialite : Dentist, Pharmacy, sinon Physician. */
export function typeSchemaOrg(slugSpecialite: string | null | undefined): 'Dentist' | 'Pharmacy' | 'Physician' {
  if (slugSpecialite === 'dentiste') return 'Dentist';
  if (slugSpecialite === SLUG_PHARMACIE) return 'Pharmacy';
  return 'Physician';
}

/** BreadcrumbList : etapes { nom, url } dans l'ordre (la derniere est la page courante). */
export function fil(etapes: { nom: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: etapes.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.nom, item: e.url })),
  };
}

/** FAQPage : doit refleter exactement les questions visibles sur la page. */
export function faqPage(questions: { q: string; r: string }[], langue: 'fr' | 'ar'): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: langue,
    mainEntity: questions.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.r } })),
  };
}
