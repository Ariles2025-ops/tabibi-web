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

/** Vrai si le statut vaut `valeur` (ex. 'ANNULEE'), sans tenir compte de la casse ni des espaces, comme l'appli. */
export function estStatutOrdonnance(statut: string | null | undefined, valeur: string): boolean {
  return (statut ?? '').trim().toUpperCase() === valeur;
}

/** Motif d'annulation nettoye (espaces retires) ; chaine vide s'il est absent ou blanc, comme `infoStatutOrdonnance` de l'appli. */
export function motifAnnulationPropre(motif: string | null | undefined): string {
  return (motif ?? '').trim();
}

/**
 * « Annulée par le médecin » suivi du motif s'il y en a un, comme `infoStatutOrdonnance` de l'appli (ordonnances.dart) :
 * « Annulée par le médecin : motif » / « ألغاها الطبيب: motif » ; jamais de « : » orphelin pour un motif vide.
 */
export function infoAnnulationOrdonnance(motif: string | null | undefined, arabe: boolean): string {
  const m = motifAnnulationPropre(motif);
  const base = arabe ? 'ألغاها الطبيب' : 'Annulée par le médecin';
  if (!m) return base;
  return arabe ? `${base}: ${m}` : `${base} : ${m}`;
}
