import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { REPONSE_SERVEUR } from './reponse-serveur';

/** Nom du site, en suffixe de chaque titre : « Trouver un médecin en Algérie | Tabibi ». */
export const SUFFIXE_TITRE = 'Tabibi';

/** Description par defaut, utilisee quand une page n'en donne pas (pages privees notamment). */
export const DESCRIPTION_PAR_DEFAUT =
  'Tabibi : prenez rendez-vous avec un médecin en Algérie, consultez les créneaux disponibles et vérifiez une ordonnance.';

export interface DefinitionPage {
  /** Titre de la page, sans le suffixe « | Tabibi » (ajoute ici). */
  titre: string;
  /** Contenu de `<meta name="description">` ; sinon la description par defaut. */
  description?: string;
  /**
   * Chemin canonique de la page (« /medecins/m1 ») : pose `<link rel="canonical">` avec l'origine du site
   * (`document.location`, connue aussi au rendu serveur) ; sans chemin, la balise est retiree.
   */
  canonique?: string;
  /**
   * Page reservee a un utilisateur connecte (rendez-vous, espaces medecin, admin...) : `robots noindex, nofollow`,
   * les moteurs n'ont rien a y lire (le serveur rend l'etat « non connecte »). Faux par defaut.
   */
  privee?: boolean;
}

/**
 * Titre, description et directives robots de la page courante, poses par chaque composant de page dans son
 * `ngOnInit` (Angular n'a pas de titre par route « riche » : la fiche du praticien depend de la reponse de l'API).
 * Fonctionne au rendu serveur (`Title` / `Meta` ecrivent dans le document rendu, d'ou le referencement) comme
 * dans le navigateur (mise a jour a chaque navigation).
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private reponse = inject(REPONSE_SERVEUR, { optional: true });

  definir(page: DefinitionPage): void {
    this.title.setTitle(`${page.titre} | ${SUFFIXE_TITRE}`);
    this.meta.updateTag({ name: 'description', content: page.description || DESCRIPTION_PAR_DEFAUT });
    if (page.privee) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.removeTag('name="robots"');
    }
    this.canonique(page.canonique);
  }

  /** Page privee : titre seul, `noindex, nofollow`, pas de canonique. */
  definirPrivee(titre: string): void {
    this.definir({ titre, privee: true });
  }

  /**
   * Page ou ressource introuvable : titre, `noindex` et, au rendu serveur, statut HTTP 404 (`REPONSE_SERVEUR`,
   * fourni par server.ts ; sans effet dans le navigateur, ou la page est deja affichee).
   */
  introuvable(titre = 'Page introuvable'): void {
    this.definirPrivee(titre);
    if (this.reponse) this.reponse.statut = 404;
  }

  private canonique(chemin: string | undefined): void {
    const head = this.document.head;
    if (!head) return;
    let lien = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!chemin) {
      lien?.remove();
      return;
    }
    if (!lien) {
      lien = this.document.createElement('link');
      lien.setAttribute('rel', 'canonical');
      head.appendChild(lien);
    }
    lien.setAttribute('href', `${this.origine()}${chemin}`);
  }

  /** Origine du site (schema://hote[:port]) ; vide si le document n'en a pas (tests), l'URL reste alors relative. */
  private origine(): string {
    const origine = this.document.location?.origin;
    return origine && origine !== 'null' ? origine : '';
  }
}
