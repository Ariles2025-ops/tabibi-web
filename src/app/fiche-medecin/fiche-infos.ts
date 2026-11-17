/** Informations modifiables par le medecin sur sa fiche publique (GET / PUT /api/medecin/fiche). */
export interface FicheInfos {
  adresse?: string | null;
  telephoneCabinet?: string | null;
  horaires?: string | null;
  presentation?: string | null;
  langues?: string[] | null;
}

export const ADRESSE_MAX = 200;
export const HORAIRES_MAX = 300;
export const PRESENTATION_MAX = 600;

/** Langues proposees (codes de l'API) avec leur libelle francais et arabe. */
export const LANGUES_FICHE: { code: string; fr: string; ar: string }[] = [
  { code: 'fr', fr: 'Français', ar: 'الفرنسية' },
  { code: 'ar', fr: 'Arabe', ar: 'العربية' },
  { code: 'en', fr: 'Anglais', ar: 'الإنجليزية' },
  { code: 'tamazight', fr: 'Tamazight', ar: 'الأمازيغية' },
];

export function libelleLangue(code: string, arabe: boolean): string {
  const l = LANGUES_FICHE.find((x) => x.code === code);
  return l ? (arabe ? l.ar : l.fr) : code;
}

/** Telephone algerien : 0XX XX XX XX(X) ou +213 / 00213 suivi de 8 ou 9 chiffres (espaces, points et tirets tolerés). */
export function telephoneAlgerienValide(valeur: string): boolean {
  const v = valeur.replace(/[\s.\-]/g, '');
  return /^(\+213|00213|0)[1-9]\d{7,8}$/.test(v);
}

/** Au moins une information renseignee a afficher sur la fiche publique ? */
export function aDesInfos(m: FicheInfos): boolean {
  return !!(m.adresse?.trim() || m.telephoneCabinet?.trim() || m.horaires?.trim() || m.presentation?.trim() || m.langues?.length);
}
