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

/** Praticien affiche dans une liste : uniquement des donnees publiques (jamais de telephone ni d'adresse privee). */
export interface PraticienLd {
  nom: string;
  url: string;
  specialiteSlug: string;
  specialite: string;
  ville: string;
  region: string;
}

/** Entree d'une ItemList : Physician / Dentist / Pharmacy selon la categorie. Sans telephone. */
export function praticienLd(p: PraticienLd): object {
  const type = typeSchemaOrg(p.specialiteSlug);
  const adresse: Record<string, string> = { '@type': 'PostalAddress', addressCountry: 'DZ' };
  if (p.ville || p.region) adresse['addressLocality'] = p.ville || p.region;
  if (p.region) adresse['addressRegion'] = p.region;
  const d: Record<string, unknown> = { '@type': type, name: p.nom, url: p.url, address: adresse };
  if (type !== 'Pharmacy' && p.specialite) d['medicalSpecialty'] = p.specialite;
  return d;
}

export interface PageAnnuaireLd {
  url: string;
  nom: string;
  description: string;
  langue: 'fr' | 'ar';
  /** Specialite traitee par la page (absente sur une page wilaya). */
  specialite?: string;
  /** Date de derniere verification, AAAA-MM-JJ. */
  verifieLe: string;
  etapes: { nom: string; url: string }[];
  praticiens: PraticienLd[];
  faq?: { q: string; r: string }[];
}

/** Bloc JSON-LD unique (@graph) : MedicalWebPage + ItemList + BreadcrumbList (+ FAQPage). */
export function pageAnnuaire(c: PageAnnuaireLd): object {
  const graphe: object[] = [];
  const page: Record<string, unknown> = {
    '@type': 'MedicalWebPage', '@id': `${c.url}#page`, url: c.url, name: c.nom, description: c.description,
    inLanguage: c.langue, lastReviewed: c.verifieLe, breadcrumb: { '@id': `${c.url}#fil` },
  };
  if (c.specialite) page['about'] = { '@type': 'MedicalSpecialty', name: c.specialite };
  if (c.praticiens.length) page['mainEntity'] = { '@id': `${c.url}#liste` };
  graphe.push(page);
  if (c.praticiens.length) {
    graphe.push({
      '@type': 'ItemList', '@id': `${c.url}#liste`, name: c.nom, numberOfItems: c.praticiens.length,
      itemListElement: c.praticiens.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: praticienLd(p) })),
    });
  }
  const { '@context': _ctx, ...filSansContexte } = fil(c.etapes) as Record<string, unknown>;
  graphe.push({ ...filSansContexte, '@id': `${c.url}#fil` });
  if (c.faq?.length) {
    const { '@context': _c2, ...faqSansContexte } = faqPage(c.faq, c.langue) as Record<string, unknown>;
    graphe.push({ ...faqSansContexte, '@id': `${c.url}#faq` });
  }
  return { '@context': 'https://schema.org', '@graph': graphe };
}
