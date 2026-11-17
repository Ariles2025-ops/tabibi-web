import { ACCUEIL_AR, ACCUEIL_FR, organisationJsonLd, referencerAccueil, siteWebJsonLd } from './marque';

/** Garde SEO de marque : titre, canonical, hreflang et JSON-LD Organization / WebSite de l'accueil. */
describe('marque (SEO accueil)', () => {
  it('les titres et descriptions portent la marque', () => {
    expect(ACCUEIL_FR.titre).toContain('Tabibi Doctor (Tabibi DZ)');
    expect(ACCUEIL_FR.description).toContain('tabibi.doctor');
    expect(ACCUEIL_AR.titre).toContain('طبيبي');
    expect(ACCUEIL_AR.description).toContain('tabibi.doctor');
  });

  it('Organization : nom, alias, logo absolu, zone', () => {
    const o = organisationJsonLd() as any;
    expect(o['@type']).toBe('Organization');
    expect(o.name).toBe('Tabibi Doctor');
    expect(o.alternateName).toEqual(['Tabibi DZ', 'Tabibi Algérie', 'طبيبي']);
    expect(o.logo).toMatch(/^https:\/\/tabibi\.doctor\//);
    expect(o.areaServed.name).toBe('Algérie');
  });

  it('WebSite : SearchAction vers la recherche du site', () => {
    const w = siteWebJsonLd() as any;
    expect(w['@type']).toBe('WebSite');
    expect(w.potentialAction['@type']).toBe('SearchAction');
    expect(w.potentialAction.target.urlTemplate).toBe('https://tabibi.doctor/?q={search_term_string}');
  });

  it('referencerAccueil pose canonical, hreflang et JSON-LD (FR puis AR, sans doublon)', () => {
    referencerAccueil(document, false);
    expect(document.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://tabibi.doctor/');
    expect(document.head.querySelector('script#ld-organisation')!.textContent).toContain('"@type":"Organization"');
    referencerAccueil(document, true);
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://tabibi.doctor/ar');
    const langues = Array.from(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).map((l) => l.getAttribute('hreflang'));
    expect(langues).toEqual(['fr', 'ar', 'x-default']);
    expect(document.head.querySelectorAll('script#ld-site').length).toBe(1);
    document.head.querySelectorAll('link[rel="canonical"], link[rel="alternate"], script[type="application/ld+json"]').forEach((e) => e.remove());
  });
});
