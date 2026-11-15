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
