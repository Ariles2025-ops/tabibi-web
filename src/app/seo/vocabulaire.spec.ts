import { TEXTES_SEO } from './textes-seo';

/**
 * Garde de vocabulaire : Tabibi est une plateforme medicale, pas un annuaire. Les mots « annuaire » et « دليل »
 * ne doivent reapparaitre ni dans index.html (title, description, og:, twitter:, JSON-LD) ni dans les titres et
 * descriptions SEO. Le code (AnnuaireComponent...) garde son nom : seuls les textes affiches comptent.
 */
describe('Vocabulaire : pas d\'« annuaire »', () => {
  const interdit = /annuaire|دليل/i;

  it('index.html (balises vues par Google) ne contient ni « annuaire » ni « دليل »', async () => {
    const html = await (await fetch('/garde-vocabulaire/index.html')).text();
    expect(html).toContain('<title>');
    expect(html).toContain('75 000');
    expect(interdit.test(html)).toBeFalse();
  });

  for (const langue of ['fr', 'ar'] as const) {
    it(`les textes SEO (${langue}) ne contiennent ni « annuaire » ni « دليل »`, () => {
      const t = TEXTES_SEO[langue];
      const textes: Record<string, string> = {};
      for (const [cle, v] of Object.entries(t)) {
        if (typeof v === 'string') textes[cle] = v;
        else if (typeof v === 'function') {
          const f = v as (...a: (string | null)[]) => unknown;
          for (const args of [['Cardiologue', 'Alger'], ['Cardiologue'], ['Alger'], [null], ['Alger', 'Cardiologue', '5']]) {
            try {
              const r = f(...args);
              if (typeof r === 'string') textes[`${cle}(${args.join(',')})`] = r;
            } catch { /* signature differente : ignoree */ }
          }
        }
      }
      expect(Object.keys(textes).length).toBeGreaterThan(10);
      for (const [cle, texte] of Object.entries(textes)) expect(interdit.test(texte)).withContext(cle).toBeFalse();
    });
  }
});
