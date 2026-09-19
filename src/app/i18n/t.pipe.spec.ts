import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateLocalePipe } from './date-locale.pipe';
import { TPipe } from './t.pipe';
import { TraductionService } from './traduction.service';

/** Hote minimal des deux pipes : un libelle, un libelle avec parametre et une date. */
@Component({
  standalone: true,
  imports: [TPipe, DateLocalePipe],
  template: `
    <p id="titre">{{ 'annuaire.titre' | t }}</p>
    <p id="duree">{{ 'commun.minutes' | t: { n: 30 } }}</p>
    <p id="vide">{{ null | t }}</p>
    <p id="date">{{ '2026-09-18T14:30:00Z' | dateLocale: 'date' }}</p>
    <p id="brut">{{ '2026-09-18T14:30:00Z' | dateLocale: 'yyyy-MM-dd' }}</p>
    <p id="dateVide">{{ null | dateLocale }}</p>
  `,
})
class HotePipes {}

describe('TPipe et DateLocalePipe', () => {
  let fixture: ComponentFixture<HotePipes>;
  let i18n: TraductionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HotePipes] });
    fixture = TestBed.createComponent(HotePipes);
    i18n = TestBed.inject(TraductionService);
    fixture.detectChanges();
  });

  afterEach(() => i18n.changer('fr'));

  function texte(id: string): string {
    return fixture.nativeElement.querySelector(`#${id}`).textContent.trim();
  }

  it('traduit la cle et interpole les parametres', () => {
    expect(texte('titre')).toBe('Trouver un praticien');
    expect(texte('duree')).toBe('30 min');
  });

  it('rend une chaine vide pour une cle absente', () => {
    expect(texte('vide')).toBe('');
  });

  it('se rafraichit au changement de langue (pipe impur)', () => {
    i18n.changer('en');
    fixture.detectChanges();
    expect(texte('titre')).toBe('Find a practitioner');

    i18n.changer('ar');
    fixture.detectChanges();
    expect(texte('titre')).toBe('البحث عن طبيب');
  });

  it('dateLocale formate avec la locale de la langue courante', () => {
    expect(texte('date')).toBe('18 septembre 2026');

    i18n.changer('en');
    fixture.detectChanges();
    expect(texte('date')).toBe('18 September 2026');

    i18n.changer('ar');
    fixture.detectChanges();
    // Locale ar-DZ : nom de mois en usage en Algerie, chiffres latins.
    expect(texte('date')).toContain('2026');
    expect(texte('date')).not.toBe('18 September 2026');
  });

  it('dateLocale accepte un motif Angular brut et ignore une valeur absente', () => {
    expect(texte('brut')).toBe('2026-09-18');
    expect(texte('dateVide')).toBe('');
  });
});
