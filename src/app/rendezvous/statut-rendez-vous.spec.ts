import { estAbsent, estAnnule, estConfirme, estHonore, libelleStatutRendezVous, libelleStatutRendezVousAr } from './statut-rendez-vous';

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

describe('statuts de rendez-vous en arabe (comme libelles.dart de l appli)', () => {
  it('traduit les statuts connus, RESERVE comme CONFIRME', () => {
    expect(libelleStatutRendezVousAr('CONFIRME')).toBe('مؤكد');
    expect(libelleStatutRendezVousAr('RESERVE')).toBe('مؤكد');
    expect(libelleStatutRendezVousAr('ANNULE')).toBe('ملغى');
    expect(libelleStatutRendezVousAr('ANNULEE')).toBe('ملغاة');
    expect(libelleStatutRendezVousAr('HONORE')).toBe('تم الحضور');
    expect(libelleStatutRendezVousAr('ABSENT')).toBe('غائب');
    expect(libelleStatutRendezVousAr('EN_ATTENTE')).toBe('قيد الانتظار');
  });

  it('retombe sur le francais lisible pour un statut inconnu, et rien si vide', () => {
    expect(libelleStatutRendezVousAr('MA_VALEUR')).toBe('Ma valeur');
    expect(libelleStatutRendezVousAr('')).toBe('');
  });
});

describe('prédicats de statut insensibles à la casse (comme rendez_vous.dart de l appli)', () => {
  it('reconnait honoré, absent et confirmé malgré casse et espaces', () => {
    expect(estHonore(' honore ')).toBeTrue();
    expect(estHonore('CONFIRME')).toBeFalse();
    expect(estAbsent('absent')).toBeTrue();
    expect(estConfirme('reserve')).toBeTrue();
    expect(estConfirme('Confirme')).toBeTrue();
    expect(estConfirme('HONORE')).toBeFalse();
    expect(estHonore(null)).toBeFalse();
  });
});
