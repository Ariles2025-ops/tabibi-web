import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { of, throwError } from 'rxjs';
import { Candidature, DemandeCandidature } from '../admin/admin.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { CandidatureMedecinComponent } from './candidature-medecin.component';
import { LangueService } from '../partage/langue.service';
import { MedecinService } from './medecin.service';

const DEMANDE: DemandeCandidature = {
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'cardiologue',
  specialiteFr: 'Cardiologue',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
  numeroOrdre: 'ORD-123',
  telephone: '0550000000',
};

const EN_ATTENTE: Candidature = {
  id: 'c1',
  medecinId: 'm1',
  ...DEMANDE,
  statut: 'EN_ATTENTE',
  motifRefus: null,
  deposeeLe: '2026-09-18T10:00:00Z',
  traiteeLe: null,
};

const VALIDEE: Candidature = { ...EN_ATTENTE, statut: 'VALIDEE', traiteeLe: '2026-09-18T12:00:00Z' };

const REFUSEE: Candidature = { ...EN_ATTENTE, statut: 'REFUSEE', motifRefus: 'Numéro d’ordre introuvable.', traiteeLe: '2026-09-18T12:00:00Z' };

const AUCUNE = () => throwError(() => new HttpErrorResponse({ status: 404, error: { erreur: 'Aucune candidature deposee.' } }));

