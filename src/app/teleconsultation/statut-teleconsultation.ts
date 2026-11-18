import { libelleStatutGenerique } from '../partage/statut-generique';

/** Libelles francais des statuts de teleconsultation connus ; un statut inconnu est affiche tel quel. */
const LIBELLES_STATUT_TELECONSULTATION: Partial<Record<string, string>> = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

export function libelleStatutTeleconsultation(statut: string | null | undefined): string {
  if (!statut) return '';
  return LIBELLES_STATUT_TELECONSULTATION[statut.trim().toUpperCase()] ?? libelleStatutGenerique(statut);
}

/** Libelles arabes des statuts de teleconsultation, identiques a ceux de l'appli ; un statut inconnu reste en francais. */
const LIBELLES_STATUT_TELECONSULTATION_AR: Partial<Record<string, string>> = {
  PLANIFIEE: 'مبرمجة',
  EN_COURS: 'جارية',
  TERMINEE: 'منتهية',
  ANNULEE: 'ملغاة',
};

export function libelleStatutTeleconsultationAr(statut: string | null | undefined): string {
  if (!statut) return '';
  return LIBELLES_STATUT_TELECONSULTATION_AR[statut.trim().toUpperCase()] ?? libelleStatutTeleconsultation(statut);
}
