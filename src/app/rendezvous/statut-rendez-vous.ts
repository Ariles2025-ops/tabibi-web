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

/** Statut normalise (espaces retires, majuscules), comme `_brut` de l'appli (rendez_vous.dart). */
function brut(statut: string | null | undefined): string {
  return (statut ?? '').trim().toUpperCase();
}

/** Vrai pour HONORE (consultation effectuee), sans tenir compte de la casse. */
export function estHonore(statut: string | null | undefined): boolean {
  return brut(statut) === 'HONORE';
}

/** Vrai pour ABSENT, sans tenir compte de la casse. */
export function estAbsent(statut: string | null | undefined): boolean {
  return brut(statut) === 'ABSENT';
}

/** Vrai pour CONFIRME ou RESERVE (meme etat pour le patient), comme `estConfirme` de l'appli. */
export function estConfirme(statut: string | null | undefined): boolean {
  const b = brut(statut);
  return b === 'CONFIRME' || b === 'RESERVE';
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
