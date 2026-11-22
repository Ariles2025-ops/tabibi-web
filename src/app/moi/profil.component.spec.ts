import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { LangueService } from '../partage/langue.service';
import { ProfilComponent } from './profil.component';
import { Profil, ProfilService } from './profil.service';

const PROFIL: Profil = {
  utilisateurId: 'u1',
  nomComplet: 'Amina Belkacem',
  telephone: '0550123456',
  dateNaissance: '1990-05-12',
  wilayaCode: '16',
  langue: 'ar',
  misAJourLe: '2026-09-18T10:00:00Z',
};

const NON_RENSEIGNE = () => throwError(() => new HttpErrorResponse({ status: 404, error: { erreur: 'Profil non renseigne.' } }));

/** Referentiel servi a la place de assets/referentiel.json (liste deroulante des wilayas). */
const REFERENTIEL = { wilayas: [{ code: '9', nom: 'Blida' }, { code: '16', nom: 'Alger' }], specialites: [] };

describe('ProfilComponent', () => {
  let fixture: ComponentFixture<ProfilComponent>;
  let service: jasmine.SpyObj<ProfilService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  let pharmacie: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    pharmacie = signal(false);
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<ProfilService>('ProfilService', ['monProfil', 'enregistrer']);
    service.monProfil.and.returnValue(NON_RENSEIGNE());
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [ProfilComponent],
      providers: [
        provideRouter([]),
        { provide: ProfilService, useValue: service },
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: { estPharmacie: pharmacie, charger: () => Promise.resolve(null) } },
        { provide: LOCALE_ID, useValue: 'fr' },
        { provide: HttpClient, useValue: { get: () => of(REFERENTIEL) } },
      ],
    });
    fixture = TestBed.createComponent(ProfilComponent);
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

  function formulaire(): HTMLFormElement | null {
    return fixture.nativeElement.querySelector('form');
  }

  function champ(nom: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`[name="${nom}"]`);
  }

  function langue(): HTMLSelectElement {
    return fixture.nativeElement.querySelector('select[name="langue"]');
  }

  async function saisir(valeurs: Record<string, string>) {
    for (const [nom, valeur] of Object.entries(valeurs)) {
      const c = champ(nom);
      c.value = valeur;
      c.dispatchEvent(new Event(c.tagName === 'SELECT' ? 'change' : 'input'));
    }
    await afficher();
  }

  async function choisirLangue(code: string) {
    const s = langue();
    s.value = code;
    s.dispatchEvent(new Event('change'));
    await afficher();
  }

  function soumettre() {
    formulaire()!.dispatchEvent(new Event('submit'));
  }

  it('propose un formulaire vide (langue Français par défaut) quand le profil n est pas renseigne (404)', async () => {
    await afficher();

    expect(formulaire()).not.toBeNull();
    expect(champ('nomComplet').value).toBe('');
    expect(champ('telephone').value).toBe('');
    expect(champ('dateNaissance').value).toBe('');
    expect(champ('wilayaCode').value).toBe('');
    expect(langue().value).toBe('fr');
    const options = Array.from(langue().options).map((o) => `${o.value}:${o.textContent?.trim()}`);
    expect(options).toEqual(['fr:Français', 'ar:العربية', 'kab:Taqbaylit', 'en:English']);
    expect(texte()).not.toContain('Profil non renseigne.');
    expect(texte()).not.toContain('Dernière mise à jour');
  });

  it('rappelle, comme l\'appli, que ces informations ne sont visibles que du patient et de ses praticiens', async () => {
    await afficher();

    expect(texte()).toContain('Ces informations ne sont visibles que de vous et des praticiens que vous consultez.');
  });

  it('preremplit le formulaire avec le profil enregistre', async () => {
    service.monProfil.and.returnValue(of(PROFIL));
    await afficher();

    expect(champ('nomComplet').value).toBe('Amina Belkacem');
    expect(champ('telephone').value).toBe('0550123456');
    expect(champ('dateNaissance').value).toBe('1990-05-12');
    expect(champ('wilayaCode').value).toBe('16');
    expect(langue().value).toBe('ar');
    expect(texte()).toContain('Dernière mise à jour le 18 septembre 2026');
  });

  it('profil sans date de mise a jour lisible : « Profil non enregistré » (FR/AR), comme l\'appli, jamais « mise à jour le » vide', async () => {
    service.monProfil.and.returnValue(of({ ...PROFIL, misAJourLe: null } as unknown as Profil));
    await afficher();
    expect(texte()).toContain('Profil non enregistré');
    expect(texte()).not.toContain('Dernière mise à jour');
  });

  it('profil à date de mise à jour illisible : « الملف غير محفوظ » en arabe', async () => {
    TestBed.inject(LangueService).definir(true);
    try {
      service.monProfil.and.returnValue(of({ ...PROFIL, misAJourLe: 'pas-une-date' }));
      await afficher();
      expect(texte()).toContain('الملف غير محفوظ');
      expect(texte()).not.toContain('آخر تحديث');
    } finally {
      TestBed.inject(LangueService).definir(false);
    }
  });

  it('refuse cote client un profil invalide (nom trop court, telephone mal forme) sans appeler l API', async () => {
    await afficher();

    await saisir({ nomComplet: 'A' });
    soumettre();
    await afficher();
    expect(texte()).toContain('Le nom complet doit compter de 2 à 120 caractères.');

    await saisir({ nomComplet: 'Amina Belkacem', telephone: '12345' });
    soumettre();
    await afficher();
    expect(texte()).toContain('Le téléphone doit être un numéro algérien');

    expect(service.enregistrer).not.toHaveBeenCalled();
  });

  it('enregistre le profil par PUT (champs nettoyes, facultatifs vides envoyes null) puis confirme « Profil enregistré. »', async () => {
    service.enregistrer.and.returnValue(of({ ...PROFIL, telephone: null, dateNaissance: null, wilayaCode: null, langue: 'kab' }));
    await afficher();

    await saisir({ nomComplet: '  Amina Belkacem ', telephone: '', dateNaissance: '', wilayaCode: '' });
    await choisirLangue('kab');
    soumettre();
    await afficher();

    expect(service.enregistrer).toHaveBeenCalledWith({ nomComplet: 'Amina Belkacem', telephone: null, dateNaissance: null, wilayaCode: null, langue: 'kab' });
    expect(texte()).toContain('Profil enregistré.');
    expect(texte()).toContain('Dernière mise à jour le 18 septembre 2026');
    expect(langue().value).toBe('kab');
  });

  it('envoie le telephone sans espaces et la date de naissance saisie', async () => {
    service.enregistrer.and.returnValue(of(PROFIL));
    await afficher();

    await saisir({ nomComplet: 'Amina Belkacem', telephone: '0550 12 34 56', dateNaissance: '1990-05-12', wilayaCode: '16' });
    await choisirLangue('ar');
    soumettre();
    await afficher();

    expect(service.enregistrer).toHaveBeenCalledWith({ nomComplet: 'Amina Belkacem', telephone: '0550123456', dateNaissance: '1990-05-12', wilayaCode: '16', langue: 'ar' });
  });

  it('affiche le { erreur } d un 400 et garde la saisie', async () => {
    service.enregistrer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'La date de naissance doit etre dans le passe.' } })),
    );
    await afficher();

    await saisir({ nomComplet: 'Amina Belkacem', dateNaissance: '1990-05-12' });
    soumettre();
    await afficher();

    expect(texte()).toContain('La date de naissance doit etre dans le passe.');
    expect(texte()).not.toContain('Profil enregistré.');
    expect(champ('nomComplet').value).toBe('Amina Belkacem');
  });

  it('affiche le motif d une erreur de chargement autre que 404 sans formulaire', async () => {
    service.monProfil.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { erreur: 'Service indisponible.' } })));
    await afficher();

    expect(texte()).toContain('Service indisponible.');
    expect(formulaire()).toBeNull();
  });

  it('redirige vers la connexion si l utilisateur n est pas connecte', async () => {
    auth.estConnecte = () => false;
    await afficher();

    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.monProfil).not.toHaveBeenCalled();
  });

  describe('en arabe (comme l\'appli)', () => {
    beforeEach(() => TestBed.inject(LangueService).definir(true));
    afterEach(() => TestBed.inject(LangueService).definir(false));

    it('affiche le formulaire en arabe, de droite a gauche, avec les wilayas en arabe', async () => {
      service.monProfil.and.returnValue(of(PROFIL));
      await afficher();

      const t = texte();
      expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
      for (const mot of ['ملفي الشخصي', 'الاسم الكامل *', 'الهاتف', 'تاريخ الميلاد', 'الولاية', 'اللغة المفضلة', 'حفظ', 'العودة إلى حسابي',
        'هذه المعلومات لا يراها إلا أنت والأطباء الذين تستشيرهم.', 'آخر تحديث في 18/09/2026']) {
        expect(t).toContain(mot);
      }
      expect(t).toContain('16 — الجزائر');
      for (const motFrancais of ['Mon profil', 'Nom complet', 'Enregistrer', 'Dernière mise à jour']) {
        expect(t).not.toContain(motFrancais);
      }
    });

    it('refuse un profil invalide avec un motif en arabe et confirme l\'enregistrement en arabe', async () => {
      await afficher();

      await saisir({ nomComplet: '' });
      soumettre();
      await afficher();
      expect(texte()).toContain('أدخل اسمك الكامل.');
      expect(service.enregistrer).not.toHaveBeenCalled();

      service.enregistrer.and.returnValue(of(PROFIL));
      await saisir({ nomComplet: 'Amina Belkacem' });
      soumettre();
      await afficher();
      expect(texte()).toContain('تم حفظ الملف الشخصي.');
    });
  });

  it('pharmacie : libelle « Nom de la pharmacie », pas de date de naissance, ni mention « praticiens »', async () => {
    pharmacie.set(true);
    await afficher();
    expect(texte()).toContain('Nom de la pharmacie');
    expect(texte()).toContain('montré aux patients');
    expect(texte()).not.toContain('Nom complet');
    expect(texte()).not.toContain('praticiens');
    expect(champ('dateNaissance')).toBeNull();
  });

  it('autres roles : textes et date de naissance inchanges', async () => {
    await afficher();
    expect(texte()).toContain('Nom complet');
    expect(texte()).toContain('praticiens que vous consultez');
    expect(champ('dateNaissance')).not.toBeNull();
  });
});
