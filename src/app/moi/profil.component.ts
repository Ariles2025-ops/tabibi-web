import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import {
  ANNEE_NAISSANCE_MIN,
  DemandeProfil,
  LANGUE_PAR_DEFAUT,
  LANGUES,
  LONGUEUR_MAX_NOM,
  LONGUEUR_MAX_WILAYA,
  Profil,
  ProfilService,
  dateLocaleIso,
  nettoyerProfil,
  validerProfil,
} from './profil.service';

/** Champs du formulaire, vides (langue fr par defaut, comme cote API). */
function formulaireVide(): DemandeProfil {
  return { nomComplet: '', telephone: '', dateNaissance: '', wilayaCode: '', langue: LANGUE_PAR_DEFAUT };
}

/**
 * Mon profil (utilisateur connecte, tous roles) : formulaire prerempli depuis GET /api/moi/profil (404 = jamais
 * renseigne → formulaire vide), enregistre par PUT /api/moi/profil. Validation cote client coherente avec le
 * backend ; un 400 affiche le motif { erreur } renvoye.
 */
@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main style="max-width:640px;margin:32px auto;padding:0 16px">
      <p style="margin:0 0 16px"><a routerLink="/moi" style="color:var(--vert)">Retour à mon compte</a></p>
      <h1 style="color:var(--vert);margin:0 0 8px">Mon profil</h1>
      <p style="color:#566b64;margin:0 0 20px">
        Ces informations servent aux praticiens et aux rappels de rendez-vous. Seul le nom complet est obligatoire.
      </p>

      <p *ngIf="connecte() === false">Redirection vers la page de connexion…</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">Chargement…</p>
        <p *ngIf="erreurChargement()" style="color:#b3261e">{{ erreurChargement() }}</p>

        <form *ngIf="!charge() && !erreurChargement()" (ngSubmit)="enregistrer()" style="display:grid;gap:12px">
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Nom complet *
            <input class="champ" [(ngModel)]="formulaire.nomComplet" name="nomComplet" required [maxlength]="longueurMaxNom"
                   placeholder="Ex. Amina Belkacem" style="color:#10241F;font-size:1rem">
          </label>
          <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Téléphone
              <input class="champ" [(ngModel)]="formulaire.telephone" name="telephone" type="tel" placeholder="Ex. 0550 12 34 56"
                     style="color:#10241F;font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Date de naissance
              <input class="champ" [(ngModel)]="formulaire.dateNaissance" name="dateNaissance" type="date" [max]="hier" [min]="dateMin"
                     style="color:#10241F;font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Wilaya (code)
              <input class="champ" [(ngModel)]="formulaire.wilayaCode" name="wilayaCode" [maxlength]="longueurMaxWilaya" placeholder="Ex. 16"
                     style="color:#10241F;font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Langue
              <select class="champ" [(ngModel)]="formulaire.langue" name="langue" style="color:#10241F;font-size:1rem">
                <option *ngFor="let l of langues" [value]="l.code">{{ l.libelle }}</option>
              </select>
            </label>
          </div>
          <p style="color:#566b64;font-size:.9rem;margin:0">* Champ obligatoire.</p>
          <p *ngIf="succes()" style="color:var(--vert);margin:0">{{ succes() }}</p>
          <p *ngIf="erreur()" style="color:#b3261e;margin:0">{{ erreur() }}</p>
          <div>
            <button type="submit" class="bouton" [disabled]="enCours()">{{ enCours() ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
          <p *ngIf="profil() as p" style="color:#566b64;font-size:.9rem;margin:0">
            Dernière mise à jour le {{ p.misAJourLe | date:'d MMMM yyyy à HH:mm' }}.
          </p>
        </form>
      </ng-container>
    </main>
  `,
})
export class ProfilComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(ProfilService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Profil enregistre cote API ; null tant qu'il n'a jamais ete renseigne. */
  profil = signal<Profil | null>(null);
  formulaire: DemandeProfil = formulaireVide();
  langues = LANGUES;
  longueurMaxNom = LONGUEUR_MAX_NOM;
  longueurMaxWilaya = LONGUEUR_MAX_WILAYA;
  /** Bornes du selecteur de date : la veille (date passee) et le 1er janvier suivant l'annee minimale. */
  hier = dateLocaleIso(new Date(Date.now() - 24 * 60 * 60 * 1000));
  dateMin = `${ANNEE_NAISSANCE_MIN + 1}-01-01`;
  charge = signal(false);
  enCours = signal(false);
  succes = signal('');
  /** Erreur du chargement initial (la page n'affiche alors pas le formulaire), distincte de celle du formulaire. */
  erreurChargement = signal('');
  erreur = signal('');

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

  charger() {
    this.charge.set(true);
    this.erreurChargement.set('');
    this.service.monProfil().subscribe({
      next: (p) => {
        this.charge.set(false);
        this.afficher(p);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 404) {
          // Jamais renseigne : formulaire vide.
          this.profil.set(null);
          this.formulaire = formulaireVide();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreurChargement.set(e.error?.erreur ?? 'Impossible de charger votre profil.');
        }
      },
    });
  }

  enregistrer() {
    const demande = nettoyerProfil(this.formulaire);
    this.succes.set('');
    const motif = validerProfil(demande);
    if (motif) {
      this.erreur.set(motif);
      return;
    }
    this.erreur.set('');
    this.enCours.set(true);
    this.service.enregistrer(demande).subscribe({
      next: (p) => {
        this.enCours.set(false);
        this.afficher(p);
        this.succes.set('Profil enregistré.');
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? 'Le profil est invalide.');
        } else {
          this.erreur.set(e.error?.erreur ?? "L'enregistrement du profil a échoué, veuillez réessayer.");
        }
      },
    });
  }

  /** Affiche le profil et preremplit le formulaire (facultatifs absents → champs vides). */
  private afficher(p: Profil) {
    this.profil.set(p);
    this.formulaire = {
      nomComplet: p.nomComplet,
      telephone: p.telephone ?? '',
      dateNaissance: p.dateNaissance ?? '',
      wilayaCode: p.wilayaCode ?? '',
      langue: p.langue || LANGUE_PAR_DEFAUT,
    };
  }
}
