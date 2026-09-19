import { ClesTraduction } from '../i18n/fr';
import { Traducteur, traduireFr } from '../i18n/traducteur';

/** Cles de traduction des statuts de teleconsultation connus ; un statut inconnu est affiche tel quel. */
const CLES_STATUT_TELECONSULTATION: Partial<Record<string, ClesTraduction>> = {
  PLANIFIEE: 'statut.teleconsultation.PLANIFIEE',
  EN_COURS: 'statut.teleconsultation.EN_COURS',
  TERMINEE: 'statut.teleconsultation.TERMINEE',
  ANNULEE: 'statut.teleconsultation.ANNULEE',
};

/** Libelle du statut dans la langue de `t` (francais par defaut). */
export function libelleStatutTeleconsultation(statut: string | null | undefined, t: Traducteur = traduireFr): string {
  if (!statut) return '';
  const cle = CLES_STATUT_TELECONSULTATION[statut];
  return cle ? t(cle) : statut;
}
