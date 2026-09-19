import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';
import { ClesTraduction } from '../i18n/fr';
import { Traducteur, traduireFr } from '../i18n/traducteur';

/** Bornes de la note et du commentaire, identiques aux regles du domaine backend (400 au-dela). */
export const NOTE_MIN = 1;
export const NOTE_MAX = 5;
export const LONGUEUR_MAX_COMMENTAIRE = 500;

/** Avis tel que le voient son patient (GET /api/avis/mes) et le medecin qui le signale : sans patientId. */
export interface Avis {
  id: string;
  rendezVousId: string;
  medecinId: string;
  /** Note de 1 a 5. */
  note: number;
  /** Commentaire facultatif ; null s'il n'a pas ete renseigne. */
  commentaire: string | null;
  /** PUBLIE, SIGNALE ou MASQUE. */
  statut: string;
  /** Date de depot au format ISO 8601. */
  deposeLe: string;
}

/** Vue publique d'un avis : anonyme, ni patient ni rendez-vous. */
export interface AvisPublic {
  id: string;
  note: number;
  commentaire: string | null;
  deposeLe: string;
}

/** Synthese publique d'un medecin (GET /api/medecins/{id}/avis) : moyenne null s'il n'a aucun avis publie. */
export interface SyntheseAvis {
  moyenne: number | null;
  nombre: number;
  /** Avis publies, les plus recents d'abord. */
  avis: AvisPublic[];
}

/** Vue complete d'un avis pour l'administrateur (GET /api/admin/avis). */
export interface AvisAdmin extends Avis {
  patientId: string;
}

/** Cles de traduction des statuts d'avis connus ; un statut inconnu est affiche tel quel. */
const CLES_STATUT_AVIS: Partial<Record<string, ClesTraduction>> = {
  PUBLIE: 'statut.avis.PUBLIE',
  SIGNALE: 'statut.avis.SIGNALE',
  MASQUE: 'statut.avis.MASQUE',
};

/** Libelle du statut dans la langue de `t` (francais par defaut). */
export function libelleStatutAvis(statut: string | null | undefined, t: Traducteur = traduireFr): string {
  if (!statut) return '';
  const cle = CLES_STATUT_AVIS[statut];
  return cle ? t(cle) : statut;
}

/**
 * « 4,5 / 5 (12 avis) » (virgule decimale en francais, point ailleurs), ou « Aucun avis pour le moment », dans la
 * langue de `t`.
 */
export function formaterMoyenne(moyenne: number | null, nombre: number, t: Traducteur = traduireFr): string {
  if (moyenne === null || nombre === 0) return t('avis.aucun');
  return t('avis.moyenne', { moyenne: moyenne.toFixed(1).replace('.', t('format.decimale')), nombre });
}

/**
 * Avis verifies des patients : depot et liste par le patient, synthese publique d'un medecin (sans jeton),
 * signalement par le medecin concerne et moderation par l'administrateur (/api/admin/** verrouille cote API).
 * JWT via l'intercepteur ; erreurs { erreur } 400 / 403 / 404 / 409 traduites par les composants.
 */
@Injectable({ providedIn: 'root' })
export class AvisService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Depot par le patient sur un de ses rendez-vous honores (201 ; 409 si non honore ou avis deja donne ; 400 si invalide). */
  deposer(rendezVousId: string, note: number, commentaire: string | null = null): Observable<Avis> {
    return this.http.post<Avis>(`${this.base}/api/avis`, { rendezVousId, note, commentaire });
  }

  /** Mes avis, tous statuts, les plus recents d'abord (role PATIENT). */
  mes(): Observable<Avis[]> {
    return this.http.get<Avis[]>(`${this.base}/api/avis/mes`);
  }

  /** Synthese publique d'un medecin : avis publies seulement, anonymises. */
  synthese(medecinId: string): Observable<SyntheseAvis> {
    return this.http.get<SyntheseAvis>(`${this.base}/api/medecins/${medecinId}/avis`);
  }

  /** Signalement a l'administrateur par le medecin concerne (403 sinon, 409 si l'avis n'est pas publie). */
  signaler(id: string): Observable<Avis> {
    return this.http.post<Avis>(`${this.base}/api/avis/${id}/signaler`, null);
  }

  /** Avis pour l'administrateur, filtres par statut si demande, les plus anciens d'abord. */
  pourModeration(statut?: string): Observable<AvisAdmin[]> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    return this.http.get<AvisAdmin[]>(`${this.base}/api/admin/avis`, { params });
  }

  /** Retrait de la vue publique par l'administrateur (409 si deja masque). */
  masquer(id: string): Observable<AvisAdmin> {
    return this.http.post<AvisAdmin>(`${this.base}/api/admin/avis/${id}/masquer`, null);
  }

  /** Remise en ligne par l'administrateur (409 si deja publie). */
  retablir(id: string): Observable<AvisAdmin> {
    return this.http.post<AvisAdmin>(`${this.base}/api/admin/avis/${id}/retablir`, null);
  }
}
