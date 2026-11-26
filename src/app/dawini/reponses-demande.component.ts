import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { instantLisible, trierParDateAncienneDabord } from '../partage/dates-lisibles';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { Besoin, DawiniService, Reponse, estOuvert, formaterPrix, libelleDisponibilite, libelleStatutBesoin, libelleWilaya } from './dawini.service';

/**
 * Reponses des pharmacies a l'une de mes demandes (GET /api/dawini/besoins/{id}/reponses, les plus anciennes
 * d'abord) : pharmacie, disponibilite, prix en dinars, commentaire, date ; « Clôturer la demande » tant qu'elle est
 * ouverte, apres confirmation dans la page (POST .../cloturer). La demande elle-meme est retrouvee dans mes demandes (pas de lecture unitaire cote API).
 */
@Component({
    selector: 'app-reponses-demande',
    imports: [CommonModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <a routerLink="/dawini" style="color:var(--vert)">{{ l.t('Retour à mes demandes', 'العودة إلى طلباتي') }}</a>
        <app-selecteur-langue />
      </div>
      <h1 style="color:var(--vert);margin:0 0 8px">{{ besoin()?.medicament ?? l.t('Ma demande', 'طلبي') }}</h1>


      <ng-container *ngIf="connecte()">
        <ng-container *ngIf="besoin() as b">
          <p style="color:var(--text3);margin:0 0 16px">
            {{ libelleStatut(b.statut) }} · {{ wilaya(b.wilayaCode) }}<ng-container *ngIf="b.commune"> · {{ b.commune }}</ng-container>
            <ng-container *ngIf="dateLisible(b.publieLe); else dateInconnue">
              <ng-container *ngIf="!l.ar()">· publiée le {{ b.publieLe | date:'d MMMM à HH:mm' }}</ng-container>
              <ng-container *ngIf="l.ar()">· نُشر في <span dir="ltr">{{ b.publieLe | date:'dd/MM/yyyy HH:mm' }}</span></ng-container>
            </ng-container>
            <ng-template #dateInconnue>· {{ l.t('date inconnue', 'تاريخ غير معروف') }}</ng-template>
            <ng-container *ngIf="dateLisible(b.clotureLe)">
              <ng-container *ngIf="!l.ar()"> · clôturée le {{ b.clotureLe | date:'d MMMM à HH:mm' }}</ng-container>
              <ng-container *ngIf="l.ar()"> · أُغلق في <span dir="ltr">{{ b.clotureLe | date:'dd/MM/yyyy HH:mm' }}</span></ng-container>
            </ng-container>
            <ng-container *ngIf="b.precision"><br>{{ b.precision }}</ng-container>
          </p>
          <p *ngIf="estOuvert(b) && !aConfirmer()" style="margin:0 0 16px">
            <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(true)" [disabled]="enCours()">{{ l.t('Clôturer la demande', 'إغلاق الطلب') }}</button>
          </p>
          <div *ngIf="estOuvert(b) && aConfirmer()" role="group" [attr.aria-label]="l.t('Confirmer la clôture', 'تأكيد الإغلاق')"
               style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 16px">
            <span style="font-weight:600">{{ l.t('Clôturer cette demande ? Les pharmacies ne la verront plus.', 'إغلاق هذا الطلب؟ لن تراه الصيدليات بعد الآن.') }}</span>
            <button type="button" class="bouton" (click)="cloturer()" [disabled]="enCours()">{{ enCours() ? l.t('Clôture…', 'جارٍ الإغلاق…') : l.t('Oui, clôturer', 'نعم، أغلق') }}</button>
            <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(false)" [disabled]="enCours()">{{ l.t('Non', 'لا') }}</button>
          </div>
        </ng-container>

        <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
        <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>

        <h2 style="font-size:1.1rem;margin:0 0 12px">{{ l.t('Réponses des pharmacies', 'ردود الصيدليات') }}</h2>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let r of reponses()" style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px;padding:14px">
            <strong>{{ r.nomPharmacie }}</strong>
            <span [style.color]="r.disponible ? 'var(--vert)' : '#b3261e'"> · {{ dispo(r.disponible) }}</span>
            <span *ngIf="r.disponible && r.prixDa !== null" style="color:var(--text3)"> · {{ prix(r.prixDa) }}</span>
            <span style="color:var(--text3)"> · <ng-container *ngIf="dateLisible(r.repondueLe); else dateReponseInconnue"><span [attr.dir]="l.ar() ? 'ltr' : null">{{ r.repondueLe | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'd MMMM à HH:mm') }}</span></ng-container><ng-template #dateReponseInconnue>{{ l.t('date inconnue', 'تاريخ غير معروف') }}</ng-template></span>
            <p *ngIf="r.commentaire" style="margin:6px 0 0;white-space:pre-wrap">{{ r.commentaire }}</p>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && reponses().length === 0">{{ l.t('Aucune réponse pour le moment.', 'لا توجد ردود حاليًا.') }}</p>
      </ng-container>
    </main>
  `
})
export class ReponsesDemandeComponent implements OnInit {
  l = inject(LangueService);
  dateLisible = (iso: string | null | undefined) => instantLisible(iso) !== null;
  /** Nom de la wilaya (referentiel) plutot que son code, dans la langue de l'ecran. */
  wilaya = (code: string | null | undefined) => libelleWilaya(code, this.l.ar());
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private service = inject(DawiniService);

  private besoinId = '';
  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** La demande, retrouvee dans mes demandes ; null tant qu'elle est inconnue. */
  besoin = signal<Besoin | null>(null);
  reponses = signal<Reponse[]>([]);
  charge = signal(false);
  enCours = signal(false);
  /** Vrai pendant la confirmation dans la page de la cloture (« Oui, clôturer » / « Non »). */
  aConfirmer = signal(false);
  succes = signal('');
  erreur = signal('');

  async ngOnInit() {
    this.besoinId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.chargerBesoin();
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.reponses(this.besoinId).subscribe({
      next: (liste) => {
        // Les plus anciennes d'abord.
        this.reponses.set(trierParDateAncienneDabord(liste, (r) => r.repondueLe));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette demande ne vous appartient pas.', 'هذا الطلب لا يخصّك.'));
        } else if (e.status === 404) {
          this.erreur.set(this.l.t('Demande introuvable.', 'الطلب غير موجود.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger les réponses.', 'تعذّر تحميل الردود.'));
        }
      },
    });
  }

  /** Cloture : les pharmacies ne voient plus la demande ; 409 (deja cloturee) affiche le motif et recharge la demande. */
  cloturer() {
    this.enCours.set(true);
    this.succes.set('');
    this.erreur.set('');
    this.service.cloturer(this.besoinId).subscribe({
      next: (b) => {
        this.enCours.set(false);
        this.aConfirmer.set(false);
        this.besoin.set(b);
        this.succes.set(this.l.t('Demande clôturée : les pharmacies ne la voient plus.', 'تم إغلاق الطلب: لم تعد الصيدليات تراه.'));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        this.aConfirmer.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409) {
          this.erreur.set(e.error?.erreur ?? this.l.t('Cette demande est déjà clôturée.', 'هذا الطلب مغلق من قبل.'));
          this.chargerBesoin();
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('La clôture a échoué, veuillez réessayer.', 'فشل الإغلاق، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  estOuvert = estOuvert;

  libelleStatut(statut: string): string {
    return libelleStatutBesoin(statut, this.l.ar());
  }

  dispo(disponible: boolean): string {
    return libelleDisponibilite(disponible, this.l.ar());
  }

  prix(prixDa: number | null): string {
    return formaterPrix(prixDa, this.l.ar());
  }

  /** Retrouve la demande dans mes demandes (statut, bouton de cloture) ; a defaut, seules les reponses s'affichent. */
  private chargerBesoin() {
    this.service.mesBesoins().subscribe({
      next: (liste) => this.besoin.set(liste.find((b) => b.id === this.besoinId) ?? null),
      error: () => undefined,
    });
  }
}
