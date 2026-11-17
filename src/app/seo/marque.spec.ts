import { configurationServeur } from '../config/config.service';
import { ACCUEIL_AR, ACCUEIL_FR, organisationJsonLd, referencerAccueil, siteWebJsonLd } from './marque';

/** Garde SEO de marque : titre, canonical, hreflang et JSON-LD Organization / WebSite de l'accueil. */
describe('marque (SEO accueil)', () => {
  it('les titres et descriptions portent la marque', () => {
    expect(ACCUEIL_FR.titre).toContain('Ndawik : trouvez un médecin et prenez rendez-vous en Algérie');
    expect(ACCUEIL_FR.description).toContain('Ndawik');
    expect(ACCUEIL_AR.titre).toContain('نداويك');
    expect(ACCUEIL_AR.description).toContain('نداويك');
  });

  it('Organization : nom, alias, logo absolu, zone', () => {
    const o = organisationJsonLd() as any;
    expect(o['@type']).toBe('Organization');
    expect(o.name).toBe('Ndawik');
    expect(o.alternateName).toEqual(['Tabibi', 'Tabibi Doctor', 'Tabibi DZ', 'نداويك']);
    expect(o.logo).toMatch(/^https:\/\/ndawik\.com\//);
    expect(o.areaServed.name).toBe('Algérie');
    expect(o.url).toBe('https://ndawik.com/');
    expect(o.logo).toBe('https://ndawik.com/icon-512.png');
    expect(o.sameAs).toContain('https://play.google.com/store/apps/details?id=dz.tabibi.app');
  });

  it('WebSite : SearchAction vers la recherche du site', () => {
    const w = siteWebJsonLd() as any;
    expect(w['@type']).toBe('WebSite');
    expect(w.potentialAction['@type']).toBe('SearchAction');
    expect(w.potentialAction.target.urlTemplate).toBe('https://ndawik.com/?q={search_term_string}');
  });

  it("le canonical de l'accueil reste https://ndawik.com/ même quand DOMAINE=tabibi.doctor (API/Keycloak)", () => {
    const env = { DOMAINE: 'tabibi.doctor' };
    expect(configurationServeur(env).apiUrl).toBe('https://api.tabibi.doctor');
    referencerAccueil(document, false);
    expect(document.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://ndawik.com/');
    document.head.querySelectorAll('link[rel="canonical"], link[rel="alternate"], script[type="application/ld+json"]').forEach((e) => e.remove());
  });

  it('referencerAccueil pose canonical, hreflang et JSON-LD (FR puis AR, sans doublon)', () => {
    referencerAccueil(document, false);
    expect(document.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://ndawik.com/');
    expect(document.head.querySelector('script#ld-organisation')!.textContent).toContain('"@type":"Organization"');
    referencerAccueil(document, true);
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://ndawik.com/ar');
    const langues = Array.from(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).map((l) => l.getAttribute('hreflang'));
    expect(langues).toEqual(['fr', 'ar', 'x-default']);
    expect(document.head.querySelectorAll('script#ld-site').length).toBe(1);
    document.head.querySelectorAll('link[rel="canonical"], link[rel="alternate"], script[type="application/ld+json"]').forEach((e) => e.remove());
  });
});
