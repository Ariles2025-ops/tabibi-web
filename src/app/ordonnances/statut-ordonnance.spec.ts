import { libelleStatutOrdonnance } from './statut-ordonnance';

describe('libelleStatutOrdonnance', () => {
  it('traduit les statuts connus, sans tenir compte de la casse ni des espaces', () => {
    expect(libelleStatutOrdonnance('EMISE')).toBe('Émise');
    expect(libelleStatutOrdonnance(' delivree ')).toBe('Délivrée');
    expect(libelleStatutOrdonnance('annulee')).toBe('Annulée');
  });

  it('rend rien pour un statut absent', () => {
    expect(libelleStatutOrdonnance(null)).toBe('');
  });
});
