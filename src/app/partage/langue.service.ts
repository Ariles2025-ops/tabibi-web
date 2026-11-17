import { Injectable, signal } from '@angular/core';

const CLE = 'tabibi.langue';

/**
 * Langue d'affichage des ecrans prives (espaces medecin et secretaire) : francais par defaut, arabe au choix
 * (memorise dans ce navigateur). Les pages publiques gardent leur langue propre (/ar/...).
 */
@Injectable({ providedIn: 'root' })
export class LangueService {
  /** Vrai quand l'interface est en arabe (affichage de droite a gauche). */
  ar = signal(lireLangue());

  /** Texte dans la langue courante. */
  t(fr: string, ar: string): string {
    return this.ar() ? ar : fr;
  }

  /** Repasse en francais pour la session sans toucher a la preference memorisee (ecrans non traduits en arabe). */
  forcerFrancais() {
    if (this.ar()) this.ar.set(false);
  }

  basculer() {
    this.definir(!this.ar());
  }

  definir(arabe: boolean) {
    this.ar.set(arabe);
    try {
      localStorage.setItem(CLE, arabe ? 'ar' : 'fr');
    } catch {
      /* stockage indisponible (rendu serveur, navigation privee) : la langue reste celle de la session */
    }
  }
}

function lireLangue(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(CLE) === 'ar';
  } catch {
    return false;
  }
}
