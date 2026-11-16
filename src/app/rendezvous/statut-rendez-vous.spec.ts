import { libelleStatutRendezVous } from './statut-rendez-vous';

describe('libelleStatutRendezVous', () => {
  it('affiche RESERVE comme CONFIRME (meme libelle que l appli)', () => {
    expect(libelleStatutRendezVous('RESERVE')).toBe('Confirmé');
    expect(libelleStatutRendezVous('CONFIRME')).toBe('Confirmé');
  });

  it('garde les autres libelles', () => {
    expect(libelleStatutRendezVous('HONORE')).toBe('Honoré');
    expect(libelleStatutRendezVous('ANNULE')).toBe('Annulé');
    expect(libelleStatutRendezVous('ABSENT')).toBe('Absent');
  });
});
