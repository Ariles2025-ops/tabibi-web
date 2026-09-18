/** Libelles francais des statuts de rendez-vous connus ; un statut inconnu est affiche tel quel. */
const LIBELLES_STATUT_RENDEZ_VOUS: Partial<Record<string, string>> = {
  CONFIRME: 'Confirmé',
  RESERVE: 'Réservé',
  HONORE: 'Honoré',
  ANNULE: 'Annulé',
};

export function libelleStatutRendezVous(statut: string): string {
  return LIBELLES_STATUT_RENDEZ_VOUS[statut] ?? statut;
}
