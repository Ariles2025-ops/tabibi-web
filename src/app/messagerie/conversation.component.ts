import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subscription, catchError, switchMap, timer } from 'rxjs';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { PatientsService } from '../medecin/patients.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
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
    imports: [CommonModule, FormsModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <p style="margin:0 0 16px"><a routerLink="/messagerie" style="color:var(--vert)">{{ l.t('Retour à la messagerie', 'العودة إلى الرسائل') }}</a></p>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--vert);margin:0 0 16px">{{ interlocuteur() ?? l.t('Conversation', 'محادثة') }}</h1>
        <app-selecteur-langue />
      </div>


      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ol style="list-style:none;padding:0;margin:0 0 16px;display:grid;gap:8px">
          <li *ngFor="let m of messages()" [class.message-moi]="estDeMoi(m)" [class.message-autre]="!estDeMoi(m)">
            <p style="margin:0;white-space:pre-wrap">{{ m.contenu }}</p>
            <span style="display:block;margin:4px 0 0;color:var(--text3);font-size:.85rem">
              <ng-container *ngIf="!m.envoyeLe">{{ l.t('date inconnue', 'تاريخ غير معروف') }}</ng-container>
              <ng-container *ngIf="m.envoyeLe && !l.ar()">{{ m.envoyeLe | date:'d MMMM à HH:mm' }}</ng-container>
              <span *ngIf="m.envoyeLe && l.ar()" dir="ltr">{{ m.envoyeLe | date:'dd/MM/yyyy HH:mm' }}</span>
              <ng-container *ngIf="estDeMoi(m) && m.luLe"> · {{ l.t('lu', 'مقروءة') }}</ng-container>
            </span>
          </li>
        </ol>
        <p *ngIf="accessible() && messages().length === 0">{{ l.t('Aucun message pour le moment. Écrivez le premier.', 'لا توجد رسائل حاليًا. اكتب أول رسالة.') }}</p>

        <p *ngIf="accessible() && conversation()?.fermee" data-testid="conversation-fermee" style="color:var(--text3)">
          {{ moiPatient() ? l.t('Le médecin a fermé cette conversation.', 'أغلق الطبيب هذه المحادثة.') : l.t('Cette conversation est fermée.', 'هذه المحادثة مغلقة.') }}
        </p>
        <p *ngIf="peutFermer()">
          <button type="button" class="bouton" data-testid="fermer-conversation" [disabled]="fermetureEnCours()" (click)="fermer()">
            {{ l.t('Fermer la conversation', 'إغلاق المحادثة') }}
          </button>
        </p>
        <p *ngIf="interdit()" data-testid="envoi-interdit" style="color:#b3261e">
          {{ l.t('Vous ne pouvez plus écrire à ce médecin : prenez un nouveau rendez-vous.', 'لا يمكنك الكتابة إلى هذا الطبيب بعد الآن: احجز موعدًا جديدًا.') }}
          <a *ngIf="conversation() as c" [routerLink]="['/medecins', c.medecinId]" style="color:var(--vert)">{{ l.t('Prendre rendez-vous', 'حجز موعد') }}</a>
        </p>

        <form *ngIf="accessible() && !conversation()?.fermee && !interdit()" (ngSubmit)="envoyer()" style="display:grid;gap:8px">
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Votre message', 'رسالتك') }}
            <textarea class="champ" [(ngModel)]="contenu" name="contenu" rows="3" style="color:var(--tbi-ink);font-size:1rem;resize:vertical"></textarea>
          </label>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <span [style.color]="tropLong() ? '#b3261e' : 'var(--text3)'" style="font-size:.9rem">{{ contenu.length }} / {{ max }}</span>
            <button type="submit" class="bouton" [disabled]="!peutEnvoyer()">{{ enCours() ? l.t('Envoi…', 'جارٍ الإرسال…') : l.t('Envoyer', 'إرسال') }}</button>
          </div>
        </form>
      </ng-container>
    </main>
  `
})
export class ConversationComponent implements OnInit, OnDestroy {
  l = inject(LangueService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private service = inject(MessagerieService);
  private annuaire = inject(AnnuaireService);
  private patientsService = inject(PatientsService);
  /** Vrai des que le composant est detruit : ngOnInit (asynchrone) ne doit plus rien abonner. */
  private detruit = false;
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
  /** Nom du patient (liste des patients du medecin) quand je suis le medecin. */
  nomPatient = signal<string | null>(null);
  messages = signal<Message[]>([]);
  /** Vrai une fois le fil lu avec succes : le champ de saisie n'est propose qu'a un participant. */
  accessible = signal(false);
  /** Texte saisi, envoye une fois les espaces autour retires. */
  contenu = '';
  max = LONGUEUR_MAX_MESSAGE;
  charge = signal(false);
  enCours = signal(false);
  erreur = signal('');
  /** Vrai quand l'envoi a ete refuse (403) faute de rendez-vous recent : le champ est remplace par une invitation a reprendre rendez-vous. */
  interdit = signal(false);
  /** Vrai pendant l'appel de fermeture : protege contre le double clic. */
  fermetureEnCours = signal(false);

  /** Libelle de l'autre participant : le medecin si je suis le patient, sinon « Patient » et un identifiant abrege. */
  interlocuteur = computed(() => {
    const c = this.conversation();
    if (!c) return null;
    if (this.moi() === c.patientId) return this.nomMedecin() ?? this.l.t('Médecin', 'طبيب');
    return this.nomPatient() ?? `${this.l.t('Patient', 'مريض')} ${abregerIdentifiant(c.patientId)}`;
  });

  /** Le bouton « Fermer la conversation » n'est propose qu'au medecin, tant que la conversation est ouverte. */
  peutFermer(): boolean {
    const c = this.conversation();
    return this.accessible() && !!c && !c.fermee && this.moi() === c.medecinId;
  }

  /** Ferme la conversation apres confirmation (POST .../fermer) ; le champ de saisie disparait ensuite. */
  fermer() {
    const c = this.conversation();
    if (!c || this.fermetureEnCours()) return;
    const message = this.l.t(
      'Fermer cette conversation ? Le patient ne pourra plus vous écrire.',
      'إغلاق هذه المحادثة؟ لن يتمكن المريض من مراسلتك بعد الآن.',
    );
    if (!window.confirm(message)) return;
    this.fermetureEnCours.set(true);
    this.erreur.set('');
    this.service.fermer(c.id).subscribe({
      next: () => {
        this.fermetureEnCours.set(false);
        this.conversation.set({ ...c, fermee: true });
      },
      error: (e: HttpErrorResponse) => {
        this.fermetureEnCours.set(false);
        if (e.status === 401) this.auth.seConnecter();
        else this.erreur.set(e.error?.erreur ?? this.l.t('La fermeture de la conversation a échoué, veuillez réessayer.', 'فشل إغلاق المحادثة، يُرجى المحاولة مرة أخرى.'));
      },
    });
  }

  /** Vrai si je suis le patient de la conversation. */
  moiPatient(): boolean {
    return this.moi() !== null && this.moi() === this.conversation()?.patientId;
  }

  async ngOnInit() {
    await this.auth.pret();
    if (this.detruit) return;
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    const profil = await this.roleService.charger();
    if (this.detruit) return;
    this.moi.set(profil?.sujet ?? null);
    this.abonnementRoute = this.route.paramMap.subscribe((params) => this.ouvrir(params.get('id') ?? ''));
  }

  ngOnDestroy() {
    this.detruit = true;
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
    this.interdit.set(false);
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
          this.erreur.set(this.l.t('Cette conversation ne vous concerne pas.', 'هذه المحادثة لا تخصّك.'));
        } else if (e.status === 404) {
          this.erreur.set(this.l.t('Conversation introuvable.', 'المحادثة غير موجودة.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger la conversation.', 'تعذّر تحميل المحادثة.'));
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
          // La lecture a reussi : la conversation me concerne, c'est l'envoi qui est refuse (rendez-vous trop ancien).
          if (this.moiPatient()) this.interdit.set(true);
          else this.erreur.set(this.l.t("Vous n'avez pas le droit d'écrire dans cette conversation.", 'ليس لديك صلاحية الكتابة في هذه المحادثة.'));
        } else if (e.status === 409) {
          const c = this.conversation();
          if (c) this.conversation.set({ ...c, fermee: true });
          else this.erreur.set(this.l.t('Cette conversation est fermée.', 'هذه المحادثة مغلقة.'));
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? this.l.t(`Le message est vide ou dépasse ${LONGUEUR_MAX_MESSAGE} caractères.`, `الرسالة فارغة أو تتجاوز ${LONGUEUR_MAX_MESSAGE} حرف.`));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t("L'envoi du message a échoué, veuillez réessayer.", 'فشل إرسال الرسالة، يُرجى المحاولة مرة أخرى.'));
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
        if (this.moi() !== c.patientId && this.roleService.estMedecin()) {
          this.patientsService.patientsDuMedecin().subscribe({
            next: (r) => this.nomPatient.set(r.get(c.patientId)?.nomComplet?.trim() || null),
            error: () => undefined,
          });
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
