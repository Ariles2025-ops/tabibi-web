import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Besoin, DawiniService, DemandeReponse, libelleReponses, libelleWilaya } from '../dawini/dawini.service';
import { Profil, ProfilService } from '../moi/profil.service';
import { OrdonnanceService, Verification } from '../ordonnances/ordonnance.service';

/** Cle localStorage du nom de la pharmacie (confort : prerempli d'une visite a l'autre, jamais indispensable). */
const CLE_NOM_PHARMACIE = 'tabibi.pharmacie.nom';

/** Champs d'une reponse en cours de saisie pour une demande. */
interface FormulaireReponse {
  /** null tant qu'aucun bouton oui / non n'est coche. */
  disponible: boolean | null;
  /** Prix en dinars : chaine vide au depart, puis nombre ou null selon le champ numerique (NumberValueAccessor). */
  prixDa: string | number | null;
  commentaire: string;
}

function formulaireVide(): FormulaireReponse {
  return { disponible: null, prixDa: '', commentaire: '' };
}

/**
 * Espace pharmacie (role PHARMACIE, Dawini) : profil de la pharmacie (nom + wilaya, GET / PUT /api/moi/profil),
 * verification / delivrance d'une ordonnance par son code, choix de la wilaya puis demandes de medicaments ouvertes
 * (GET /api/dawini/besoins?wilaya=, sans identite de patient) et, pour chacune, un formulaire de reponse
 * (POST /api/dawini/besoins/{id}/reponses) : nom de la pharmacie (memorise dans localStorage), disponible oui / non,
 * prix en dinars et commentaire facultatifs. Le patient est prevenu par l'API.
 */
