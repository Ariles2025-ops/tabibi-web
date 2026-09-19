/**
 * Bornes et abreviations de la messagerie, sans dependance Angular : importees telles quelles par les tests du
 * projet `logique`. `MessagerieService` les reexporte, les imports existants ne changent pas.
 */

/** Longueur maximale d'un message, identique a la regle du domaine backend (400 au-dela). */
export const LONGUEUR_MAX_MESSAGE = 2000;

/** Identifiant abrege d'un utilisateur (huit premiers caracteres), pour designer un patient sans afficher tout l'UUID. */
export function abregerIdentifiant(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}
