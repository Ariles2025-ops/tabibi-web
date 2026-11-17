import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AnnuaireSeoComponent } from './annuaire-seo.component';
import { REPONSE_HTTP } from './statut-http';

/** Pages de l'annuaire : vraie 404 au rendu serveur, rubrique Pharmacies a part, accords « un / une ». */
describe('AnnuaireSeoComponent', () => {
  let reponse: { status: jasmine.Spy };
  let annuaire: jasmine.SpyObj<AnnuaireService>;

  function creer(params: Record<string, string>) {
    reponse = { status: jasmine.createSpy('status') };
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercher', 'communes']);
    annuaire.rechercher.and.returnValue(of([]));
    annuaire.communes.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [AnnuaireSeoComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} }, paramMap: of(convertToParamMap(params)) } },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: REPONSE_HTTP, useValue: reponse },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireSeoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('repond 404 (et non 200) pour une specialite ou une wilaya inexistante', () => {
    const f = creer({ specialite: 'nimportequoi' });
    expect(reponse.status).toHaveBeenCalledWith(404);
    expect(f.componentInstance.introuvable).toBeTrue();
    expect(annuaire.rechercher).not.toHaveBeenCalled();
  });

  it('ne touche pas au statut d une page existante', () => {
    creer({ specialite: 'cardiologue', wilaya: 'alger' });
    expect(reponse.status).not.toHaveBeenCalled();
    expect(annuaire.rechercher).toHaveBeenCalledWith('cardiologue', '16', undefined, undefined);
  });

  it('page wilaya : lien « Pharmacies à Alger », pharmacies absentes du maillage des specialites', () => {
    const f = creer({ wilaya: 'alger' });
    const el: HTMLElement = f.nativeElement;
    const lien = el.querySelector('a[href="/specialites/pharmacie/alger"]');
    expect(lien?.textContent).toContain('Pharmacies à Alger');
    expect(el.querySelectorAll('a[href="/specialites/pharmacie/alger"]').length).toBe(1);
    expect(f.componentInstance.specialitesAlpha.some((s) => s.slug === 'pharmacie')).toBeFalse();
  });

  it('page /specialites/pharmacie/alger : existe, sans « prendre rendez-vous »', () => {
    const f = creer({ specialite: 'pharmacie', wilaya: 'alger' });
    expect(reponse.status).not.toHaveBeenCalled();
    expect(f.componentInstance.titre).toBe('Pharmacies à Alger');
    expect(f.componentInstance.intro).not.toContain('rendez-vous');
    expect(annuaire.rechercher).toHaveBeenCalledWith('pharmacie', '16', undefined, undefined);
  });

  it('accorde l article : « une sage-femme », « un ORL »', () => {
    let f = creer({ specialite: 'sage-femme' });
    expect(f.componentInstance.intro).toContain('Trouvez une sage-femme');
    TestBed.resetTestingModule();
    f = creer({ specialite: 'ORL', wilaya: 'oran' });
    expect(f.componentInstance.cible).toBe('avec un ORL à Oran');
  });

  describe('JSON-LD', () => {
    const ld = (id: string) => {
      const el = document.head.querySelector(`script#${id}`);
      return el ? JSON.parse(el.textContent || '{}') : null;
    };
    /** Noeud du @graph unique par type. */
    const noeud = (type: string) => ld('ld-page')?.['@graph'].find((n: { '@type': string }) => n['@type'] === type);
    // Ordre des tests aleatoire : d'autres specs (accueil) peuvent laisser leurs blocs JSON-LD dans le <head>.
    const viderJsonLd = () => document.head.querySelectorAll('script[type="application/ld+json"]').forEach((e) => e.remove());
    beforeEach(viderJsonLd);
    afterEach(viderJsonLd);

    it('FR : BreadcrumbList + FAQPage (memes questions que la FAQ visible) sur /specialites/:s/:w', () => {
      const f = creer({ specialite: 'cardiologue', wilaya: 'oran' });
      const fil = noeud('BreadcrumbList');
      expect(fil['@type']).toBe('BreadcrumbList');
      expect(fil.itemListElement.map((e: { name: string }) => e.name)).toEqual(['Accueil', 'Médecins', 'Cardiologue', 'Oran']);
      const faq = noeud('FAQPage');
      expect(faq['@type']).toBe('FAQPage');
      expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
      expect(faq.mainEntity[faq.mainEntity.length - 3].name).toBe('Comment prendre rendez-vous avec un cardiologue à Oran ?');
      expect((f.nativeElement as HTMLElement).querySelectorAll('.seo-faq details').length).toBe(faq.mainEntity.length);
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://tabibi.doctor/specialites/cardiologue/oran');
      expect(document.head.querySelector('link[rel="alternate"][hreflang="ar"]')).toBeTruthy();
    });

    it('AR : FAQPage en arabe, canonical /ar, pas de FAQ pour une page introuvable', () => {
      TestBed.configureTestingModule({});
      reponse = { status: jasmine.createSpy('status') };
      annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercher', 'communes']);
      annuaire.rechercher.and.returnValue(of([]));
      annuaire.communes.and.returnValue(of([]));
      TestBed.configureTestingModule({
        imports: [AnnuaireSeoComponent],
        providers: [
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { data: { langue: 'ar' } }, paramMap: of(convertToParamMap({ specialite: 'cardiologue', wilaya: 'oran' })) } },
          { provide: AnnuaireService, useValue: annuaire },
          { provide: REPONSE_HTTP, useValue: reponse },
        ],
      });
      const fixture = TestBed.createComponent(AnnuaireSeoComponent);
      fixture.detectChanges();
      // Le fil d'Ariane arabe ramene a l'accueil arabe, pas a l'accueil francais.
      expect(fixture.nativeElement.querySelector('.seo-accueil')?.getAttribute('href')).toBe('/ar');
      expect(noeud('FAQPage').inLanguage).toBe('ar');
      expect(noeud('FAQPage').mainEntity[0].name).toMatch(/[\u0600-\u06FF]/);
      expect(noeud('BreadcrumbList').itemListElement[0].name).toBe('الرئيسية');
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://tabibi.doctor/ar/specialites/cardiologue/oran');
      TestBed.resetTestingModule();
      creer({ specialite: 'nimportequoi' });
      expect(ld('ld-page')).toBeNull();
    });

    it('un seul bloc @graph : MedicalWebPage + ItemList de Physician (sans telephone) + BreadcrumbList + FAQPage', () => {
      reponse = { status: jasmine.createSpy('status') };
      annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercher', 'communes']);
      annuaire.communes.and.returnValue(of([]));
      annuaire.rechercher.and.returnValue(of<Medecin[]>([
        { id: 'a1', nomComplet: 'Dr Samir Benali', specialiteSlug: 'pediatre', specialiteFr: 'Pédiatre', wilayaCode: '19',
          wilayaFr: 'Sétif', ville: 'Sétif', telephoneCabinet: '0555000000', adresse: '12 rue privée' },
      ] as Medecin[]));
      TestBed.configureTestingModule({
        imports: [AnnuaireSeoComponent],
        providers: [
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { data: {} }, paramMap: of(convertToParamMap({ specialite: 'pediatre', wilaya: 'setif' })) } },
          { provide: AnnuaireService, useValue: annuaire },
          { provide: REPONSE_HTTP, useValue: reponse },
        ],
      });
      TestBed.createComponent(AnnuaireSeoComponent).detectChanges();
      expect(document.head.querySelectorAll('script[type="application/ld+json"]').length).toBe(1);
      const types = ld('ld-page')['@graph'].map((n: { '@type': string }) => n['@type']);
      expect(types).toEqual(['MedicalWebPage', 'ItemList', 'BreadcrumbList', 'FAQPage']);
      const page = noeud('MedicalWebPage');
      expect(page.inLanguage).toBe('fr');
      expect(page.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.about['@type']).toBe('MedicalSpecialty');
      const item = noeud('ItemList').itemListElement[0].item;
      expect(item['@type']).toBe('Physician');
      expect(item.name).toBe('Dr Samir Benali');
      expect(item.url).toBe('https://tabibi.doctor/praticiens/a1/dr-samir-benali');
      expect(item.address).toEqual({ '@type': 'PostalAddress', addressCountry: 'DZ', addressLocality: 'Sétif', addressRegion: 'Sétif' });
      const brut = document.head.querySelector('script#ld-page')!.textContent!;
      expect(brut).not.toContain('0555000000');
      expect(brut).not.toContain('telephone');
      expect(brut).not.toContain('rue privée');
    });

    it('pharmacies : entrees Pharmacy, pas de MedicalSpecialty ni de FAQ', () => {
      reponse = { status: jasmine.createSpy('status') };
      annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercher', 'communes']);
      annuaire.communes.and.returnValue(of([]));
      annuaire.rechercher.and.returnValue(of<Medecin[]>([
        { id: 'p1', nomComplet: 'Pharmacie Centrale', specialiteSlug: 'pharmacie', specialiteFr: 'Pharmacie', wilayaCode: '16', wilayaFr: 'Alger', ville: 'Alger' },
      ] as Medecin[]));
      TestBed.configureTestingModule({
        imports: [AnnuaireSeoComponent],
        providers: [
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { data: {} }, paramMap: of(convertToParamMap({ specialite: 'pharmacie', wilaya: 'alger' })) } },
          { provide: AnnuaireService, useValue: annuaire },
          { provide: REPONSE_HTTP, useValue: reponse },
        ],
      });
      TestBed.createComponent(AnnuaireSeoComponent).detectChanges();
      const item = noeud('ItemList').itemListElement[0].item;
      expect(item['@type']).toBe('Pharmacy');
      expect(item.medicalSpecialty).toBeUndefined();
      expect(noeud('MedicalWebPage').about).toBeUndefined();
      expect(noeud('FAQPage')).toBeUndefined();
    });
  });
});
