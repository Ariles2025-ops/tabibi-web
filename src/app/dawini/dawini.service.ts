import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';

// Libelles et formats : module pur (`./dawini.formats`), reexporte pour les imports existants.
export { formaterPrix, libelleReponses, libelleStatutBesoin } from './dawini.formats';

/**
 * Besoin de medicament publie par un patient (Dawini). `patientId` vaut null dans la vue remise aux pharmacies ;
 * `clotureLe` vaut null tant que le besoin est ouvert.
 */
export interface Besoin {
  id: string;
  patientId: string | null;
  medicament: string;
  wilayaCode: string;
  commune: string | null;
  precision: string | null;
  /** OUVERT ou CLOTURE. */
  statut: string;
  /** Dates au format ISO 8601. */
  publieLe: string;
  clotureLe: string | null;
  nombreReponses: number;
}

/** Donnees de publication d'un besoin (POST /api/dawini/besoins, role PATIENT) ; commune et precision facultatives. */
export interface DemandeBesoin {
  medicament: string;
  wilayaCode: string;
  commune?: string;
  precision?: string;
}

/** Reponse d'une pharmacie a un besoin ; prix en dinars et commentaire facultatifs (null sinon). */
export interface Reponse {
  id: string;
  besoinId: string;
  pharmacieId: string;
  nomPharmacie: string;
  disponible: boolean;
  prixDa: number | null;
  commentaire: string | null;
  repondueLe: string;
}

/** Donnees d'une reponse (POST /api/dawini/besoins/{id}/reponses, role PHARMACIE) ; la disponibilite est obligatoire. */
export interface DemandeReponse {
  nomPharmacie: string;
  disponible: boolean;
  prixDa?: number | null;
  commentaire?: string | null;
}

/**
 * Dawini : besoins de medicaments publies par les patients et reponses des pharmacies (role PHARMACIE).
 * JWT via l'intercepteur ; erreurs { erreur } 400 / 403 / 404 / 409 traduites par les composants.
 */
@Injectable({ providedIn: 'root' })
export class DawiniService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Publication d'un besoin par le patient connecte (201 ; 400 si le medicament ou la wilaya manque). */
  publier(demande: DemandeBesoin): Observable<Besoin> {
    return this.http.post<Besoin>(`${this.base}/api/dawini/besoins`, demande);
  }

  /** Mes besoins, tous statuts, les plus recents d'abord, avec le nombre de reponses (role PATIENT). */
  mesBesoins(): Observable<Besoin[]> {
    return this.http.get<Besoin[]>(`${this.base}/api/dawini/besoins/mes`);
  }

  /** Cloture par le patient (404, 403 si a un autre patient, 409 si deja cloture). */
  cloturer(id: string): Observable<Besoin> {
    return this.http.post<Besoin>(`${this.base}/api/dawini/besoins/${id}/cloturer`, null);
  }

  /** Reponses a un besoin, les plus anciennes d'abord : pour son patient (403 sinon) ou pour toute pharmacie. */
  reponses(besoinId: string): Observable<Reponse[]> {
    return this.http.get<Reponse[]>(`${this.base}/api/dawini/besoins/${besoinId}/reponses`);
  }

  /** Besoins ouverts d'une wilaya pour une pharmacie, sans identifiant de patient (400 sans wilaya). */
  besoinsOuverts(wilayaCode: string): Observable<Besoin[]> {
    const params = new HttpParams().set('wilaya', wilayaCode);
    return this.http.get<Besoin[]>(`${this.base}/api/dawini/besoins`, { params });
  }

  /** Reponse d'une pharmacie a un besoin ouvert (201 ; 409 si cloture ou deja repondu ; 400 si incomplete). */
  repondre(besoinId: string, demande: DemandeReponse): Observable<Reponse> {
    return this.http.post<Reponse>(`${this.base}/api/dawini/besoins/${besoinId}/reponses`, demande);
  }
}
