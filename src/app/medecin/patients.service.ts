import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { ConfigService } from '../config/config.service';

/** Patient connu d'un medecin (rendez-vous ou liste d'attente), tel que renvoye par l'API. */
export interface PatientResume {
  patientId: string;
  nomComplet: string;
  telephone: string | null;
  email: string | null;
}

/** Patients indexes par identifiant. */
export type RepertoirePatients = Map<string, PatientResume>;

/** Libelle affiche pour un patient : son nom, a defaut « Patient ». */
export function nomPatient(repertoire: RepertoirePatients, patientId: string, arabe = false): string {
  return repertoire.get(patientId)?.nomComplet?.trim() || (arabe ? 'مريض' : 'Patient');
}

/** Telephone du patient s'il est connu (chaine vide sinon). */
export function telephonePatient(repertoire: RepertoirePatients, patientId: string): string {
  return repertoire.get(patientId)?.telephone?.trim() || '';
}

function indexer(liste: PatientResume[]): RepertoirePatients {
  return new Map(liste.map((p) => [p.patientId, p]));
}

/**
 * Noms des patients pour les ecrans professionnels, a la place des identifiants : patients du medecin connecte
 * (MEDECIN), d'un cabinet rattache (SECRETAIRE) ou d'une liste d'identifiants (ADMIN).
 */
@Injectable({ providedIn: 'root' })
export class PatientsService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Patients ayant un rendez-vous ou une inscription en liste d'attente chez le medecin connecte. */
  patientsDuMedecin(): Observable<RepertoirePatients> {
    return this.http.get<PatientResume[]>(`${this.base}/api/medecin/patients`).pipe(map(indexer));
  }

  /** Memes patients, pour un medecin auquel la secretaire connectee est rattachee (403 sinon). */
  patientsDuCabinet(medecinId: string): Observable<RepertoirePatients> {
    return this.http.get<PatientResume[]>(`${this.base}/api/secretaire/medecins/${medecinId}/patients`).pipe(map(indexer));
  }

  /** Administrateur : patients designes par leurs identifiants (aucun appel si la liste est vide). */
  patientsParIds(ids: string[]): Observable<RepertoirePatients> {
    const uniques = [...new Set(ids.filter(Boolean))];
    if (uniques.length === 0) return of(new Map());
    const params = new HttpParams().set('ids', uniques.join(','));
    return this.http.get<PatientResume[]>(`${this.base}/api/admin/patients`, { params }).pipe(map(indexer));
  }
}
