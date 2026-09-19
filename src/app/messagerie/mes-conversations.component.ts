import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { Conversation, MessagerieService, abregerIdentifiant } from './messagerie.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';

/**
 * Mes conversations (GET /api/conversations), la plus recente activite d'abord. L'interlocuteur est le
 * medecin (nom lu dans l'annuaire) quand je suis le patient, sinon « Patient » suivi d'un identifiant abrege ;
 * chaque ligne mene au fil et affiche le nombre de messages non lus.
 */
@Component({
  selector: 'app-mes-conversations',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">{{ 'messagerie.titre' | t }}</h1>

      <p *ngIf="connecte() === false">{{ 'commun.redirectionConnexion' | t }}</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let c of conversations()" style="border:1px solid #e4e9e7;border-radius:12px"
              [class.conversation-non-lue]="c.nonLus > 0">
            <a [routerLink]="['/messagerie', c.id]"
               style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;color:inherit;text-decoration:none">
              <span>
                <strong>{{ interlocuteur(c) }}</strong><br>
                <span style="color:#566b64">{{ 'messagerie.derniereActivite' | t:{ date: (c.dernierMessageLe | dateLocale:'jourHeure') } }}</span>
              </span>
              <span *ngIf="c.nonLus > 0" style="color:var(--vert);font-weight:600">{{ 'messagerie.nonLus' | t:{ n: c.nonLus } }}</span>
            </a>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && conversations().length === 0">
          {{ 'messagerie.aucune' | t }}
          <ng-container *ngIf="!estMedecin()">
            {{ 'messagerie.ecrireDepuisFiche' | t }}
            <a routerLink="/" style="color:var(--vert)">{{ 'commun.trouverPraticien' | t }}</a>
          </ng-container>
        </p>
      </ng-container>
    </main>
  `,
})
export class MesConversationsComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private service = inject(MessagerieService);
  private annuaire = inject(AnnuaireService);
  private i18n = inject(TraductionService);

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
    this.seo.definirPrivee('seo.messagerie');
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
        this.conversations.set([...liste].sort((a, b) => Date.parse(b.dernierMessageLe) - Date.parse(a.dernierMessageLe)));
        this.chargerNoms(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reservePatientsMedecins'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('messagerie.erreurChargement'));
        }
      },
    });
  }

  /** Libelle de l'autre participant : le medecin (nom de l'annuaire) si je suis le patient, sinon le patient abrege. */
  interlocuteur(c: Conversation): string {
    if (this.jeSuisLePatient(c)) {
      return this.noms()[c.medecinId] ?? this.i18n.t('commun.medecin');
    }
    return this.i18n.t('commun.patient', { id: abregerIdentifiant(c.patientId) });
  }

  /** Vrai si je suis le patient de la conversation ; a defaut d'identifiant connu, on se fie au role. */
  private jeSuisLePatient(c: Conversation): boolean {
    const moi = this.moi();
    return moi ? c.patientId === moi : !this.estMedecin();
  }

  /** Recupere (une seule fois par praticien) le nom des medecins des conversations ou je suis le patient. */
  private chargerNoms(liste: Conversation[]) {
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
