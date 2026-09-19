import { InjectionToken } from '@angular/core';

/**
 * En-tete `Accept-Language` de la requete en cours de rendu cote serveur (SSR). Angular 18 n'expose pas la requete
 * express aux services (`@angular/ssr/tokens` n'arrive qu'en 19) : `server.ts` fournit la valeur a chaque rendu, et
 * `TraductionService` en deduit la langue de la page renvoyee (`<html lang dir>`, libelles, dates). Absent dans le
 * navigateur, ou le choix memorise puis `navigator.language` decident ; fixe a `fr` dans les tests (`src/test.ts`).
 */
export const LANGUE_SERVEUR = new InjectionToken<string>('LANGUE_SERVEUR');
