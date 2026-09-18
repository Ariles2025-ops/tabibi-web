/** Libelles francais des statuts d'ordonnance connus ; un statut inconnu est affiche tel quel. */
const LIBELLES_STATUT_ORDONNANCE: Partial<Record<string, string>> = {
  EMISE: 'Émise',
  DELIVREE: 'Délivrée',
  ANNULEE: 'Annulée',
  EXPIREE: 'Expirée',
};

export function libelleStatutOrdonnance(statut: string | null | undefined): string {
  if (!statut) return '';
  return LIBELLES_STATUT_ORDONNANCE[statut] ?? statut;
}
