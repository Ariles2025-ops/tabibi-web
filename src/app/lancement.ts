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

/**
 * Phase de test (18/11/2026) : la CONNEXION est ouverte (les praticiens se connectent avec le compte que l'equipe
 * leur a cree), mais personne ne peut CREER de compte soi-meme. Un praticien envoie une demande depuis /praticien ;
 * l'equipe verifie puis cree son compte. Le realm Keycloak doit aussi avoir « User registration » desactive.
 * Remettre INSCRIPTION_LIBRE a true au lancement public.
 */
export const CONNEXION_OUVERTE = true;
export const INSCRIPTION_LIBRE = false;

/** Vrai si « Se connecter » doit mener a la page « Lancement prochainement » au lieu de Keycloak. */
export function connexionFermee(): boolean {
  return PRELANCEMENT && !CONNEXION_OUVERTE && !accesEquipe();
}

/** Vrai si « Creer un compte » doit etre masque (comptes crees uniquement par l'equipe, sur demande). */
export function inscriptionFermee(): boolean {
  return !INSCRIPTION_LIBRE && !accesEquipe();
}

/**
 * Teleconsultation (visio) : pas au lancement. Tant que VISIO_ACTIVE vaut false, la fonction reste VISIBLE avec
 * l'etiquette « Bientôt » mais ne peut pas etre utilisee (pages /teleconsultations remplacees par un message,
 * bouton « Proposer une téléconsultation » masque ; le serveur refuse aussi, TABIBI_TELECONSULTATION_ACTIVE).
 */
export const VISIO_ACTIVE = false;
