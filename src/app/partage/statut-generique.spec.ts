import { libelleStatutAvis } from '../avis/avis.service';
import { libelleStatutBesoin } from '../dawini/dawini.service';
import { libelleStatutOrdonnanceAr, libelleStatutOrdonnance } from '../ordonnances/statut-ordonnance';
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
  it('traduit les statuts connus, y compris ceux absents de la table propre a un ecran', () => {
    expect(libelleStatutGeneriqueAr('RESERVE')).toBe('مؤكد');
    expect(libelleStatutGeneriqueAr('demarree')).toBe('بدأت');
    expect(libelleStatutGeneriqueAr('EMISE')).toBe('صادرة');
  });

  it('un statut inconnu garde la mise en forme francaise ; absent : chaine vide', () => {
    expect(libelleStatutGeneriqueAr('EN_REVISION')).toBe('En revision');
    expect(libelleStatutGeneriqueAr(null)).toBe('');
  });

  it('sert de secours aux libelles arabes de chaque ecran (plus de francais dans un ecran arabe)', () => {
    expect(libelleStatutOrdonnanceAr('VALIDEE')).toBe('مُعتمدة');
    expect(libelleStatutBesoin('EN_COURS', true)).toBe('جارية');
    expect(libelleStatutBesoin('EN_COURS')).toBe('En cours');
  });
});
