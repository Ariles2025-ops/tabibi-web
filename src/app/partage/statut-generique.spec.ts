import { libelleStatutAvis } from '../avis/avis.service';
import { libelleStatutBesoin } from '../dawini/dawini.service';
import { libelleStatutOrdonnance } from '../ordonnances/statut-ordonnance';
import { libelleStatutGenerique } from './statut-generique';

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
