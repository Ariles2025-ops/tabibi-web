import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { MoiService } from './moi.service';

/** Libelles francais des roles metier ; tout autre role (technique) n'est pas affiche. */
const LIBELLES_ROLES: Partial<Record<string, string>> = {
  PATIENT: 'Patient',
  MEDECIN: 'Médecin',
  SECRETAIRE: 'Secrétaire',
  PHARMACIE: 'Pharmacie',
  ADMIN: 'Administrateur',
};

interface Raccourci { lien: string; libelle: string; }

/**
 * Mon compte : utilisateur connecte, role en francais, acces rapides selon le role, deconnexion et suppression
 * du compte (confirmation en deux temps dans la page, puis DELETE /api/moi et deconnexion).
 */
@Component({
    selector: 'app-moi',
    imports: [CommonModule, RouterLink],
    template: `
    <main style="max-width:640px;margin:40px auto;padding:0 16px">
      <h1 style="color:var(--vert)">Mon compte</h1>
      <div *ngIf="!connecte()" style="display:flex;flex-direction:column;gap:12px;max-width:420px">
        <p style="color:var(--text3);margin:0">Créez votre compte avec votre adresse e-mail, ou connectez-vous par téléphone (code SMS), pour prendre rendez-vous.</p>
        <button type="button" class="bouton" (click)="seConnecter()">Se connecter</button>
        <button *ngIf="inscriptionOuverte()" type="button" class="bouton-secondaire" (click)="sInscrireParEmail()">Créer un compte</button>
      </div>
      <div *ngIf="connecte()">
        <p *ngIf="moi()?.nom?.trim() as nom; else sansNom">Connecté en tant que <b>{{ nom }}</b></p>
        <ng-template #sansNom><p>Vous êtes connecté(e).</p></ng-template>
        <p *ngIf="rolesAffiches().length">{{ rolesAffiches().length > 1 ? 'Rôles' : 'Rôle' }} : {{ rolesAffiches().join(', ') }}</p>
        <nav aria-label="Accès rapides" style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0">
          <a *ngFor="let r of raccourcis(); let premier = first" [class.bouton]="premier" [class.bouton-secondaire]="!premier" [routerLink]="r.lien">{{ r.libelle }}</a>
        </nav>
        <p style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="bouton-secondaire" (click)="seDeconnecter()">Se déconnecter</button>
        </p>

        <section aria-labelledby="titre-suppression" style="margin-top:32px;padding:16px;border:1px solid var(--border);border-radius:16px;background:#fff">
          <h2 id="titre-suppression" style="font-size:1.05rem;margin:0 0 6px">Supprimer mon compte</h2>
          <p style="color:var(--text3);margin:0 0 12px;font-size:.95rem">
            Votre compte et vos données personnelles (profil, rendez-vous, messages, listes d'attente) sont effacés définitivement.
            <a routerLink="/supprimer-mon-compte" style="color:var(--vert)">En savoir plus</a>
          </p>
          <button *ngIf="!confirmation()" type="button" class="bouton-secondaire" style="color:var(--red);border-color:var(--red)"
                  (click)="confirmation.set(true)">Supprimer mon compte</button>
          <div *ngIf="confirmation()" role="alert" style="display:flex;flex-direction:column;gap:10px">
            <p style="margin:0;color:var(--red);font-weight:600">Cette action est définitive. Confirmez-vous la suppression de votre compte ?</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="bouton" style="background:var(--red);border-color:var(--red)"
                      (click)="supprimer()" [disabled]="suppressionEnCours()">
                {{ suppressionEnCours() ? 'Suppression…' : 'Oui, supprimer définitivement' }}
              </button>
              <button type="button" class="bouton-secondaire" (click)="confirmation.set(false)" [disabled]="suppressionEnCours()">Annuler</button>
            </div>
          </div>
          <p *ngIf="erreurSuppression()" style="color:var(--red);margin:10px 0 0">{{ erreurSuppression() }}</p>
        </section>
      </div>
    </main>
  `
})
export class MoiComponent implements OnInit {
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private moiService = inject(MoiService);
  connecte = signal(false);
  /** Profil /api/moi, lu depuis le cache de RoleService (une seule requete par chargement de page). */
  moi = this.roleService.moi;
  private roles = computed(() => (this.moi()?.roles ?? []).map((r) => r.toUpperCase()));
  /** Roles metier en francais ; les roles techniques de Keycloak (default-roles-tabibi, offline_access...) sont masques. */
  rolesAffiches = computed(() => this.roles().map((r) => LIBELLES_ROLES[r]).filter((l): l is string => !!l));

  /** Acces rapides selon le role (espace professionnel d'abord, sinon les pages patient). */
  raccourcis = computed<Raccourci[]>(() => {
    const r = this.roles();
    const profil = { lien: '/moi/profil', libelle: 'Mon profil' };
    const notifications = { lien: '/notifications', libelle: 'Notifications' };
    // Comme « Mon espace » de l'appli : l'invitation d'un médecin arrive à un compte patient, qui doit pouvoir l'ouvrir.
    const invitations = { lien: '/invitations', libelle: 'Invitations de cabinet' };
    if (r.includes('MEDECIN')) {
      return [{ lien: '/medecin/agenda', libelle: 'Mon agenda' }, { lien: '/medecin/disponibilites', libelle: 'Disponibilités' }, profil, notifications];
    }
    if (r.includes('SECRETAIRE')) return [{ lien: '/secretaire', libelle: 'Agenda du cabinet' }, invitations, profil, notifications];
    if (r.includes('PHARMACIE')) return [{ lien: '/pharmacie', libelle: 'Demandes de médicaments' }, profil, notifications];
    if (r.includes('ADMIN')) return [{ lien: '/admin', libelle: 'Administration' }, profil, notifications];
    return [profil, { lien: '/mes-rendez-vous', libelle: 'Mes rendez-vous' }, invitations, notifications];
  });

  /** Seconde etape de la suppression du compte affichee (pas de confirm() du navigateur). */
  confirmation = signal(false);
  suppressionEnCours = signal(false);
  erreurSuppression = signal('');

  async ngOnInit() {
    await this.auth.pret();
    if (this.auth.estConnecte()) {
      this.connecte.set(true);
      this.roleService.charger();
    }
  }

  seConnecter() { this.auth.seConnecter(); }
  sInscrireParEmail() { this.auth.sInscrireParEmail(); }
  inscriptionOuverte() { return this.auth.inscriptionOuverte(); }
  seDeconnecter() { this.auth.seDeconnecter(); this.connecte.set(false); }

  /** DELETE /api/moi (204) puis deconnexion : la session Keycloak du compte supprime n'a plus d'objet. */
  supprimer() {
    this.suppressionEnCours.set(true);
    this.erreurSuppression.set('');
    this.moiService.supprimer().subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.seDeconnecter();
      },
      error: (e: HttpErrorResponse) => {
        this.suppressionEnCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter('/moi');
        } else {
          this.erreurSuppression.set(
            e.error?.erreur ?? 'La suppression a échoué. Réessayez ou écrivez à contact@ndawik.com.',
          );
        }
      },
    });
  }
}
