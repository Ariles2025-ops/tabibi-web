import { InjectionToken } from '@angular/core';

/**
 * Etat de la reponse HTTP en cours de rendu cote serveur (SSR). Angular 18 n'expose pas la reponse express aux
 * composants (`@angular/ssr/tokens` n'arrive qu'en 19) : `server.ts` fournit cet objet a chaque rendu et lit
 * `statut` une fois le HTML produit. Une page introuvable (route `**`, praticien inconnu) y pose 404 : le moteur de
 * recherche n'indexe pas la page et le navigateur, lui, ne voit pas la difference. Absent dans le navigateur.
 */
export interface ReponseServeur {
  statut: number;
}

export const REPONSE_SERVEUR = new InjectionToken<ReponseServeur>('REPONSE_SERVEUR');