describe('CandidatureMedecinComponent', () => {
  let fixture: ComponentFixture<CandidatureMedecinComponent>;
  let service: jasmine.SpyObj<MedecinService>;
  let annuaire: jasmine.SpyObj<AnnuaireService>;
  let auth: { seConnecter: jasmine.Spy; actualiserRoles: jasmine.Spy };
  let roles: { recharger: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<MedecinService>('MedecinService', ['maCandidature', 'deposerCandidature']);
    service.maCandidature.and.returnValue(AUCUNE());
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    auth = { seConnecter: jasmine.createSpy('seConnecter'), actualiserRoles: jasmine.createSpy('actualiserRoles').and.resolveTo() };
    roles = { recharger: jasmine.createSpy('recharger').and.resolveTo(null) };

    TestBed.configureTestingModule({
      imports: [CandidatureMedecinComponent],
      providers: [
        provideRouter([]),
        { provide: MedecinService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: roles },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(CandidatureMedecinComponent);
  });

  /** Premier rendu puis stabilisation des ngModel (asynchrones). */
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

  function champ(nom: string): HTMLInputElement | HTMLSelectElement {
    return fixture.nativeElement.querySelector(`[name="${nom}"]`);
  }

  async function saisir(valeurs: Partial<DemandeCandidature>) {
    for (const [nom, valeur] of Object.entries(valeurs)) {
      const c = champ(nom);
      if (!c) continue;
      c.value = valeur ?? '';
      c.dispatchEvent(new Event(c instanceof HTMLSelectElement ? 'change' : 'input'));
    }
    await afficher();
  }

  function soumettre() {
    formulaire()!.dispatchEvent(new Event('submit'));
  }

  it('propose le formulaire quand aucune candidature n a ete deposee (404)', async () => {
    await afficher();

    expect(formulaire()).not.toBeNull();
    expect(texte()).not.toContain('Nouvelle candidature');
    for (const nom of ['nomComplet', 'specialiteSlug', 'wilayaCode', 'ville', 'numeroOrdre', 'telephone']) {
      expect(champ(nom)).withContext(nom).not.toBeNull();
    }
    // Specialite et wilaya : listes du referentiel (slugs exacts), plus de saisie libre.
    expect(champ('specialiteSlug') instanceof HTMLSelectElement).toBeTrue();
    expect(champ('wilayaCode') instanceof HTMLSelectElement).toBeTrue();
    const slugs = Array.from((champ('specialiteSlug') as HTMLSelectElement).options).map((o) => o.value);
    expect(slugs).toContain('medecin-generaliste');
    expect(slugs).not.toContain('generaliste');
    expect(slugs).not.toContain('pharmacie');
    expect((champ('wilayaCode') as HTMLSelectElement).options.length).toBe(70);
    expect(texte()).not.toContain('Aucune candidature deposee.');
  });

  it('refuse cote client un depot sans les champs obligatoires', async () => {
    await afficher();

    await saisir({ nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'cardiologue' });
    soumettre();
    await afficher();

    expect(service.deposerCandidature).not.toHaveBeenCalled();
    expect(texte()).toContain("Renseignez le nom complet, la spécialité, la wilaya et le numéro d'inscription à l'ordre.");
  });

  it('depose la candidature (champs nettoyes) puis affiche son statut en attente sans formulaire', async () => {
    service.deposerCandidature.and.returnValue(of(EN_ATTENTE));
    await afficher();

    await saisir({ ...DEMANDE, nomComplet: '  Dr Amina Belkacem ', ville: ' Alger ' });
    soumettre();
    await afficher();

    expect(service.deposerCandidature).toHaveBeenCalledWith(DEMANDE);
    expect(texte()).toContain('Candidature déposée');
    expect(texte()).toContain('En attente');
    expect(texte()).toContain("Votre candidature est en cours d'examen.");
    expect(formulaire()).toBeNull();
  });

  it('affiche une candidature validee avec le lien vers la fiche, sans formulaire', async () => {
    service.maCandidature.and.returnValue(of(VALIDEE));
    await afficher();

    expect(texte()).toContain('Validée');
    expect(texte()).toContain('Votre candidature a été validée : vous figurez sur Ndawik.');
    expect(fixture.nativeElement.querySelector('a[href="/medecins/m1"]')).not.toBeNull();
    expect(formulaire()).toBeNull();
    // Le role MEDECIN vient d'etre accorde : jeton et profil relus, acces direct a l'agenda.
    expect(auth.actualiserRoles).toHaveBeenCalled();
    await fixture.whenStable();
    expect(roles.recharger).toHaveBeenCalled();
    const agenda = fixture.nativeElement.querySelector('a[href="/medecin/agenda"]');
    expect(agenda?.textContent).toContain('Ouvrir mon agenda');
  });

  it('affiche le motif d une candidature refusee et un formulaire de nouveau depot prerempli', async () => {
    service.maCandidature.and.returnValue(of(REFUSEE));
    await afficher();

    expect(texte()).toContain('Refusée');
    expect(texte()).toContain('Motif : Numéro d’ordre introuvable.');
    expect(formulaire()).not.toBeNull();
    expect(texte()).toContain('Nouvelle candidature');
    expect(champ('nomComplet').value).toBe('Dr Amina Belkacem');
    expect(champ('numeroOrdre').value).toBe('ORD-123');
    expect(champ('wilayaCode').value).toBe('16');
  });

  it('affiche le { erreur } d un 409 et recharge la candidature existante', async () => {
    service.deposerCandidature.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: "Une candidature est deja en attente d'examen." } })),
    );
    service.maCandidature.and.returnValues(AUCUNE(), of(EN_ATTENTE));
    await afficher();

    await saisir(DEMANDE);
    soumettre();
    await afficher();

    expect(texte()).toContain("Une candidature est deja en attente d'examen.");
    expect(texte()).toContain('En attente');
    expect(formulaire()).toBeNull();
  });

  it('affiche le { erreur } d un 400 et garde le formulaire', async () => {
    service.deposerCandidature.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'La wilaya est obligatoire.' } })),
    );
    await afficher();

    await saisir(DEMANDE);
    soumettre();
    await afficher();

    expect(texte()).toContain('La wilaya est obligatoire.');
    expect(formulaire()).not.toBeNull();
  });

  it('indique l acces refuse sur un 403', async () => {
    service.maCandidature.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();

    expect(texte()).toContain('Accès refusé. Connectez-vous pour envoyer votre demande.');
    expect(formulaire()).toBeNull();
  });

  it('reclame une fiche existante : formulaire prerempli depuis l annuaire et fiche jointe au depot', async () => {
    annuaire.medecin.and.returnValue(of({
      id: 'f1', nomComplet: 'BELKACEM Amina', specialiteSlug: 'cardiologue', specialiteFr: 'Cardiologue',
      wilayaCode: '16', wilayaFr: 'Alger', ville: 'Hydra',
    }));
    service.deposerCandidature.and.returnValue(of({ ...EN_ATTENTE, ficheReclamee: 'f1' }));
    TestBed.inject(ActivatedRoute).snapshot.queryParams = { fiche: 'f1' };
    await afficher();

    expect(texte()).toContain('Réclamer ma fiche');
    expect(champ('nomComplet').value).toBe('BELKACEM Amina');
    await saisir({ numeroOrdre: 'ORD-9' });
    formulaire()!.dispatchEvent(new Event('submit'));
    await afficher();

    const depot = service.deposerCandidature.calls.mostRecent().args[0];
    expect(depot.ficheReclamee).toBe('f1');
    expect(depot.nomComplet).toBe('BELKACEM Amina');
    expect(depot.ville).toBe('Hydra');
  });

  it('reclamation avec derniere candidature refusee : le formulaire garde l identite de la fiche', async () => {
    annuaire.medecin.and.returnValue(of({
      id: 'f1', nomComplet: 'BELKACEM Amina', specialiteSlug: 'cardiologue', specialiteFr: 'Cardiologue',
      wilayaCode: '16', wilayaFr: 'Alger', ville: 'Hydra',
    }));
    service.maCandidature.and.returnValue(of({ ...REFUSEE, nomComplet: 'Ancien Nom', specialiteSlug: 'dentiste', specialiteFr: 'Dentiste', ville: 'Oran', wilayaCode: '31' }));
    TestBed.inject(ActivatedRoute).snapshot.queryParams = { fiche: 'f1' };
    await afficher();

    expect(champ('nomComplet').value).toBe('BELKACEM Amina');
    expect(champ('specialiteSlug').value).toBe('cardiologue');
    expect(champ('numeroOrdre').value).toBe('ORD-123');
  });

  describe('en arabe', () => {
    beforeEach(() => TestBed.inject(LangueService).definir(true));
    afterEach(() => localStorage.removeItem('tabibi.langue'));

    it('formulaire : titre, champs, listes en arabe et sens RTL, sans texte français', async () => {
      await afficher();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('main')?.getAttribute('dir')).toBe('rtl');
      expect(texte()).toContain('ترشحي');
      expect(texte()).toContain('رقم التسجيل في الهيئة');
      expect(texte()).toContain('إيداع ترشحي');
      expect(texte()).toContain('طبيب القلب');
      expect(texte()).not.toContain('Ma candidature');
      expect(texte()).not.toContain('Spécialité');
      expect(texte()).not.toContain('Déposer');
    });

    it('candidature en attente : statut, détails et dates en arabe', async () => {
      service.maCandidature.and.returnValue(of(EN_ATTENTE));
      await afficher();
      expect(texte()).toContain('قيد الانتظار');
      expect(texte()).toContain('ترشحك قيد الفحص.');
      expect(texte()).toContain('طبيب القلب');
      expect(texte()).toContain('18/09/2026');
      expect(texte()).not.toContain('En attente');
      expect(texte()).not.toContain('Déposée le');
    });

    it('refus : motif et message d erreur de saisie en arabe', async () => {
      service.maCandidature.and.returnValue(of(REFUSEE));
      await afficher();
      expect(texte()).toContain('مرفوضة');
      expect(texte()).toContain('تم رفض ترشحك');
      await saisir({ numeroOrdre: '' });
      formulaire()!.dispatchEvent(new Event('submit'));
      await afficher();
      expect(texte()).toContain('أدخل الاسم الكامل والتخصص والولاية ورقم التسجيل في الهيئة.');
    });
  });
});
