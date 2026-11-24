import { cibleDuLien } from './cible-notification';
import { VISIO_ACTIVE } from '../lancement';

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

  it('suit les liens des espaces médecin et secrétaire, comme l\'appli', () => {
    expect(cibleDuLien('/medecin/agenda')).toBe('/medecin/agenda');
    expect(cibleDuLien('/medecin/avis')).toBe('/medecin/avis');
    expect(cibleDuLien('/medecin/secretaires')).toBe('/medecin/secretaires');
    expect(cibleDuLien('/medecin/candidature')).toBe('/medecin/candidature');
    expect(cibleDuLien('/admin/candidatures')).toBe('/admin/candidatures');
    expect(cibleDuLien('/admin/demandes')).toBe('/admin/demandes');
    expect(cibleDuLien('/admin/avis')).toBe('/admin/avis');
    expect(cibleDuLien('/admin')).toBeNull();
    expect(cibleDuLien('/admin/inconnu')).toBeNull();
    expect(cibleDuLien('/secretaire')).toBe('/secretaire');
    expect(cibleDuLien('/invitations')).toBe('/invitations');
    expect(cibleDuLien('/medecin')).toBeNull();
    expect(cibleDuLien('/medecin/inconnu')).toBeNull();
    expect(cibleDuLien('/secretaire/x')).toBeNull();
  });

  it('« /teleconsultations » n\'est suivi que si la visio est ouverte', () => {
    expect(cibleDuLien('/teleconsultations')).toBe(VISIO_ACTIVE ? '/teleconsultations' : null);
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
