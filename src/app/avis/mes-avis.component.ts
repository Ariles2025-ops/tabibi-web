import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { Avis, AvisService, libelleStatutAvis } from './avis.service';
import { instantLisible, trierParDateRecenteDabord } from '../partage/dates-lisibles';

/** Avis deposes par le patient connecte (GET /api/avis/mes), tous statuts, les plus recents d'abord. */
@Component({
    selector: 'app-mes-avis',
    imports: [CommonModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--vert);margin:0 0 16px">{{ l.t('Mes avis', 'آرائي') }}</h1>
        <app-selecteur-langue />
      </div>


      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let a of avis()" style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px;padding:14px">
            <strong>{{ a.note }} / 5</strong>
            <span style="color:var(--text3)"> · {{ libelleStatut(a.statut) }} · <span *ngIf="dateLisible(a.deposeLe)" [attr.dir]="l.ar() ? 'ltr' : null">{{ a.deposeLe | date:(l.ar() ? 'dd/MM/yyyy' : 'd MMMM yyyy') }}</span><ng-container *ngIf="!dateLisible(a.deposeLe)">{{ l.t('date inconnue', 'تاريخ غير معروف') }}</ng-container></span><br>
            <a [routerLink]="['/medecins', a.medecinId]" style="color:var(--vert)">{{ noms()[a.medecinId] ?? l.t('Voir le praticien', 'عرض الطبيب') }}</a>
            <p *ngIf="a.commentaire" style="margin:6px 0 0;white-space:pre-wrap">{{ a.commentaire }}</p>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && avis().length === 0">
          {{ l.t('Aucun avis pour le moment. Vous pouvez noter un rendez-vous honoré depuis', 'لا توجد آراء حاليًا. يمكنك تقييم موعد تم حضوره من') }}
          <a routerLink="/mes-rendez-vous" style="color:var(--vert)">{{ l.t('Mes rendez-vous', 'مواعيدي') }}</a>.
        </p>
      </ng-container>
    </main>
  `
})
export class MesAvisComponent implements OnInit {
  l = inject(LangueService);
  private auth = inject(AuthService);
  private service = inject(AvisService);
  private annuaire = inject(AnnuaireService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  avis = signal<Avis[]>([]);
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
    this.charger();
  }

  /** Vrai si la date est lisible (sinon « date inconnue », comme dans l'appli). */
  dateLisible = (iso: string | null | undefined) => instantLisible(iso) !== null;

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.mes().subscribe({
      next: (liste) => {
        // Les plus recents d'abord.
        this.avis.set(trierParDateRecenteDabord(liste, (a) => a.deposeLe));
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
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos avis.', 'تعذّر تحميل آرائك.'));
        }
      },
    });
  }

  /** Libelle cote patient : un avis signale est en verification, un avis masque l'a ete par la moderation. */
  libelleStatut(statut: string): string {
    const brut = (statut ?? '').trim().toUpperCase();
    if (brut === 'SIGNALE') return this.l.t('En cours de vérification', 'قيد التحقق');
    if (brut === 'MASQUE') return this.l.t('Masqué par la modération', 'أخفته الإدارة');
    if (brut === 'PUBLIE') return this.l.t('Publié', 'منشور');
    return libelleStatutAvis(statut);
  }

  /** Recupere (une seule fois par praticien) le nom des medecins notes. */
  private chargerNoms(liste: Avis[]) {
    const ids = new Set(liste.map((a) => a.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe({
        next: (m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })),
        error: () => undefined,
      });
    }
  }
}