@Component({
    selector: 'app-espace-pharmacie',
    imports: [CommonModule, FormsModule],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">Espace pharmacie</h1>
      <p style="color:var(--text3);margin:0 0 20px">
        Demandes de médicaments publiées par les patients de votre wilaya. Répondez en indiquant la disponibilité,
        le prix et vos précisions : le patient est prévenu, sans que son identité vous soit communiquée.
      </p>

      <form (ngSubmit)="chercher()" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:0 0 20px">
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          Wilaya *
          <select class="champ" [(ngModel)]="wilayaCode" name="wilayaCode" required style="min-width:200px;color:#10241F;font-size:1rem">
            <option value="">Choisissez votre wilaya</option>
            <option *ngFor="let w of wilayas()" [value]="w.code">{{ w.code }} — {{ w.nom }}</option>
          </select>
        </label>
        <button type="submit" class="bouton" [disabled]="charge()">{{ charge() ? 'Recherche…' : 'Afficher les demandes' }}</button>
      </form>

      <form *ngIf="profilManquant()" class="formulaire-profil" (ngSubmit)="enregistrerProfil()"
            style="display:grid;gap:10px;margin:0 0 20px;padding:14px;border:1px solid var(--border);border-radius:var(--r12);background:var(--blue-l)">
        <strong style="color:var(--blue-d)">Renseignez le nom et la wilaya de votre pharmacie</strong>
        <span style="color:var(--text2);font-size:.9rem">Ils seront utilisés pour vos réponses et pour afficher directement les demandes de votre wilaya.</span>
        <div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            Nom de la pharmacie *
            <input class="champ" [(ngModel)]="profilNom" name="profilNom" required maxlength="120" placeholder="Ex. Pharmacie El Amel" style="color:var(--ink);font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            Téléphone
            <input class="champ" [(ngModel)]="profilTelephone" name="profilTelephone" inputmode="tel" placeholder="Ex. 0550123456" style="color:var(--ink);font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            Wilaya *
            <select class="champ" [(ngModel)]="profilWilaya" name="profilWilaya" required style="color:var(--ink);font-size:1rem">
              <option value="">Choisissez votre wilaya</option>
              <option *ngFor="let w of wilayas()" [value]="w.code">{{ w.code }} — {{ w.nom }}</option>
            </select>
          </label>
        </div>
        <p *ngIf="erreurProfil()" style="color:var(--red);margin:0">{{ erreurProfil() }}</p>
        <div><button type="submit" class="bouton" [disabled]="enregistrementProfil()">{{ enregistrementProfil() ? 'Enregistrement…' : 'Enregistrer' }}</button></div>
      </form>

      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let b of besoins()" style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px;padding:14px">
          <strong>{{ b.medicament }}</strong>
          <span style="color:var(--text3)">
            · {{ wilaya(b.wilayaCode) }}<ng-container *ngIf="b.commune"> · {{ b.commune }}</ng-container>
            · publiée le {{ b.publieLe | date:'d MMMM à HH:mm' }} · {{ libelleReponses(b.nombreReponses) }}
          </span>
          <p *ngIf="b.precision" style="margin:6px 0 0">{{ b.precision }}</p>

          <p *ngIf="repondus().has(b.id)" style="margin:10px 0 0;color:var(--vert)">Vous avez répondu à cette demande.</p>
          <p *ngIf="!repondus().has(b.id) && b.dejaRepondu" class="deja-repondu" style="margin:10px 0 0;color:var(--vert);font-weight:600">Déjà répondu</p>

          <form *ngIf="!repondus().has(b.id) && !b.dejaRepondu && formulaires[b.id] as f" (ngSubmit)="repondre(b)"
                style="display:grid;gap:10px;margin:12px 0 0;padding:12px;border:1px solid var(--border);border-radius:8px;background:#f8faf9">
            <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
              Nom de la pharmacie{{ profil() ? '' : ' *' }}
              <input class="champ" [(ngModel)]="nomPharmacie" [name]="'nom-' + b.id" [required]="!profil()" placeholder="Ex. Pharmacie El Amel" style="color:#10241F;font-size:1rem">
            </label>
            <fieldset style="border:0;padding:0;margin:0;display:flex;gap:16px;align-items:center;flex-wrap:wrap;color:var(--text3);font-size:.9rem">
              <legend style="padding:0;margin:0 0 4px">Médicament disponible *</legend>
              <label style="display:flex;gap:6px;align-items:center;color:#10241F;font-size:1rem">
                <input type="radio" [name]="'disponible-' + b.id" [value]="true" [(ngModel)]="f.disponible"> Oui
              </label>
              <label style="display:flex;gap:6px;align-items:center;color:#10241F;font-size:1rem">
                <input type="radio" [name]="'disponible-' + b.id" [value]="false" [(ngModel)]="f.disponible"> Non
              </label>
            </fieldset>
            <div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
              <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
                Prix (DA)
                <input class="champ" type="number" min="0" step="1" [(ngModel)]="f.prixDa" [name]="'prix-' + b.id" placeholder="Ex. 850" style="color:#10241F;font-size:1rem">
              </label>
              <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
                Commentaire
                <input class="champ" [(ngModel)]="f.commentaire" [name]="'commentaire-' + b.id" placeholder="Ex. Disponible jusqu'à 19 h" style="color:#10241F;font-size:1rem">
              </label>
            </div>
            <div>
              <button type="submit" class="bouton" [disabled]="enCours() !== null">
                {{ enCours() === b.id ? 'Envoi…' : 'Répondre' }}
              </button>
            </div>
          </form>
        </li>
      </ul>
      <p *ngIf="recherchee() && !charge() && !erreur() && besoins().length === 0">Aucune demande ouverte dans cette wilaya.</p>

      <section class="bloc-delivrance" style="margin:32px 0 0;padding:16px;background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r16)">
        <h2 style="color:var(--ink);font-size:1.15rem;margin:0 0 6px">Vérifier / délivrer une ordonnance</h2>
        <p style="color:var(--text3);margin:0 0 12px;font-size:.9rem">Saisissez le code de 8 caractères imprimé sur l'ordonnance.</p>
        <form (ngSubmit)="verifierOrdonnance()" style="display:flex;gap:8px;flex-wrap:wrap">
          <input class="champ" [(ngModel)]="codeOrdonnance" name="codeOrdonnance" maxlength="8" autocomplete="off"
                 placeholder="Code de vérification" style="flex:1;min-width:180px;letter-spacing:.15em;text-transform:uppercase;color:var(--ink);font-size:1rem">
          <button type="submit" class="bouton" [disabled]="verificationEnCours() || codeOrdonnance.trim().length !== 8">
            {{ verificationEnCours() ? 'Vérification…' : 'Vérifier' }}
          </button>
        </form>

        <div *ngIf="verification() as v" class="resultat-verification" style="margin:12px 0 0">
          <ng-container [ngSwitch]="v.statut">
            <p *ngSwitchCase="'DELIVREE'" style="color:var(--red);font-weight:600;margin:0">
              Déjà délivrée<ng-container *ngIf="v.delivreeLe"> le {{ v.delivreeLe | date:'d MMMM yyyy à HH:mm' }}</ng-container> : ne pas délivrer une nouvelle fois.
            </p>
            <p *ngSwitchCase="'ANNULEE'" style="color:var(--red);font-weight:600;margin:0">Annulée par le médecin : ne pas délivrer.</p>
            <p *ngSwitchCase="'EXPIREE'" style="color:var(--red);font-weight:600;margin:0">Expirée : ordonnance plus valable, ne pas délivrer.</p>
            <ng-container *ngSwitchDefault>
              <ng-container *ngIf="v.valide">
                <p style="color:var(--green);font-weight:600;margin:0 0 10px">
                  Ordonnance valide, émise le {{ v.emiseLe | date:'EEEE d MMMM yyyy à HH:mm' }}.
                </p>
                <button type="button" class="bouton" (click)="delivrer()" [disabled]="delivranceEnCours()">
                  {{ delivranceEnCours() ? 'Enregistrement…' : 'Marquer comme délivrée' }}
                </button>
              </ng-container>
              <p *ngIf="!v.valide" style="color:var(--red);font-weight:600;margin:0">Code inconnu.</p>
            </ng-container>
          </ng-container>
        </div>
        <p *ngIf="succesOrdonnance()" style="color:var(--green);margin:10px 0 0">{{ succesOrdonnance() }}</p>
        <p *ngIf="erreurOrdonnance()" role="alert" style="color:var(--red);margin:10px 0 0">{{ erreurOrdonnance() }}</p>
      </section>
    </main>
  `
})
export class EspacePharmacieComponent implements OnInit {
  /** Nom de la wilaya (referentiel) plutot que son code. */
  wilaya = libelleWilaya;
  private auth = inject(AuthService);
  private service = inject(DawiniService);
  private http = inject(HttpClient);
  private profils = inject(ProfilService);
  private ordonnances = inject(OrdonnanceService);

  wilayaCode = '';
  /** Wilayas du referentiel (assets/referentiel.json) : code attendu par l'API + libelle FR. */
  wilayas = signal<{ code: string; nom: string }[]>([]);
  /** Nom de la pharmacie, commun a toutes les reponses, relu depuis localStorage s'il a deja ete saisi. */
  nomPharmacie = '';
  besoins = signal<Besoin[]>([]);
  /** Reponse en cours de saisie, par identifiant de demande. */
  formulaires: Record<string, FormulaireReponse> = {};
  /** Demandes auxquelles j'ai repondu pendant cette visite (le formulaire est remplace par une mention). */
  repondus = signal<Set<string>>(new Set());
  /** Vrai une fois une recherche lancee (etat vide affiche seulement apres). */
  recherchee = signal(false);
  charge = signal(false);
  /** Identifiant de la demande dont la reponse est en cours d'envoi. */
  enCours = signal<string | null>(null);
  succes = signal('');
  erreur = signal('');

  /** Profil de la pharmacie (GET /api/moi/profil) : nom et wilaya ; null tant qu'il n'est pas connu ou s'il manque. */
  profil = signal<Profil | null>(null);
  /** Vrai si le profil n'a jamais ete renseigne (404) : un petit formulaire est propose. */
  profilManquant = signal(false);
  profilNom = '';
  profilTelephone = '';
  profilWilaya = '';
  enregistrementProfil = signal(false);
  erreurProfil = signal('');

  /** Verification / delivrance d'une ordonnance par son code. */
  codeOrdonnance = '';
  verification = signal<Verification | null>(null);
  /** Code effectivement verifie (celui qu'on marquera delivre). */
  private codeVerifie = '';
  verificationEnCours = signal(false);
  delivranceEnCours = signal(false);
  succesOrdonnance = signal('');
  erreurOrdonnance = signal('');

  ngOnInit() {
    this.nomPharmacie = lireNomMemorise();
    this.http
      .get<{ wilayas?: { code: string; nom: string }[] }>('/assets/referentiel.json')
      .pipe(catchError(() => of({ wilayas: [] })))
      .subscribe((ref) => this.wilayas.set(ref?.wilayas ?? []));
    this.chargerProfil();
  }

  /** Lit le profil : prerempli le nom et la wilaya, et affiche directement les demandes de cette wilaya. */
  private chargerProfil() {
    this.profils.monProfil().subscribe({
      next: (p) => this.appliquerProfil(p),
      error: (e: HttpErrorResponse) => {
        if (e.status === 404) this.profilManquant.set(true);
        else if (e.status === 401) this.auth.seConnecter();
        // Autre erreur : la page reste utilisable avec le choix manuel de la wilaya.
      },
    });
  }

  private appliquerProfil(p: Profil) {
    this.profil.set(p);
    this.profilManquant.set(false);
    if (p.nomComplet) this.nomPharmacie = p.nomComplet;
    if (p.wilayaCode) {
      this.wilayaCode = p.wilayaCode;
      this.charger(p.wilayaCode);
    }
  }

  enregistrerProfil() {
    const nomComplet = this.profilNom.trim();
    const wilayaCode = this.profilWilaya.trim();
    const telephone = this.profilTelephone.replace(/\D/g, '');
    if (nomComplet.length < 2) {
      this.erreurProfil.set('Indiquez le nom de votre pharmacie.');
      return;
    }
    if (!wilayaCode) {
      this.erreurProfil.set('Choisissez la wilaya de votre pharmacie.');
      return;
    }
    this.erreurProfil.set('');
    this.enregistrementProfil.set(true);
    this.profils
      .enregistrer({ nomComplet, telephone: telephone || null, dateNaissance: null, wilayaCode, langue: 'fr' })
      .subscribe({
        next: (p) => {
          this.enregistrementProfil.set(false);
          this.appliquerProfil(p);
        },
        error: (e: HttpErrorResponse) => {
          this.enregistrementProfil.set(false);
          this.erreurProfil.set(e.error?.erreur ?? "L'enregistrement du profil a échoué, veuillez réessayer.");
        },
      });
  }

  verifierOrdonnance() {
    const code = this.codeOrdonnance.trim().toUpperCase();
    if (code.length !== 8) return;
    this.verificationEnCours.set(true);
    this.verification.set(null);
    this.succesOrdonnance.set('');
    this.erreurOrdonnance.set('');
    this.ordonnances.verifier(code).subscribe({
      next: (v) => {
        this.verificationEnCours.set(false);
        this.codeVerifie = code;
        this.verification.set(v);
      },
      error: (e: HttpErrorResponse) => {
        this.verificationEnCours.set(false);
        if (e.status === 404) {
          this.verification.set({ valide: false, emiseLe: null, statut: null });
        } else {
          this.erreurOrdonnance.set(e.error?.erreur ?? 'La vérification a échoué, veuillez réessayer.');
        }
      },
    });
  }

  delivrer() {
    const v = this.verification();
    if (!v || !this.codeVerifie) return;
    this.delivranceEnCours.set(true);
    this.succesOrdonnance.set('');
    this.erreurOrdonnance.set('');
    this.ordonnances.delivrer(this.codeVerifie).subscribe({
      next: (d) => {
        this.delivranceEnCours.set(false);
        this.verification.set({ ...v, statut: d.statut, delivreeLe: d.delivreeLe });
        this.succesOrdonnance.set('Ordonnance marquée comme délivrée.');
      },
      error: (e: HttpErrorResponse) => {
        this.delivranceEnCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreurOrdonnance.set(e.error?.erreur ?? 'La délivrance a échoué, veuillez réessayer.');
        }
      },
    });
  }

  chercher() {
    const wilaya = this.wilayaCode.trim();
    this.succes.set('');
    if (!wilaya) {
      this.erreur.set('Choisissez votre wilaya.');
      return;
    }
    this.charger(wilaya);
  }

  /** Recharge les demandes ouvertes de la wilaya ; `motif` est un message d'erreur a conserver a l'ecran. */
  charger(wilaya: string, motif = '') {
    this.charge.set(true);
    this.recherchee.set(true);
    this.erreur.set(motif);
    this.service.besoinsOuverts(wilaya).subscribe({
      next: (liste) => {
        // Les plus recentes d'abord ; un formulaire vierge par demande nouvelle.
        this.besoins.set([...liste].sort((a, b) => Date.parse(b.publieLe) - Date.parse(a.publieLe)));
        for (const b of liste) this.formulaires[b.id] ??= formulaireVide();
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        this.besoins.set([]);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux pharmacies.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger les demandes.');
        }
      },
    });
  }

  repondre(b: Besoin) {
    const f = this.formulaires[b.id] ?? formulaireVide();
    const nomPharmacie = this.nomPharmacie.trim();
    const prixSaisi = f.prixDa === null || f.prixDa === undefined ? '' : String(f.prixDa).trim();
    const prixDa = prixSaisi === '' ? null : Number(prixSaisi);
    const commentaire = f.commentaire.trim();
    this.succes.set('');
    // Avec un profil, le nom peut rester vide : le serveur le complete depuis le profil.
    if (!nomPharmacie && !this.profil()) {
      this.erreur.set('Indiquez le nom de votre pharmacie.');
      return;
    }
    if (f.disponible === null) {
      this.erreur.set('Indiquez si le médicament est disponible.');
      return;
    }
    if (prixDa !== null && (!Number.isInteger(prixDa) || prixDa < 0)) {
      this.erreur.set('Indiquez un prix en dinars valide (nombre entier positif ou nul).');
      return;
    }
    const demande: DemandeReponse = { nomPharmacie, disponible: f.disponible, prixDa, commentaire: commentaire || null };
    this.erreur.set('');
    this.enCours.set(b.id);
    this.service.repondre(b.id, demande).subscribe({
      next: () => {
        this.enCours.set(null);
        if (nomPharmacie) memoriserNom(nomPharmacie);
        this.repondus.update((ids) => new Set(ids).add(b.id));
        this.succes.set(`Réponse envoyée pour « ${b.medicament} » : le patient est prévenu.`);
        this.charger(b.wilayaCode);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Seul un compte pharmacie peut répondre à une demande.');
        } else if (e.status === 409 || e.status === 404) {
          // Demande cloturee entre-temps ou deja repondue : motif affiche et liste rechargee.
          this.charger(b.wilayaCode, e.error?.erreur ?? "Cette demande n'accepte plus de réponse.");
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? 'La réponse est incomplète.');
        } else {
          this.erreur.set(e.error?.erreur ?? "L'envoi de la réponse a échoué, veuillez réessayer.");
        }
      },
    });
  }

  libelleReponses(nombre: number): string {
    return libelleReponses(nombre);
  }
}

/**
 * Nom memorise, ou chaine vide si le stockage est indisponible (navigation privee, stockage bloque, rendu cote
 * serveur ou localStorage n'existe pas).
 */
function lireNomMemorise(): string {
  try {
    return typeof localStorage === 'undefined' ? '' : (localStorage.getItem(CLE_NOM_PHARMACIE) ?? '');
  } catch {
    return '';
  }
}

/** Memorise le nom pour la prochaine visite ; un stockage indisponible n'empeche rien. */
function memoriserNom(nom: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CLE_NOM_PHARMACIE, nom);
  } catch {
    // Stockage indisponible : le nom sera simplement a ressaisir.
  }
}
