import { estPageFrancaiseSeule, remettreDocumentFrancais } from './page-seo';

describe('pages sans version arabe', () => {
  it('reconnait /bientot, /verifier, /supprimer-mon-compte et /praticien (pas /praticiens/..., pas /ar/...)', () => {
    for (const u of ['/bientot', '/verifier', '/supprimer-mon-compte', '/praticien', '/verifier?x=1', '/bientot/']) {
      expect(estPageFrancaiseSeule(u)).withContext(u).toBeTrue();
    }
    for (const u of ['/ar/bientot', '/praticiens/abc', '/', '/ar']) {
      expect(estPageFrancaiseSeule(u)).withContext(u).toBeFalse();
    }
  });

  it('remet <html lang="fr" dir="ltr">', () => {
    document.documentElement.setAttribute('lang', 'ar');
    document.documentElement.setAttribute('dir', 'rtl');
    remettreDocumentFrancais(document);
    expect(document.documentElement.getAttribute('lang')).toBe('fr');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
