import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';
import { DemandeProfil } from './profil.formats';

// Regles, nettoyage et validation : module pur (`./profil.formats`), reexporte pour les imports existants.
export {
  ANNEE_NAISSANCE_MIN,
  LANGUES,
  LANGUE_PAR_DEFAUT,
  LONGUEUR_MAX_NOM,
  LONGUEUR_MAX_WILAYA,
  LONGUEUR_MIN_NOM,
  dateLocaleIso,
  libelleLangue,
  nettoyerProfil,
  validerProfil,
} from './profil.formats';
export type { DemandeProfil } from './profil.formats';

/** Profil de l'utilisateur connecte, quel que soit son role (GET / PUT /api/moi/profil). */
export interface Profil {
  utilisateurId: string;
  nomComplet: string;
  /** Chiffres seulement (ex. 0550123456) ; null si non renseigne. */
  telephone: string | null;
  /** Date au format yyyy-MM-dd ; null si non renseignee. */
  dateNaissance: string | null;
  wilayaCode: string | null;
  /** fr, ar, kab ou en. */
  langue: string;
  /** Date de derniere mise a jour au format ISO 8601. */
  misAJourLe: string;
}

/** Mon profil (utilisateur connecte, tous roles ; JWT via l'intercepteur) : lecture (404 tant que non renseigne) et enregistrement. */
@Injectable({ providedIn: 'root' })
export class ProfilService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Mon profil ; 404 { erreur } si je ne l'ai jamais renseigne. */
  monProfil(): Observable<Profil> {
    return this.http.get<Profil>(`${this.base}/api/moi/profil`);
  }

  /** Renseigne ou remplace mon profil (400 { erreur } si une regle n'est pas respectee). */
  enregistrer(demande: DemandeProfil): Observable<Profil> {
    return this.http.put<Profil>(`${this.base}/api/moi/profil`, demande);
  }
}
