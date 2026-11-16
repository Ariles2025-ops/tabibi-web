import { RendezVous } from '../rendezvous/rendezvous.service';
import { estConfirme, peutHonorer, peutMarquerAbsent, peutProposerTeleconsultation } from './agenda-utils';

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
