import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Medecin {
  id: string;
  nomComplet: string;
  specialiteSlug: string;
  specialiteFr: string;
  wilayaCode: string;
  wilayaFr: string;
  ville: string;
}

@Injectable({ providedIn: 'root' })
export class AnnuaireService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8080';

  rechercher(specialite?: string, wilaya?: string, q?: string): Observable<Medecin[]> {
    let params = new HttpParams();
    if (specialite) params = params.set('specialite', specialite);
    if (wilaya) params = params.set('wilaya', wilaya);
    if (q) params = params.set('q', q);
    return this.http.get<Medecin[]>(`${this.base}/api/medecins`, { params });
  }
}
