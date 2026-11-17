/**
 * Pre-lancement : tant que PRELANCEMENT vaut true, le site est visible (annuaire, pages de referencement) mais
 * « Se connecter » et « Creer un compte » menent a la page /bientot au lieu de Keycloak. L'equipe garde l'acces
 * en ouvrant une fois https://ndawik.com/?equipe=1 (memorise dans ce navigateur ; ?equipe=0 pour l'oublier).
 */
export const PRELANCEMENT = true;

const CLE = 'tabibi.equipe';

export function accesEquipe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const p = new URLSearchParams(window.location.search).get('equipe');
    if (p === '1') localStorage.setItem(CLE, '1');
    if (p === '0') localStorage.removeItem(CLE);
    return localStorage.getItem(CLE) === '1';
  } catch {
    return false;
  }
}

/** Vrai si la connexion et l'inscription doivent etre remplacees par la page « Lancement prochainement ». */
export function connexionFermee(): boolean {
  return PRELANCEMENT && !accesEquipe();
}

/**
 * Teleconsultation (visio) : pas au lancement. Tant que VISIO_ACTIVE vaut false, la fonction reste VISIBLE avec
 * l'etiquette « Bientôt » mais ne peut pas etre utilisee (pages /teleconsultations remplacees par un message,
 * bouton « Proposer une téléconsultation » masque ; le serveur refuse aussi, TABIBI_TELECONSULTATION_ACTIVE).
 */
export const VISIO_ACTIVE = false;
