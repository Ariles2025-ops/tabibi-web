import { ClesTraduction } from '../i18n/fr';
import { Traducteur, traduireFr } from '../i18n/traducteur';

/**
 * Libelles et formats de Dawini, sans dependance Angular : importes tels quels par les tests du projet `logique`.
 * `DawiniService` les reexporte, les imports existants ne changent pas.
 */

/** Cles de traduction des statuts de besoin connus ; un statut inconnu est affiche tel quel. */
const CLES_STATUT_BESOIN: Partial<Record<string, ClesTraduction>> = {
  OUVERT: 'statut.besoin.OUVERT',
  CLOTURE: 'statut.besoin.CLOTURE',
};

/** Libelle du statut dans la langue de `t` (francais par defaut). */
export function libelleStatutBesoin(statut: string | null | undefined, t: Traducteur = traduireFr): string {
  if (!statut) return '';
  const cle = CLES_STATUT_BESOIN[statut];
  return cle ? t(cle) : statut;
}

/**
 * « 850 DA », « 1 250 DA » (milliers separes par une espace ; « دج » en arabe) ; chaine vide si le prix n'est pas
 * renseigne.
 */
export function formaterPrix(prixDa: number | null | undefined, t: Traducteur = traduireFr): string {
  if (prixDa === null || prixDa === undefined) return '';
  return t('dawini.prix', { prix: Math.trunc(prixDa).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') });
}

/** « 0 réponse », « 1 réponse », « 3 réponses », dans la langue de `t`. */
export function libelleReponses(nombre: number, t: Traducteur = traduireFr): string {
  return t(nombre > 1 ? 'dawini.plusieursReponses' : 'dawini.uneReponse', { n: nombre });
}
