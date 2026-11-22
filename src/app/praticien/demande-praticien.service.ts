import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';

/** Corps de POST /api/public/demandes-praticien ; `siteWeb` est le champ piege (toujours vide pour un humain). */
export interface DepotDemandePraticien {
  nom: string;
  specialite: string;
  wilaya: string;
  ville?: string;
  numeroOrdre: string;
  telephone: string;
  email: string;
  message?: string;
  /** Fiche de l'annuaire choisie (« C'est ma fiche »). */
  ficheId?: string;
  siteWeb: string;
}

/** Depot public (sans compte) d'une demande praticien. */
@Injectable({ providedIn: 'root' })
export class DemandePraticienService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  deposer(depot: DepotDemandePraticien): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.config.apiUrl}/api/public/demandes-praticien`, depot);
  }
}
