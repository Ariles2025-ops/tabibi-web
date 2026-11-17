import { libelleStatutTeleconsultation } from './statut-teleconsultation';

describe('libelleStatutTeleconsultation', () => {
  it('traduit les statuts connus en francais', () => {
    expect(libelleStatutTeleconsultation('PLANIFIEE')).toBe('Planifiée');
    expect(libelleStatutTeleconsultation('EN_COURS')).toBe('En cours');
    expect(libelleStatutTeleconsultation('TERMINEE')).toBe('Terminée');
    expect(libelleStatutTeleconsultation('ANNULEE')).toBe('Annulée');
  });

  it('rend un statut inconnu lisible et rien pour un statut absent', () => {
    expect(libelleStatutTeleconsultation('REPORTEE')).toBe('Reportee');
    expect(libelleStatutTeleconsultation(null)).toBe('');
    expect(libelleStatutTeleconsultation(undefined)).toBe('');
  });
});

describe('libelleStatutTeleconsultation (casse et espaces)', () => {
  it('ignore la casse et les espaces, comme l\'appli mobile', () => {
    expect(libelleStatutTeleconsultation(' en_cours ')).toBe('En cours');
    expect(libelleStatutTeleconsultation('terminee')).toBe('Terminée');
  });
});
