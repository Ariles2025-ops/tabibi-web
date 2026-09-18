import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnnuaireService, Medecin } from './annuaire.service';

@Component({
  selector: 'app-annuaire',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <header style="display:flex;justify-content:space-between;align-items:center">
        <h1 style="color:var(--vert);margin:0">Tabibi</h1>
        <a routerLink="/moi">Mon compte</a>
      </header>

      <form (ngSubmit)="rechercher()" style="display:flex;gap:8px;flex-wrap:wrap;margin:20px 0">
        <input [(ngModel)]="q" name="q" placeholder="Nom du medecin"
               style="flex:1;min-width:160px;padding:10px;border:1px solid #ddd;border-radius:8px">
        <select [(ngModel)]="specialite" name="specialite" style="padding:10px;border:1px solid #ddd;border-radius:8px">
          <option value="">Toute specialite</option>
          <option value="generaliste">Generaliste</option>
          <option value="cardiologue">Cardiologue</option>
          <option value="dermatologue">Dermatologue</option>
          <option value="pediatre">Pediatre</option>
        </select>
        <input [(ngModel)]="wilaya" name="wilaya" placeholder="Wilaya (code)"
               style="width:120px;padding:10px;border:1px solid #ddd;border-radius:8px">
        <button type="submit"
                style="padding:10px 16px;background:var(--vert);color:#fff;border:0;border-radius:8px">Rechercher</button>
      </form>

      <p *ngIf="charge()">Recherche…</p>
      <ul style="list-style:none;padding:0;display:grid;gap:10px">
        <li *ngFor="let m of resultats()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
          <strong>{{ m.nomComplet }}</strong><br>
          <span style="color:#566b64">{{ m.specialiteFr }} · {{ m.ville }} ({{ m.wilayaFr }})</span>
        </li>
      </ul>
      <p *ngIf="!charge() && resultats().length === 0">Aucun praticien trouve.</p>
    </main>
  `,
})
export class AnnuaireComponent implements OnInit {
  private service = inject(AnnuaireService);
  q = ''; specialite = ''; wilaya = '';
  resultats = signal<Medecin[]>([]);
  charge = signal(false);

  ngOnInit() { this.rechercher(); }

  rechercher() {
    this.charge.set(true);
    this.service.rechercher(this.specialite, this.wilaya, this.q).subscribe({
      next: (r) => { this.resultats.set(r); this.charge.set(false); },
      error: () => this.charge.set(false),
    });
  }
}
