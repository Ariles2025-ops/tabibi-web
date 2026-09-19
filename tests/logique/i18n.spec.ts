import { expect, test } from '@playwright/test';
import { AR } from '../../src/app/i18n/ar';
import { EN } from '../../src/app/i18n/en';
import { FR } from '../../src/app/i18n/fr';
import {
  LANGUES_INTERFACE,
  LOCALES,
  langueDepuisAcceptLanguage,
  langueDepuisCode,
} from '../../src/app/i18n/langues';
import { interpoler, traduireFr } from '../../src/app/i18n/traducteur';

/**
 * Dictionnaires et fonctions pures de l'i18n : aucun paquet Angular n'est importe ici, les modules s'executent
 * directement dans node. Le rendu (pipe `t`, sens d'ecriture, memorisation du choix) est verifie dans le
 * projet `navigateur`.
 */

test.describe('Dictionnaires', () => {
  test('portent exactement les memes cles dans les trois langues', () => {
    const fr = Object.keys(FR).sort();
    expect(Object.keys(AR).sort()).toEqual(fr);
    expect(Object.keys(EN).sort()).toEqual(fr);
    // Garde-fou sur l'ordre de grandeur attendu (~430 cles) : une perte massive de cles serait un bug.
    expect(fr.length).toBeGreaterThan(400);
  });

  test('ne laissent aucun libelle vide', () => {
    for (const [langue, dictionnaire] of [
      ['fr', FR],
      ['ar', AR],
      ['en', EN],
    ] as const) {
      for (const [cle, libelle] of Object.entries(dictionnaire)) {
        expect(libelle.trim(), `${langue} / ${cle}`).not.toBe('');
      }
    }
  });

  test('emploient les memes parametres d interpolation dans les trois langues', () => {
    const parametres = (texte: string) => (texte.match(/\{(\w+)\}/g) ?? []).sort();
    for (const cle of Object.keys(FR) as (keyof typeof FR)[]) {
      expect(parametres(AR[cle]), `ar / ${cle}`).toEqual(parametres(FR[cle]));
      expect(parametres(EN[cle]), `en / ${cle}`).toEqual(parametres(FR[cle]));
    }
  });

  test('proposent les trois langues au selecteur, dans leur propre langue', () => {
    expect(LANGUES_INTERFACE.map((l) => l.code)).toEqual(['fr', 'ar', 'en']);
    expect(LANGUES_INTERFACE.map((l) => l.libelle)).toEqual(['Français', 'العربية', 'English']);
  });

  test('associent a chaque langue sa locale de dates', () => {
    expect(LOCALES).toEqual({ fr: 'fr', ar: 'ar-DZ', en: 'en' });
  });
});

test.describe('interpoler', () => {
  test('remplace chaque parametre par sa valeur', () => {
    expect(interpoler('Praticien : {nom}', { nom: 'Dr Belkacem' })).toBe('Praticien : Dr Belkacem');
    expect(interpoler('{n} min', { n: 30 })).toBe('30 min');
  });

  test('laisse tel quel un parametre absent et ne touche pas un texte sans parametre', () => {
    expect(interpoler('Bonjour {nom}', {})).toBe('Bonjour {nom}');
    expect(interpoler('Bonjour {nom}')).toBe('Bonjour {nom}');
    expect(interpoler('Aucun praticien trouve.', { n: 1 })).toBe('Aucun praticien trouve.');
  });

  test('traduireFr traduit en francais sans service (valeur par defaut des fonctions de libelles)', () => {
    expect(traduireFr('statut.rendezVous.CONFIRME')).toBe('Confirmé');
    expect(traduireFr('commun.minutes', { n: 20 })).toBe('20 min');
  });
});

test.describe('langueDepuisCode', () => {
  test('reconnait les trois langues, avec ou sans region', () => {
    expect(langueDepuisCode('fr')).toBe('fr');
    expect(langueDepuisCode('fr-FR')).toBe('fr');
    expect(langueDepuisCode('ar-DZ')).toBe('ar');
    expect(langueDepuisCode('AR')).toBe('ar');
    expect(langueDepuisCode('en-GB')).toBe('en');
  });

  test('renvoie null pour une langue non prise en charge ou une valeur vide', () => {
    expect(langueDepuisCode('kab')).toBeNull();
    expect(langueDepuisCode('es')).toBeNull();
    expect(langueDepuisCode('')).toBeNull();
    expect(langueDepuisCode(null)).toBeNull();
  });
});

test.describe('langueDepuisAcceptLanguage', () => {
  test('prend la langue prise en charge la mieux notee', () => {
    expect(langueDepuisAcceptLanguage('ar-DZ,ar;q=0.9,fr;q=0.8')).toBe('ar');
    expect(langueDepuisAcceptLanguage('en-US,en;q=0.9')).toBe('en');
    expect(langueDepuisAcceptLanguage('es;q=0.9,ar;q=0.5')).toBe('ar');
    expect(langueDepuisAcceptLanguage('fr;q=0.2,ar;q=0.8')).toBe('ar');
  });

  test('retombe sur le francais sans en-tete ou sans langue connue', () => {
    expect(langueDepuisAcceptLanguage('')).toBe('fr');
    expect(langueDepuisAcceptLanguage(null)).toBe('fr');
    expect(langueDepuisAcceptLanguage('kab,es;q=0.5')).toBe('fr');
    expect(langueDepuisAcceptLanguage('ar;q=0')).toBe('fr');
  });
});
