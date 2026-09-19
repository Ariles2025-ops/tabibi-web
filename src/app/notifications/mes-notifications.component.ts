import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { Notification, NotificationService } from './notification.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';

/** Boite de reception de l'utilisateur connecte (GET /api/notifications/mes), avec marquage lu. */
@Component({
  selector: 'app-mes-notifications',
  standalone: true,
  imports: [CommonModule, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">{{ 'notifications.titre' | t }}</h1>
        <button *ngIf="connecte()" type="button" class="bouton-secondaire" (click)="toutMarquerLu()"
                [disabled]="nombreNonLues() === 0 || enCours() !== null">
          {{ (enCours() === 'toutes' ? 'commun.enregistrement' : 'notifications.toutMarquerLu') | t }}
        </button>
      </div>

      <p *ngIf="connecte() === false">{{ 'commun.redirectionConnexion' | t }}</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let n of notifications()" [class.notification-lue]="n.lue" [class.notification-non-lue]="!n.lue"
              style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <strong>{{ n.sujet }}</strong>
              <span style="color:#566b64"> · {{ n.creeLe | dateLocale:'jourDateHeure' }}</span><br>
              <span>{{ n.message }}</span>
            </div>
            <button *ngIf="!n.lue" type="button" class="bouton-secondaire" (click)="marquerLue(n)"
                    [disabled]="enCours() !== null">
              {{ (enCours() === n.id ? 'commun.enregistrement' : 'notifications.marquerLue') | t }}
            </button>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && notifications().length === 0">{{ 'notifications.aucune' | t }}</p>
      </ng-container>
    </main>
  `,
})
export class MesNotificationsComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(NotificationService);
  private i18n = inject(TraductionService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  notifications = signal<Notification[]>([]);
  nombreNonLues = computed(() => this.notifications().filter((n) => !n.lue).length);
  charge = signal(false);
  /** Identifiant de la notification en cours de marquage, ou 'toutes' pour le marquage global. */
  enCours = signal<string | null>(null);
  erreur = signal('');

  async ngOnInit() {
    this.seo.definirPrivee('seo.mesNotifications');
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
          this.erreur.set(e.error?.erreur ?? this.i18n.t('notifications.erreurChargement'));
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
        this.erreur.set(e.error?.erreur ?? this.i18n.t('notifications.marquageEchec'));
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
        this.erreur.set(e.error?.erreur ?? this.i18n.t('notifications.marquageEchecToutes'));
      },
    });
  }
}
