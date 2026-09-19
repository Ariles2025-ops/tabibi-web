import { ClesTraduction, FR } from './fr';

/** Parametres d'interpolation : `{nom}` dans le libelle est remplace par la valeur. */
export type ParametresTraduction = Record<string, string | number | null | undefined>;

/** Fonction de traduction : `TraductionService.t`, ou `traduireFr` (francais seul) par defaut dans les fonctions pures. */
export type Traducteur = (cle: ClesTraduction, params?: ParametresTraduction) => string;

/** Remplace chaque `{nom}` par sa valeur ; un nom absent des parametres est laisse tel quel. */
export function interpoler(texte: string, params?: ParametresTraduction): string {
  if (!params) return texte;
  return texte.replace(/\{(\w+)\}/g, (tout, nom: string) => (nom in params ? String(params[nom] ?? '') : tout));
}

/** Traduction en francais, sans service : valeur par defaut des fonctions de libelles (statuts, compteurs). */
export const traduireFr: Traducteur = (cle, params) => interpoler(FR[cle] ?? cle, params);
