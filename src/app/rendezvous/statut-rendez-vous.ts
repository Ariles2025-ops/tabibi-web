import { ClesTraduction } from '../i18n/fr';
import { Traducteur, traduireFr } from '../i18n/traducteur';

/** Cles de traduction des statuts de rendez-vous connus ; un statut inconnu est affiche tel quel. */
const CLES_STATUT_RENDEZ_VOUS: Partial<Record<string, ClesTraduction>> = {
  CONFIRME: 'statut.rendezVous.CONFIRME',
  RESERVE: 'statut.rendezVous.RESERVE',
  HONORE: 'statut.rendezVous.HONORE',
  ANNULE: 'statut.rendezVous.ANNULE',
};

/** Libelle du statut dans la langue de `t` (francais par defaut). */
export function libelleStatutRendezVous(statut: string, t: Traducteur = traduireFr): string {
  const cle = CLES_STATUT_RENDEZ_VOUS[statut];
  return cle ? t(cle) : statut;
}
