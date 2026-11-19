import { libelleStatutAvis } from '../avis/avis.service';
import { libelleStatutBesoin } from '../dawini/dawini.service';
import { libelleStatutOrdonnance } from '../ordonnances/statut-ordonnance';
import { libelleStatutRendezVousAr } from '../rendezvous/statut-rendez-vous';
import { libelleStatutOrdonnanceAr } from '../ordonnances/statut-ordonnance';
import { libelleStatutTeleconsultationAr } from '../teleconsultation/statut-teleconsultation';
import { libelleStatutCandidatureAr } from '../admin/admin.service';
import { libelleStatutGenerique, libelleStatutGeneriqueAr } from './statut-generique';

describe('libelleStatutGenerique (meme regle que libelles.dart de l\'appli)', () => {
  it('accentue les statuts connus et rend RESERVE « Confirmé »', () => {
    expect(libelleStatutGenerique('RESERVE')).toBe('Confirmé');
    expect(libelleStatutGenerique('expiree')).toBe('Expirée');
    expect(libelleStatutGenerique('DEMARREE')).toBe('Démarrée');
  });

  it('humanise un statut inconnu et ne renvoie rien pour un statut absent', () => {
    expect(libelleStatutGenerique('EN_REVISION')).toBe('En revision');
    expect(libelleStatutGenerique(null)).toBe('');
    expect(libelleStatutGenerique('  ')).toBe('');
  });

  it('sert de secours aux libelles propres a chaque ecran', () => {
    expect(libelleStatutOrdonnance('EXPIREE')).toBe('Expirée');
    expect(libelleStatutBesoin('EN_COURS')).toBe('En cours');
    expect(libelleStatutAvis('EMISE')).toBe('Émise');
  });
});

describe('libelleStatutGeneriqueAr (meme table que libelles.dart de l\'appli)', () => {
  it('traduit les statuts connus, RESERVE comme CONFIRME', () => {
    expect(libelleStatutGeneriqueAr('RESERVE')).toBe('مؤكد');
    expect(libelleStatutGeneriqueAr('expiree')).toBe('منتهية الصلاحية');
    expect(libelleStatutGeneriqueAr('DEMARREE')).toBe('بدأت');
  });

  it('garde la forme francaise pour un statut inconnu et rien pour un statut absent', () => {
    expect(libelleStatutGeneriqueAr('EN_REVISION')).toBe('En revision');
    expect(libelleStatutGeneriqueAr(null)).toBe('');
  });

  it('sert de secours arabe aux libelles propres a chaque ecran, sans francais', () => {
    expect(libelleStatutRendezVousAr('REFUSEE')).toBe('مرفوضة');
    expect(libelleStatutOrdonnanceAr('TERMINEE')).toBe('منتهية');
    expect(libelleStatutTeleconsultationAr('DEMARREE')).toBe('بدأت');
    expect(libelleStatutCandidatureAr('EXPIREE')).toBe('منتهية الصلاحية');
    expect(libelleStatutBesoin('EN_COURS', true)).toBe('جارية');
    expect(libelleStatutBesoin('EN_COURS', false)).toBe('En cours');
  });
});
