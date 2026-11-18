import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { cibleDuLien } from './cible-notification';
import { Notification, NotificationService } from './notification.service';

/** Boite de reception de l'utilisateur connecte (GET /api/notifications/mes), avec marquage lu. */
@Component({
    selector: 'app-mes-notifications',
    imports: [CommonModule, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">{{ l.t('Mes notifications', 'إشعاراتي') }}</h1>
        <app-selecteur-langue />
        <button *ngIf="connecte()" type="button" class="bouton-secondaire" (click)="toutMarquerLu()"
                [disabled]="nombreNonLues() === 0 || enCours() !== null">
          {{ enCours() === 'toutes' ? l.t('Enregistrement…', 'جارٍ الحفظ…') : l.t('Tout marquer comme lu', 'تعليم الكل كمقروء') }}
        </button>
      </div>


      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
        <p *ngIf="succes()" role="status" style="color:var(--vert)">{{ succes() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let n of notifications()" [class.notification-lue]="n.lue" [class.notification-non-lue]="!n.lue"
              [class.notification-cliquable]="aLien(n)" [style.cursor]="aLien(n) ? 'pointer' : null"
              [attr.role]="aLien(n) ? 'link' : null" [attr.tabindex]="aLien(n) ? 0 : null"
              (click)="ouvrir(n)" (keydown.enter)="ouvrir(n)"
              style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <strong>{{ n.sujet }}</strong>
              <span style="color:var(--text3)"> · <span [attr.dir]="l.ar() ? 'ltr' : null">{{ n.creeLe | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'EEEE d MMMM yyyy à HH:mm') }}</span></span><br>
              <span>{{ n.message }}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button *ngIf="!n.lue" type="button" class="bouton-secondaire" (click)="$event.stopPropagation(); marquerLue(n)"
                      (keydown.enter)="$event.stopPropagation()" [disabled]="enCours() !== null">
                {{ enCours() === n.id ? l.t('Enregistrement…', 'جارٍ الحفظ…') : l.t('Marquer comme lue', 'تعليم كمقروء') }}
              </button>
              <span *ngIf="aLien(n)" class="notification-voir" style="color:var(--blue);font-weight:600">{{ l.t('Voir →', 'عرض ←') }}</span>
            </div>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && notifications().length === 0">{{ l.t('Aucune notification pour le moment.', 'لا توجد إشعارات حاليًا.') }}</p>
      </ng-container>
    </main>
  `
})
export class MesNotificationsComponent implements OnInit {
  l = inject(LangueService);
  private auth = inject(AuthService);
  private service = inject(NotificationService);
  private router = inject(Router);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  notifications = signal<Notification[]>([]);
  nombreNonLues = computed(() => this.notifications().filter((n) => !n.lue).length);
  charge = signal(false);
  /** Identifiant de la notification en cours de marquage, ou 'toutes' pour le marquage global. */
  enCours = signal<string | null>(null);
  erreur = signal('');
  /** Confirmation apres « Tout marquer comme lu » (comme dans l'appli). */
  succes = signal('');

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
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos notifications.', 'تعذّر تحميل إشعاراتك.'));
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
        this.erreur.set(e.error?.erreur ?? this.l.t('Le marquage de la notification a échoué, veuillez réessayer.', 'تعذّر تعليم الإشعار كمقروء، يُرجى المحاولة مرة أخرى.'));
      },
    });
  }

  /**
   * Vrai si la notification mene a une page du site (« /mes-rendez-vous », « /ordonnances/{id} »...). Un lien vide, externe
   * ou sans page correspondante n'est pas propose, comme dans l'appli (lien sans ecran = pas de « Voir »).
   */
  aLien(notification: Notification): boolean {
    return cibleDuLien(notification.lien) !== null;
  }

  /** Clic sur une notification qui porte un lien : la marque lue (si besoin) puis ouvre la page cible. */
  ouvrir(notification: Notification) {
    if (!this.aLien(notification)) return;
    if (!notification.lue) {
      this.service.marquerLue(notification.id).subscribe({
        next: (lue) => this.notifications.update((liste) => liste.map((n) => (n.id === lue.id ? lue : n))),
        error: () => undefined,
      });
    }
    this.router.navigateByUrl(cibleDuLien(notification.lien) as string);
  }

  toutMarquerLu() {
    this.enCours.set('toutes');
    this.erreur.set('');
    this.succes.set('');
    this.service.toutMarquerLu().subscribe({
      next: (nombre) => {
        this.enCours.set(null);
        this.charger();
        this.succes.set(
          nombre > 0
            ? this.l.t(`${nombre} notification(s) marquée(s) lue(s)`, `تم تعليم ${nombre} إشعار(ات) كمقروءة`)
            : this.l.t('Aucune notification à marquer', 'لا توجد إشعارات لتعليمها'),
        );
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.erreur.set(e.error?.erreur ?? this.l.t('Le marquage des notifications a échoué, veuillez réessayer.', 'تعذّر تعليم الإشعارات كمقروءة، يُرجى المحاولة مرة أخرى.'));
      },
    });
  }
}
