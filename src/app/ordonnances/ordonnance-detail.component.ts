import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';
import { Ordonnance, OrdonnanceService } from './ordonnance.service';
import { libelleStatutOrdonnance } from './statut-ordonnance';
import { SeoService } from '../seo/seo.service';

@Component({
  selector: 'app-ordonnance-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p class="sans-impression" style="margin:0 0 16px">
        <a *ngIf="!estMedecin()" routerLink="/mes-ordonnances" style="color:var(--vert)">{{ 'ordonnance.retourMes' | t }}</a>
        <a *ngIf="estMedecin()" routerLink="/medecin/ordonnances" style="color:var(--vert)">{{ 'ordonnance.retourRedigees' | t }}</a>
      </p>

      <p *ngIf="connecte() === false">{{ 'commun.redirectionConnexion' | t }}</p>
      <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <article *ngIf="ordonnance() as o">
        <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <h1 style="color:var(--vert);margin:0 0 4px">{{ 'ordonnance.titre' | t }}</h1>
            <p style="color:#566b64;margin:0">
              {{ 'ordonnance.emiseLe' | t:{ date: (o.emiseLe | dateLocale:'jourDateHeure') } }} · {{ libelleStatut(o.statut) }}
            </p>
            <p style="color:#566b64;margin:4px 0 0">
              {{ 'commun.praticien' | t:{ nom: medecin()?.nomComplet ?? o.medecinId } }}<br>
              {{ 'commun.patientId' | t:{ id: o.patientId } }}
            </p>
          </div>
          <div class="sans-impression" style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="bouton" (click)="imprimer()">{{ 'ordonnance.imprimer' | t }}</button>
            <button type="button" class="bouton-secondaire" (click)="telechargerPdf()" [disabled]="pdfEnCours()">
              {{ (pdfEnCours() ? 'ordonnance.pdfEnCours' : 'ordonnance.telechargerPdf') | t }}
            </button>
          </div>
        </header>
        <p *ngIf="erreurPdf()" class="sans-impression" style="color:#b3261e">{{ erreurPdf() }}</p>

        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <thead>
            <tr style="text-align:left;color:#566b64">
              <th style="padding:8px;border-bottom:2px solid #e4e9e7">{{ 'ordonnance.medicament' | t }}</th>
              <th style="padding:8px;border-bottom:2px solid #e4e9e7">{{ 'ordonnance.posologie' | t }}</th>
              <th style="padding:8px;border-bottom:2px solid #e4e9e7">{{ 'ordonnance.duree' | t }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of o.lignes">
              <td style="padding:8px;border-bottom:1px solid #e4e9e7"><strong>{{ l.medicament }}</strong></td>
              <td style="padding:8px;border-bottom:1px solid #e4e9e7">{{ l.posologie }}</td>
              <td style="padding:8px;border-bottom:1px solid #e4e9e7">{{ l.duree }}</td>
            </tr>
          </tbody>
        </table>

        <section style="border:2px dashed var(--vert);border-radius:12px;padding:16px;text-align:center">
          <p style="margin:0 0 4px;color:#566b64">{{ 'ordonnance.codeVerification' | t }}</p>
          <p style="margin:0;font-size:2.2rem;font-weight:700;letter-spacing:.15em;font-family:ui-monospace,monospace;color:var(--vert)">
            {{ o.codeVerification }}
          </p>
          <p style="margin:8px 0 0;color:#566b64;font-size:.9rem">
            {{ 'ordonnance.authenticite' | t }}
            <a routerLink="/verifier" [queryParams]="{ code: o.codeVerification }" style="color:var(--vert)">{{ 'nav.verifierOrdonnance' | t }}</a>.
          </p>
        </section>
      </article>
    </main>
  `,
})
export class OrdonnanceDetailComponent implements OnInit {
  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private service = inject(OrdonnanceService);
  private annuaire = inject(AnnuaireService);
  private roleService = inject(RoleService);
  private document = inject(DOCUMENT);
  private i18n = inject(TraductionService);
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Lien de retour : liste du patient ou liste des ordonnances redigees par le medecin. */
  estMedecin = this.roleService.estMedecin;
  ordonnance = signal<Ordonnance | null>(null);
  /** Praticien emetteur, lu dans l'annuaire pour afficher son nom. */
  medecin = signal<Medecin | null>(null);
  charge = signal(false);
  erreur = signal('');
  /** Vrai pendant le telechargement du PDF (bouton desactive). */
  pdfEnCours = signal(false);
  /** Motif d'echec du PDF : `{ erreur }` de l'API, sinon un message generique. */
  erreurPdf = signal('');

  async ngOnInit() {
    this.seo.definirPrivee('seo.ordonnance');
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.route.paramMap.subscribe((params) => this.charger(params.get('id') ?? ''));
  }

  imprimer() {
    window.print();
  }

  /**
   * Version PDF de l'ordonnance (`GET /api/ordonnances/{id}/pdf`, avec le jeton) : le fichier recu est propose au
   * telechargement sous le nom `ordonnance-<code>.pdf` par un lien temporaire (URL objet liberee ensuite).
   * Navigateur seulement : ni Blob ni URL objet au rendu serveur, et le bouton n'y est de toute facon pas actif.
   */
  telechargerPdf() {
    const o = this.ordonnance();
    if (!o || !this.navigateur || this.pdfEnCours()) return;
    this.erreurPdf.set('');
    this.pdfEnCours.set(true);
    this.service.pdf(o.id).subscribe({
      next: (pdf) => {
        this.pdfEnCours.set(false);
        this.ouvrirPdf(pdf, `ordonnance-${o.codeVerification}.pdf`);
      },
      error: async (e: HttpErrorResponse) => {
        this.pdfEnCours.set(false);
        this.erreurPdf.set((await motifErreurBlob(e)) ?? this.i18n.t('ordonnance.pdfEchec'));
      },
    });
  }

  /** Declenche le telechargement du blob via un lien `download`, puis libere l'URL objet. */
  private ouvrirPdf(pdf: Blob, nomFichier: string) {
    const url = URL.createObjectURL(pdf);
    const lien = this.document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    lien.rel = 'noopener';
    this.document.body.appendChild(lien);
    lien.click();
    lien.remove();
    // Le navigateur a pris le fichier ; l'URL objet est liberee un peu apres (un revoke immediat peut annuler
    // le telechargement sur certains navigateurs).
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  libelleStatut(statut: string): string {
    return libelleStatutOrdonnance(statut, this.i18n.t.bind(this.i18n));
  }

  private charger(id: string) {
    this.ordonnance.set(null);
    this.medecin.set(null);
    this.erreur.set('');
    this.charge.set(true);
    this.service.parId(id).subscribe({
      next: (o) => {
        this.ordonnance.set(o);
        this.charge.set(false);
        this.chargerMedecin(o.medecinId);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('ordonnance.acces'));
        } else if (e.status === 404) {
          this.erreur.set(this.i18n.t('ordonnance.introuvable'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('ordonnance.erreurChargement'));
        }
      },
    });
  }

  /** Nom du praticien (annuaire public) ; a defaut, l'identifiant reste affiche. */
  private chargerMedecin(medecinId: string) {
    this.annuaire.medecin(medecinId).subscribe({
      next: (m) => this.medecin.set(m),
      error: () => this.medecin.set(null),
    });
  }
}

/**
 * Motif `{ erreur }` d'une reponse d'erreur recue en `responseType: 'blob'` : le corps est alors un Blob (JSON de
 * l'API) ou, selon le navigateur, deja un objet ; `null` si le corps n'en contient pas.
 */
export async function motifErreurBlob(e: HttpErrorResponse): Promise<string | null> {
  const corps: unknown = e.error;
  try {
    if (corps instanceof Blob) {
      const json = JSON.parse(await corps.text()) as { erreur?: unknown };
      return typeof json.erreur === 'string' && json.erreur ? json.erreur : null;
    }
    const erreur = (corps as { erreur?: unknown } | null)?.erreur;
    return typeof erreur === 'string' && erreur ? erreur : null;
  } catch {
    return null;
  }
}
