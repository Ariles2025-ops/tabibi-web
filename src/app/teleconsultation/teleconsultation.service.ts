import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';
import { Teleconsultation } from './teleconsultation.formats';

// Forme et acces a la salle : module pur (`./teleconsultation.formats`), reexporte pour les imports existants.
export { salleAccessible } from './teleconsultation.formats';
export type { Teleconsultation } from './teleconsultation.formats';

/**
 * Teleconsultations : suivi et consentement du patient, planification et pilotage par le medecin
 * (JWT via l'intercepteur ; erreurs { erreur } 403 / 404 / 409 traduites par les composants).
 */
@Injectable({ providedIn: 'root' })
export class TeleconsultationService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Teleconsultations du patient connecte, les plus recentes d'abord (role PATIENT). */
  mes(): Observable<Teleconsultation[]> {
    return this.http.get<Teleconsultation[]>(`${this.base}/api/teleconsultations/mes`);
  }

  /** Une teleconsultation, pour son patient ou son medecin (403 sinon, 404 si absente). */
  parId(id: string): Observable<Teleconsultation> {
    return this.http.get<Teleconsultation>(`${this.base}/api/teleconsultations/${id}`);
  }

  /** Consentement explicite du patient : la vue renvoyee porte le lien de salle (409 si terminee ou annulee). */
  consentir(id: string): Observable<Teleconsultation> {
    return this.http.post<Teleconsultation>(`${this.base}/api/teleconsultations/${id}/consentir`, null);
  }

  /** Planification par le medecin sur l'un de ses rendez-vous confirmes (201 ; 409 sinon ou si deja planifiee). */
  planifier(rendezVousId: string): Observable<Teleconsultation> {
    return this.http.post<Teleconsultation>(`${this.base}/api/medecin/teleconsultations`, { rendezVousId });
  }

  /** Teleconsultations menees par le medecin connecte, les plus recentes d'abord (role MEDECIN). */
  duMedecin(): Observable<Teleconsultation[]> {
    return this.http.get<Teleconsultation[]>(`${this.base}/api/medecin/teleconsultations`);
  }

  /** Le medecin ouvre la session (409 sans consentement du patient ou si elle n'est pas planifiee). */
  demarrer(id: string): Observable<Teleconsultation> {
    return this.http.post<Teleconsultation>(`${this.base}/api/teleconsultations/${id}/demarrer`, null);
  }

  /** Le medecin clot la session (409 si elle n'est pas en cours). */
  terminer(id: string): Observable<Teleconsultation> {
    return this.http.post<Teleconsultation>(`${this.base}/api/teleconsultations/${id}/terminer`, null);
  }

  /** Le medecin annule une teleconsultation planifiee (409 sinon). */
  annuler(id: string): Observable<Teleconsultation> {
    return this.http.post<Teleconsultation>(`${this.base}/api/teleconsultations/${id}/annuler`, null);
  }
}
