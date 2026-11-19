import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../config/config.service';
import { libelleStatutGenerique, libelleStatutGeneriqueAr } from '../partage/statut-generique';

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
  /** Fiche de l'annuaire reclamee par le medecin ; null (ou absente) pour une nouvelle fiche. */
  ficheReclamee?: string | null;
  /** E-mail du compte qui a depose la candidature ; null s'il est inconnu. */
  compteEmail?: string | null;
  /** Nom affiche sur la fiche reclamee ; null pour une nouvelle fiche. */
  ficheReclameeNom?: string | null;
  /** Nombre d'autres candidatures portant le meme numero d'ordre. */
  doublonsNumeroOrdre?: number;
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
  /** Fiche de l'annuaire que le medecin reclame (absente pour une nouvelle fiche). */
  ficheReclamee?: string | null;
}

/** Demande praticien (formulaire public /praticien), telle que renvoyee par GET /api/admin/demandes-praticien. */
export interface DemandePraticien {
  id: string;
  nom: string;
  specialite: string;
  wilaya: string;
  ville: string | null;
  numeroOrdre: string;
  telephone: string;
  email: string | null;
  message: string | null;
  /** Fiche de l'annuaire choisie par le praticien ; null sinon. */
  ficheId: string | null;
  /** NOUVELLE, TRAITEE ou REFUSEE. */
  statut: string;
  creeeLe: string;
  traiteeLe: string | null;
}

/** Tableau de bord de l'administrateur (GET /api/admin/statistiques). */
export interface StatistiquesAdministration {
  candidaturesEnAttente: number;
  candidaturesValidees: number;
  candidaturesRefusees: number;
}

/** Libelles francais des statuts de candidature connus ; un statut inconnu est affiche tel quel. */
const LIBELLES_STATUT_CANDIDATURE: Partial<Record<string, string>> = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
};

export function libelleStatutCandidature(statut: string | null | undefined): string {
  if (!statut) return '';
  return LIBELLES_STATUT_CANDIDATURE[statut] ?? libelleStatutGenerique(statut);
}

/** Libelles arabes des statuts de candidature (memes mots que l'appli). */
const LIBELLES_STATUT_CANDIDATURE_AR: Partial<Record<string, string>> = {
  EN_ATTENTE: 'قيد الانتظار',
  VALIDEE: 'مُعتمدة',
  REFUSEE: 'مرفوضة',
};

export function libelleStatutCandidatureAr(statut: string | null | undefined): string {
  if (!statut) return '';
  return LIBELLES_STATUT_CANDIDATURE_AR[statut] ?? libelleStatutGeneriqueAr(statut);
}

/** « 0 rappel envoyé », « 1 rappel envoyé », « 3 rappels envoyés ». */
export function libelleRappels(nombre: number): string {
  return `${nombre} ${nombre > 1 ? 'rappels envoyés' : 'rappel envoyé'}`;
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

  /** Demandes praticien deposees depuis le site, filtrees par statut si demande. */
  demandesPraticien(statut?: string): Observable<DemandePraticien[]> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    return this.http.get<DemandePraticien[]>(`${this.base}/api/admin/demandes-praticien`, { params });
  }

  /** Marque la demande comme traitee (409 si deja cloturee). */
  traiterDemande(id: string): Observable<DemandePraticien> {
    return this.http.post<DemandePraticien>(`${this.base}/api/admin/demandes-praticien/${id}/traiter`, null);
  }

  /** Refuse la demande (409 si deja cloturee). */
  refuserDemande(id: string): Observable<DemandePraticien> {
    return this.http.post<DemandePraticien>(`${this.base}/api/admin/demandes-praticien/${id}/refuser`, null);
  }

  /** Cree le compte medecin (e-mail « definir votre mot de passe ») et passe la demande en TRAITEE. */
  creerCompteDemande(id: string): Observable<DemandePraticien> {
    return this.http.post<DemandePraticien>(`${this.base}/api/admin/demandes-praticien/${id}/creer-compte`, null);
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
