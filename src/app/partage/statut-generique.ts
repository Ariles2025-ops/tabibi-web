/**
 * Libelles generiques des statuts de l'API, identiques a `libelleStatut` de l'appli mobile (libelles.dart) :
 * un statut absent des listes propres a chaque ecran (rendez-vous, ordonnance, avis...) reste lisible,
 * accentue, sans jamais afficher la valeur brute (« EXPIREE », « EN_COURS »).
 */
const LIBELLES_GENERIQUES: Partial<Record<string, string>> = {
  CONFIRME: 'Confirmé',
  RESERVE: 'Confirmé',
  ANNULE: 'Annulé',
  ANNULEE: 'Annulée',
  HONORE: 'Honoré',
  ABSENT: 'Absent',
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  CLOTURE: 'Clôturé',
  OUVERT: 'Ouvert',
  EXPIREE: 'Expirée',
  DELIVREE: 'Délivrée',
  TERMINEE: 'Terminée',
  PLANIFIEE: 'Planifiée',
  DEMARREE: 'Démarrée',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
  MASQUE: 'Masqué',
  PUBLIE: 'Publié',
  SIGNALE: 'Signalé',
  EMISE: 'Émise',
};

/** « CONFIRME » -> « Confirmé », « MA_VALEUR » -> « Ma valeur » ; chaine vide si le statut est absent. */
export function libelleStatutGenerique(statut: string | null | undefined): string {
  const brut = (statut ?? '').trim().toUpperCase();
  if (!brut) return '';
  const connu = LIBELLES_GENERIQUES[brut];
  if (connu) return connu;
  const s = brut.replace(/_/g, ' ').toLowerCase();
  return s[0].toUpperCase() + s.slice(1);
}

/** Memes statuts en arabe, identiques a `_statuts` de libelles.dart de l'appli mobile. */
const LIBELLES_GENERIQUES_AR: Partial<Record<string, string>> = {
  CONFIRME: 'مؤكد',
  RESERVE: 'مؤكد',
  ANNULE: 'ملغى',
  ANNULEE: 'ملغاة',
  HONORE: 'تم الحضور',
  ABSENT: 'غائب',
  EN_ATTENTE: 'قيد الانتظار',
  EN_COURS: 'جارية',
  CLOTURE: 'مغلق',
  OUVERT: 'مفتوح',
  EXPIREE: 'منتهية الصلاحية',
  DELIVREE: 'مُسلَّمة',
  TERMINEE: 'منتهية',
  PLANIFIEE: 'مبرمجة',
  DEMARREE: 'بدأت',
  VALIDEE: 'مُعتمدة',
  REFUSEE: 'مرفوضة',
  MASQUE: 'مخفي',
  PUBLIE: 'منشور',
  SIGNALE: 'مُبلَّغ عنه',
  EMISE: 'صادرة',
};

/** Libelle arabe d'un statut de l'API ; un statut hors liste garde la mise en forme francaise (comme l'appli). */
export function libelleStatutGeneriqueAr(statut: string | null | undefined): string {
  const brut = (statut ?? '').trim().toUpperCase();
  return LIBELLES_GENERIQUES_AR[brut] ?? libelleStatutGenerique(statut);
}
