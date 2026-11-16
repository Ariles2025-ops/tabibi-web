/**
 * Libelles francais des statuts de rendez-vous, identiques a ceux de l'appli mobile (libelles.dart) :
 * RESERVE est affiche « Confirmé » comme CONFIRME (meme etat pour le patient).
 */
const LIBELLES_STATUT_RENDEZ_VOUS: Partial<Record<string, string>> = {
  CONFIRME: 'Confirmé',
  RESERVE: 'Confirmé',
  HONORE: 'Honoré',
  ANNULE: 'Annulé',
  ANNULEE: 'Annulée',
  ABSENT: 'Absent',
  EN_ATTENTE: 'En attente',
};

/** « EN_COURS » -> « En cours » : un statut inconnu reste lisible (meme regle que l'appli). */
function humaniser(statut: string): string {
  const s = statut.replace(/_/g, ' ').toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

export function libelleStatutRendezVous(statut: string): string {
  const brut = (statut ?? '').trim().toUpperCase();
  return LIBELLES_STATUT_RENDEZ_VOUS[brut] ?? humaniser(brut);
}

/** Vrai pour un rendez-vous annule (ANNULE, ANNULEE...), comme `startsWith('ANNUL')` dans l'appli. */
export function estAnnule(statut: string): boolean {
  return (statut ?? '').toUpperCase().startsWith('ANNUL');
}
