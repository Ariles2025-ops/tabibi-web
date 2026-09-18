import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Moi {
  sujet: string;
  nom: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class MoiService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8080';

  moi(): Observable<Moi> {
    return this.http.get<Moi>(`${this.base}/api/moi`);
  }
}
