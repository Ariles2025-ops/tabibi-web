import { ClesTraduction } from '../i18n/fr';
import { Traducteur, traduireFr } from '../i18n/traducteur';

/**
 * Bornes et libelles des avis, sans dependance Angular : importes tels quels par les tests du projet `logique`.
 * `AvisService` les reexporte, les imports existants ne changent pas.
 */

/** Bornes de la note et du commentaire, identiques aux regles du domaine backend (400 au-dela). */
export const NOTE_MIN = 1;
export const NOTE_MAX = 5;
export const LONGUEUR_MAX_COMMENTAIRE = 500;

/** Cles de traduction des statuts d'avis connus ; un statut inconnu est affiche tel quel. */
const CLES_STATUT_AVIS: Partial<Record<string, ClesTraduction>> = {
  PUBLIE: 'statut.avis.PUBLIE',
  SIGNALE: 'statut.avis.SIGNALE',
  MASQUE: 'statut.avis.MASQUE',
};

/** Libelle du statut dans la langue de `t` (francais par defaut). */
export function libelleStatutAvis(statut: string | null | undefined, t: Traducteur = traduireFr): string {
  if (!statut) return '';
  const cle = CLES_STATUT_AVIS[statut];
  return cle ? t(cle) : statut;
}

/**
 * « 4,5 / 5 (12 avis) » (virgule decimale en francais, point ailleurs), ou « Aucun avis pour le moment », dans la
 * langue de `t`.
 */
export function formaterMoyenne(moyenne: number | null, nombre: number, t: Traducteur = traduireFr): string {
  if (moyenne === null || nombre === 0) return t('avis.aucun');
  return t('avis.moyenne', { moyenne: moyenne.toFixed(1).replace('.', t('format.decimale')), nombre });
}
