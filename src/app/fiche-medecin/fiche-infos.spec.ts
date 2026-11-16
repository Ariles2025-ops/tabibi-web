import { aDesInfos, libelleLangue, telephoneAlgerienValide } from './fiche-infos';

describe('fiche-infos', () => {
  it('accepte les formats de telephone algeriens', () => {
    for (const t of ['021 12 34 56', '0550 12 34 56', '0550123456', '+213 550 12 34 56', '00213550123456']) {
      expect(telephoneAlgerienValide(t)).withContext(t).toBeTrue();
    }
  });

  it('refuse les numeros invalides', () => {
    for (const t of ['', 'abc', '12 34', '+33 6 12 34 56 78', '0550']) {
      expect(telephoneAlgerienValide(t)).withContext(t).toBeFalse();
    }
  });

  it('traduit les langues en francais et en arabe', () => {
    expect(libelleLangue('ar', false)).toBe('Arabe');
    expect(libelleLangue('fr', true)).toBe('الفرنسية');
    expect(libelleLangue('xx', false)).toBe('xx');
  });

  it('detecte les fiches sans information', () => {
    expect(aDesInfos({})).toBeFalse();
    expect(aDesInfos({ adresse: '  ', langues: [] })).toBeFalse();
    expect(aDesInfos({ horaires: 'Dim–Jeu 9h–16h' })).toBeTrue();
  });
});
