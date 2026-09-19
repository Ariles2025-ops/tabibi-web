import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { AR } from './ar';
import { EN } from './en';
import { FR } from './fr';
import { LANGUE_SERVEUR } from './langue-serveur';
import { interpoler, traduireFr } from './traducteur';
import {
  CLE_STOCKAGE_LANGUE,
  LANGUES_INTERFACE,
  LOCALES,
  TraductionService,
  langueDepuisAcceptLanguage,
  langueDepuisCode,
} from './traduction.service';

/**
 * Traduction a l'execution : dictionnaires complets, interpolation, changement de langue et sens d'ecriture
 * (`<html lang dir>`), choix initial (stockage, en-tete du serveur, navigateur).
 */
describe('Dictionnaires', () => {
  it('portent exactement les memes cles dans les trois langues', () => {
    const fr = Object.keys(FR).sort();
    expect(Object.keys(AR).sort()).toEqual(fr);
    expect(Object.keys(EN).sort()).toEqual(fr);
  });

  it('ne laissent aucun libelle vide', () => {
    for (const [langue, dictionnaire] of [
      ['fr', FR],
      ['ar', AR],
      ['en', EN],
    ] as const) {
      for (const [cle, libelle] of Object.entries(dictionnaire)) {
        expect(libelle.trim()).withContext(`${langue} / ${cle}`).not.toBe('');
      }
    }
  });

  it('emploient les memes parametres d interpolation dans les trois langues', () => {
    const parametres = (texte: string) => (texte.match(/\{(\w+)\}/g) ?? []).sort();
    for (const cle of Object.keys(FR) as (keyof typeof FR)[]) {
      expect(parametres(AR[cle])).withContext(`ar / ${cle}`).toEqual(parametres(FR[cle]));
      expect(parametres(EN[cle])).withContext(`en / ${cle}`).toEqual(parametres(FR[cle]));
    }
  });

  it('proposent les trois langues au selecteur, dans leur propre langue', () => {
    expect(LANGUES_INTERFACE.map((l) => l.code)).toEqual(['fr', 'ar', 'en']);
    expect(LANGUES_INTERFACE.map((l) => l.libelle)).toEqual(['Français', 'العربية', 'English']);
  });
});

describe('interpoler', () => {
  it('remplace chaque parametre par sa valeur', () => {
    expect(interpoler('Praticien : {nom}', { nom: 'Dr Belkacem' })).toBe('Praticien : Dr Belkacem');
    expect(interpoler('{n} min', { n: 30 })).toBe('30 min');
  });

  it('laisse tel quel un parametre absent et ne touche pas un texte sans parametre', () => {
    expect(interpoler('Bonjour {nom}', {})).toBe('Bonjour {nom}');
    expect(interpoler('Bonjour {nom}')).toBe('Bonjour {nom}');
    expect(interpoler('Aucun praticien trouve.', { n: 1 })).toBe('Aucun praticien trouve.');
  });

  it('traduireFr traduit en francais sans service (valeur par defaut des fonctions de libelles)', () => {
    expect(traduireFr('statut.rendezVous.CONFIRME')).toBe('Confirmé');
    expect(traduireFr('commun.minutes', { n: 20 })).toBe('20 min');
  });
});

describe('langueDepuisCode', () => {
  it('reconnait les trois langues, avec ou sans region', () => {
    expect(langueDepuisCode('fr')).toBe('fr');
    expect(langueDepuisCode('fr-FR')).toBe('fr');
    expect(langueDepuisCode('ar-DZ')).toBe('ar');
    expect(langueDepuisCode('AR')).toBe('ar');
    expect(langueDepuisCode('en-GB')).toBe('en');
  });

  it('renvoie null pour une langue non prise en charge ou une valeur vide', () => {
    expect(langueDepuisCode('kab')).toBeNull();
    expect(langueDepuisCode('es')).toBeNull();
    expect(langueDepuisCode('')).toBeNull();
    expect(langueDepuisCode(null)).toBeNull();
  });
});

