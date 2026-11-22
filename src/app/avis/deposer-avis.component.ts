import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { RendezVous, RendezVousService } from '../rendezvous/rendezvous.service';
import { AvisService, LONGUEUR_MAX_COMMENTAIRE, NOTE_MAX, NOTE_MIN } from './avis.service';

/** Notes proposees, de 1 a 5. */
const NOTES = Array.from({ length: NOTE_MAX - NOTE_MIN + 1 }, (_, i) => NOTE_MIN + i);

/**
 * Depot d'un avis par le patient sur un rendez-vous honore (POST /api/avis) : note de 1 a 5 par cinq boutons
 * radio stylises, commentaire facultatif (500 caracteres au plus). Le rendez-vous et le praticien sont rappeles
 * s'ils sont retrouves dans mes rendez-vous ; un rendez-vous retrouve mais non honore masque le formulaire.
 * 409 : le motif { erreur } du backend est affiche (avis deja donne, rendez-vous non honore...).
 */
@Component({
    selector: 'app-deposer-avis',
    imports: [CommonModule, FormsModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <a routerLink="/mes-rendez-vous" style="color:var(--vert)">{{ l.t('Retour à mes rendez-vous', 'العودة إلى مواعيدي') }}</a>
        <app-selecteur-langue />
      </div>
      <h1 style="color:var(--vert);margin:0 0 8px">{{ l.t('Donner mon avis', 'أبدِ رأيك') }}</h1>


      <ng-container *ngIf="connecte()">
        <p *ngIf="rendezVous() as r" style="color:var(--text3);margin:0 0 20px">
          <ng-container *ngIf="!l.ar()">Rendez-vous du {{ r.debut | date:'EEEE d MMMM y à HH:mm' }}<ng-container *ngIf="nomMedecin()"> avec {{ nomMedecin() }}</ng-container>.</ng-container>
          <ng-container *ngIf="l.ar()">موعد بتاريخ <span dir="ltr">{{ r.debut | date:'dd/MM/yyyy HH:mm' }}</span><ng-container *ngIf="nomMedecin()"> مع {{ nomMedecin() }}</ng-container>.</ng-container>
        </p>

        <p *ngIf="succes()" style="color:var(--vert)">
          {{ succes() }} <a routerLink="/mes-avis" style="color:var(--vert)">{{ l.t('Voir mes avis', 'عرض آرائي') }}</a>
        </p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <p *ngIf="nonHonore()" role="alert" style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px;margin:0">
          {{ l.t("Vous pourrez donner votre avis une fois la consultation effectuée : le médecin doit d'abord indiquer que ce rendez-vous a bien eu lieu.", 'يمكنك إبداء رأيك بعد إجراء الاستشارة: يجب أن يشير الطبيب أولًا إلى أن هذا الموعد قد تم فعلًا.') }}
        </p>

        <form *ngIf="!succes() && !nonHonore()" (ngSubmit)="deposer()" style="display:grid;gap:16px">
          <fieldset style="border:0;padding:0;margin:0">
            <legend style="color:var(--text3);font-size:.9rem;margin:0 0 2px">{{ l.t('Votre note', 'تقييمك') }} *</legend>
            <p class="aide-note" style="margin:0 0 6px;color:var(--text3);font-size:.85rem">{{ l.t('1 = insatisfait, 5 = excellent', '1 = غير راضٍ، 5 = ممتاز') }}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <label *ngFor="let n of notes" class="note" [class.note-choisie]="note === n" [attr.aria-label]="l.ar() ? 'التقييم ' + n + ' من 5' : 'Note ' + n + ' sur 5'">
                <input type="radio" name="note" [value]="n" [(ngModel)]="note">{{ n }}
              </label>
              <span style="color:var(--text3);font-size:.9rem;margin-left:4px"><span [attr.dir]="l.ar() ? 'ltr' : null">{{ note !== null ? note + ' / 5' : l.t('Choisissez une note de 1 à 5', 'اختر تقييمًا من 1 إلى 5') }}</span></span>
            </div>
          </fieldset>

          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Commentaire (facultatif)', 'تعليق (اختياري)') }}
            <textarea class="champ" [(ngModel)]="commentaire" name="commentaire" rows="4" [placeholder]="l.t('Accueil, écoute, explications...', 'الاستقبال، الإصغاء، الشرح...')" style="color:var(--tbi-ink);font-size:1rem;resize:vertical"></textarea>
            <span [style.color]="commentaireTropLong() ? '#b3261e' : 'var(--text3)'">{{ commentaire.length }} / {{ maxCommentaire }}</span>
          </label>

          <p class="avis-anonyme" style="margin:0;color:var(--text3);font-size:.9rem">{{ l.t('Votre avis est publié anonymement sur la fiche du praticien.', 'يُنشر رأيك دون ذكر اسمك في صفحة الطبيب.') }}</p>

          <div>
            <button type="submit" class="bouton" [disabled]="enCours() || commentaireTropLong()">
              {{ enCours() ? l.t('Envoi…', 'جارٍ الإرسال…') : l.t('Envoyer mon avis', 'إرسال رأيي') }}
            </button>
          </div>
        </form>
      </ng-container>
    </main>
  `
})
export class DeposerAvisComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private service = inject(AvisService);
  private rendezVousService = inject(RendezVousService);
  private annuaire = inject(AnnuaireService);
  l = inject(LangueService);

  private rendezVousId = '';
  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Le rendez-vous note, s'il est retrouve dans mes rendez-vous (rappel de la date et du praticien). */
  rendezVous = signal<RendezVous | null>(null);
  nomMedecin = signal<string | null>(null);
  notes = NOTES;
  /** Note choisie ; null tant qu'aucun bouton n'est coche. */
  note: number | null = null;
  commentaire = '';
  maxCommentaire = LONGUEUR_MAX_COMMENTAIRE;
  enCours = signal(false);
  succes = signal('');
  erreur = signal('');

  async ngOnInit() {
    this.rendezVousId = this.route.snapshot.paramMap.get('rendezVousId') ?? '';
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.chargerRendezVous();
  }

  deposer() {
    this.succes.set('');
    if (this.note === null) {
      this.erreur.set(this.l.t('Choisissez une note de 1 à 5.', 'اختر تقييمًا من 1 إلى 5.'));
      return;
    }
    if (this.commentaireTropLong()) {
      this.erreur.set(this.l.t(`Le commentaire ne peut pas dépasser ${LONGUEUR_MAX_COMMENTAIRE} caractères.`, `لا يمكن أن يتجاوز التعليق ${LONGUEUR_MAX_COMMENTAIRE} حرفًا.`));
      return;
    }
    const commentaire = this.commentaire.trim();
    this.erreur.set('');
    this.enCours.set(true);
    this.service.deposer(this.rendezVousId, this.note, commentaire || null).subscribe({
      next: () => {
        this.enCours.set(false);
        this.succes.set(this.l.t('Merci pour votre avis.', 'شكرًا على رأيك.'));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409) {
          this.erreur.set(e.error?.erreur ?? this.l.t('Vous avez déjà donné votre avis pour ce rendez-vous.', 'لقد أبديت رأيك في هذا الموعد من قبل.'));
        } else if (e.status === 403) {
          this.erreur.set(e.error?.erreur ?? this.l.t('Seul le patient du rendez-vous peut donner son avis.', 'يمكن لمريض هذا الموعد فقط إبداء رأيه.'));
        } else if (e.status === 404) {
          this.erreur.set(this.l.t('Rendez-vous introuvable.', 'الموعد غير موجود.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t("L'envoi de l'avis a échoué, veuillez réessayer.", 'تعذّر إرسال الرأي، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /** Vrai si le rendez-vous est retrouve et n'est pas encore honore : l'avis n'est pas encore possible. */
  nonHonore(): boolean {
    const r = this.rendezVous();
    return r !== null && r.statut !== 'HONORE';
  }

  commentaireTropLong(): boolean {
    return this.commentaire.length > LONGUEUR_MAX_COMMENTAIRE;
  }

  /** Rappel du rendez-vous (date, praticien) ; a defaut, le formulaire reste utilisable. */
  private chargerRendezVous() {
    this.rendezVousService.mes().subscribe({
      next: (liste) => {
        const r = liste.find((x) => x.id === this.rendezVousId) ?? null;
        this.rendezVous.set(r);
        if (!r) return;
        this.annuaire.medecin(r.medecinId).subscribe({
          next: (m) => this.nomMedecin.set(m.nomComplet),
          error: () => undefined,
        });
      },
      error: () => undefined,
    });
  }
}
