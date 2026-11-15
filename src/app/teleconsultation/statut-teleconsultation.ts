/** Libelles francais des statuts de teleconsultation connus ; un statut inconnu est affiche tel quel. */
const LIBELLES_STATUT_TELECONSULTATION: Partial<Record<string, string>> = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

export function libelleStatutTeleconsultation(statut: string | null | undefined): string {
  if (!statut) return '';
  return LIBELLES_STATUT_TELECONSULTATION[statut] ?? statut;
}
