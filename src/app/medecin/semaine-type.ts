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

/** « موعد » accorde avec le nombre : singulier, duel, pluriel (3 a 10), puis accusatif singulier (11 et plus). */
function motArabe(n: number, cas: 'nominatif' | 'accusatif'): string {
  if (n === 1) return 'موعد واحد';
  if (n === 2) return cas === 'nominatif' ? 'موعدان' : 'موعدين';
  if (n >= 3 && n <= 10) return n + ' مواعيد';
  return n + ' موعدًا';
}

/** Message de resultat : crees, ignores et la raison des ignores (horaire passe ou creneau deja ouvert). */
export function messageSemaineType(r: ResultatSemaineType, ar: boolean): string {
  if (ar) {
    const crees = r.crees === 0 ? 'لم يُنشأ أي موعد' : 'تم إنشاء ' + motArabe(r.crees, 'accusatif');
    if (r.ignores === 0) return crees + '.';
    return crees + '؛ وتم تجاهل ' + motArabe(r.ignores, 'accusatif') + ' (الوقت مضى أو يوجد موعد مفتوح في الوقت نفسه).';
  }
  const crees = r.crees + (r.crees > 1 ? ' créneaux créés' : ' créneau créé');
  if (r.ignores === 0) return crees + '.';
  return crees + ' ; ' + r.ignores + (r.ignores > 1 ? ' ignorés' : ' ignoré')
    + ' (horaire déjà passé ou créneau déjà ouvert à ce moment).';
}
