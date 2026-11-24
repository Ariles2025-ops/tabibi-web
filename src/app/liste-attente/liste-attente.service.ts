import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';

/** Inscription d'un patient sur la liste d'attente d'un medecin, telle que renvoyee par l'API (au patient comme au medecin). */
export interface InscriptionAttente {
  id: string;
  patientId: string;
  medecinId: string;
  /** Date d'inscription au format ISO 8601 ; peut manquer ou etre illisible. */
  inscritLe?: string | null;
}

/** Instant (ms) de l'inscription ; null si la date est absente ou illisible. */
export function instantInscription(i: Pick<InscriptionAttente, 'inscritLe'>): number | null {
  const instant = i.inscritLe ? Date.parse(i.inscritLe) : NaN;
  return Number.isNaN(instant) ? null : instant;
}

/**
 * Copie triee de la plus ancienne a la plus recente inscription (ordre de la file : les premiers inscrits sont
 * prevenus en premier), comme `trierParInscription` de l'appli (liste_attente.dart) ; les dates absentes vont en fin.
 */
export function trierParInscription<T extends Pick<InscriptionAttente, 'inscritLe'>>(inscriptions: T[]): T[] {
  return [...inscriptions].sort((a, b) => {
    const da = instantInscription(a);
    const db = instantInscription(b);
    if (da === null) return db === null ? 0 : 1;
    if (db === null) return -1;
    return da - db;
  });
}

/**
 * Liste d'attente par medecin : le patient s'inscrit depuis la fiche du praticien et est prevenu des qu'un creneau
 * se libere chez lui ; il consulte et retire ses inscriptions ; le medecin consulte sa liste (JWT via l'intercepteur ;
 * erreurs { erreur } 403 / 404 / 409 traduites par les composants).
 */
@Injectable({ providedIn: 'root' })
export class ListeAttenteService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Inscription du patient connecte sur la liste d'attente d'un medecin (201 ; 409 s'il y est deja). */
  inscrire(medecinId: string): Observable<InscriptionAttente> {
    return this.http.post<InscriptionAttente>(`${this.base}/api/medecins/${medecinId}/liste-attente`, null);
  }

  /** Mes inscriptions, les plus anciennes d'abord (role PATIENT). */
  mes(): Observable<InscriptionAttente[]> {
    return this.http.get<InscriptionAttente[]>(`${this.base}/api/liste-attente/mes`);
  }

  /** Retrait d'une de mes inscriptions (204 sans corps ; 404 si inconnue, 403 si elle est a un autre patient). */
  retirer(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/api/liste-attente/${id}/retirer`, null);
  }

  /** Liste d'attente du medecin connecte, les plus anciens inscrits d'abord (role MEDECIN). */
  duMedecin(): Observable<InscriptionAttente[]> {
    return this.http.get<InscriptionAttente[]>(`${this.base}/api/medecin/liste-attente`);
  }
}
