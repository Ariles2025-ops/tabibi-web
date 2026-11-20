import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Profil, ProfilService } from '../moi/profil.service';
import { LangueService } from '../partage/langue.service';
import { Besoin, DawiniService } from './dawini.service';
import { MesDemandesComponent } from './mes-demandes.component';

const OUVERTE: Besoin = {
  id: 'b1',
  patientId: 'p1',
  medicament: 'Amoxicilline 1 g',
  wilayaCode: '16',
  commune: 'Bab Ezzouar',
  precision: null,
  statut: 'OUVERT',
  publieLe: '2026-09-18T10:00:00Z',
  clotureLe: null,
  nombreReponses: 3,
};

const CLOTUREE: Besoin = {
  ...OUVERTE,
  id: 'b2',
  medicament: 'Insuline',
  commune: null,
  statut: 'CLOTURE',
  publieLe: '2026-09-10T10:00:00Z',
  clotureLe: '2026-09-11T10:00:00Z',
  nombreReponses: 1,
};

/** Referentiel servi a la place de assets/referentiel.json (liste deroulante des wilayas). */
const REFERENTIEL = { wilayas: [{ code: '9', nom: 'Blida' }, { code: '16', nom: 'Alger' }], specialites: [] };

describe('MesDemandesComponent', () => {
  let fixture: ComponentFixture<MesDemandesComponent>;
  let service: jasmine.SpyObj<DawiniService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };
  let profils: jasmine.SpyObj<ProfilService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<DawiniService>('DawiniService', ['mesBesoins', 'publier']);
    service.mesBesoins.and.returnValue(of([CLOTUREE, OUVERTE]));
    profils = jasmine.createSpyObj<ProfilService>('ProfilService', ['monProfil']);
    profils.monProfil.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [MesDemandesComponent],
      providers: [
        provideRouter([]),
        { provide: DawiniService, useValue: service },
        { provide: AuthService, useValue: auth },
        { provide: ProfilService, useValue: profils },
        { provide: LOCALE_ID, useValue: 'fr' },
        { provide: HttpClient, useValue: { get: () => of(REFERENTIEL) } },
      ],
    });
    fixture = TestBed.createComponent(MesDemandesComponent);
  });

  /** Lance ngOnInit (attente de l'etat de connexion) puis stabilise les ngModel (asynchrones). */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function champ(nom: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`[name="${nom}"]`);
  }

  async function saisir(valeurs: Record<string, string>) {
    for (const [nom, valeur] of Object.entries(valeurs)) {
      const c = champ(nom);
      c.value = valeur;
      c.dispatchEvent(new Event(c.tagName === 'SELECT' ? 'change' : 'input'));
    }
    await afficher();
  }

  function soumettre() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  }

  it('liste mes demandes, les plus recentes d abord, avec statut et nombre de reponses', async () => {
    await afficher();

    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Amoxicilline 1 g');
    expect(items[0].textContent).toContain('Ouverte');
    expect(items[0].textContent).toContain('Alger · Bab Ezzouar');
    expect(items[0].textContent).toContain('3 réponses');
    expect(items[0].querySelector('a')?.getAttribute('href')).toBe('/dawini/b1');
    expect(items[1].textContent).toContain('Insuline');
    expect(items[1].textContent).toContain('Clôturée');
    expect(items[1].textContent).toContain('1 réponse');
  });

  it('une demande sans date lisible affiche « date inconnue » et passe en fin de liste, sans erreur (comme l\'appli)', async () => {
    service.mesBesoins.and.returnValue(of([
      { ...OUVERTE, id: 'b3', medicament: 'Sans date', publieLe: 'pas une date' },
      CLOTUREE,
      OUVERTE,
    ]));
    await afficher();

    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.map((li) => li.textContent)).toEqual([
      jasmine.stringContaining('Amoxicilline 1 g'),
      jasmine.stringContaining('Insuline'),
      jasmine.stringContaining('Sans date'),
    ]);
    expect(items[2].textContent).toContain('date inconnue');
    expect(items[2].textContent).not.toContain('publiée le');
    expect(items[0].textContent).toContain('publiée le');
  });

  it('en arabe, une demande sans date affiche « تاريخ غير معروف »', async () => {
    TestBed.inject(LangueService).ar.set(true);
    try {
      service.mesBesoins.and.returnValue(of([{ ...OUVERTE, publieLe: null as unknown as string }]));
      await afficher();

      expect(texte()).toContain('تاريخ غير معروف');
      expect(texte()).not.toContain('date inconnue');
      expect(texte()).not.toContain('نُشر في');
    } finally {
      TestBed.inject(LangueService).ar.set(false);
    }
  });

  it('propose les wilayas du referentiel et preselectionne celle du profil du patient', async () => {
    profils.monProfil.and.returnValue(of({ wilayaCode: '9' } as Profil));
    await afficher();

    const select = champ('wilayaCode') as unknown as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => `${o.value}:${o.textContent?.trim()}`);
    expect(options).toEqual([':Choisissez votre wilaya', '9:9 — Blida', '16:16 — Alger']);
    expect(select.value).toBe('9');
  });

  it('refuse cote client une demande sans medicament ou sans wilaya', async () => {
    await afficher();

    await saisir({ wilayaCode: '16' });
    soumettre();
    await afficher();

    expect(service.publier).not.toHaveBeenCalled();
    expect(texte()).toContain('Indiquez le médicament recherché.');
    expect(texte()).not.toContain('choisissez votre wilaya');
  });

  it('demande la wilaya seule quand le médicament est renseigné (même message que l\'appli)', async () => {
    await afficher();

    await saisir({ medicament: 'Amoxicilline 1 g', wilayaCode: '' });
    soumettre();
    await afficher();

    expect(service.publier).not.toHaveBeenCalled();
    expect(texte()).toContain('Choisissez votre wilaya.');
  });

  it('publie la demande (champs nettoyes, facultatifs omis s ils sont vides), confirme, vide le formulaire et recharge', async () => {
    service.publier.and.returnValue(of(OUVERTE));
    await afficher();

    await saisir({ medicament: '  Amoxicilline 1 g ', wilayaCode: '16', commune: 'Bab Ezzouar', precision: '   ' });
    soumettre();
    await afficher();

    expect(service.publier).toHaveBeenCalledWith({ medicament: 'Amoxicilline 1 g', wilayaCode: '16', commune: 'Bab Ezzouar' });
    expect(texte()).toContain('Demande publiée');
    expect(champ('medicament').value).toBe('');
    expect(service.mesBesoins).toHaveBeenCalledTimes(2);
  });

  it('affiche le { erreur } d un 400 sans recharger', async () => {
    service.publier.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'Le code de wilaya ne peut pas depasser 4 caracteres.' } })),
    );
    await afficher();

    await saisir({ medicament: 'Insuline', wilayaCode: '16' });
    soumettre();
    await afficher();

    expect(texte()).toContain('Le code de wilaya ne peut pas depasser 4 caracteres.');
    expect(service.mesBesoins).toHaveBeenCalledTimes(1);
  });

  it('affiche un message quand il n y a aucune demande et redirige si non connecte', async () => {
    service.mesBesoins.and.returnValue(of([]));
    await afficher();
    expect(texte()).toContain('Aucune demande pour le moment.');

    auth.estConnecte = () => false;
    fixture = TestBed.createComponent(MesDemandesComponent);
    await afficher();
    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.mesBesoins).toHaveBeenCalledTimes(1);
  });

  describe('en arabe (comme l\'appli)', () => {
    beforeEach(() => TestBed.inject(LangueService).ar.set(true));
    afterEach(() => TestBed.inject(LangueService).ar.set(false));

    it('affiche le formulaire et la liste en arabe, de droite à gauche, avec la wilaya en arabe', async () => {
      await afficher();

      expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
      expect(fixture.nativeElement.querySelector('h1').textContent).toContain('داويني');
      expect(texte()).toContain('الدواء المطلوب *');
      expect(texte()).toContain('طلباتي');
      const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
      expect(items[0].textContent).toContain('مفتوح');
      expect(items[0].textContent).toContain('3 ردود');
      expect(items[0].textContent).toContain('الجزائر');
      expect(items[1].textContent).toContain('مغلق');
      expect(items[1].textContent).toContain('1 رد');
      expect(texte()).not.toContain('Ouverte');
      expect(texte()).not.toContain('réponse');
    });

    it('refuse une demande vide avec les messages arabes de l\'appli', async () => {
      await afficher();
      soumettre();
      await afficher();
      expect(texte()).toContain('أدخل اسم الدواء المطلوب.');

      await saisir({ medicament: 'Insuline' });
      soumettre();
      await afficher();
      expect(texte()).toContain('اختر ولايتك.');
    });
  });
});
