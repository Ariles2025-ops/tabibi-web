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

      <!-- HERO -->
      <section class="carte" style="border-radius:var(--rayon-lg);padding:36px 24px;text-align:center">
        <span class="badge-or">{{ 'accueil.badge' | t }}</span>

        <h1 style="font-size:clamp(2rem,6vw,3rem);margin:18px auto 10px;max-width:12ch;text-wrap:balance">
          {{ 'accueil.titre' | t }}
        </h1>
        <p style="color:var(--texte-doux);font-size:1.1rem;max-width:52ch;margin:0 auto 24px">
          {{ 'accueil.sousTitre' | t }}
        </p>

        <!-- Barre de recherche unifiee -->
        <form (ngSubmit)="rechercher()"
              style="display:flex;align-items:center;gap:8px;background:var(--surface);border:1.5px solid var(--bord-fort);
                     border-radius:999px;padding:6px 6px 6px 18px;max-width:640px;margin:0 auto;box-shadow:var(--ombre)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="flex:none">
            <circle cx="11" cy="11" r="7" stroke="var(--vert)" stroke-width="2"/>
            <path d="M20 20l-3.2-3.2" stroke="var(--vert)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input [(ngModel)]="recherche" name="q" [placeholder]="'accueil.recherchePlaceholder' | t"
                 aria-label="{{ 'accueil.recherchePlaceholder' | t }}"
                 style="flex:1;min-width:0;border:0;outline:none;font:inherit;font-size:1.05rem;color:var(--texte);background:transparent">
          <button type="submit" class="bouton" style="border-radius:999px;padding:11px 22px">
            {{ 'annuaire.rechercher' | t }}
          </button>
        </form>

        <!-- Paiement -->
        <p style="display:flex;align-items:center;justify-content:center;gap:8px;color:var(--texte-doux);margin:18px 0 0;font-size:.95rem">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex:none">
            <rect x="2.5" y="5" width="19" height="14" rx="3" stroke="var(--or)" stroke-width="2"/>
            <path d="M2.5 9.5h19" stroke="var(--or)" stroke-width="2"/>
          </svg>
          {{ 'accueil.paiement' | t }}
        </p>

        <!-- Tuiles de stats -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:26px">
          <div class="carte" style="padding:16px 8px">
            <div style="font-family:var(--police-titre);font-weight:800;font-size:1.7rem;color:var(--vert)">{{ resultats().length }}</div>
            <div style="color:var(--texte-doux);font-size:.9rem">{{ 'accueil.statMedecins' | t }}</div>
          </div>
          <div class="carte" style="padding:16px 8px">
            <div style="font-family:var(--police-titre);font-weight:800;font-size:1.7rem;color:var(--vert)">58</div>
            <div style="color:var(--texte-doux);font-size:.9rem">{{ 'accueil.statWilayas' | t }}</div>
          </div>
          <div class="carte" style="padding:16px 8px">
            <div style="font-family:var(--police-titre);font-weight:800;font-size:1.7rem;color:var(--vert)">24/7</div>
            <div style="color:var(--texte-doux);font-size:.9rem">{{ 'accueil.statReservation' | t }}</div>
          </div>
        </div>
      </section>

      <!-- RESULTATS -->
      <h2 style="font-size:1.2rem;margin:32px 0 14px">{{ 'annuaire.titre' | t }}</h2>
      <p *ngIf="charge()" style="color:var(--texte-doux)">{{ 'annuaire.recherche' | t }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:12px">
        <li *ngFor="let m of resultats()" class="carte" style="padding:0">
          <a [routerLink]="['/medecins', m.id]"
             style="display:flex;align-items:center;gap:14px;padding:16px;color:inherit;text-decoration:none">
            <span style="flex:none;width:46px;height:46px;border-radius:50%;background:var(--vert-clair);color:var(--vert);
                         display:flex;align-items:center;justify-content:center;font-weight:700;font-family:var(--police-titre)">
              {{ initiales(m.nomComplet) }}
            </span>
            <span style="flex:1;min-width:0">
              <strong style="color:var(--texte);font-family:var(--police-titre);font-size:1.05rem">{{ m.nomComplet }}</strong><br>
              <span style="color:var(--texte-doux);font-size:.92rem">{{ m.specialiteFr }} · {{ m.ville }} ({{ m.wilayaFr }})</span>
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
