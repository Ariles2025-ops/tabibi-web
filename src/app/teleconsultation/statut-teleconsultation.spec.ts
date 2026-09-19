import { libelleStatutTeleconsultation } from './statut-teleconsultation';

describe('libelleStatutTeleconsultation', () => {
  it('traduit les statuts connus en francais', () => {
    expect(libelleStatutTeleconsultation('PLANIFIEE')).toBe('Planifiée');
    expect(libelleStatutTeleconsultation('EN_COURS')).toBe('En cours');
    expect(libelleStatutTeleconsultation('TERMINEE')).toBe('Terminée');
    expect(libelleStatutTeleconsultation('ANNULEE')).toBe('Annulée');
  });

  it('affiche tel quel un statut inconnu et rien pour un statut absent', () => {
    expect(libelleStatutTeleconsultation('REPORTEE')).toBe('REPORTEE');
    expect(libelleStatutTeleconsultation(null)).toBe('');
    expect(libelleStatutTeleconsultation(undefined)).toBe('');
  });
});
