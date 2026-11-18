import { RendezVous } from '../rendezvous/rendezvous.service';
import { cleJour, instantAlger, valeurDateHeureLocale, estConfirme, peutHonorer, peutMarquerAbsent, peutProposerTeleconsultation } from './agenda-utils';

/** Statut RESERVE (reservation du patient) traite comme CONFIRME : les boutons restent visibles. */
describe('agenda-utils : RESERVE traite comme CONFIRME', () => {
  const maintenant = Date.parse('2026-11-16T10:00:00Z');
  const rdv = (statut: string, debut: string): RendezVous =>
    ({ id: 'r', patientId: 'p', medecinId: 'm', creneauId: 'c', statut, debut });

  it('reconnait CONFIRME et RESERVE, pas ANNULE / HONORE / ABSENT', () => {
    expect(estConfirme({ statut: 'CONFIRME' })).toBeTrue();
    expect(estConfirme({ statut: 'RESERVE' })).toBeTrue();
    for (const s of ['ANNULE', 'HONORE', 'ABSENT']) expect(estConfirme({ statut: s })).withContext(s).toBeFalse();
  });

  it('propose honorer / absent sur un RESERVE commence, et la visio sur un RESERVE a venir', () => {
    const passe = rdv('RESERVE', '2026-11-16T09:00:00Z');
    const futur = rdv('RESERVE', '2026-11-17T09:00:00Z');
    expect(peutHonorer(passe, maintenant)).toBeTrue();
    expect(peutMarquerAbsent(passe, maintenant)).toBeTrue();
    expect(peutProposerTeleconsultation(futur, maintenant)).toBeTrue();
    expect(peutHonorer(rdv('ANNULE', '2026-11-16T09:00:00Z'), maintenant)).toBeFalse();
  });
});

describe('agenda-utils : heure d\'Algérie indépendante du fuseau du navigateur', () => {
  it('09:00 saisi → 08:00Z', () => {
    expect(new Date(instantAlger('2026-07-15', '09:00')).toISOString()).toBe('2026-07-15T08:00:00.000Z');
    expect(new Date(instantAlger('2026-01-15', '09:00:00')).toISOString()).toBe('2026-01-15T08:00:00.000Z');
  });

  it('saisie invalide → NaN', () => {
    expect(Number.isNaN(instantAlger('', '09:00'))).toBeTrue();
    expect(Number.isNaN(instantAlger('2026-07-15', ''))).toBeTrue();
  });

  it('cleJour range 00:30 Algérie (23:30Z la veille) sous le bon jour et 21:00 sous la même date', () => {
    expect(cleJour('2026-07-14T23:30:00Z')).toBe('2026-07-15');
    expect(cleJour('2026-07-15T20:00:00Z')).toBe('2026-07-15');
    expect(cleJour('2026-07-15T23:00:00Z')).toBe('2026-07-16');
  });

  it('valeurDateHeureLocale affiche l\'heure d\'Algérie', () => {
    expect(valeurDateHeureLocale(new Date('2026-07-15T08:00:00Z'))).toBe('2026-07-15T09:00');
  });
});
