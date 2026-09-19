import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subscription, catchError, switchMap, timer } from 'rxjs';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { Conversation, LONGUEUR_MAX_MESSAGE, Message, MessagerieService, abregerIdentifiant } from './messagerie.service';

/** Intervalle de relecture du fil tant que la page est ouverte. */
const INTERVALLE_RAFRAICHISSEMENT_MS = 30_000;

/**
 * Fil d'une conversation (GET /api/conversations/{id}/messages, du plus ancien au plus recent) : mes messages
 * a droite, ceux de l'autre participant a gauche, champ de saisie avec compteur (2000 caracteres au plus) et
 * envoi (POST .../messages). La lecture marque lus les messages recus ; le fil est relu toutes les 30 s et
 * apres chaque envoi, et la relecture s'arrete a la destruction du composant.
 */
@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p style="margin:0 0 16px"><a routerLink="/messagerie" style="color:var(--vert)">Retour à la messagerie</a></p>
      <h1 style="color:var(--vert);margin:0 0 16px">{{ interlocuteur() ?? 'Conversation' }}</h1>

      <p *ngIf="connecte() === false">Redirection vers la page de connexion…</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">Chargement…</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ol style="list-style:none;padding:0;margin:0 0 16px;display:grid;gap:8px">
          <li *ngFor="let m of messages()" [class.message-moi]="estDeMoi(m)" [class.message-autre]="!estDeMoi(m)">
            <p style="margin:0;white-space:pre-wrap">{{ m.contenu }}</p>
            <span style="display:block;margin:4px 0 0;color:#566b64;font-size:.85rem">
              {{ m.envoyeLe | date:'d MMMM à HH:mm' }}<ng-container *ngIf="estDeMoi(m) && m.luLe"> · lu</ng-container>
            </span>
          </li>
        </ol>
        <p *ngIf="accessible() && messages().length === 0">Aucun message pour le moment.</p>

        <form *ngIf="accessible()" (ngSubmit)="envoyer()" style="display:grid;gap:8px">
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Votre message
            <textarea class="champ" [(ngModel)]="contenu" name="contenu" rows="3" style="color:#10241F;font-size:1rem;resize:vertical"></textarea>
          </label>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <span [style.color]="tropLong() ? '#b3261e' : '#566b64'" style="font-size:.9rem">{{ contenu.length }} / {{ max }}</span>
            <button type="submit" class="bouton" [disabled]="!peutEnvoyer()">{{ enCours() ? 'Envoi…' : 'Envoyer' }}</button>
          </div>
        </form>
      </ng-container>
    </main>
  `,
})
export class ConversationComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private service = inject(MessagerieService);
  private annuaire = inject(AnnuaireService);
  private abonnementRoute: Subscription | null = null;
  private rafraichissement: Subscription | null = null;

  private conversationId = '';
  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Identifiant de l'utilisateur connecte (sujet du jeton, lu sur /api/moi) ; null s'il est inconnu. */
  moi = signal<string | null>(null);
  /** La conversation, retrouvee dans ma liste (l'API n'expose pas de lecture unitaire) ; null tant qu'elle est inconnue. */
  conversation = signal<Conversation | null>(null);
  /** Nom du medecin (annuaire) quand je suis le patient. */
  nomMedecin = signal<string | null>(null);
  messages = signal<Message[]>([]);
  /** Vrai une fois le fil lu avec succes : le champ de saisie n'est propose qu'a un participant. */
  accessible = signal(false);
  /** Texte saisi, envoye une fois les espaces autour retires. */
  contenu = '';
  max = LONGUEUR_MAX_MESSAGE;
  charge = signal(false);
  enCours = signal(false);
  erreur = signal('');

  /** Libelle de l'autre participant : le medecin si je suis le patient, sinon « Patient » et un identifiant abrege. */
  interlocuteur = computed(() => {
    const c = this.conversation();
    if (!c) return null;
    if (this.moi() === c.patientId) return this.nomMedecin() ?? 'Médecin';
    return `Patient ${abregerIdentifiant(c.patientId)}`;
  });

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
    this.abonnementRoute = this.route.paramMap.subscribe((params) => this.ouvrir(params.get('id') ?? ''));
  }

  ngOnDestroy() {
    this.abonnementRoute?.unsubscribe();
    this.arreterRafraichissement();
  }

  /** Charge le fil de la conversation demandee et relance la relecture periodique. */
  private ouvrir(id: string) {
    this.conversationId = id;
    this.conversation.set(null);
    this.messages.set([]);
    this.accessible.set(false);
    this.contenu = '';
    this.erreur.set('');
    this.chargerConversation();
    this.charger();
    this.arreterRafraichissement();
    this.rafraichissement = timer(INTERVALLE_RAFRAICHISSEMENT_MS, INTERVALLE_RAFRAICHISSEMENT_MS)
      .pipe(
        // Une erreur passagere (API indisponible) laisse le fil tel quel sans casser la relecture.
        switchMap(() => this.service.messages(id).pipe(catchError(() => EMPTY))),
      )
      .subscribe((liste) => this.messages.set(liste));
  }

  /** Lecture du fil ; les messages recus sont marques lus par l'API. */
  charger() {
    this.charge.set(true);
    this.service.messages(this.conversationId).subscribe({
      next: (liste) => {
        this.messages.set(liste);
        this.accessible.set(true);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette conversation ne vous concerne pas.');
        } else if (e.status === 404) {
          this.erreur.set('Conversation introuvable.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger la conversation.');
        }
      },
    });
  }

  envoyer() {
    const contenu = this.contenu.trim();
    if (!contenu || contenu.length > LONGUEUR_MAX_MESSAGE) return;
    this.enCours.set(true);
    this.erreur.set('');
    this.service.envoyer(this.conversationId, contenu).subscribe({
      next: () => {
        this.enCours.set(false);
        this.contenu = '';
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette conversation ne vous concerne pas.');
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? `Le message est vide ou dépasse ${LONGUEUR_MAX_MESSAGE} caractères.`);
        } else {
          this.erreur.set(e.error?.erreur ?? "L'envoi du message a échoué, veuillez réessayer.");
        }
      },
    });
  }

  tropLong(): boolean {
    return this.contenu.length > LONGUEUR_MAX_MESSAGE;
  }

  /** « Envoyer » est actif si le texte n'est ni vide ni trop long et qu'aucun envoi n'est en cours. */
  peutEnvoyer(): boolean {
    return this.contenu.trim().length > 0 && !this.tropLong() && !this.enCours();
  }

  /** Vrai si le message a ete ecrit par l'utilisateur connecte (bulle a droite). */
  estDeMoi(m: Message): boolean {
    return m.auteurId === this.moi();
  }

  /** Retrouve la conversation dans ma liste pour nommer l'interlocuteur ; a defaut, le titre reste « Conversation ». */
  private chargerConversation() {
    this.service.mesConversations().subscribe({
      next: (liste) => {
        const c = liste.find((x) => x.id === this.conversationId) ?? null;
        this.conversation.set(c);
        if (!c) return;
        if (this.moi() === null) {
          // Profil inconnu : je suis le medecin si j'en ai le role, sinon le patient.
          this.moi.set(this.roleService.estMedecin() ? c.medecinId : c.patientId);
        }
        if (this.moi() === c.patientId) {
          this.annuaire.medecin(c.medecinId).subscribe({
            next: (m) => this.nomMedecin.set(m.nomComplet),
            error: () => undefined,
          });
        }
      },
      error: () => undefined,
    });
  }

  private arreterRafraichissement() {
    this.rafraichissement?.unsubscribe();
    this.rafraichissement = null;
  }
}
