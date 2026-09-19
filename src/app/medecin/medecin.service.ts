import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidature, DemandeCandidature } from '../admin/admin.service';
import { Creneau } from '../annuaire/annuaire.service';
import { ConfigService } from '../config/config.service';
import { Ordonnance } from '../ordonnances/ordonnance.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { Rattachement } from '../secretaire/secretaire.service';

/**
 * Espace medecin : agenda, ouverture de creneaux, rendez-vous honores ou annules, ordonnances redigees,
 * candidature a l'annuaire et secretaires du cabinet (role MEDECIN).
 */
@Injectable({ providedIn: 'root' })
export class MedecinService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

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

  /**
   * Annulation par le medecin d'un rendez-vous confirme de son agenda : le creneau est remis a disposition et le
   * patient prevenu (403 si le rendez-vous est a un autre medecin, 409 s'il n'est pas confirme).
   */
  annulerRendezVous(rendezVousId: string): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${this.base}/api/medecin/rendezvous/${rendezVousId}/annuler`, null);
  }

  /** Secretaires rattachees au cabinet du medecin connecte, les plus anciens rattachements d'abord. */
  secretaires(): Observable<Rattachement[]> {
    return this.http.get<Rattachement[]>(`${this.base}/api/medecin/secretaires`);
  }

  /** Rattache une secretaire par l'identifiant de son compte Keycloak (201 ; 400 si soi-meme, 409 si deja rattachee) ; elle est prevenue. */
  rattacherSecretaire(secretaireId: string): Observable<Rattachement> {
    return this.http.post<Rattachement>(`${this.base}/api/medecin/secretaires`, { secretaireId });
  }

  /** Retire une secretaire du cabinet (204 sans corps ; 404 si inconnu, 403 si le rattachement est a un autre medecin). */
  retirerSecretaire(rattachementId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/api/medecin/secretaires/${rattachementId}/retirer`, null);
  }
}
