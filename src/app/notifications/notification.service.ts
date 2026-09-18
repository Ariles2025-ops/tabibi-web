import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, map, tap } from 'rxjs';

/** Notification adressee a l'utilisateur connecte, quel que soit son role (GET /api/notifications/mes). */
export interface Notification {
  id: string;
  destinataireId: string;
  /** Canal de remise renvoye par l'API (INTERNE ; SMS et EMAIL reserves). */
  canal: string;
  sujet: string;
  message: string;
  lue: boolean;
  /** Date de creation au format ISO 8601. */
  creeLe: string;
}

/** Corps des compteurs de l'API : { "nombre": n }. */
interface Nombre {
  nombre: number;
}

/** Boite de reception de l'utilisateur connecte : liste, nombre de non lues, marquage lu (JWT via l'intercepteur). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8080';
  private changements = new Subject<void>();

  /** Emet apres chaque marquage lu reussi : la cloche de la barre de navigation relit alors son compteur. */
  changements$ = this.changements.asObservable();

  /** Mes notifications, les plus recentes d'abord. */
  mesNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.base}/api/notifications/mes`);
  }

  /** Nombre de notifications non lues (compteur de la barre de navigation). */
  nombreNonLues(): Observable<number> {
    return this.http.get<Nombre>(`${this.base}/api/notifications/non-lues/nombre`).pipe(map((r) => r.nombre));
  }

  /** Marque une notification lue ; renvoie la notification mise a jour (403 si elle est a un autre utilisateur, 404 si inconnue). */
  marquerLue(id: string): Observable<Notification> {
    return this.http
      .post<Notification>(`${this.base}/api/notifications/${id}/lue`, null)
      .pipe(tap(() => this.changements.next()));
  }

  /** Marque lues toutes mes notifications ; renvoie le nombre passees a lues. */
  toutMarquerLu(): Observable<number> {
    return this.http.post<Nombre>(`${this.base}/api/notifications/toutes-lues`, null).pipe(
      map((r) => r.nombre),
      tap(() => this.changements.next()),
    );
  }
}
