import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { AvisPublic, AvisService, SyntheseAvis, formaterMoyenne } from '../avis/avis.service';

/**
 * Avis publics recus par le medecin connecte (GET /api/medecins/{moi}/avis, ou « moi » est le sujet du jeton lu
 * sur /api/moi) et signalement d'un avis a l'equipe Ndawik (POST /api/avis/{id}/signaler) : l'avis signale
 * reste visible jusqu'a la decision de l'equipe ; il est marque « Signalé » dans la page.
 */
@Component({
    selector: 'app-avis-medecin',
    imports: [CommonModule, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--blue);margin:0 0 8px">{{ l.t('Avis des patients', 'آراء المرضى') }}</h1>
        <app-selecteur-langue />
      </div>
      <p style="color:var(--text3);margin:0 0 16px">
        {{ l.t("Avis publiés sur votre fiche, anonymes. Un avis signalé reste visible jusqu'à la décision de l'équipe Ndawik.", 'آراء منشورة على صفحتك، بدون ذكر الأسماء. يبقى الرأي المُبلَّغ عنه ظاهرًا حتى قرار فريق نداويك.') }}
      </p>

      <p *ngIf="charge()" style="color:var(--text3)">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
      <p *ngIf="succes()" style="color:var(--blue)">{{ succes() }}</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>
      <p *ngIf="synthese()" style="margin:0 0 12px"><strong>{{ libelle() }}</strong></p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let a of avis()"
            style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r12);padding:14px 16px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <strong>{{ a.note }} / 5</strong>
            <span style="color:var(--text3)"> · <span [attr.dir]="l.ar() ? 'ltr' : null">{{ a.deposeLe | date:(l.ar() ? 'dd/MM/yyyy' : 'd MMMM yyyy') }}</span></span>
            <p *ngIf="a.commentaire" style="margin:6px 0 0;white-space:pre-wrap">{{ a.commentaire }}</p>
          </div>
          <span *ngIf="estSignale(a)"
                style="display:inline-block;background:var(--red-l);color:var(--red);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600">{{ l.t('Signalé', 'مُبلَّغ عنه') }}</span>
          <button *ngIf="!estSignale(a)" type="button" class="bouton-secondaire" (click)="signaler(a)" [disabled]="enCours() !== null">
            {{ enCours() === a.id ? l.t('Signalement…', 'جارٍ الإبلاغ…') : l.t('Signaler', 'إبلاغ') }}
          </button>
        </li>
      </ul>
    </main>
  `
})
export class AvisMedecinComponent implements OnInit {
  l = inject(LangueService);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private service = inject(AvisService);

  /** Identifiant du medecin connecte (sujet du jeton) ; vide tant qu'il est inconnu. */
  private moi = '';
  synthese = signal<SyntheseAvis | null>(null);
  charge = signal(false);
  /** Identifiant de l'avis en cours de signalement. */
  enCours = signal<string | null>(null);
  /** Avis signales depuis cette page, en complement du champ `signale` renvoye par l'API. */
  signales = signal<ReadonlySet<string>>(new Set());
  succes = signal('');
  erreur = signal('');

  libelle = computed(() => {
    const s = this.synthese();
    return s ? formaterMoyenne(s.moyenne, s.nombre, this.l.ar()) : '';
  });

  /** Avis publies, les plus recents d'abord. */
  avis = computed<AvisPublic[]>(() => {
    const s = this.synthese();
    return s ? [...s.avis].sort((a, b) => Date.parse(b.deposeLe) - Date.parse(a.deposeLe)) : [];
  });

  async ngOnInit() {
    const profil = await this.roleService.charger();
    this.moi = profil?.sujet ?? '';
    if (!this.moi) {
      this.erreur.set(this.l.t('Impossible de lire votre profil, veuillez réessayer.', 'تعذّر قراءة ملفك الشخصي، يرجى إعادة المحاولة.'));
      return;
    }
    this.charger();
  }

  /** Recharge la synthese ; `motif` est un message d'erreur a conserver a l'ecran (etat depasse apres un 409). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.synthese(this.moi).subscribe({
      next: (s) => {
        this.synthese.set(s);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos avis.', 'تعذّر تحميل آرائك.'));
        }
      },
    });
  }

  signaler(a: AvisPublic) {
    // Confirmation avant l'envoi, comme dans l'appli (« Signaler cet avis ? »).
    const message = this.l.t(
      "Signaler cet avis ? Il reste visible jusqu'à la décision de l'équipe Ndawik.",
      'الإبلاغ عن هذا الرأي؟ يبقى ظاهرًا حتى قرار فريق نداويك.',
    );
    if (!window.confirm(message)) return;
    this.enCours.set(a.id);
    this.succes.set('');
    this.erreur.set('');
    this.service.signaler(a.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.marquerSignale(a.id);
        this.succes.set(this.l.t("Avis signalé : il reste visible jusqu'à la décision de l'équipe Ndawik.", 'تم الإبلاغ عن الرأي، ويبقى ظاهرًا حتى قرار فريق نداويك.'));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cet avis ne vous concerne pas.', 'هذا الرأي لا يخصّك.'));
        } else if (e.status === 409) {
          this.marquerSignale(a.id);
          this.erreur.set(e.error?.erreur ?? this.l.t('Cet avis a déjà été signalé.', 'تم الإبلاغ عن هذا الرأي من قبل.'));
        } else if (e.status === 404) {
          this.charger(e.error?.erreur ?? this.l.t("Cet avis n'existe plus.", 'هذا الرأي لم يعد موجودًا.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Le signalement a échoué, veuillez réessayer.', 'فشل الإبلاغ، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  estSignale(a: AvisPublic): boolean {
    return a.signale === true || this.signales().has(a.id);
  }

  private marquerSignale(id: string) {
    this.signales.update((s) => new Set([...s, id]));
  }
}
