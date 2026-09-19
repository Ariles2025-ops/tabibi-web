import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Besoin, DawiniService, DemandeReponse, libelleReponses } from '../dawini/dawini.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { Traducteur } from '../i18n/traducteur';
import { TraductionService } from '../i18n/traduction.service';

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
 * Espace pharmacie (role PHARMACIE, Dawini) : choix de la wilaya puis demandes de medicaments ouvertes
 * (GET /api/dawini/besoins?wilaya=, sans identite de patient) et, pour chacune, un formulaire de reponse
 * (POST /api/dawini/besoins/{id}/reponses) : nom de la pharmacie (memorise dans localStorage), disponible oui / non,
 * prix en dinars et commentaire facultatifs. Le patient est prevenu par l'API.
 */
@Component({
  selector: 'app-espace-pharmacie',
  standalone: true,
  imports: [CommonModule, FormsModule, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ 'pharmacie.titre' | t }}</h1>
      <p style="color:#566b64;margin:0 0 20px">{{ 'pharmacie.intro' | t }}</p>

      <form (ngSubmit)="chercher()" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:0 0 20px">
        <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
          {{ 'pharmacie.wilaya' | t }}
          <input class="champ" [(ngModel)]="wilayaCode" name="wilayaCode" required [placeholder]="'pharmacie.wilayaPlaceholder' | t" style="width:120px;color:#10241F;font-size:1rem">
        </label>
        <button type="submit" class="bouton" [disabled]="charge()">{{ (charge() ? 'pharmacie.recherche' : 'pharmacie.afficher') | t }}</button>
      </form>

      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let b of besoins()" style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
          <strong>{{ b.medicament }}</strong>
          <span style="color:#566b64">
            · {{ 'dawini.wilayaLigne' | t:{ code: b.wilayaCode } }}<ng-container *ngIf="b.commune"> · {{ b.commune }}</ng-container>
            · {{ 'dawini.publieeLe' | t:{ date: (b.publieLe | dateLocale:'courtHeure') } }} · {{ libelleReponses(b.nombreReponses) }}
          </span>
          <p *ngIf="b.precision" style="margin:6px 0 0">{{ b.precision }}</p>

          <p *ngIf="repondus().has(b.id)" style="margin:10px 0 0;color:var(--vert)">{{ 'pharmacie.dejaRepondu' | t }}</p>

          <form *ngIf="!repondus().has(b.id) && formulaires[b.id] as f" (ngSubmit)="repondre(b)"
                style="display:grid;gap:10px;margin:12px 0 0;padding:12px;border:1px solid #e4e9e7;border-radius:8px;background:#f8faf9">
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              {{ 'pharmacie.nom' | t }}
              <input class="champ" [(ngModel)]="nomPharmacie" [name]="'nom-' + b.id" required [placeholder]="'pharmacie.nomPlaceholder' | t" style="color:#10241F;font-size:1rem">
            </label>
            <fieldset style="border:0;padding:0;margin:0;display:flex;gap:16px;align-items:center;flex-wrap:wrap;color:#566b64;font-size:.9rem">
              <legend style="padding:0;margin:0 0 4px">{{ 'pharmacie.disponibilite' | t }}</legend>
              <label style="display:flex;gap:6px;align-items:center;color:#10241F;font-size:1rem">
                <input type="radio" [name]="'disponible-' + b.id" [value]="true" [(ngModel)]="f.disponible"> {{ 'commun.oui' | t }}
              </label>
              <label style="display:flex;gap:6px;align-items:center;color:#10241F;font-size:1rem">
                <input type="radio" [name]="'disponible-' + b.id" [value]="false" [(ngModel)]="f.disponible"> {{ 'commun.non' | t }}
              </label>
            </fieldset>
            <div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
              <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
                {{ 'pharmacie.prix' | t }}
                <input class="champ" type="number" min="0" step="1" [(ngModel)]="f.prixDa" [name]="'prix-' + b.id" [placeholder]="'pharmacie.prixPlaceholder' | t" style="color:#10241F;font-size:1rem">
              </label>
              <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
                {{ 'pharmacie.commentaire' | t }}
                <input class="champ" [(ngModel)]="f.commentaire" [name]="'commentaire-' + b.id" [placeholder]="'pharmacie.commentairePlaceholder' | t" style="color:#10241F;font-size:1rem">
              </label>
            </div>
            <div>
              <button type="submit" class="bouton" [disabled]="enCours() !== null">
                {{ (enCours() === b.id ? 'commun.envoi' : 'pharmacie.repondre') | t }}
              </button>
            </div>
          </form>
        </li>
      </ul>
      <p *ngIf="recherchee() && !charge() && !erreur() && besoins().length === 0">{{ 'pharmacie.aucune' | t }}</p>
    </main>
  `,
})
export class EspacePharmacieComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(DawiniService);
  private i18n = inject(TraductionService);
  /** Traducteur de la langue courante, passe aux fonctions de libelles du service. */
  private traduire: Traducteur = (cle, params) => this.i18n.t(cle, params);

  wilayaCode = '';
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

  ngOnInit() {
    this.seo.definirPrivee('seo.espacePharmacie');
    this.nomPharmacie = lireNomMemorise();
  }

  chercher() {
    const wilaya = this.wilayaCode.trim();
    this.succes.set('');
    if (!wilaya) {
      this.erreur.set(this.i18n.t('pharmacie.indiquerWilaya'));
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
          this.erreur.set(this.i18n.t('commun.reservePharmacies'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('pharmacie.erreurChargement'));
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
    if (!nomPharmacie) {
      this.erreur.set(this.i18n.t('pharmacie.indiquerNom'));
      return;
    }
    if (f.disponible === null) {
      this.erreur.set(this.i18n.t('pharmacie.indiquerDisponibilite'));
      return;
    }
    if (prixDa !== null && (!Number.isInteger(prixDa) || prixDa < 0)) {
      this.erreur.set(this.i18n.t('pharmacie.prixInvalide'));
      return;
    }
    const demande: DemandeReponse = { nomPharmacie, disponible: f.disponible, prixDa, commentaire: commentaire || null };
    this.erreur.set('');
    this.enCours.set(b.id);
    this.service.repondre(b.id, demande).subscribe({
      next: () => {
        this.enCours.set(null);
        memoriserNom(nomPharmacie);
        this.repondus.update((ids) => new Set(ids).add(b.id));
        this.succes.set(this.i18n.t('pharmacie.reponseEnvoyee', { medicament: b.medicament }));
        this.charger(b.wilayaCode);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('pharmacie.seulPharmacie'));
        } else if (e.status === 409 || e.status === 404) {
          // Demande cloturee entre-temps ou deja repondue : motif affiche et liste rechargee.
          this.charger(b.wilayaCode, e.error?.erreur ?? this.i18n.t('pharmacie.plusDeReponse'));
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('pharmacie.incomplete'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('pharmacie.envoiEchec'));
        }
      },
    });
  }

  libelleReponses(nombre: number): string {
    return libelleReponses(nombre, this.traduire);
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
