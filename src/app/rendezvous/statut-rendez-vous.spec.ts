import { estAnnule, libelleStatutRendezVous } from './statut-rendez-vous';

describe('statuts de rendez-vous (vocabulaire commun site / appli)', () => {
  it('affiche Confirmé, Annulé, Honoré, Absent', () => {
    expect(libelleStatutRendezVous('CONFIRME')).toBe('Confirmé');
    expect(libelleStatutRendezVous('ANNULE')).toBe('Annulé');
    expect(libelleStatutRendezVous('HONORE')).toBe('Honoré');
    expect(libelleStatutRendezVous('ABSENT')).toBe('Absent');
  });

  it('affiche RESERVE comme Confirmé', () => {
    expect(libelleStatutRendezVous('RESERVE')).toBe('Confirmé');
  });

  it('garde les autres libelles', () => {
    expect(libelleStatutRendezVous('HONORE')).toBe('Honoré');
    expect(libelleStatutRendezVous('ANNULE')).toBe('Annulé');
    expect(libelleStatutRendezVous('ABSENT')).toBe('Absent');
  });

  it('rend un statut inconnu lisible', () => {
    expect(libelleStatutRendezVous('EN_COURS')).toBe('En cours');
    expect(libelleStatutRendezVous('')).toBe('');
  });

  it('reconnait ANNULE et ANNULEE comme annules', () => {
    expect(estAnnule('ANNULE')).toBeTrue();
    expect(estAnnule('ANNULEE')).toBeTrue();
    expect(estAnnule('CONFIRME')).toBeFalse();
  });
});