describe('langueDepuisAcceptLanguage', () => {
  it('prend la langue prise en charge la mieux notee', () => {
    expect(langueDepuisAcceptLanguage('ar-DZ,ar;q=0.9,fr;q=0.8')).toBe('ar');
    expect(langueDepuisAcceptLanguage('en-US,en;q=0.9')).toBe('en');
    expect(langueDepuisAcceptLanguage('es;q=0.9,ar;q=0.5')).toBe('ar');
    expect(langueDepuisAcceptLanguage('fr;q=0.2,ar;q=0.8')).toBe('ar');
  });

  it('retombe sur le francais sans en-tete ou sans langue connue', () => {
    expect(langueDepuisAcceptLanguage('')).toBe('fr');
    expect(langueDepuisAcceptLanguage(null)).toBe('fr');
    expect(langueDepuisAcceptLanguage('kab,es;q=0.5')).toBe('fr');
    expect(langueDepuisAcceptLanguage('ar;q=0')).toBe('fr');
  });
});

describe('TraductionService', () => {
  let document: Document;

  /** Cree le service avec, au besoin, l'en-tete Accept-Language qu'aurait fourni server.ts. */
  function creer(langueServeur?: string): TraductionService {
    TestBed.configureTestingModule({
      providers: langueServeur === undefined ? [] : [{ provide: LANGUE_SERVEUR, useValue: langueServeur }],
    });
    document = TestBed.inject(DOCUMENT);
    return TestBed.inject(TraductionService);
  }

  afterEach(() => {
    try {
      localStorage.removeItem(CLE_STOCKAGE_LANGUE);
    } catch {
      // Stockage indisponible : rien a nettoyer.
    }
    document?.documentElement.setAttribute('lang', 'fr');
    document?.documentElement.setAttribute('dir', 'ltr');
  });

  it('demarre en francais et pose lang et dir sur le document', () => {
    const service = creer();

    expect(service.langue()).toBe('fr');
    expect(service.dir()).toBe('ltr');
    expect(service.locale()).toBe(LOCALES.fr);
    expect(document.documentElement.getAttribute('lang')).toBe('fr');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(service.choisieManuellement()).toBeFalse();
  });

  it('traduit dans la langue courante et interpole les parametres', () => {
    const service = creer();

    expect(service.t('annuaire.titre')).toBe('Trouver un praticien');
    expect(service.t('commun.minutes', { n: 30 })).toBe('30 min');

    service.changer('ar');
    expect(service.t('annuaire.titre')).toBe(AR['annuaire.titre']);
    expect(service.t('commun.minutes', { n: 30 })).toBe('30 دقيقة');

    service.changer('en');
    expect(service.t('annuaire.titre')).toBe('Find a practitioner');
    expect(service.t('avis.moyenne', { moyenne: '4.5', nombre: 2 })).toBe('4.5 / 5 (2 reviews)');
  });

  it('passe en arabe : dir rtl, locale ar-DZ et document mis a jour', () => {
    const service = creer();

    service.changer('ar');

    expect(service.langue()).toBe('ar');
    expect(service.dir()).toBe('rtl');
    expect(service.locale()).toBe('ar-DZ');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('memorise le choix du selecteur et le relit au demarrage suivant', () => {
    creer().changer('ar');
    expect(localStorage.getItem(CLE_STOCKAGE_LANGUE)).toBe('ar');

    TestBed.resetTestingModule();
    const suivant = creer('fr-FR');

    expect(suivant.langue()).toBe('ar');
    expect(suivant.choisieManuellement()).toBeTrue();
  });

  it('une initialisation depuis le profil ne compte pas comme un choix manuel', () => {
    const service = creer();

    service.changer('en', false);

    expect(service.langue()).toBe('en');
    expect(service.choisieManuellement()).toBeFalse();
    expect(localStorage.getItem(CLE_STOCKAGE_LANGUE)).toBeNull();
  });

  it('au rendu serveur, la langue vient de l en-tete Accept-Language', () => {
    expect(creer('ar-DZ,ar;q=0.9,fr;q=0.8').langue()).toBe('ar');

    TestBed.resetTestingModule();
    expect(creer('en-US,en;q=0.9').langue()).toBe('en');

    TestBed.resetTestingModule();
    expect(creer('kab').langue()).toBe('fr');
  });

  it('une cle absente du dictionnaire courant retombe sur le francais', () => {
    const service = creer();
    service.changer('ar');
    const incomplet = AR as Record<string, string>;
    const sauvegarde = incomplet['annuaire.rechercher'];
    delete incomplet['annuaire.rechercher'];

    expect(service.t('annuaire.rechercher')).toBe('Rechercher');

    incomplet['annuaire.rechercher'] = sauvegarde;
  });
});
