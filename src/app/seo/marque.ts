import { ecrireJsonLd } from './donnees-structurees';
import { liensLangues } from './referentiel-seo';

/** Adresse du site (absolue, sans « / » final). */
export const SITE = 'https://tabibi.doctor';

/**
 * Lien Google Play de l'appli Tabibi DZ, ajoute dans `sameAs` de l'Organization des qu'il est renseigne.
 * A COMPLETER : coller ici l'adresse de la fiche Play Store (https://play.google.com/store/apps/details?id=…).
 * D'autres profils (Facebook, Instagram, LinkedIn…) peuvent etre ajoutes dans AUTRES_PROFILS.
 */
export const LIEN_GOOGLE_PLAY = '';
export const AUTRES_PROFILS: string[] = [];

/** Titres et descriptions de l'accueil : la marque (Tabibi Doctor / Tabibi DZ / طبيبي) et « tabibi.doctor » y figurent. */
export const ACCUEIL_FR = {
  titre: 'Tabibi Doctor (Tabibi DZ) : trouvez un médecin et prenez rendez-vous en Algérie',
  description: 'Tabibi Doctor (tabibi.doctor), aussi appelé Tabibi DZ : la plateforme médicale qui réunit plus de 75 000 médecins, cliniques et pharmacies en Algérie. Trouvez un praticien par spécialité et par wilaya, et prenez rendez-vous en quelques clics.',
};
export const ACCUEIL_AR = {
  titre: 'طبيبي Tabibi Doctor (Tabibi DZ): احجز موعدك مع طبيب في الجزائر',
  description: 'طبيبي Tabibi Doctor (tabibi.doctor)، المعروف أيضًا باسم Tabibi DZ: احجز موعدك مع طبيب في الجزائر. أكثر من 75 000 طبيب في الولايات الـ69، حسب التخصص والولاية. الدفع في العيادة.',
};

/** JSON-LD Organization : identite de la marque pour les moteurs de recherche. */
export function organisationJsonLd(): object {
  const sameAs = [LIEN_GOOGLE_PLAY, ...AUTRES_PROFILS].filter((u) => !!u);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE}/#organisation`,
    name: 'Tabibi Doctor',
    alternateName: ['Tabibi DZ', 'Tabibi Algérie', 'طبيبي'],
    url: `${SITE}/`,
    logo: `${SITE}/assets/img/logo-tabibi.svg`,
    areaServed: { '@type': 'Country', name: 'Algérie' },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** JSON-LD WebSite avec SearchAction : la recherche de l'accueil accepte ?q=. */
export function siteWebJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE}/#site`,
    name: 'Tabibi Doctor',
    alternateName: ['Tabibi DZ', 'Tabibi Algérie', 'طبيبي'],
    url: `${SITE}/`,
    inLanguage: ['fr', 'ar'],
    publisher: { '@id': `${SITE}/#organisation` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Pose canonical, hreflang (fr / ar / x-default) et JSON-LD de marque sur l'accueil FR ou AR. */
export function referencerAccueil(doc: Document, ar: boolean): void {
  let lien = doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!lien) {
    lien = doc.createElement('link');
    lien.setAttribute('rel', 'canonical');
    doc.head.appendChild(lien);
  }
  lien.setAttribute('href', ar ? `${SITE}/ar` : `${SITE}/`);
  liensLangues(doc, '');
  doc.documentElement.setAttribute('lang', ar ? 'ar' : 'fr');
  ecrireJsonLd(doc, 'ld-organisation', organisationJsonLd());
  ecrireJsonLd(doc, 'ld-site', siteWebJsonLd());
}
