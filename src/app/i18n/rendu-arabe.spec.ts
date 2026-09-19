import { DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireComponent } from '../annuaire/annuaire.component';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AR } from './ar';
import { TraductionService } from './traduction.service';

const MEDECINS: Medecin[] = [
  { id: 'm1', nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'generaliste', specialiteFr: 'Généraliste', wilayaCode: '16', wilayaFr: 'Alger', ville: 'Alger' },
];

/**
 * Une page rendue en arabe : libelles du dictionnaire arabe, sens d'ecriture `rtl` sur le document, et titre de
 * la page (SeoService) traduit lui aussi. Les donnees de l'API (nom du praticien) restent telles quelles.
 */
describe('Rendu en arabe (annuaire)', () => {
  let fixture: ComponentFixture<AnnuaireComponent>;
  let i18n: TraductionService;
  let document: Document;

  beforeEach(() => {
    const service = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercher']);
    service.rechercher.and.returnValue(of(MEDECINS));
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [provideRouter([]), { provide: AnnuaireService, useValue: service }],
    });
    document = TestBed.inject(DOCUMENT);
    i18n = TestBed.inject(TraductionService);
    i18n.changer('ar');
    fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    i18n.changer('fr');
    document.title = '';
  });

  it('affiche les libelles en arabe', () => {
    const html: HTMLElement = fixture.nativeElement;

    expect(html.querySelector('h1')?.textContent?.trim()).toBe(AR['annuaire.titre']);
    expect(html.querySelector('h1')?.textContent?.trim()).toBe('البحث عن طبيب');
    expect(html.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('بحث');
    expect(html.querySelector('input[name="q"]')?.getAttribute('placeholder')).toBe('اسم الطبيب');
    expect(html.textContent).toContain('طبيب عام');
    // Les donnees de l'API ne sont pas traduites.
    expect(html.textContent).toContain('Dr Amina Belkacem');
  });

  it('pose dir rtl et lang ar sur le document', () => {
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
  });

  it('traduit aussi le titre de la page (referencement)', () => {
    expect(document.title).toBe(`${AR['seo.annuaire.titre']} | Tabibi`);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(AR['seo.annuaire.description']);
  });

  it('repasse en francais sans reconstruction de l application', () => {
    i18n.changer('fr');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Trouver un praticien');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(document.title).toBe('Trouver un médecin en Algérie | Tabibi');
  });
});
