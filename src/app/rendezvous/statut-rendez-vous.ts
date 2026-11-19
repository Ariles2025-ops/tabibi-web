import { libelleStatutGenerique, libelleStatutGeneriqueAr } from '../partage/statut-generique';

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

export function libelleStatutRendezVous(statut: string): string {
  const brut = (statut ?? '').trim().toUpperCase();
  return LIBELLES_STATUT_RENDEZ_VOUS[brut] ?? libelleStatutGenerique(brut);
}

/** Vrai pour un rendez-vous annule (ANNULE, ANNULEE...), comme `startsWith('ANNUL')` dans l'appli. */
export function estAnnule(statut: string): boolean {
  return (statut ?? '').toUpperCase().startsWith('ANNUL');
}

/** Libelles arabes, identiques a ceux de l'appli mobile (libelles.dart). */
const LIBELLES_STATUT_RENDEZ_VOUS_AR: Partial<Record<string, string>> = {
  CONFIRME: 'مؤكد',
  RESERVE: 'مؤكد',
  ANNULE: 'ملغى',
  ANNULEE: 'ملغاة',
  HONORE: 'تم الحضور',
  ABSENT: 'غائب',
  EN_ATTENTE: 'قيد الانتظار',
  EN_COURS: 'جارية',
  TERMINEE: 'منتهية',
};

/** Libelle arabe d'un statut de rendez-vous ; un statut sans traduction retombe sur le libelle francais. */
export function libelleStatutRendezVousAr(statut: string): string {
  const brut = (statut ?? '').trim().toUpperCase();
  return LIBELLES_STATUT_RENDEZ_VOUS_AR[brut] ?? libelleStatutGeneriqueAr(brut);
}
