import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { PraticienPublicComponent } from './praticien-public.component';
import { REPONSE_HTTP } from './statut-http';

/** Fiche praticien publique : JSON-LD (Physician/Dentist/Pharmacy + BreadcrumbList), canonical et hreflang. */
describe('PraticienPublicComponent (JSON-LD)', () => {
  const dentiste: Medecin = {
    id: '3f2a1c9e-8b4d-4e6a-9c1f-5d7e2a0b6c48', nomComplet: 'Dr Amine Benali', specialiteSlug: 'dentiste', specialiteFr: 'Dentiste',
    wilayaCode: '31', wilayaFr: 'Oran', ville: 'Oran',
  };

  function creer(langue: 'fr' | 'ar', m: Medecin, liste: Medecin[] = []) {
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin', 'rechercher']);
    annuaire.medecin.and.returnValue(of(m));
    annuaire.rechercher.and.returnValue(of(liste));
    TestBed.configureTestingModule({
      imports: [PraticienPublicComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { langue } }, paramMap: of(convertToParamMap({ id: m.id })) } },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: REPONSE_HTTP, useValue: { status: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(PraticienPublicComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const description = () => document.head.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  it('fiche non reservable : « Voir la fiche », pas de badge ni de promesse de reservation', () => {
    const el = creer('fr', dentiste, [{ ...dentiste, reservable: false }]);
    expect(el.querySelector('.pp-resa')).toBeNull();
    expect(el.querySelector('.pp-btn')?.textContent).toContain('Voir la fiche');
    expect(el.querySelector('.pp-action small')).toBeNull();
    expect(description()).not.toContain('rendez-vous');
  });

  it('reservable connu par la liste : badge, bouton et description de reservation', () => {
    const el = creer('fr', dentiste, [{ ...dentiste, reservable: true }]);
    expect(el.querySelector('.pp-resa')).toBeTruthy();
    expect(el.querySelector('.pp-btn')?.textContent).toContain('Prendre rendez-vous');
    expect(description()).toContain('rendez-vous');
  });

  it('identifiant non UUID : vraie 404 au rendu serveur, sans appel a l API', () => {
    const status = jasmine.createSpy('status');
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin', 'rechercher']);
    TestBed.configureTestingModule({
      imports: [PraticienPublicComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { langue: 'fr' } }, paramMap: of(convertToParamMap({ id: 'n-importe-quoi' })) } },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: REPONSE_HTTP, useValue: { status } },
      ],
    });
    TestBed.createComponent(PraticienPublicComponent).detectChanges();
    expect(status).toHaveBeenCalledWith(404);
    expect(annuaire.medecin).not.toHaveBeenCalled();
  });

  const ld = (id: string) => {
    const el = document.head.querySelector(`script#${id}`);
    return el ? JSON.parse(el.textContent || '{}') : null;
  };

  afterEach(() => {
    document.head.querySelectorAll('script[type="application/ld+json"], link[rel="canonical"], link[rel="alternate"]').forEach((e) => e.remove());
  });

  it('FR : fiche Dentist complete + fil d Ariane Accueil › Specialite › Wilaya › Nom', () => {
    creer('fr', dentiste);
    const f = ld('ld-praticien');
    expect(f['@type']).toBe('Dentist');
    expect(f.name).toBe('Dr Amine Benali');
    expect(f.medicalSpecialty).toBe('Dentiste');
    expect(f.inLanguage).toBe('fr');
    expect(f.url).toBe('https://tabibi.doctor/praticiens/3f2a1c9e-8b4d-4e6a-9c1f-5d7e2a0b6c48/dr-amine-benali');
    expect(f.address.addressRegion).toBe('Oran');
    const fil = ld('ld-fil');
    expect(fil['@type']).toBe('BreadcrumbList');
    expect(fil.itemListElement.map((e: { name: string }) => e.name)).toEqual(['Accueil', 'Dentiste', 'Oran', 'Dr Amine Benali']);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(f.url);
    expect(document.head.querySelector('link[rel="alternate"][hreflang="fr"]')).toBeTruthy();
    expect(document.head.querySelector('link[rel="alternate"][hreflang="ar"]')).toBeTruthy();
  });

  it('AR : textes arabes, URL /ar, Physician pour une autre specialite, Pharmacy pour une pharmacie', () => {
    creer('ar', { ...dentiste, specialiteSlug: 'cardiologue', specialiteFr: 'Cardiologue' });
    const f = ld('ld-praticien');
    expect(f['@type']).toBe('Physician');
    expect(f.inLanguage).toBe('ar');
    expect(f.url).toContain('https://tabibi.doctor/ar/praticiens/3f2a1c9e-8b4d-4e6a-9c1f-5d7e2a0b6c48/');
    expect(f.address.addressRegion).toBe('وهران');
    expect(ld('ld-fil').itemListElement[0].name).toBe('الرئيسية');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(f.url);
    TestBed.resetTestingModule();
    creer('fr', { ...dentiste, specialiteSlug: 'pharmacie', specialiteFr: 'Pharmacie' });
    expect(ld('ld-praticien')['@type']).toBe('Pharmacy');
  });
});
