import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Ligne de prescription : un medicament, sa posologie et sa duree. */
export interface LigneOrdonnance {
  medicament: string;
  posologie: string;
  duree: string;
}

/** Ordonnance emise par un medecin pour un patient. */
export interface Ordonnance {
  id: string;
  medecinId: string;
  patientId: string;
  /** Rendez-vous lie a l'ordonnance, s'il y en a un. */
  rendezVousId: string | null;
  lignes: LigneOrdonnance[];
  /** Date d'emission au format ISO 8601. */
  emiseLe: string;
  /** Code imprime sur l'ordonnance, a saisir sur /verifier. */
  codeVerification: string;
  /** Statut renvoye par l'API (ex. EMISE). */
  statut: string;
}

/** Donnees d'emission d'une ordonnance (POST /api/ordonnances, role MEDECIN). */
export interface NouvelleOrdonnance {
  patientId: string;
  rendezVousId?: string;
  lignes: LigneOrdonnance[];
}

/** Reponse publique de GET /api/ordonnances/verifier/{code}. */
export interface Verification {
  valide: boolean;
  emiseLe: string | null;
  statut: string | null;
}

/** Ordonnances : consultation (PATIENT), emission (MEDECIN) et verification publique d'un code. */
@Injectable({ providedIn: 'root' })
export class OrdonnanceService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8080';

  /** Ordonnances du patient connecte. */
  mes(): Observable<Ordonnance[]> {
    return this.http.get<Ordonnance[]>(`${this.base}/api/ordonnances/mes`);
  }

  parId(id: string): Observable<Ordonnance> {
    return this.http.get<Ordonnance>(`${this.base}/api/ordonnances/${id}`);
  }

  /** Verification d'un code, sans connexion (l'intercepteur joint le JWT s'il existe, l'API n'en a pas besoin). */
  verifier(code: string): Observable<Verification> {
    return this.http.get<Verification>(`${this.base}/api/ordonnances/verifier/${encodeURIComponent(code)}`);
  }

  /** Emission d'une ordonnance par le medecin connecte (201 Created, renvoie l'ordonnance creee). */
  emettre(ordonnance: NouvelleOrdonnance): Observable<Ordonnance> {
    return this.http.post<Ordonnance>(`${this.base}/api/ordonnances`, ordonnance);
  }
}
