import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ClesTraduction, FR } from '../i18n/fr';
import { TraductionService } from '../i18n/traduction.service';
import { REPONSE_SERVEUR } from './reponse-serveur';

/** Nom du site, en suffixe de chaque titre : « Trouver un médecin en Algérie | Tabibi ». */
export const SUFFIXE_TITRE = 'Tabibi';

/** Description par defaut (francais), utilisee quand une page n'en donne pas ; traduite via `seo.description.defaut`. */
export const DESCRIPTION_PAR_DEFAUT = FR['seo.description.defaut'];

export interface DefinitionPage {
  /** Titre de la page, sans le suffixe « | Tabibi » (ajoute ici) : un texte, ou une cle de traduction. */
  titre: string;
  /** Contenu de `<meta name="description">` (texte ou cle de traduction) ; sinon la description par defaut. */
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
 *
 * Langues : `titre` et `description` peuvent etre des cles de traduction (`ClesTraduction`), traduites dans la
 * langue courante ; une definition peut aussi etre une fonction (titre construit avec des valeurs de l'API). La
 * derniere definition est reappliquee a chaque changement de langue (effet sur le signal de langue).
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private i18n = inject(TraductionService);
  private reponse = inject(REPONSE_SERVEUR, { optional: true });
  /** Derniere definition posee, reappliquee quand la langue change. */
  private derniere: (() => DefinitionPage) | null = null;

  constructor() {
    effect(() => {
      this.i18n.langue();
      if (this.derniere) this.appliquer(this.derniere());
    });
  }

  definir(page: DefinitionPage | (() => DefinitionPage)): void {
    this.derniere = typeof page === 'function' ? page : () => page;
    this.appliquer(this.derniere());
  }

  /** Page privee : titre seul (texte ou cle de traduction), `noindex, nofollow`, pas de canonique. */
  definirPrivee(titre: string | (() => string)): void {
    this.definir(() => ({ titre: typeof titre === 'function' ? titre() : titre, privee: true }));
  }

  /**
   * Page ou ressource introuvable : titre, `noindex` et, au rendu serveur, statut HTTP 404 (`REPONSE_SERVEUR`,
   * fourni par server.ts ; sans effet dans le navigateur, ou la page est deja affichee).
   */
  introuvable(titre: string | (() => string) = 'seo.pageIntrouvable'): void {
    this.definirPrivee(titre);
    if (this.reponse) this.reponse.statut = 404;
  }

  private appliquer(page: DefinitionPage): void {
    this.title.setTitle(`${this.texte(page.titre)} | ${SUFFIXE_TITRE}`);
    this.meta.updateTag({ name: 'description', content: this.texte(page.description || 'seo.description.defaut') });
    if (page.privee) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.removeTag('name="robots"');
    }
    this.canonique(page.canonique);
  }

  /** Une cle de traduction est traduite ; tout autre texte est repris tel quel. */
  private texte(valeur: string): string {
    return valeur in FR ? this.i18n.t(valeur as ClesTraduction) : valeur;
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
