import { Injectable, Injector, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../config/config.service';

/**
 * Fonctions recentes de l'API qui peuvent ne pas encore exister en production : tant qu'une route repond 404,
 * l'ecran correspondant reste cache, sans aucune erreur visible.
 */
@Injectable({ providedIn: 'root' })
export class ApiDisponibleService {
  private injector = inject(Injector);

  /** Route « semaine type » (faux apres un 404). */
  semaineType = signal(true);
  /** Route « RDV pris au telephone » (faux apres un 404). */
  rdvTelephone = signal(true);
  /** « Ma fiche » : vrai seulement si GET /api/medecin/fiche a repondu. */
  ficheMedecin = signal(false);

  /** Verifie une fois que la route de la fiche existe ; tout echec garde l'ecran cache. */
  sonderFiche() {
    // HttpClient n'est resolu qu'ici : les ecrans qui ne font que lire les indicateurs n'en ont pas besoin.
    const http = this.injector.get(HttpClient);
    http.get(`${this.injector.get(ConfigService).apiUrl}/api/medecin/fiche`).subscribe({
      next: () => this.ficheMedecin.set(true),
      error: () => this.ficheMedecin.set(false),
    });
  }
}
