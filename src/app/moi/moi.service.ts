import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';

export interface Moi {
  sujet: string;
  nom: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class MoiService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  moi(): Observable<Moi> {
    return this.http.get<Moi>(`${this.base}/api/moi`);
  }
}
