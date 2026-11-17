import { Meta, Title } from '@angular/platform-browser';
import { liensLangues } from './referentiel-seo';

/** Titre, description, robots, lien canonique et hreflang d'une page publique simple (chemin sans prefixe /ar). */
export function referencerPage(
  doc: Document, title: Title, meta: Meta,
  page: { titre: string; description: string; chemin: string; ar: boolean; indexable?: boolean; bilingue?: boolean },
): void {
  title.setTitle(`${page.titre} | Ndawik`);
  meta.updateTag({ name: 'description', content: page.description });
  meta.updateTag({ property: 'og:title', content: `${page.titre} | Ndawik` });
  meta.updateTag({ property: 'og:description', content: page.description });
  meta.updateTag({ property: 'og:locale', content: page.ar ? 'ar_DZ' : 'fr_DZ' });
  meta.updateTag({ name: 'robots', content: page.indexable === false ? 'noindex' : 'index, follow' });
  let lien = doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!lien) {
    lien = doc.createElement('link');
    lien.setAttribute('rel', 'canonical');
    doc.head.appendChild(lien);
  }
  lien.setAttribute('href', `https://tabibi.doctor${page.ar ? '/ar' : ''}${page.chemin === '/' && page.ar ? '' : page.chemin}`);
  if (page.bilingue !== false) {
    liensLangues(doc, page.chemin);
  } else {
    doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((l) => l.remove());
  }
  poserLangueDocument(doc, page.ar);
}

/** Pose lang et dir sur <html> (ar/rtl ou fr/ltr) : lecteurs d'ecran et moteurs de recherche lisent la racine. */
export function poserLangueDocument(doc: Document, ar: boolean): void {
  doc.documentElement.setAttribute('lang', ar ? 'ar' : 'fr');
  doc.documentElement.setAttribute('dir', ar ? 'rtl' : 'ltr');
}

/** Pages uniquement en francais (sans version arabe) : /bientot, /verifier, /supprimer-mon-compte, /praticien. */
export function estPageFrancaiseSeule(url: string): boolean {
  const chemin = url.split(/[?#]/)[0].replace(/\/+$/, '');
  return ['/bientot', '/verifier', '/supprimer-mon-compte', '/praticien'].includes(chemin);
}

/** Remet <html lang="fr" dir="ltr"> (apres un passage par une page /ar, qui laisse lang="ar" sur le document). */
export function remettreDocumentFrancais(doc: Document): void {
  doc.documentElement.setAttribute('lang', 'fr');
  doc.documentElement.setAttribute('dir', 'ltr');
}
