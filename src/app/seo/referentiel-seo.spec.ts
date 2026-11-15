import referentiel from '../../assets/referentiel.json';
import { WILAYAS_SEO } from './referentiel-seo';

/** Garde : l'Algerie compte 69 wilayas (reforme de 2025). Le site en annoncait 69 mais n'en listait que 66. */
describe('Referentiel des wilayas', () => {
  it('liste les 69 wilayas, codes 1 a 69 sans trou ni doublon, identiques dans les deux referentiels', () => {
    const codes = (referentiel as { wilayas: { code: string }[] }).wilayas.map((w) => Number(w.code));
    expect(codes).toEqual(Array.from({ length: 69 }, (_, i) => i + 1));
    expect(WILAYAS_SEO.map((w) => Number(w.code))).toEqual(codes);
    expect(new Set(WILAYAS_SEO.map((w) => w.slug)).size).toBe(69);
  });
});

describe('Pages publiques en arabe', () => {
  const arabe = /[؀-ۿ]/;

  it('chaque specialite et chaque wilaya a un nom arabe', async () => {
    const { SPECIALITES_SEO } = await import('./referentiel-seo');
    for (const s of SPECIALITES_SEO) expect(arabe.test(s.nomAr)).withContext(s.slug).toBeTrue();
    for (const w of WILAYAS_SEO) expect(arabe.test(w.nomAr)).withContext(w.code).toBeTrue();
  });

  it('les textes arabes couvrent toutes les cles francaises et sont en arabe', async () => {
    const { TEXTES_SEO } = await import('./textes-seo');
    expect(Object.keys(TEXTES_SEO.ar).sort()).toEqual(Object.keys(TEXTES_SEO.fr).sort());
    expect(arabe.test(TEXTES_SEO.ar.titreSpecWil('طبيب القلب', 'الجزائر'))).toBeTrue();
    expect(arabe.test(TEXTES_SEO.ar.introIndex)).toBeTrue();
  });
});

describe('Liens des pages arabes', () => {
  it('une page de liste arabe renvoie vers la page arabe du praticien', async () => {
    const { AnnuaireSeoComponent } = await import('./annuaire-seo.component');
    const c = Object.create(AnnuaireSeoComponent.prototype) as { ar: boolean; lien: (m: unknown) => string[] };
    c.ar = true;
    expect(c.lien({ id: 'x', nomComplet: 'Abbou Katia' })[0]).toBe('/ar/praticiens');
    c.ar = false;
    expect(c.lien({ id: 'x', nomComplet: 'Abbou Katia' })[0]).toBe('/praticiens');
  });
});
