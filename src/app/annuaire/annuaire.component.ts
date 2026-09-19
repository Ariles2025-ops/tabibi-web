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
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0">{{ 'annuaire.titre' | t }}</h1>

      <form (ngSubmit)="rechercher()" style="display:flex;gap:8px;flex-wrap:wrap;margin:20px 0">
        <input [(ngModel)]="q" name="q" [placeholder]="'annuaire.nom' | t"
               style="flex:1;min-width:160px;padding:10px;border:1px solid #ddd;border-radius:8px">
        <select [(ngModel)]="specialite" name="specialite" style="padding:10px;border:1px solid #ddd;border-radius:8px">
          <option value="">{{ 'annuaire.touteSpecialite' | t }}</option>
          <option value="generaliste">{{ 'specialite.generaliste' | t }}</option>
          <option value="cardiologue">{{ 'specialite.cardiologue' | t }}</option>
          <option value="dermatologue">{{ 'specialite.dermatologue' | t }}</option>
          <option value="pediatre">{{ 'specialite.pediatre' | t }}</option>
        </select>
        <input [(ngModel)]="wilaya" name="wilaya" [placeholder]="'annuaire.wilaya' | t"
               style="width:120px;padding:10px;border:1px solid #ddd;border-radius:8px">
        <button type="submit"
                style="padding:10px 16px;background:var(--vert);color:#fff;border:0;border-radius:8px">{{ 'annuaire.rechercher' | t }}</button>
      </form>

      <p *ngIf="charge()">{{ 'annuaire.recherche' | t }}</p>
      <ul style="list-style:none;padding:0;display:grid;gap:10px">
        <li *ngFor="let m of resultats()" style="border:1px solid #e4e9e7;border-radius:12px">
          <a [routerLink]="['/medecins', m.id]" style="display:block;padding:14px;color:inherit;text-decoration:none">
            <strong style="color:var(--vert)">{{ m.nomComplet }}</strong><br>
            <span style="color:#566b64">{{ m.specialiteFr }} · {{ m.ville }} ({{ m.wilayaFr }})</span>
          </a>
        </li>
      </ul>
      <p *ngIf="!charge() && resultats().length === 0">{{ 'annuaire.aucun' | t }}</p>
    </main>
  `,
})
export class AnnuaireComponent implements OnInit {
  private service = inject(AnnuaireService);
  private seo = inject(SeoService);
  q = ''; specialite = ''; wilaya = '';
  resultats = signal<Medecin[]>([]);
  charge = signal(false);

  ngOnInit() {
    this.seo.definir({ titre: 'seo.annuaire.titre', description: 'seo.annuaire.description', canonique: '/' });
    this.rechercher();
  }

  rechercher() {
    this.charge.set(true);
    this.service.rechercher(this.specialite, this.wilaya, this.q).subscribe({
      next: (r) => { this.resultats.set(r); this.charge.set(false); },
      error: () => this.charge.set(false),
    });
  }
}
