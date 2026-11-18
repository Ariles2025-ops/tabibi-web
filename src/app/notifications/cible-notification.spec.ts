import { cibleDuLien } from './cible-notification';

describe('cibleDuLien', () => {
  it('suit les liens qui ont une page, comme l\'appli', () => {
    expect(cibleDuLien('/mes-rendez-vous')).toBe('/mes-rendez-vous');
    expect(cibleDuLien('/ordonnances/o1')).toBe('/ordonnances/o1');
    expect(cibleDuLien('/medecins/m1')).toBe('/medecins/m1');
    expect(cibleDuLien('/messagerie')).toBe('/messagerie');
    expect(cibleDuLien('/messagerie/c1')).toBe('/messagerie/c1');
    expect(cibleDuLien('/dawini')).toBe('/dawini');
    expect(cibleDuLien('/dawini/d1')).toBe('/dawini/d1');
    expect(cibleDuLien('/mes-avis')).toBe('/mes-avis');
    expect(cibleDuLien('/liste-attente?x=1#y')).toBe('/liste-attente');
  });

  it('« /ordonnances » ouvre la liste « Mes ordonnances » (pas de page introuvable)', () => {
    expect(cibleDuLien('/ordonnances')).toBe('/mes-ordonnances');
  });

  it('un lien sans page correspondante n\'est pas suivi', () => {
    for (const lien of ['', '   ', null, undefined, 'https://exemple.org', '//exemple.org', '/', '/medecins',
      '/inconnu', '/mes-rendez-vous/x', '/a/b/c']) {
      expect(cibleDuLien(lien)).withContext(String(lien)).toBeNull();
    }
  });
});
