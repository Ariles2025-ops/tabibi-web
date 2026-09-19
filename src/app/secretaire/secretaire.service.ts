import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Creneau } from '../annuaire/annuaire.service';
import { ConfigService } from '../config/config.service';
import { RendezVous } from '../rendezvous/rendezvous.service';

/** Rattachement d'une secretaire au cabinet d'un medecin, tel que renvoye par l'API (au medecin comme a la secretaire). */
export interface Rattachement {
  id: string;
  medecinId: string;
  /** Sujet du jeton Keycloak de la secretaire (identifiant visible dans « Mon compte »). */
  secretaireId: string;
  /** Date de rattachement au format ISO 8601. */
  creeLe: string;
}

/** Bornes de la duree d'un creneau, celles du backend (CreneauService). */
export const DUREE_MIN_MINUTES = 5;
export const DUREE_MAX_MINUTES = 120;

/** Un UUID Keycloak (sujet du jeton), sans espaces ni accolades ; la casse est indifferente. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function estUuid(valeur: string): boolean {
  return UUID.test(valeur);
}

/**
 * Espace secretaire (role SECRETAIRE) : cabinets auxquels je suis rattachee, agenda d'un medecin, ouverture d'un
 * creneau et rendez-vous honores ou annules pour lui (403 sans rattachement ; JWT via l'intercepteur ; erreurs
 * { erreur } 400 / 403 / 404 / 409 traduites par les composants). Le rattachement lui-meme est fait par le medecin
 * (MedecinService).
 */
@Injectable({ providedIn: 'root' })
export class SecretaireService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Cabinets auxquels la secretaire connectee est rattachee. */
  mesMedecins(): Observable<Rattachement[]> {
    return this.http.get<Rattachement[]>(`${this.base}/api/secretaire/medecins`);
  }

  /** Agenda d'un medecin qui m'a rattachee, tous statuts (403 sinon). */
  agenda(medecinId: string): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${this.base}/api/secretaire/medecins/${medecinId}/rendezvous`);
  }

  /** Ouvre un creneau dans l'agenda du medecin (201 ; 400 si passe ou duree hors bornes). `debut` au format ISO 8601. */
  ouvrirCreneau(medecinId: string, debut: string, dureeMinutes: number): Observable<Creneau> {
    return this.http.post<Creneau>(`${this.base}/api/secretaire/medecins/${medecinId}/creneaux`, { debut, dureeMinutes });
  }

  /** Le patient est venu : le rendez-vous passe HONORE (409 s'il n'est pas confirme). */
  honorer(rendezVousId: string): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${this.base}/api/secretaire/rendezvous/${rendezVousId}/honorer`, null);
  }

  /** Annulation pour le cabinet : creneau remis a disposition, patient prevenu (409 s'il n'est pas confirme). */
  annuler(rendezVousId: string): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${this.base}/api/secretaire/rendezvous/${rendezVousId}/annuler`, null);
  }
}
