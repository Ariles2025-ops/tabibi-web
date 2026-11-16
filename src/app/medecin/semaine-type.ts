/** Jours de la semaine tels que l'API les attend, dimanche d'abord (semaine algerienne). */
export const JOURS_SEMAINE: { code: string; fr: string; ar: string }[] = [
  { code: 'DIMANCHE', fr: 'Dimanche', ar: 'الأحد' },
  { code: 'LUNDI', fr: 'Lundi', ar: 'الاثنين' },
  { code: 'MARDI', fr: 'Mardi', ar: 'الثلاثاء' },
  { code: 'MERCREDI', fr: 'Mercredi', ar: 'الأربعاء' },
  { code: 'JEUDI', fr: 'Jeudi', ar: 'الخميس' },
  { code: 'VENDREDI', fr: 'Vendredi', ar: 'الجمعة' },
  { code: 'SAMEDI', fr: 'Samedi', ar: 'السبت' },
];

/** Corps de POST .../creneaux/semaine-type (fuseau Africa/Algiers, cote API). */
export interface SemaineType {
  jours: string[];
  debut: string;
  fin: string;
  dureeMinutes: number;
  aPartirDu: string;
  nombreSemaines: number;
}

/** Reponse : creneaux crees et creneaux ignores (chevauchement d'un creneau existant). */
export interface ResultatSemaineType {
  crees: number;
  ignores: number;
}

export const SEMAINES_MAX = 8;

/** Corps de POST /api/secretaire/medecins/{id}/rendezvous (rendez-vous pris au telephone). */
export interface RdvTelephone {
  creneauId: string;
  nomPatient: string;
  telephonePatient: string;
  motif?: string;
}
