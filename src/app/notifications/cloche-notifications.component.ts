import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { EMPTY, Subject, Subscription, catchError, merge, switchMap, timer } from 'rxjs';
import { NotificationService } from './notification.service';

/** Intervalle de rafraichissement du compteur de notifications non lues. */
const INTERVALLE_RAFRAICHISSEMENT_MS = 60_000;

/**
 * Cloche de la barre de navigation (utilisateur connecte) : lien « Notifications » avec le nombre de
 * non lues entre parentheses. Le compteur est relu toutes les 60 s, a chaque clic et apres chaque
 * marquage lu (NotificationService.changements$) ; l'abonnement est ferme a la destruction du composant.
 * Cote serveur (SSR), aucune minuterie n'est lancee : elle empecherait le rendu de se terminer.
 */
@Component({
  selector: 'app-cloche-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <a routerLink="/notifications" routerLinkActive="actif" (click)="rafraichir()"
       [attr.aria-label]="nonLues() > 0 ? 'Notifications, ' + nonLues() + ' non lues' : 'Notifications'">
      Notifications<ng-container *ngIf="nonLues() > 0"> ({{ nonLues() }})</ng-container>
    </a>
  `,
})
export class ClocheNotificationsComponent implements OnInit, OnDestroy {
  private service = inject(NotificationService);
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  /** Demandes de rafraichissement immediat (clic), en plus du tic periodique. */
  private demandes = new Subject<void>();
  private abonnement: Subscription | null = null;

  nonLues = signal(0);

  ngOnInit() {
    if (!this.navigateur) return;
    this.abonnement = merge(timer(0, INTERVALLE_RAFRAICHISSEMENT_MS), this.demandes, this.service.changements$)
      .pipe(
        // Une erreur (API indisponible, jeton expire) laisse le dernier compteur connu sans casser le flux.
        switchMap(() => this.service.nombreNonLues().pipe(catchError(() => EMPTY))),
      )
      .subscribe((nombre) => this.nonLues.set(nombre));
  }

  ngOnDestroy() {
    this.abonnement?.unsubscribe();
    this.abonnement = null;
  }

  rafraichir() {
    this.demandes.next();
  }
}
