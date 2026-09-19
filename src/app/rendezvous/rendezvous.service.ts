import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';

/** Rendez-vous du patient connecte (GET /api/rendezvous/mes). */
export interface RendezVous {
  id: string;
  patientId: string;
  medecinId: string;
  /** Date/heure de debut au format ISO 8601. */
  debut: string;
  /** Statut renvoye par l'API (ex. CONFIRME, ANNULE). */
  statut: string;
  creneauId: string;
}

/** Reponse de POST /api/creneaux/{id}/reserver. */
export interface Reservation {
  id: string;
  medecinId: string;
  debut: string;
  statut: string;
}

/** Reservation et suivi des rendez-vous (appels reserves au role PATIENT, JWT via l'intercepteur). */
@Injectable({ providedIn: 'root' })
export class RendezVousService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  reserver(creneauId: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/api/creneaux/${creneauId}/reserver`, null);
  }

  mes(): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${this.base}/api/rendezvous/mes`);
  }

  annuler(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/api/rendezvous/${id}/annuler`, null);
  }
}
