/**
 * Bornes et validation de l'espace secretaire, sans dependance Angular : importees telles quelles par les tests
 * du projet `logique`. `SecretaireService` les reexporte, les imports existants ne changent pas.
 */

/** Bornes de la duree d'un creneau, celles du backend (CreneauService). */
export const DUREE_MIN_MINUTES = 5;
export const DUREE_MAX_MINUTES = 120;

/** Un UUID Keycloak (sujet du jeton), sans espaces ni accolades ; la casse est indifferente. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function estUuid(valeur: string): boolean {
  return UUID.test(valeur);
}
