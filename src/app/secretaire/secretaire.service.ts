import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Creneau } from '../annuaire/annuaire.service';
import { ConfigService } from '../config/config.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { RdvTelephone, ResultatSemaineType, SemaineType } from '../medecin/semaine-type';

/** Rattachement d'une secretaire au cabinet d'un medecin, tel que renvoye par l'API (au medecin comme a la secretaire). */
export interface Rattachement {
  id: string;
  medecinId: string;
  /** Sujet du jeton Keycloak de la secretaire (identifiant visible dans « Mon compte »). */
  secretaireId: string;
  /** Date de rattachement au format ISO 8601. */
  creeLe: string;
  /** Nom et e-mail du compte de la secretaire, s'ils sont connus. */
  secretaireNom?: string | null;
  secretaireEmail?: string | null;
  /** Faux tant que la secretaire n'a pas accepte l'invitation (aucun acces d'ici la). Absent = ancien rattachement, actif. */
  accepte?: boolean;
}

/** Invitation recue d'un medecin, en attente de reponse. */
export interface Invitation {
  id: string;
  medecinId: string;
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

  /** Invitations a rejoindre un cabinet, en attente, adressees au compte connecte (tout role). */
  invitations(): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${this.base}/api/moi/invitations-cabinet`);
  }

  /** Accepte : acces a l'agenda du medecin et role SECRETAIRE (403 si l'invitation est pour un autre compte). */
  accepterInvitation(id: string): Observable<Rattachement> {
    return this.http.post<Rattachement>(`${this.base}/api/moi/invitations-cabinet/${id}/accepter`, {});
  }

  /** Refuse : l'invitation disparait, le medecin est prevenu. */
  refuserInvitation(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/api/moi/invitations-cabinet/${id}/refuser`, {});
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

  /** Creneaux a venir du medecin, libres et reserves (403 sans rattachement). */
  creneaux(medecinId: string): Observable<Creneau[]> {
    return this.http.get<Creneau[]>(`${this.base}/api/secretaire/medecins/${medecinId}/creneaux`);
  }

  /** Semaine type pour le medecin (404 tant que l'API ne l'a pas ; 403 sans rattachement). */
  semaineType(medecinId: string, corps: SemaineType): Observable<ResultatSemaineType> {
    return this.http.post<ResultatSemaineType>(`${this.base}/api/secretaire/medecins/${medecinId}/creneaux/semaine-type`, corps);
  }

  /** Rendez-vous pris au telephone sur un creneau libre (409 si le creneau vient d'etre pris). */
  prendreRdvTelephone(medecinId: string, corps: RdvTelephone): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${this.base}/api/secretaire/medecins/${medecinId}/rendezvous`, corps);
  }

  /** Supprime un creneau libre du medecin (204 ; 409 s'il est reserve). */
  supprimerCreneau(medecinId: string, creneauId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/secretaire/medecins/${medecinId}/creneaux/${creneauId}`);
  }

  /** Le patient est venu : le rendez-vous passe HONORE (409 s'il n'est pas confirme). */
  honorer(rendezVousId: string): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${this.base}/api/secretaire/rendezvous/${rendezVousId}/honorer`, null);
  }

  /** Annulation pour le cabinet : creneau remis a disposition, patient prevenu (409 s'il n'est pas confirme). */
  annuler(rendezVousId: string): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${this.base}/api/secretaire/rendezvous/${rendezVousId}/annuler`, null);
  }
  /** Signale un patient absent a un rendez-vous confirme deja commence ; renvoie le rendez-vous mis a jour. */
  marquerAbsent(rendezVousId: string): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${this.base}/api/secretaire/rendezvous/${rendezVousId}/absent`, null);
  }

}
