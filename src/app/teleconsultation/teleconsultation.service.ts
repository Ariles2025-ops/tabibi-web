import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';

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
