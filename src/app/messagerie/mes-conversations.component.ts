import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { PatientsService, RepertoirePatients } from '../medecin/patients.service';
import { Conversation, MessagerieService, abregerIdentifiant, trierParActivite } from './messagerie.service';

/**
 * Mes conversations (GET /api/conversations), la plus recente activite d'abord. L'interlocuteur est le
 * medecin (nom lu dans l'annuaire) quand je suis le patient, sinon « Patient » suivi d'un identifiant abrege ;
 * chaque ligne mene au fil et affiche le nombre de messages non lus.
 */
@Component({
    selector: 'app-mes-conversations',
    imports: [CommonModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--vert);margin:0 0 16px">{{ l.t('Messagerie', 'الرسائل') }}</h1>
        <app-selecteur-langue />
      </div>


      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let c of conversations()" style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px"
              [class.conversation-non-lue]="c.nonLus > 0">
            <a [routerLink]="['/messagerie', c.id]"
               style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;color:inherit;text-decoration:none">
              <span>
                <strong>{{ interlocuteur(c) }}</strong><br>
                <span style="color:var(--text3)" *ngIf="!c.dernierMessageLe && !c.creeLe">{{ l.t('Aucun message', 'لا توجد رسائل') }}</span>
                <span style="color:var(--text3)" *ngIf="!c.dernierMessageLe && c.creeLe && !l.ar()">Ouverte le {{ c.creeLe | date:'EEEE d MMMM à HH:mm' }}</span>
                <span style="color:var(--text3)" *ngIf="!c.dernierMessageLe && c.creeLe && l.ar()">فُتحت في <span dir="ltr">{{ c.creeLe | date:'dd/MM/yyyy HH:mm' }}</span></span>
                <span style="color:var(--text3)" *ngIf="c.dernierMessageLe && !l.ar()">Dernier message le {{ c.dernierMessageLe | date:'EEEE d MMMM à HH:mm' }}</span>
                <span style="color:var(--text3)" *ngIf="c.dernierMessageLe && l.ar()">آخر رسالة في <span dir="ltr">{{ c.dernierMessageLe | date:'dd/MM/yyyy HH:mm' }}</span></span>
              </span>
              <span *ngIf="c.fermee" data-testid="liste-fermee" style="color:var(--text3)">{{ l.t('Fermée', 'مغلقة') }}</span>
              <span *ngIf="c.nonLus > 0" style="color:var(--vert);font-weight:600">{{ libelleNonLus(c.nonLus) }}</span>
            </a>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && conversations().length === 0">
          {{ l.t('Aucune conversation pour le moment.', 'لا توجد محادثات حاليًا.') }}
          <ng-container *ngIf="!estMedecin()">
            {{ l.t('Vous pouvez écrire à un médecin depuis sa fiche, une fois un rendez-vous pris.', 'يمكنك مراسلة طبيب من صفحته بعد حجز موعد.') }}
            <a routerLink="/" style="color:var(--vert)">{{ l.t('Trouver un praticien', 'ابحث عن طبيب') }}</a>
          </ng-container>
        </p>
      </ng-container>
    </main>
  `
})
export class MesConversationsComponent implements OnInit {
  l = inject(LangueService);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private service = inject(MessagerieService);
  private annuaire = inject(AnnuaireService);
  private patientsService = inject(PatientsService);
  /** Patients du medecin connecte (noms), charges une fois si je suis medecin ; vide sinon ou en cas d'echec. */
  private patients = signal<RepertoirePatients>(new Map());

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Identifiant de l'utilisateur connecte (sujet du jeton, lu sur /api/moi) ; null s'il est inconnu. */
  moi = signal<string | null>(null);
  estMedecin = this.roleService.estMedecin;
  conversations = signal<Conversation[]>([]);
  /** Nom complet des praticiens, par identifiant. */
  noms = signal<Partial<Record<string, string>>>({});
  charge = signal(false);
  erreur = signal('');

  async ngOnInit() {
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    const profil = await this.roleService.charger();
    this.moi.set(profil?.sujet ?? null);
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.mesConversations().subscribe({
      next: (liste) => {
        // La plus recente activite d'abord.
        this.conversations.set(trierParActivite(liste));
        this.chargerNoms(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette page est réservée aux patients et aux médecins.', 'هذه الصفحة مخصّصة للمرضى والأطباء.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos conversations.', 'تعذّر تحميل المحادثات.'));
        }
      },
    });
  }

  /** Pastille des non lus, comme l'appli : « 1 non lu », « 3 non lus ». */
  libelleNonLus(n: number): string {
    if (n === 1) return this.l.t('1 non lu', 'رسالة واحدة غير مقروءة');
    return this.l.t(`${n} non lus`, `${n} غير مقروءة`);
  }

  /** Libelle de l'autre participant : le medecin (nom de l'annuaire) si je suis le patient, sinon le patient abrege. */
  interlocuteur(c: Conversation): string {
    if (this.jeSuisLePatient(c)) {
      return this.noms()[c.medecinId] ?? this.l.t('Médecin', 'طبيب');
    }
    const nom = this.patients().get(c.patientId)?.nomComplet?.trim();
    return nom || `${this.l.t('Patient', 'مريض')} ${abregerIdentifiant(c.patientId)}`;
  }

  /** Vrai si je suis le patient de la conversation ; a defaut d'identifiant connu, on se fie au role. */
  private jeSuisLePatient(c: Conversation): boolean {
    const moi = this.moi();
    return moi ? c.patientId === moi : !this.estMedecin();
  }

  /** Recupere (une seule fois par praticien) le nom des medecins des conversations ou je suis le patient. */
  private chargerNoms(liste: Conversation[]) {
    if (this.estMedecin() && this.patients().size === 0 && liste.some((c) => !this.jeSuisLePatient(c))) {
      this.patientsService.patientsDuMedecin().subscribe({
        next: (r) => this.patients.set(r),
        error: () => undefined,
      });
    }
    const ids = new Set(liste.filter((c) => this.jeSuisLePatient(c)).map((c) => c.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe({
        next: (m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })),
        error: () => undefined,
      });
    }
  }
}
