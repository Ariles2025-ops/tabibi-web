import { ClesTraduction } from '../i18n/fr';
import { Traducteur, traduireFr } from '../i18n/traducteur';

/** Cles de traduction des statuts d'ordonnance connus ; un statut inconnu est affiche tel quel. */
const CLES_STATUT_ORDONNANCE: Partial<Record<string, ClesTraduction>> = {
  EMISE: 'statut.ordonnance.EMISE',
  DELIVREE: 'statut.ordonnance.DELIVREE',
  ANNULEE: 'statut.ordonnance.ANNULEE',
  EXPIREE: 'statut.ordonnance.EXPIREE',
};

/** Libelle du statut dans la langue de `t` (francais par defaut). */
export function libelleStatutOrdonnance(statut: string | null | undefined, t: Traducteur = traduireFr): string {
  if (!statut) return '';
  const cle = CLES_STATUT_ORDONNANCE[statut];
  return cle ? t(cle) : statut;
}
