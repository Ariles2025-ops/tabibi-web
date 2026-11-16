import { Injectable, InjectionToken, inject } from '@angular/core';

/**
 * Reponse HTTP Express de la requete en cours, fournie par server.ts au rendu cote serveur (absente dans le
 * navigateur). Seule la methode status() est utilisee : une page « introuvable » repond 404 et non 200 (soft 404).
 */
export interface ReponseHttp { status(code: number): unknown; }
export const REPONSE_HTTP = new InjectionToken<ReponseHttp>('REPONSE_HTTP');

@Injectable({ providedIn: 'root' })
export class StatutHttpService {
  private reponse = inject(REPONSE_HTTP, { optional: true });

  /** Statut 404 pour la page en cours de rendu serveur ; sans effet dans le navigateur. */
  introuvable(): void {
    this.reponse?.status(404);
  }
}
