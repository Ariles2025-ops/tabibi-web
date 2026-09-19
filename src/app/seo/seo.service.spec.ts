import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { REPONSE_SERVEUR, ReponseServeur } from './reponse-serveur';
import { DESCRIPTION_PAR_DEFAUT, SeoService } from './seo.service';

/** Titre, description, robots et canonique de la page courante ; statut 404 transmis au serveur de rendu. */
describe('SeoService', () => {
  let service: SeoService;
  let title: Title;
  let meta: Meta;
  let document: Document;
  let reponse: ReponseServeur;

  beforeEach(() => {
    reponse = { statut: 200 };
    TestBed.configureTestingModule({ providers: [{ provide: REPONSE_SERVEUR, useValue: reponse }] });
    service = TestBed.inject(SeoService);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
    document = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    // Le document est partage entre les specs (Karma) : on retire ce que le service y a pose.
    meta.removeTag('name="description"');
    meta.removeTag('name="robots"');
    document.head.querySelector('link[rel="canonical"]')?.remove();
    title.setTitle('');
  });

  function description(): string | null {
    return meta.getTag('name="description"')?.getAttribute('content') ?? null;
  }

  function robots(): string | null {
    return meta.getTag('name="robots"')?.getAttribute('content') ?? null;
  }

  function canonique(): string | null {
    return document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
  }

  it('pose le titre avec le suffixe « | Tabibi », la description et le canonique (origine du document)', () => {
    service.definir({ titre: 'Trouver un médecin en Algérie', description: 'Annuaire des praticiens.', canonique: '/' });

    expect(title.getTitle()).toBe('Trouver un médecin en Algérie | Tabibi');
    expect(description()).toBe('Annuaire des praticiens.');
    expect(canonique()).toBe(`${document.location.origin}/`);
    expect(robots()).toBeNull();
    expect(reponse.statut).toBe(200);
  });

  it('remplace la description et le canonique a la page suivante, sans dupliquer les balises', () => {
    service.definir({ titre: 'Page A', description: 'A', canonique: '/a' });
    service.definir({ titre: 'Page B', description: 'B', canonique: '/b' });

    expect(title.getTitle()).toBe('Page B | Tabibi');
    expect(description()).toBe('B');
    expect(canonique()).toBe(`${document.location.origin}/b`);
    expect(meta.getTags('name="description"').length).toBe(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });

  it('sans description ni canonique : description par defaut et balise canonique retiree', () => {
    service.definir({ titre: 'Page A', canonique: '/a' });
    service.definir({ titre: 'Page B' });

    expect(description()).toBe(DESCRIPTION_PAR_DEFAUT);
    expect(canonique()).toBeNull();
  });

  it('definirPrivee : robots noindex, nofollow ; une page publique ensuite retire la balise', () => {
    service.definirPrivee('Mes rendez-vous');
    expect(title.getTitle()).toBe('Mes rendez-vous | Tabibi');
    expect(robots()).toBe('noindex, nofollow');
    expect(canonique()).toBeNull();

    service.definir({ titre: 'Vérifier une ordonnance' });
    expect(robots()).toBeNull();
  });

  it('introuvable : titre « Page introuvable », noindex et statut 404 pour le serveur de rendu', () => {
    service.introuvable();
    expect(title.getTitle()).toBe('Page introuvable | Tabibi');
    expect(robots()).toBe('noindex, nofollow');
    expect(reponse.statut).toBe(404);
  });

  it('introuvable avec un titre particulier (praticien inconnu)', () => {
    service.introuvable('Praticien introuvable');
    expect(title.getTitle()).toBe('Praticien introuvable | Tabibi');
    expect(reponse.statut).toBe(404);
  });
});

/** Dans le navigateur, REPONSE_SERVEUR n'est pas fourni : le service fonctionne sans. */
describe('SeoService (sans REPONSE_SERVEUR)', () => {
  it('introuvable ne pose que le titre et le noindex', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(SeoService);
    const title = TestBed.inject(Title);
    const meta = TestBed.inject(Meta);

    expect(() => service.introuvable()).not.toThrow();
    expect(title.getTitle()).toBe('Page introuvable | Tabibi');
    expect(meta.getTag('name="robots"')?.getAttribute('content')).toBe('noindex, nofollow');

    meta.removeTag('name="description"');
    meta.removeTag('name="robots"');
    title.setTitle('');
  });
});
