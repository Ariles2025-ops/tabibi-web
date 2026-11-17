import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';

export interface Medecin {
  id: string;
  nomComplet: string;
  specialiteSlug: string;
  specialiteFr: string;
  wilayaCode: string;
  wilayaFr: string;
  ville: string;
  /** Vrai si le medecin a des creneaux libres a venir (le serveur trie ces medecins en premier). */
  reservable?: boolean;
  /** Informations facultatives saisies par le medecin (absentes tant qu'il ne les a pas renseignees). */
  adresse?: string | null;
  telephoneCabinet?: string | null;
  horaires?: string | null;
  presentation?: string | null;
  langues?: string[] | null;
}

/** Commune renvoyee par GET /api/medecins/communes. */
export interface CommuneApi { slug: string; nom: string; nombre: number; }

/** Creneau de consultation propose par un medecin. */
export interface Creneau {
  id: string;
  medecinId: string;
  /** Date/heure de debut au format ISO 8601. */
  debut: string;
  dureeMinutes: number;
  disponible: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnnuaireService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** `commune` : slug de commune ; le filtre est applique cote API (la liste n'est plus limitee aux 50 premieres fiches). */
  rechercher(specialite?: string, wilaya?: string, q?: string, commune?: string): Observable<Medecin[]> {
    let params = new HttpParams();
    if (specialite) params = params.set('specialite', specialite);
    if (wilaya) params = params.set('wilaya', wilaya);
    if (q) params = params.set('q', q);
    if (commune) params = params.set('commune', commune);
    return this.http.get<Medecin[]>(`${this.base}/api/medecins`, { params });
  }

  /** Communes (>= 3 praticiens) d'une specialite dans une wilaya : GET /api/medecins/communes. */
  communes(specialite?: string, wilayaCode?: string): Observable<CommuneApi[]> {
    let params = new HttpParams();
    if (specialite) params = params.set('specialite', specialite);
    if (wilayaCode) params = params.set('wilaya', wilayaCode);
    return this.http.get<CommuneApi[]>(`${this.base}/api/medecins/communes`, { params });
  }

  medecin(id: string): Observable<Medecin> {
    return this.http.get<Medecin>(`${this.base}/api/medecins/${id}`);
  }

  /** Vrai si la fiche n'appartient encore a aucun compte : son praticien peut la reclamer. */
  reclamable(id: string): Observable<{ reclamable: boolean }> {
    return this.http.get<{ reclamable: boolean }>(`${this.base}/api/medecins/${id}/reclamable`);
  }

  creneaux(medecinId: string): Observable<Creneau[]> {
    return this.http.get<Creneau[]>(`${this.base}/api/medecins/${medecinId}/creneaux`);
  }
}
