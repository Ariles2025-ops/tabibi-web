import { libelleStatutGenerique, libelleStatutGeneriqueAr } from '../partage/statut-generique';

/** Libelles francais des statuts d'ordonnance connus ; un statut inconnu est affiche tel quel. */
const LIBELLES_STATUT_ORDONNANCE: Partial<Record<string, string>> = {
  EMISE: 'Émise',
  DELIVREE: 'Délivrée',
  ANNULEE: 'Annulée',
  EXPIREE: 'Expirée',
};

export function libelleStatutOrdonnance(statut: string | null | undefined): string {
  if (!statut) return '';
  return LIBELLES_STATUT_ORDONNANCE[statut.trim().toUpperCase()] ?? libelleStatutGenerique(statut);
}

/** Libelles arabes des statuts d'ordonnance connus (page /ar/verifier) ; un statut inconnu est affiche tel quel. */
const LIBELLES_STATUT_ORDONNANCE_AR: Partial<Record<string, string>> = {
  EMISE: 'صادرة',
  DELIVREE: 'مُسلَّمة',
  ANNULEE: 'ملغاة',
  EXPIREE: 'منتهية الصلاحية',
};

export function libelleStatutOrdonnanceAr(statut: string | null | undefined): string {
  if (!statut) return '';
  return LIBELLES_STATUT_ORDONNANCE_AR[statut.trim().toUpperCase()] ?? libelleStatutGeneriqueAr(statut);
}
