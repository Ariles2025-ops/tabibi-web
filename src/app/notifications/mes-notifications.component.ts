import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { Notification, NotificationService } from './notification.service';

/** Boite de reception de l'utilisateur connecte (GET /api/notifications/mes), avec marquage lu. */
@Component({
  selector: 'app-mes-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">Mes notifications</h1>
        <button *ngIf="connecte()" type="button" class="bouton-secondaire" (click)="toutMarquerLu()"
                [disabled]="nombreNonLues() === 0 || enCours() !== null">
          {{ enCours() === 'toutes' ? 'Enregistrement…' : 'Tout marquer comme lu' }}
        </button>
      </div>

      <p *ngIf="connecte() === false">Redirection vers la page de connexion…</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">Chargement…</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let n of notifications()" [class.notification-lue]="n.lue" [class.notification-non-lue]="!n.lue"
              style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <strong>{{ n.sujet }}</strong>
              <span style="color:#566b64"> · {{ n.creeLe | date:'EEEE d MMMM yyyy à HH:mm' }}</span><br>
              <span>{{ n.message }}</span>
            </div>
            <button *ngIf="!n.lue" type="button" class="bouton-secondaire" (click)="marquerLue(n)"
                    [disabled]="enCours() !== null">
              {{ enCours() === n.id ? 'Enregistrement…' : 'Marquer comme lue' }}
            </button>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && notifications().length === 0">Aucune notification pour le moment.</p>
      </ng-container>
    </main>
  `,
})
export class MesNotificationsComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(NotificationService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  notifications = signal<Notification[]>([]);
  nombreNonLues = computed(() => this.notifications().filter((n) => !n.lue).length);
  charge = signal(false);
  /** Identifiant de la notification en cours de marquage, ou 'toutes' pour le marquage global. */
  enCours = signal<string | null>(null);
  erreur = signal('');

  async ngOnInit() {
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.mesNotifications().subscribe({
      next: (liste) => {
        // Les plus recentes d'abord.
        this.notifications.set([...liste].sort((a, b) => Date.parse(b.creeLe) - Date.parse(a.creeLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos notifications.');
        }
      },
    });
  }

  marquerLue(notification: Notification) {
    this.enCours.set(notification.id);
    this.erreur.set('');
    this.service.marquerLue(notification.id).subscribe({
      next: (lue) => {
        this.enCours.set(null);
        this.notifications.update((liste) => liste.map((n) => (n.id === lue.id ? lue : n)));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.erreur.set(e.error?.erreur ?? 'Le marquage de la notification a échoué, veuillez réessayer.');
      },
    });
  }

  toutMarquerLu() {
    this.enCours.set('toutes');
    this.erreur.set('');
    this.service.toutMarquerLu().subscribe({
      next: () => {
        this.enCours.set(null);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.erreur.set(e.error?.erreur ?? 'Le marquage des notifications a échoué, veuillez réessayer.');
      },
    });
  }
}
