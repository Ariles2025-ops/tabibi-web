import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject, map, of, throwError } from 'rxjs';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ACCUEIL_AR } from '../seo/marque';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../auth/auth.service';
import { AnnuaireService, Medecin } from './annuaire.service';
import { AnnuaireComponent } from './annuaire.component';

/** Verrou de l'accueil : « Créer un compte » mene a l'inscription (en pre-lancement : /bientot), pas a la connexion. */
describe('AnnuaireComponent : boutons du verrou', () => {
  it('« Créer un compte » appelle l inscription, « Se connecter » la connexion', () => {
    const auth = jasmine.createSpyObj('AuthService', ['sInscrireParEmail', 'seConnecter']);
    const c = Object.create(AnnuaireComponent.prototype) as { auth: unknown; sInscrire(): void; seConnecter(): void };
    c.auth = auth;

    c.sInscrire();
    expect(auth.sInscrireParEmail).toHaveBeenCalledTimes(1);
    expect(auth.seConnecter).not.toHaveBeenCalled();
    c.seConnecter();
    expect(auth.seConnecter).toHaveBeenCalledTimes(1);
  });
});

/** Accessibilite : l'accueil expose un repere <main> unique (audit Lighthouse « landmark-one-main »). */
describe('AnnuaireComponent : reperes d accessibilite', () => {
  it('affiche un unique <main> contenant le titre h1', () => {
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => false, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();

    const mains = fixture.nativeElement.querySelectorAll('main') as NodeListOf<HTMLElement>;
    expect(mains.length).toBe(1);
    expect(mains[0].querySelector('h1')).not.toBeNull();
  });
});

/** Hors connexion, pas de cadenas quand il n'y a rien a debloquer (aucun resultat ou erreur). */
describe('AnnuaireComponent : cadenas sans resultat', () => {
  function creer(retour: Subject<Medecin[]>) {
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercherPage']);
    annuaire.rechercherPage.and.returnValue(retour.pipe(map((medecins) => ({ medecins, total: medecins.length }))));
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => false, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: annuaire },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.componentInstance.q = 'zzz';
    fixture.detectChanges();
    return fixture;
  }

  it('aucun resultat : message « Aucun médecin trouvé » sans cadenas', () => {
    const retour = new Subject<Medecin[]>();
    const fixture = creer(retour);
    fixture.componentInstance.rechercher();
    retour.next([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.docs-gate')).toBeNull();
    expect(el.textContent).toContain('Aucun médecin trouvé');
    expect(el.textContent).not.toContain('Créez un compte pour voir');
  });

  it('avec des resultats : le cadenas reste affiche', () => {
    const retour = new Subject<Medecin[]>();
    const fixture = creer(retour);
    fixture.componentInstance.rechercher();
    retour.next([{ id: 'a', nomComplet: 'A' } as Medecin]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.docs-gate')).not.toBeNull();
  });
});

/** Le champ ne promet que ce que l'API fait : GET /api/medecins?q= ne filtre que sur le nom. */
describe('AnnuaireComponent : libelle du champ de recherche', () => {
  it('annonce « Nom du médecin », sans promettre specialite ni etablissement', () => {
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => false, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();
    const champ = fixture.nativeElement.querySelector('input[autocomplete="off"][placeholder]') as HTMLInputElement;
    expect(champ.placeholder).toBe('Nom du médecin');
    expect(champ.getAttribute('aria-label')).toBe('Nom du médecin');
  });
});

/** Recherche de l'accueil : une nouvelle recherche annule la requete precedente (switchMap). */
describe('AnnuaireComponent : recherche', () => {
  it('seule la derniere recherche met a jour les resultats', () => {
    const premiere = new Subject<Medecin[]>();
    const seconde = new Subject<Medecin[]>();
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercherPage']);
    annuaire.rechercherPage.and.returnValues(
      premiere.pipe(map((medecins) => ({ medecins, total: medecins.length }))),
      seconde.pipe(map((medecins) => ({ medecins, total: medecins.length }))),
    );
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => false, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: annuaire },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const m = (id: string) => ({ id, nomComplet: id } as Medecin);

    c.rechercher();
    c.rechercher();
    expect(premiere.observed).toBeFalse(); // requete precedente annulee
    premiere.next([m('ancien')]);
    seconde.next([m('recent')]);
    expect(c.resultats().map((x) => x.id)).toEqual(['recent']);
    expect(c.charge()).toBeFalse();
  });

  it('echec d une nouvelle recherche : l ancienne liste est videe, seule l erreur reste', () => {
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercherPage']);
    const m = (id: string) => ({ id, nomComplet: id } as Medecin);
    annuaire.rechercherPage.and.returnValues(
      of({ medecins: [m('alger')], total: 1 }),
      throwError(() => new Error('reseau')),
    );
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => false, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: annuaire },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    c.rechercher();
    expect(c.resultats().length).toBe(1);
    c.rechercher();
    expect(c.erreur()).not.toBe('');
    expect(c.resultats()).toEqual([]);
    expect(c.total()).toBe(0);
  });
});

