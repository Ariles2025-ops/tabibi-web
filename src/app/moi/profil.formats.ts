import { Traducteur, traduireFr } from '../i18n/traducteur';

/**
 * Regles, nettoyage et validation du profil, sans dependance Angular : importes tels quels par les tests du
 * projet `logique`. `ProfilService` les reexporte, les imports existants ne changent pas.
 */

/** Donnees d'enregistrement du profil (PUT /api/moi/profil) ; seul le nom complet est obligatoire. */
export interface DemandeProfil {
  nomComplet: string;
  telephone: string | null;
  dateNaissance: string | null;
  wilayaCode: string | null;
  langue: string;
}

/** Regles du domaine backend (Profil.java), reprises pour la validation cote client. */
export const LONGUEUR_MIN_NOM = 2;
export const LONGUEUR_MAX_NOM = 120;
export const LONGUEUR_MAX_WILAYA = 4;
export const ANNEE_NAISSANCE_MIN = 1900;
export const LANGUE_PAR_DEFAUT = 'fr';

/** Langues de l'interface, dans l'ordre de la liste deroulante ; le libelle est celui de la langue elle-meme. */
export const LANGUES: ReadonlyArray<{ code: string; libelle: string }> = [
  { code: 'fr', libelle: 'Français' },
  { code: 'ar', libelle: 'العربية' },
  { code: 'kab', libelle: 'Taqbaylit' },
  { code: 'en', libelle: 'English' },
];

/** Numero algerien, mobile ou fixe : 9 a 10 chiffres commencant par 0, une fois les espaces retires. */
const TELEPHONE = /^0[0-9]{8,9}$/;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function libelleLangue(code: string | null | undefined): string {
  if (!code) return '';
  return LANGUES.find((l) => l.code === code)?.libelle ?? code;
}

/** « 2026-09-19 » pour la date locale du navigateur (le champ date et la comparaison travaillent sur ce format). */
export function dateLocaleIso(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/**
 * Nettoie les champs saisis (espaces retires, telephone sans espaces, facultatifs vides → null) pour l'envoi ;
 * la langue vide vaut fr, comme cote API.
 */
export function nettoyerProfil(saisie: DemandeProfil): DemandeProfil {
  const facultatif = (valeur: string | null) => {
    const v = (valeur ?? '').trim();
    return v ? v : null;
  };
  const telephone = (saisie.telephone ?? '').replace(/\s+/g, '');
  return {
    nomComplet: saisie.nomComplet.trim(),
    telephone: telephone ? telephone : null,
    dateNaissance: facultatif(saisie.dateNaissance),
    wilayaCode: facultatif(saisie.wilayaCode),
    langue: (saisie.langue ?? '').trim().toLowerCase() || LANGUE_PAR_DEFAUT,
  };
}

/**
 * Validation cote client d'une demande deja nettoyee, coherente avec le backend (400 sinon) : renvoie le premier
 * motif dans la langue de `t` (francais par defaut), ou null si tout est correct. `aujourdHui` est la date locale
 * (injectable pour les tests).
 */
export function validerProfil(demande: DemandeProfil, aujourdHui: Date = new Date(), t: Traducteur = traduireFr): string | null {
  if (demande.nomComplet.length < LONGUEUR_MIN_NOM || demande.nomComplet.length > LONGUEUR_MAX_NOM) {
    return t('profil.nomLongueur', { min: LONGUEUR_MIN_NOM, max: LONGUEUR_MAX_NOM });
  }
  if (demande.telephone !== null && !TELEPHONE.test(demande.telephone)) {
    return t('profil.telephoneInvalide');
  }
  if (demande.dateNaissance !== null) {
    if (!DATE_ISO.test(demande.dateNaissance) || Number.isNaN(Date.parse(demande.dateNaissance))) {
      return t('profil.dateInvalide');
    }
    if (demande.dateNaissance >= dateLocaleIso(aujourdHui)) {
      return t('profil.datePassee');
    }
    if (Number(demande.dateNaissance.slice(0, 4)) <= ANNEE_NAISSANCE_MIN) {
      return t('profil.dateApres', { annee: ANNEE_NAISSANCE_MIN });
    }
  }
  if (demande.wilayaCode !== null && demande.wilayaCode.length > LONGUEUR_MAX_WILAYA) {
    return t('profil.wilayaTropLongue', { max: LONGUEUR_MAX_WILAYA });
  }
  if (!LANGUES.some((l) => l.code === demande.langue)) {
    return t('profil.langueInvalide', { langues: LANGUES.map((l) => l.code).join(', ') });
  }
  return null;
}
