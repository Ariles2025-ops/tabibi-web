import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { AR } from './ar';
import { EN } from './en';
import { ClesTraduction, FR } from './fr';
import { LANGUE_SERVEUR } from './langue-serveur';
import { ParametresTraduction, interpoler } from './traducteur';

/** Langues de l'interface : francais (par defaut), arabe (droite a gauche) et anglais. */
export type Langue = 'fr' | 'ar' | 'en';

export const LANGUES_INTERFACE: ReadonlyArray<{ code: Langue; libelle: string }> = [
  { code: 'fr', libelle: 'Français' },
  { code: 'ar', libelle: 'العربية' },
  { code: 'en', libelle: 'English' },
];

export const LANGUE_PAR_DEFAUT: Langue = 'fr';

/** Cle localStorage du choix manuel de langue (selecteur de la barre de navigation). */
export const CLE_STOCKAGE_LANGUE = 'tabibi.langue';

/**
 * Locale Angular (dates) de chaque langue : `LOCALE_ID` reste `fr`, mais le pipe `dateLocale` prend celle de la
 * langue courante. `ar-DZ` : noms des mois en usage en Algerie (جانفي، فيفري…) et chiffres latins.
 */
export const LOCALES: Record<Langue, string> = { fr: 'fr', ar: 'ar-DZ', en: 'en' };

const DICTIONNAIRES: Record<Langue, Record<ClesTraduction, string>> = { fr: FR, ar: AR, en: EN };

/** `fr-FR` → fr, `ar-DZ` → ar, `en-GB` → en ; null si la langue n'est pas prise en charge (kab, es…). */
export function langueDepuisCode(code: string | null | undefined): Langue | null {
  const base = (code ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return base === 'fr' || base === 'ar' || base === 'en' ? base : null;
}

/**
 * Premiere langue prise en charge d'un en-tete `Accept-Language` (« ar-DZ,ar;q=0.9,fr;q=0.8 » → ar), par ordre de
 * preference (`q`) ; francais si l'en-tete est absent ou ne cite aucune langue connue.
 */
export function langueDepuisAcceptLanguage(entete: string | null | undefined): Langue {
  if (!entete) return LANGUE_PAR_DEFAUT;
  const candidats = entete
    .split(',')
    .map((partie, index) => {
      const [code, ...params] = partie.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const poids = q ? Number(q.slice(2)) : 1;
      return { code, poids: Number.isNaN(poids) ? 0 : poids, index };
    })
    .filter((c) => c.poids > 0)
    .sort((a, b) => b.poids - a.poids || a.index - b.index);
  for (const c of candidats) {
    const langue = langueDepuisCode(c.code);
    if (langue) return langue;
  }
  return LANGUE_PAR_DEFAUT;
}

/**
 * Traduction a l'execution, sans reconstruction par langue : un dictionnaire par langue (fr, ar, en), toutes les
 * cles etant celles du francais (`ClesTraduction`). La langue courante est un signal : le pipe `t` et le pipe
 * `dateLocale` (impurs) se rafraichissent des qu'elle change. A chaque changement, `<html lang>` et `dir`
 * (`rtl` pour l'arabe) sont poses sur le document, au rendu serveur comme dans le navigateur.
 *
 * Choix initial : le choix memorise (`localStorage`, cle `tabibi.langue`, navigateur seulement), sinon
 * `LANGUE_SERVEUR` (en-tete `Accept-Language` au rendu serveur), sinon `navigator.language`, sinon le francais.
 */
@Injectable({ providedIn: 'root' })
export class TraductionService {
  private document = inject(DOCUMENT);
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  private langueServeur = inject(LANGUE_SERVEUR, { optional: true });
  private courante = signal<Langue>(LANGUE_PAR_DEFAUT);
  private choixManuel = signal(false);

  /** Langue courante de l'interface. */
  langue = this.courante.asReadonly();
  /** Vrai si l'utilisateur a choisi la langue lui-meme (memorisee) : le profil ne la remplace alors pas. */
  choisieManuellement = this.choixManuel.asReadonly();
  /** Locale Angular des dates de la langue courante. */
  locale = computed(() => LOCALES[this.courante()]);
  /** Sens d'ecriture : `rtl` pour l'arabe, `ltr` sinon. */
  dir = computed<'ltr' | 'rtl'>(() => (this.courante() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    const memorisee = this.lireChoixMemorise();
    if (memorisee) {
      this.courante.set(memorisee);
      this.choixManuel.set(true);
    } else {
      this.courante.set(this.langueInitiale());
    }
    this.appliquerAuDocument();
  }

  /**
   * Libelle de la cle dans la langue courante, avec interpolation des parametres (`{nom}` → valeur). Une cle
   * absente du dictionnaire courant retombe sur le francais, puis sur la cle elle-meme.
   */
  t(cle: ClesTraduction, params?: ParametresTraduction): string {
    return interpoler(DICTIONNAIRES[this.courante()][cle] ?? FR[cle] ?? cle, params);
  }

  /**
   * Change la langue de l'interface. Par defaut le choix est memorise (`localStorage`) : c'est celui du selecteur
   * de la barre de navigation ; `memoriser: false` pour une initialisation depuis le profil.
   */
  changer(langue: Langue, memoriser = true): void {
    this.courante.set(langue);
    if (memoriser) {
      this.choixManuel.set(true);
      if (this.navigateur) {
        try {
          localStorage.setItem(CLE_STOCKAGE_LANGUE, langue);
        } catch {
          // Stockage indisponible (navigation privee, quota) : le choix vaut pour la page en cours.
        }
      }
    }
    this.appliquerAuDocument();
  }

  private lireChoixMemorise(): Langue | null {
    if (!this.navigateur) return null;
    try {
      return langueDepuisCode(localStorage.getItem(CLE_STOCKAGE_LANGUE));
    } catch {
      return null;
    }
  }

  private langueInitiale(): Langue {
    if (this.langueServeur !== null && this.langueServeur !== undefined) {
      return langueDepuisAcceptLanguage(this.langueServeur);
    }
    if (this.navigateur && typeof navigator !== 'undefined') {
      return langueDepuisCode(navigator.language) ?? LANGUE_PAR_DEFAUT;
    }
    return LANGUE_PAR_DEFAUT;
  }

  private appliquerAuDocument(): void {
    const html = this.document?.documentElement;
    if (!html) return;
    html.setAttribute('lang', this.courante());
    html.setAttribute('dir', this.dir());
  }
}