/** /ar affiche la MEME page d'accueil que /, traduite en arabe et de droite a gauche (donnee de route `langue: 'ar'`). */
describe('AnnuaireComponent : accueil arabe', () => {
  function creer(langue?: 'ar') {
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => false, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: {} },
      ],
    });
    // Meme donnee de route que { path: 'ar', data: { langue: 'ar' } } dans app.routes.ts.
    TestBed.inject(ActivatedRoute).snapshot.data = langue ? { langue } : {};
    const fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('avec langue: ar, le h1 est en arabe et <main> est en RTL', () => {
    const el = creer('ar');
    const main = el.querySelector('main')!;
    expect(main.getAttribute('dir')).toBe('rtl');
    expect(main.getAttribute('lang')).toBe('ar');
    const h1 = main.querySelector('h1')!.textContent!.trim();
    expect(h1).toMatch(/[؀-ۿ]/);
    expect(h1).not.toMatch(/[A-Za-zÀ-ÿ]/);
    expect(main.querySelector('#sec-dawini')!.textContent).toContain('داويني');
    expect(TestBed.inject(Title).getTitle()).toBe(ACCUEIL_AR.titre);
  });

  it('sans langue, la page reste en francais (LTR) et propose les boutons Google Play / App Store', () => {
    const el = creer();
    const main = el.querySelector('main')!;
    expect(main.getAttribute('dir')).toBeNull();
    expect(main.querySelector('h1')!.textContent).toContain('Votre santé');
    const play = main.querySelector('.hero-stores a.store') as HTMLAnchorElement;
    expect(play.href).toBe('https://play.google.com/store/apps/details?id=dz.tabibi.app');
    expect(play.target).toBe('_blank');
    expect(main.querySelector('.hero-stores .store--bientot')!.getAttribute('aria-disabled')).toBe('true');
  });
});

/** Plus de plafond a 50 : total reel (X-Total-Count), « Voir plus » ajoute la page suivante, filtre commune. */
describe('AnnuaireComponent : pagination et commune', () => {
  it('affiche le vrai total, charge la page suivante et masque le bouton une fois tout charge', () => {
    const m = (id: string) => ({ id, nomComplet: id } as Medecin);
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercherPage', 'communes']);
    annuaire.communes.and.returnValue(of([{ slug: 'bab-ezzouar', nom: 'Bab Ezzouar', nombre: 5 }]));
    annuaire.rechercherPage.and.returnValues(
      of({ medecins: [m('a'), m('b')], total: 3 }),
      of({ medecins: [m('b'), m('c')], total: 3 }),
    );
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => true, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: annuaire },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireComponent);
    const c = fixture.componentInstance;
    c.q = 'x';
    c.connecte.set(true);
    fixture.detectChanges();

    c.rechercher();
    expect(c.texteCompte()).toBe('3 médecins trouvés');
    expect(c.resteAcharger()).toBeTrue();
    c.voirPlus();
    expect(annuaire.rechercherPage.calls.mostRecent().args[4]).toBe(1);
    expect(c.resultats().map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(c.resteAcharger()).toBeFalse();
  });

  it('choisir une wilaya charge les communes ; la commune est envoyee a la recherche', () => {
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercherPage', 'communes']);
    annuaire.communes.and.returnValue(of([{ slug: 'bab-ezzouar', nom: 'Bab Ezzouar', nombre: 5 }]));
    annuaire.rechercherPage.and.returnValue(of({ medecins: [], total: 0 }));
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => false, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: annuaire },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.specialite = 'medecin-generaliste';
    c.wilaya = '16';
    c.surFiltre();
    expect(annuaire.communes).toHaveBeenCalledWith('medecin-generaliste', '16');
    expect(c.communes().length).toBe(1);
    c.commune = 'bab-ezzouar';
    c.surCommune();
    expect(annuaire.rechercherPage.calls.mostRecent().args[3]).toBe('bab-ezzouar');
  });

  it('l autocompletion du nom respecte la specialite et la wilaya choisies', fakeAsync(() => {
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercherPage', 'communes', 'rechercher']);
    annuaire.communes.and.returnValue(of([]));
    annuaire.rechercherPage.and.returnValue(of({ medecins: [], total: 0 }));
    annuaire.rechercher.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => false, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: annuaire },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.specialite = 'dermatologue';
    c.wilaya = '31';
    c.surFiltre();
    c.q = 'Ben';
    c.surSaisie();
    tick(300);
    expect(annuaire.rechercher).toHaveBeenCalledWith('dermatologue', '31', 'Ben');
    // Meme texte apres changement de filtre : nouvelle requete avec le nouveau filtre.
    c.wilaya = '16';
    c.surFiltre();
    c.surSaisie();
    tick(300);
    expect(annuaire.rechercher.calls.mostRecent().args).toEqual(['dermatologue', '16', 'Ben']);
    tick(400);
  }));
});
