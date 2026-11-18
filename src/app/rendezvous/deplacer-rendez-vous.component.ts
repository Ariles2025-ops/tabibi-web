import { Component, OnInit, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Creneau } from '../annuaire/annuaire.service';
import { RendezVous } from './rendezvous.service';

/** Message affiche quand le nouveau creneau vient d'etre pris (409). */
export const MESSAGE_CRENEAU_PRIS = "Ce créneau vient d'être pris. Votre rendez-vous n'a pas changé : choisissez un autre créneau.";

/**
 * Deplacement d'un rendez-vous : liste des creneaux libres du meme medecin, choix d'un creneau puis confirmation.
 * L'ancien creneau n'est libere par l'API qu'apres succes (une seule transaction ; 409 si le nouveau est pris).
 */
@Component({
    selector: 'app-deplacer-rendez-vous',
    imports: [CommonModule],
    template: `
    <div class="deplacer" role="group" aria-label="Déplacer le rendez-vous" style="flex-basis:100%;display:grid;gap:8px">
      <strong style="color:var(--ink);font-size:.9rem">Choisissez un nouveau créneau</strong>
      <p *ngIf="chargement()" style="margin:0;color:var(--text3)">Chargement des créneaux…</p>
      <p *ngIf="erreur()" role="alert" style="margin:0;color:var(--red)">{{ erreur() }}</p>
      <p *ngIf="!chargement() && !erreur() && libres().length === 0" style="margin:0;color:var(--text3)">Aucun autre créneau disponible pour le moment.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap" *ngIf="!choisi()">
        <button *ngFor="let c of libres()" type="button" class="bouton-secondaire creneau-libre" (click)="choisi.set(c)">
          {{ c.debut | date:'EEE d MMM à HH:mm' }}
        </button>
      </div>
      <div *ngIf="choisi() as c" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="color:var(--text2);font-size:.9rem">Déplacer ce rendez-vous au {{ c.debut | date:'EEEE d MMMM à HH:mm' }} ?</span>
        <button type="button" class="bouton confirmer-deplacement" (click)="confirmer(c)" [disabled]="enCours()">
          {{ enCours() ? 'Déplacement…' : 'Confirmer' }}
        </button>
        <button type="button" class="bouton-secondaire" (click)="choisi.set(null)" [disabled]="enCours()">Changer</button>
      </div>
      <div><button type="button" class="bouton-secondaire" (click)="annule.emit()" [disabled]="enCours()">Fermer</button></div>
    </div>
  `
})
export class DeplacerRendezVousComponent implements OnInit {
  rendezVous = input.required<RendezVous>();
  /** Creneaux du medecin du rendez-vous (selon le role). */
  lister = input.required<() => Observable<Creneau[]>>();
  /** Appel de deplacement (selon le role) ; recoit l'identifiant du nouveau creneau. */
  deplacer = input.required<(rdv: RendezVous, creneauId: string) => Observable<unknown>>();
  deplace = output<Creneau>();
  annule = output<void>();

  libres = signal<Creneau[]>([]);
  choisi = signal<Creneau | null>(null);
  chargement = signal(true);
  enCours = signal(false);
  erreur = signal('');

  ngOnInit() {
    const rdv = this.rendezVous();
    this.lister()().subscribe({
      next: (liste) => {
        const maintenant = Date.now();
        this.libres.set(
          liste
            .filter((c) => c.disponible && c.id !== rdv.creneauId && c.medecinId === rdv.medecinId && Date.parse(c.debut) > maintenant)
            .sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)),
        );
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger les créneaux disponibles.');
      },
    });
  }

  confirmer(creneau: Creneau) {
    this.enCours.set(true);
    this.erreur.set('');
    this.deplacer()(this.rendezVous(), creneau.id).subscribe({
      next: () => {
        this.enCours.set(false);
        this.deplace.emit(creneau);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        this.choisi.set(null);
        if (e.status === 409) {
          this.erreur.set(MESSAGE_CRENEAU_PRIS);
          this.libres.update((l) => l.filter((c) => c.id !== creneau.id));
        } else {
          this.erreur.set(e.error?.erreur ?? 'Le déplacement a échoué, veuillez réessayer.');
        }
      },
    });
  }
}
