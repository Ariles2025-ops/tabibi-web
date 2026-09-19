import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidature, DemandeCandidature } from '../admin/admin.service';
import { Creneau } from '../annuaire/annuaire.service';
import { Ordonnance } from '../ordonnances/ordonnance.service';
import { RendezVous } from '../rendezvous/rendezvous.service';

/**
 * Espace medecin : agenda, ouverture de creneaux, rendez-vous honores, ordonnances redigees et candidature a
 * l'annuaire (role MEDECIN).
 */
@Injectable({ providedIn: 'root' })
export class MedecinService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8080';

  /** Rendez-vous pris chez le medecin connecte. */
  agenda(): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${this.base}/api/medecin/rendezvous`);
  }

  /** Ouvre un creneau de consultation (201 Created). `debut` au format ISO 8601. */
  ouvrirCreneau(debut: string, dureeMinutes: number): Observable<Creneau> {
    return this.http.post<Creneau>(`${this.base}/api/medecin/creneaux`, { debut, dureeMinutes });
  }

  /** Marque un rendez-vous comme honore (le patient est venu en consultation). */
  honorer(rendezVousId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/api/rendezvous/${rendezVousId}/honorer`, null);
  }

  /** Ordonnances emises par le medecin connecte. */
  ordonnancesRedigees(): Observable<Ordonnance[]> {
    return this.http.get<Ordonnance[]>(`${this.base}/api/medecin/ordonnances`);
  }

  /** Depot d'une candidature a l'annuaire (201 ; 400 si incomplete ; 409 si une candidature est en attente ou validee). */
  deposerCandidature(demande: DemandeCandidature): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.base}/api/medecin/candidature`, demande);
  }

  /** Derniere candidature du medecin connecte (404 s'il n'en a depose aucune). */
  maCandidature(): Observable<Candidature> {
    return this.http.get<Candidature>(`${this.base}/api/medecin/candidature`);
  }
}
