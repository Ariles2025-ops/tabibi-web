import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TPipe } from '../i18n/t.pipe';
import { SeoService } from '../seo/seo.service';
import { AnnuaireService, Medecin } from './annuaire.service';

@Component({
  selector: 'app-annuaire',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe],
  template: `
    <main style="max-width:880px;margin:0 auto;padding:24px 16px 48px">

      <!-- HERO de marque (dégradé vert, signature Tabibi) -->
      <section class="hero">
        <span class="hero-badge"><span class="hero-dot"></span>{{ 'accueil.badge' | t }}</span>

        <h1 [innerHTML]="'accueil.titre' | t"></h1>
        <p class="hero-sous">{{ 'accueil.sousTitre' | t }}</p>

        <!-- Barre de recherche unifiée -->
        <form (ngSubmit)="rechercher()" class="recherche-barre">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="flex:none;color:#64748b">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
            <path d="M20 20l-3.2-3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input [(ngModel)]="recherche" name="q" [placeholder]="'accueil.recherchePlaceholder' | t"
                 [attr.aria-label]="'accueil.recherchePlaceholder' | t">
          <button type="submit" class="bouton">{{ 'annuaire.rechercher' | t }}</button>
        </form>

        <!-- Note de paiement -->
        <p class="hero-paiement">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex:none;color:#fcd34d">
            <rect x="2.5" y="5" width="19" height="14" rx="3" stroke="currentColor" stroke-width="2"/>
            <path d="M2.5 9.5h19" stroke="currentColor" stroke-width="2"/>
          </svg>
          {{ 'accueil.paiement' | t }}
        </p>

        <!-- Tuiles de stats -->
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="hero-stat-val">{{ resultats().length }}</div>
            <div class="hero-stat-lib">{{ 'accueil.statMedecins' | t }}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-val">58</div>
            <div class="hero-stat-lib">{{ 'accueil.statWilayas' | t }}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-val">24/7</div>
            <div class="hero-stat-lib">{{ 'accueil.statReservation' | t }}</div>
          </div>
        </div>
      </section>

      <!-- RESULTATS -->
      <h2 style="font-size:1.2rem;margin:32px 0 14px">{{ 'annuaire.titre' | t }}</h2>
      <p *ngIf="charge()" style="color:var(--texte-doux)">{{ 'annuaire.recherche' | t }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:12px">
        <li *ngFor="let m of resultats()" class="carte carte-cliquable medecin-carte">
          <a [routerLink]="['/medecins', m.id]" class="medecin-lien">
            <span class="medecin-avatar">{{ initiales(m.nomComplet) }}</span>
            <span style="flex:1;min-width:0">
              <span class="medecin-nom">{{ m.nomComplet }}</span><br>
              <span class="medecin-meta">{{ m.specialiteFr }} · {{ m.ville }} ({{ m.wilayaFr }})</span>
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex:none;color:var(--bord-fort)">
              <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </li>
      </ul>
      <p *ngIf="!charge() && resultats().length === 0" style="color:var(--texte-doux)">{{ 'annuaire.aucun' | t }}</p>
    </main>
  `,
})
export class AnnuaireComponent implements OnInit {
  private service = inject(AnnuaireService);
  private seo = inject(SeoService);
  recherche = '';
  resultats = signal<Medecin[]>([]);
  charge = signal(false);

  ngOnInit() {
    this.seo.definir({ titre: 'seo.annuaire.titre', description: 'seo.annuaire.description', canonique: '/' });
    this.rechercher();
  }

  rechercher() {
    this.charge.set(true);
    this.service.rechercher('', '', this.recherche).subscribe({
      next: (r) => { this.resultats.set(r); this.charge.set(false); },
      error: () => this.charge.set(false),
    });
  }

  initiales(nom: string): string {
    return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();
  }
}
