import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { Invitation, SecretaireService } from './secretaire.service';
import { instantLisible } from '../partage/dates-lisibles';

interface InvitationAffichee extends Invitation {
  medecinNom: string;
  medecinDetail: string;
}

/**
 * Invitations a gerer l'agenda d'un cabinet (lien des notifications « Invitation à rejoindre un cabinet ») :
 * la personne invitee accepte ou refuse. Rien n'est accessible avant l'acceptation.
 */
@Component({
    selector: 'app-invitations',
    imports: [CommonModule, SelecteurLangueComponent],
    template: `
    <main style="max-width:640px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--blue);margin:0 0 8px">{{ l.t('Invitations de cabinet', 'دعوات العيادات') }}</h1>
        <app-selecteur-langue />
      </div>
      <p style="color:var(--text3);margin:0 0 20px">
        {{ l.t("Un médecin vous propose de gérer l'agenda de son cabinet (rendez-vous, créneaux, patients). Acceptez seulement si vous travaillez réellement pour lui.", 'يقترح عليك طبيب إدارة مواعيد عيادته (المواعيد والفترات المتاحة والمرضى). اقبل فقط إذا كنت تعمل لديه فعلًا.') }}
      </p>

      <p *ngIf="charge()" style="color:var(--text3)">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>
      <p *ngIf="succes()" style="color:var(--blue)">{{ succes() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:12px">
        <li *ngFor="let i of invitations()"
            style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r16);padding:16px 18px;display:grid;gap:12px">
          <div>
            <strong style="color:var(--ink);font-size:1.05rem">{{ i.medecinNom }}</strong>
            <div *ngIf="i.medecinDetail" style="color:var(--text3);font-size:.9rem">{{ i.medecinDetail }}</div>
            <div *ngIf="dateLisible(i.creeLe)" class="date-invitation" style="color:var(--text3);font-size:.85rem">{{ l.t('Invitation du', 'دعوة بتاريخ') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ i.creeLe | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'd MMMM yyyy à HH:mm') }}</span></div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button type="button" class="bouton" (click)="accepter(i)" [disabled]="enCours() !== null">
              {{ enCours() === i.id ? l.t('Patientez…', 'يرجى الانتظار…') : l.t('Accepter', 'قبول') }}
            </button>
            <button type="button" class="bouton-secondaire" (click)="refuser(i)" [disabled]="enCours() !== null">{{ l.t('Refuser', 'رفض') }}</button>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && invitations().length === 0 && !succes()" style="color:var(--text3)">
        {{ l.t('Aucune invitation en attente.', 'لا توجد دعوات في الانتظار.') }}
      </p>
    </main>
  `
})
export class InvitationsComponent implements OnInit {
  l = inject(LangueService);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private service = inject(SecretaireService);
  private annuaire = inject(AnnuaireService);
  private router = inject(Router);

  invitations = signal<InvitationAffichee[]>([]);
  charge = signal(false);
  enCours = signal<string | null>(null);
  erreur = signal('');
  succes = signal('');

  /** Vrai si la date est lisible (sinon elle n'est pas affichee, comme dans l'appli). */
  dateLisible = (iso: string | null | undefined) => instantLisible(iso) !== null;

  async ngOnInit() {
    await this.auth.pret();
    if (!this.auth.estConnecte()) {
      this.auth.seConnecter('/invitations');
      return;
    }
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.invitations().subscribe({
      next: (liste) => {
        if (liste.length === 0) {
          this.invitations.set([]);
          this.charge.set(false);
          return;
        }
        forkJoin(
          liste.map((i) =>
            this.annuaire.medecin(i.medecinId).pipe(
              map((m) => ({ ...i, medecinNom: m.nomComplet, medecinDetail: [m.specialiteFr, m.ville || m.wilayaFr].filter(Boolean).join(' · ') })),
              catchError(() => of({ ...i, medecinNom: this.l.t('Un médecin', 'طبيب'), medecinDetail: '' })),
            ),
          ),
        ).subscribe((affichees) => {
          this.invitations.set(affichees);
          this.charge.set(false);
        });
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter('/invitations');
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos invitations.', 'تعذّر تحميل دعواتك.'));
        }
      },
    });
  }

  accepter(i: InvitationAffichee) {
    this.enCours.set(i.id);
    this.erreur.set('');
    this.service.accepterInvitation(i.id).subscribe({
      next: async () => {
        // Le role SECRETAIRE vient d'etre accorde : on relit le jeton pour ouvrir l'espace secretaire tout de suite.
        await this.auth.actualiserRoles();
        await this.roleService.recharger();
        this.enCours.set(null);
        this.router.navigateByUrl('/secretaire', { state: { invitationAcceptee: true } });
      },
      error: (e: HttpErrorResponse) => this.echec(e),
    });
  }

  refuser(i: InvitationAffichee) {
    this.enCours.set(i.id);
    this.erreur.set('');
    this.service.refuserInvitation(i.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.succes.set(this.l.t('Invitation refusée : le médecin est prévenu.', 'تم رفض الدعوة وتم إعلام الطبيب.'));
        this.charger();
      },
      error: (e: HttpErrorResponse) => this.echec(e),
    });
  }

  private echec(e: HttpErrorResponse) {
    this.enCours.set(null);
    if (e.status === 401) {
      this.auth.seConnecter('/invitations');
    } else {
      this.erreur.set(e.error?.erreur ?? this.l.t("L'opération a échoué, veuillez réessayer.", 'فشلت العملية، يرجى المحاولة مرة أخرى.'));
      this.charger();
    }
  }
}
