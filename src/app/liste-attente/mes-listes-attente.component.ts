import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { libelleMedecin } from '../messagerie/messagerie.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { InscriptionAttente, ListeAttenteService, instantInscription, trierParInscription } from './liste-attente.service';

/**
 * Mes listes d'attente (role PATIENT) : inscriptions du patient (GET /api/liste-attente/mes), les plus anciennes
 * d'abord, avec le nom du praticien lu dans l'annuaire et le retrait (POST /api/liste-attente/{id}/retirer).
 */
@Component({
    selector: 'app-mes-listes-attente',
    imports: [CommonModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--vert);margin:0 0 8px">{{ l.t("Mes listes d'attente", 'قوائم الانتظار') }}</h1>
        <app-selecteur-langue />
      </div>
      <p style="color:var(--text3);margin:0 0 20px">
        {{ l.t("Vous serez notifié dès qu'un créneau se libère chez l'un de ces praticiens.", 'سيتم إشعارك فور توفر موعد لدى أحد هؤلاء الأطباء.') }}
      </p>


      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
        <p *ngIf="succes()" role="status" style="color:var(--vert)">{{ succes() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let i of inscriptions()"
              style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <a [routerLink]="['/medecins', i.medecinId]" style="color:var(--vert);font-weight:600">{{ noms()[i.medecinId] ?? libelleMedecin(i.medecinId, l.ar()) }}</a><br>
              <span style="color:var(--text3)" *ngIf="!date(i)">{{ l.t("Date d'inscription inconnue", 'تاريخ التسجيل غير معروف') }}</span>
              <span style="color:var(--text3)" *ngIf="date(i) && !l.ar()">Inscrit le {{ i.inscritLe | date:'d MMMM yyyy à HH:mm' }}</span>
              <span style="color:var(--text3)" *ngIf="date(i) && l.ar()">التسجيل في <span dir="ltr">{{ i.inscritLe | date:'dd/MM/yyyy HH:mm' }}</span></span>
            </div>
            <button *ngIf="aConfirmer() !== i.id" type="button" (click)="aConfirmer.set(i.id)" [disabled]="enCours() !== null"
                    style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
              {{ l.t('Me retirer', 'انسحاب') }}
            </button>
            <div *ngIf="aConfirmer() === i.id" role="group" [attr.aria-label]="l.t('Confirmer le retrait', 'تأكيد الانسحاب')"
                 style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span><strong>{{ l.t("Vous retirer de cette liste d'attente ?", 'الانسحاب من قائمة الانتظار هذه؟') }}</strong> {{ l.t('Vous ne serez plus notifié des créneaux libérés.', 'لن يتم إشعارك بعد الآن بالمواعيد الشاغرة.') }}</span>
              <button type="button" (click)="retirer(i)" [disabled]="enCours() !== null"
                      style="padding:10px 16px;background:#b3261e;color:#fff;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
                {{ enCours() === i.id ? l.t('Retrait…', 'جارٍ الانسحاب…') : l.t('Oui, me retirer', 'نعم، انسحب') }}
              </button>
              <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="enCours() !== null">{{ l.t('Non, rester inscrit', 'لا، البقاء مسجّلًا') }}</button>
            </div>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && inscriptions().length === 0">
          {{ l.t("Vous n'êtes inscrit sur aucune liste d'attente. Inscrivez-vous depuis la fiche d'un médecin : vous serez notifié dès qu'un créneau se libère.", 'لست مسجّلًا في أي قائمة انتظار. سجّل من صفحة الطبيب، وسيتم إشعارك فور توفر موعد.') }}
          <a routerLink="/" style="color:var(--vert)">{{ l.t('Trouver un praticien', 'ابحث عن طبيب') }}</a>
        </p>
      </ng-container>
    </main>
  `
})
export class MesListesAttenteComponent implements OnInit {
  l = inject(LangueService);
  private auth = inject(AuthService);
  private service = inject(ListeAttenteService);
  private annuaire = inject(AnnuaireService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  inscriptions = signal<InscriptionAttente[]>([]);
  /** Nom complet des praticiens, par identifiant. */
  noms = signal<Partial<Record<string, string>>>({});
  charge = signal(false);
  /** Identifiant de l'inscription dont le retrait est en cours. */
  enCours = signal<string | null>(null);
  /** Inscription dont le retrait attend la confirmation du patient (confirmation dans la page). */
  aConfirmer = signal<string | null>(null);
  erreur = signal('');
  /** Confirmation apres un retrait (comme dans l'appli). */
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

  /** Instant d'inscription, null si la date est absente ou illisible (message « Date d'inscription inconnue »). */
  date(i: InscriptionAttente): number | null {
    return instantInscription(i);
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.mes().subscribe({
      next: (liste) => {
        this.inscriptions.set(trierParInscription(liste));
        this.chargerNoms(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette page est réservée aux patients.', 'هذه الصفحة مخصّصة للمرضى.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t("Impossible de charger vos listes d'attente.", 'تعذّر تحميل قوائم الانتظار.'));
        }
      },
    });
  }

  retirer(inscription: InscriptionAttente) {
    this.enCours.set(inscription.id);
    this.erreur.set('');
    this.succes.set('');
    this.service.retirer(inscription.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        this.inscriptions.update((liste) => liste.filter((i) => i.id !== inscription.id));
        this.succes.set(this.l.t("Retrait de la liste d'attente effectué.", 'تم الانسحاب من قائمة الانتظار.'));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        if (e.status === 404) {
          // Deja retiree (autre onglet) : la liste est rechargee.
          this.charger();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Le retrait a échoué, veuillez réessayer.', 'فشل الانسحاب، يُرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /** Recupere (une seule fois par praticien) le nom des medecins des inscriptions ; un echec laisse le lien generique. */
  private chargerNoms(liste: InscriptionAttente[]) {
    const ids = new Set(liste.map((i) => i.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe({
        next: (m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })),
        error: () => undefined,
      });
    }
  }
}
