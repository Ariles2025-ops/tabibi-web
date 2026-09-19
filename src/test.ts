import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar-DZ';
import localeEn from '@angular/common/locales/en';
import localeFr from '@angular/common/locales/fr';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { CLE_STOCKAGE_LANGUE, LANGUE_PAR_DEFAUT } from './app/i18n/traduction.service';
import { LANGUE_SERVEUR } from './app/i18n/langue-serveur';

/**
 * Point d'entree des tests unitaires (`main` de la cible `test` dans angular.json ; les fichiers `*.spec.ts` sont
 * decouverts par le constructeur). Il initialise l'environnement Jasmine / Angular et fixe la langue de
 * l'interface a `fr` pour toutes les specs : le navigateur d'integration continue annonce `en-US`, et les libelles
 * attendus par les specs existantes sont ceux du francais. Une spec qui veut une autre langue appelle
 * `TraductionService.changer(...)` elle-meme.
 */
// Memes donnees de locale qu'au demarrage de l'application (app.config.ts) : le pipe `dateLocale` en a besoin.
registerLocaleData(localeFr);
registerLocaleData(localeAr);
registerLocaleData(localeEn);

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

beforeEach(() => {
  // Le stockage est partage par toutes les specs du navigateur : un choix memorise par l'une ne doit pas fuir.
  try {
    localStorage.removeItem(CLE_STOCKAGE_LANGUE);
  } catch {
    // Stockage indisponible : rien a nettoyer.
  }
  TestBed.configureTestingModule({ providers: [{ provide: LANGUE_SERVEUR, useValue: LANGUE_PAR_DEFAUT }] });
});
