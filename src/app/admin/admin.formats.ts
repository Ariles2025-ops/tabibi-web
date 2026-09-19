import { ClesTraduction } from '../i18n/fr';
import { Traducteur, traduireFr } from '../i18n/traducteur';

/**
 * Libelles de l'administration, sans dependance Angular : importes tels quels par les tests du projet `logique`.
 * `AdminService` les reexporte, les imports existants ne changent pas.
 */

/** Cles de traduction des statuts de candidature connus ; un statut inconnu est affiche tel quel. */
const CLES_STATUT_CANDIDATURE: Partial<Record<string, ClesTraduction>> = {
  EN_ATTENTE: 'statut.candidature.EN_ATTENTE',
  VALIDEE: 'statut.candidature.VALIDEE',
  REFUSEE: 'statut.candidature.REFUSEE',
};

/** Libelle du statut dans la langue de `t` (francais par defaut). */
export function libelleStatutCandidature(statut: string | null | undefined, t: Traducteur = traduireFr): string {
  if (!statut) return '';
  const cle = CLES_STATUT_CANDIDATURE[statut];
  return cle ? t(cle) : statut;
}

/** « 0 rappel envoyé », « 1 rappel envoyé », « 3 rappels envoyés », dans la langue de `t`. */
export function libelleRappels(nombre: number, t: Traducteur = traduireFr): string {
  return t(nombre > 1 ? 'admin.rappelsPlusieurs' : 'admin.rappelUn', { n: nombre });
}
