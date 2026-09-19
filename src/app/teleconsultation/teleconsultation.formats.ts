/**
 * Forme d'une teleconsultation et acces a la salle video, sans dependance Angular : importes tels quels par les
 * tests du projet `logique`. `TeleconsultationService` les reexporte, les imports existants ne changent pas.
 */

/**
 * Teleconsultation video (Jitsi Meet) adossee a un rendez-vous confirme. `lienSalle` n'est renseigne que
 * pour le medecin et pour le patient ayant consenti (null sinon) ; les dates sont au format ISO 8601.
 */
export interface Teleconsultation {
  id: string;
  rendezVousId: string;
  patientId: string;
  medecinId: string;
  /** PLANIFIEE, EN_COURS, TERMINEE ou ANNULEE. */
  statut: string;
  /** Date du consentement explicite du patient ; null tant qu'il n'a pas consenti. */
  consentementPatientLe: string | null;
  /** Lien de la salle video ; null pour un patient qui n'a pas encore consenti. */
  lienSalle: string | null;
  creeLe: string;
  demarreeLe: string | null;
  termineeLe: string | null;
}

/** Statuts dans lesquels la salle video est accessible (si le lien est connu). */
const STATUTS_SALLE_OUVERTE = ['PLANIFIEE', 'EN_COURS'];

/** Vrai si l'on peut rejoindre la salle : lien remis et teleconsultation ni terminee ni annulee. */
export function salleAccessible(t: Teleconsultation): boolean {
  return t.lienSalle !== null && t.lienSalle !== '' && STATUTS_SALLE_OUVERTE.includes(t.statut);
}
