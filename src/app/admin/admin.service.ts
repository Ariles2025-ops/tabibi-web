import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../config/config.service';
import { ClesTraduction } from '../i18n/fr';
import { Traducteur, traduireFr } from '../i18n/traducteur';

/** Candidature d'un medecin a figurer dans l'annuaire, telle que renvoyee par l'API (au medecin comme a l'administrateur). */
export interface Candidature {
  id: string;
  medecinId: string;
  nomComplet: string;
  specialiteSlug: string;
  specialiteFr: string | null;
  wilayaCode: string;
  wilayaFr: string | null;
  ville: string | null;
  numeroOrdre: string;
  telephone: string | null;
  /** EN_ATTENTE, VALIDEE ou REFUSEE. */
  statut: string;
  /** Motif du refus, renseigne seulement si REFUSEE. */
  motifRefus: string | null;
  /** Dates au format ISO 8601 ; traiteeLe est null tant que la candidature est en attente. */
  deposeeLe: string;
  traiteeLe: string | null;
}

/** Donnees du depot d'une candidature (POST /api/medecin/candidature, role MEDECIN). */
export interface DemandeCandidature {
  nomComplet: string;
  specialiteSlug: string;
  specialiteFr: string;
  wilayaCode: string;
  wilayaFr: string;
  ville: string;
  numeroOrdre: string;
  telephone: string;
}

/** Tableau de bord de l'administrateur (GET /api/admin/statistiques). */
export interface StatistiquesAdministration {
  candidaturesEnAttente: number;
  candidaturesValidees: number;
  candidaturesRefusees: number;
}

/** Cles de traduction des statuts de candidature connus ; un statut inconnu est affiche tel quel. */
const CLES_STATUT_CANDIDATURE: Partial<Record<string, ClesTraduction>> = {
  EN_ATTENTE: 'statut.candidature.EN_ATTENTE',
  VALIDEE: 'statut.candidature.VALIDEE',
  REFUSEE: 'statut.candidature.REFUSEE',
};

/** Libelle du statut dans la langue de `t` (francais par defaut). */
export function libelleStatutCandidature(statut: string | null | undefined, t: Traducteur = traduireFr): string {
  if (!statut) return '';
  const cle = CLES_STATUT_CANDIDATURE[statut];
  return cle ? t(cle) : statut;
}

/** « 0 rappel envoyé », « 1 rappel envoyé », « 3 rappels envoyés », dans la langue de `t`. */
export function libelleRappels(nombre: number, t: Traducteur = traduireFr): string {
  return t(nombre > 1 ? 'admin.rappelsPlusieurs' : 'admin.rappelUn', { n: nombre });
}

/** Corps des compteurs de l'API : { "nombre": n }. */
interface Nombre {
  nombre: number;
}

/**
 * Administration (role ADMIN, /api/admin/** verrouille cote API) : examen des candidatures de medecins,
 * statistiques et declenchement manuel des rappels de rendez-vous. Le depot et la consultation de sa candidature
 * par le medecin sont dans MedecinService.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Candidatures, filtrees par statut si demande, de la plus ancienne a la plus recente. */
  candidatures(statut?: string): Observable<Candidature[]> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    return this.http.get<Candidature[]>(`${this.base}/api/admin/candidatures`, { params });
  }

  /** Validation : le medecin est publie dans l'annuaire et prevenu (404 si inconnue, 409 si deja traitee). */
  valider(id: string): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.base}/api/admin/candidatures/${id}/valider`, null);
  }

  /** Refus motive : le medecin est prevenu du motif (400 sans motif, 404, 409 si deja traitee). */
  refuser(id: string, motif: string): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.base}/api/admin/candidatures/${id}/refuser`, { motif });
  }

  statistiques(): Observable<StatistiquesAdministration> {
    return this.http.get<StatistiquesAdministration>(`${this.base}/api/admin/statistiques`);
  }

  /**
   * Envoie maintenant les rappels des rendez-vous confirmes des 24 prochaines heures (un seul rappel par rendez-vous,
   * le planificateur horaire fait de meme) ; renvoie le nombre de rappels envoyes.
   */
  executerRappels(): Observable<number> {
    return this.http.post<Nombre>(`${this.base}/api/admin/rappels/executer`, null).pipe(map((r) => r.nombre));
  }
}
