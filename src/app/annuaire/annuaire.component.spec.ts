import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireComponent } from './annuaire.component';
import { AnnuaireService, Medecin } from './annuaire.service';

const MEDECINS: Medecin[] = [
  { id: 'm1', nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'generaliste', specialiteFr: 'Généraliste', wilayaCode: '16', wilayaFr: 'Alger', ville: 'Alger' },
  { id: 'm2', nomComplet: 'Dr Karim Meziane', specialiteSlug: 'cardiologue', specialiteFr: 'Cardiologue', wilayaCode: '31', wilayaFr: 'Oran', ville: 'Oran' },
];

/** Annuaire (page d'accueil) : recherche au chargement, resultats avec lien vers la fiche, titre et description SEO. */
describe('AnnuaireComponent', () => {
  let fixture: ComponentFixture<AnnuaireComponent>;
  let service: jasmine.SpyObj<AnnuaireService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercher']);
    service.rechercher.and.returnValue(of(MEDECINS));
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [provideRouter([]), { provide: AnnuaireService, useValue: service }],
    });
    fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();
  });

  it('lance la recherche au chargement et liste les praticiens avec un lien vers leur fiche', () => {
    expect(service.rechercher).toHaveBeenCalledWith('', '', '');
    const html: HTMLElement = fixture.nativeElement;
    expect(html.textContent).toContain('Dr Amina Belkacem');
    expect(html.textContent).toContain('Cardiologue · Oran (Oran)');
    expect(html.querySelector('a[href="/medecins/m2"]')).not.toBeNull();
  });

  it('definit le titre « Trouver un médecin en Algérie | Tabibi », la description et le canonique, page indexable', () => {
    expect(document.title).toBe('Trouver un médecin en Algérie | Tabibi');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('Annuaire des praticiens Tabibi');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${location.origin}/`);
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('relance la recherche avec les criteres saisis', () => {
    const composant = fixture.componentInstance;
    composant.specialite = 'cardiologue';
    composant.wilaya = '31';
    composant.q = 'Meziane';
    composant.rechercher();
    expect(service.rechercher).toHaveBeenCalledWith('cardiologue', '31', 'Meziane');
  });
});
