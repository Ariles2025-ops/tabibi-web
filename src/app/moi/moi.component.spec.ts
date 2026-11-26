import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { Moi, MoiService } from './moi.service';
import { consommerCompteSupprime } from './compte-supprime';
import { LangueService } from '../partage/langue.service';
import { ApiDisponibleService } from '../partage/api-disponible.service';
import { MoiComponent } from './moi.component';

const PROFIL: Moi = { sujet: '55555555-5555-5555-5555-555555555555', nom: 'patient.demo', roles: ['PATIENT'] };

/** Mon compte : roles, acces rapides selon le role, suppression du compte en deux temps. */
describe('MoiComponent', () => {
  let fixture: ComponentFixture<MoiComponent>;
  let connecte: boolean;
  let moi: ReturnType<typeof signal<Moi | null>>;
  let auth: {
    pret: () => Promise<void>; estConnecte: () => boolean;
    seConnecter: jasmine.Spy; sInscrireParEmail: jasmine.Spy; seDeconnecter: jasmine.Spy;
  };
  let service: jasmine.SpyObj<MoiService>;

  afterEach(() => localStorage.removeItem('tabibi.langue')); // ne pas laisser « ar » aux autres suites

  beforeEach(() => {
    localStorage.removeItem('tabibi.langue');
    connecte = true;
    moi = signal<Moi | null>(PROFIL);
    auth = {
      pret: () => Promise.resolve(),
      estConnecte: () => connecte,
      seConnecter: jasmine.createSpy('seConnecter'),
      sInscrireParEmail: jasmine.createSpy('sInscrireParEmail'),
      seDeconnecter: jasmine.createSpy('seDeconnecter'),
    };
    service = jasmine.createSpyObj<MoiService>('MoiService', ['supprimer']);

    TestBed.configureTestingModule({
      imports: [MoiComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: MoiService, useValue: service },
        { provide: RoleService, useValue: { moi, charger: jasmine.createSpy('charger').and.resolveTo(PROFIL) } },
      ],
    });
    fixture = TestBed.createComponent(MoiComponent);
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const texte = (): string => fixture.nativeElement.textContent;
  const bouton = (libelle: string): HTMLButtonElement | undefined =>
    (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === libelle);
  const lien = (href: string) => fixture.nativeElement.querySelector(`a[href="${href}"]`);

  it('affiche le role en francais, masque les roles techniques et propose les acces rapides patient', async () => {
    moi.set({ ...PROFIL, roles: ['default-roles-tabibi', 'offline_access', 'uma_authorization', 'PATIENT'] });
    await afficher();

    expect(texte()).toContain('Rôle : Patient');
    expect(texte()).not.toContain('offline_access');
    expect(lien('/moi/profil')).not.toBeNull();
    expect(lien('/mes-rendez-vous')).not.toBeNull();
    expect(lien('/notifications')).not.toBeNull();
    expect(lien('/invitations')).not.toBeNull();
    expect(texte()).toContain('Ma candidature de médecin');
    expect(lien('/medecin/candidature')).not.toBeNull();
  });

  it('sans nom dans le profil, n affiche ni « en tant que » vide ni null', async () => {
    moi.set({ ...PROFIL, nom: '  ' });
    await afficher();

    expect(texte()).not.toContain('en tant que');
    expect(texte()).not.toContain('null');
    expect(texte()).toContain('Vous êtes connecté(e).');
  });

  it('avec un nom, l affiche', async () => {
    await afficher();

    expect(texte()).toContain('Connecté en tant que patient.demo');
  });

  it('adapte les acces rapides au role : agenda pour le medecin, agenda du cabinet pour la secretaire', async () => {
    moi.set({ ...PROFIL, roles: ['PATIENT', 'MEDECIN'] });
    await afficher();
    expect(lien('/medecin/agenda')).not.toBeNull();
    expect(lien('/mes-rendez-vous')).toBeNull();
    expect(lien('/medecin/candidature')).toBeNull(); // déjà médecin : sa candidature est validée

    moi.set({ ...PROFIL, roles: ['PATIENT', 'SECRETAIRE'] });
    await afficher();
    expect(lien('/secretaire')).not.toBeNull();
    expect(lien('/invitations')).not.toBeNull();
    expect(lien('/mes-rendez-vous')).toBeNull();
  });

  it('un compte à plusieurs rôles professionnels retrouve chacun de ses espaces, comme « Mon espace » de l\'appli', async () => {
    moi.set({ ...PROFIL, roles: ['PATIENT', 'MEDECIN', 'SECRETAIRE', 'PHARMACIE', 'ADMIN'] });
    await afficher();
    for (const l of ['/medecin/agenda', '/secretaire', '/pharmacie', '/admin', '/messagerie', '/verifier', '/invitations']) expect(lien(l)).not.toBeNull();
    expect(lien('/medecin/candidature')).toBeNull(); // déjà médecin
    expect(lien('/mes-rendez-vous')).toBeNull();

    moi.set({ ...PROFIL, roles: ['SECRETAIRE', 'PHARMACIE'] });
    await afficher();
    for (const l of ['/secretaire', '/pharmacie', '/medecin/candidature']) expect(lien(l)).not.toBeNull();
    expect(lien('/medecin/agenda')).toBeNull();
  });

  it('propose « Invitations de cabinet » à tous les rôles, comme l\'appli', async () => {
    for (const role of ['MEDECIN', 'SECRETAIRE', 'PHARMACIE', 'ADMIN', 'PATIENT']) {
      moi.set({ ...PROFIL, roles: [role] });
      await afficher();
      expect(lien('/invitations')).withContext(role).not.toBeNull();
    }
  });

  it('propose « Ma fiche » au médecin seulement quand la route de l\'API existe, comme « Mon espace » de l\'appli', async () => {
    const api = TestBed.inject(ApiDisponibleService);
    moi.set({ ...PROFIL, roles: ['MEDECIN'] });
    await afficher();
    expect(lien('/medecin/ma-fiche')).toBeNull();

    api.ficheMedecin.set(true);
    await afficher();
    expect(lien('/medecin/ma-fiche')).not.toBeNull();
    expect(texte()).toContain('Ma fiche');

    moi.set(PROFIL);
    await afficher();
    expect(lien('/medecin/ma-fiche')).toBeNull();
  });

  it('propose la messagerie au médecin et au patient, et au patient ses avis, listes d\'attente et Dawini, comme « Mon compte » de l\'appli', async () => {
    moi.set({ ...PROFIL, roles: ['MEDECIN'] });
    await afficher();
    expect(lien('/messagerie')).not.toBeNull();

    moi.set({ ...PROFIL, roles: ['PATIENT'] });
    await afficher();
    for (const l of ['/messagerie', '/mes-avis', '/liste-attente', '/dawini']) expect(lien(l)).not.toBeNull();
  });

  it('ne propose pas « Mes avis », « Mes listes d\'attente » ni Dawini à un compte médecin, secrétaire ou pharmacie sans rôle PATIENT, comme « Mon compte » de l\'appli', async () => {
    for (const role of ['MEDECIN', 'SECRETAIRE', 'PHARMACIE']) {
      moi.set({ ...PROFIL, roles: [role] });
      await afficher();
      for (const l of ['/mes-avis', '/liste-attente', '/dawini']) expect(lien(l)).withContext(role + ' ' + l).toBeNull();
      // La messagerie est réservée par l'API aux patients et aux médecins.
      if (role === 'MEDECIN') expect(lien('/messagerie')).withContext(role).not.toBeNull();
      else expect(lien('/messagerie')).withContext(role).toBeNull();
    }
  });

  it('propose « Mes avis », « Mes listes d\'attente » et Dawini à un professionnel qui a aussi le rôle PATIENT, et à un administrateur', async () => {
    for (const roles of [['MEDECIN', 'PATIENT'], ['SECRETAIRE', 'PATIENT'], ['PHARMACIE', 'PATIENT'], ['ADMIN']]) {
      moi.set({ ...PROFIL, roles });
      await afficher();
      for (const l of ['/mes-avis', '/liste-attente', '/dawini']) expect(lien(l)).withContext(roles.join() + ' ' + l).not.toBeNull();
    }
  });

  it('nomme l\'entrée Dawini « Dawini (pharmacies) » / « داويني (الصيدليات) », comme « Mon compte » de l\'appli', async () => {
    moi.set({ ...PROFIL, roles: ['PATIENT'] });
    await afficher();
    expect(lien('/dawini')?.textContent).toContain('Dawini (pharmacies)');
  });

  it('propose au médecin ses ordonnances, avis, liste d\'attente et secrétaires, au patient ses ordonnances, et à tous « Vérifier une ordonnance », comme l\'appli', async () => {
    moi.set({ ...PROFIL, roles: ['MEDECIN'] });
    await afficher();
    for (const l of ['/medecin/ordonnances', '/medecin/avis', '/medecin/liste-attente', '/medecin/secretaires', '/verifier']) expect(lien(l)).not.toBeNull();

    moi.set({ ...PROFIL, roles: ['PATIENT'] });
    await afficher();
    for (const l of ['/mes-ordonnances', '/verifier']) expect(lien(l)).not.toBeNull();

    for (const role of ['SECRETAIRE', 'PHARMACIE', 'ADMIN']) {
      moi.set({ ...PROFIL, roles: [role] });
      await afficher();
      expect(lien('/verifier')).not.toBeNull();
    }
  });

  it('ne propose pas la messagerie à la secrétaire, à la pharmacie ni à l\'administrateur seuls (l\'API la refuse), mais la garde avec le rôle PATIENT', async () => {
    for (const role of ['SECRETAIRE', 'PHARMACIE', 'ADMIN']) {
      moi.set({ ...PROFIL, roles: [role] });
      await afficher();
      expect(lien('/messagerie')).withContext(role).toBeNull();
      moi.set({ ...PROFIL, roles: ['PATIENT', role] });
      await afficher();
      expect(lien('/messagerie')).withContext('PATIENT+' + role).not.toBeNull();
    }
  });

  it('affiche « Téléconsultation » avec « Bientôt » à chaque rôle (visio pas encore ouverte), comme « Mon compte » de l\'appli', async () => {
    for (const role of ['PATIENT', 'MEDECIN', 'SECRETAIRE', 'PHARMACIE', 'ADMIN']) {
      moi.set({ ...PROFIL, roles: [role] });
      await afficher();
      const href = role === 'MEDECIN' ? '/medecin/teleconsultations' : '/teleconsultations';
      const a = lien(href) as HTMLElement | null;
      expect(a).withContext(role).not.toBeNull();
      expect(a!.textContent).toContain('Téléconsultation');
      expect(a!.textContent).toContain('Bientôt');
    }
  });

  it('affiche la téléconsultation et « Bientôt » en arabe', async () => {
    TestBed.inject(LangueService).definir(true);
    await afficher();
    const a = lien('/teleconsultations') as HTMLElement | null;
    expect(a?.textContent).toContain('الاستشارة عن بُعد');
    expect(a?.textContent).toContain('قريبًا');
  });

  it('n affiche plus l identifiant technique du compte, meme a une secretaire', async () => {
    moi.set({ ...PROFIL, roles: ['SECRETAIRE'] });
    await afficher();

    expect(texte()).not.toContain('Identifiant du compte');
    expect(texte()).not.toContain(PROFIL.sujet);
  });

  it('supprime le compte apres une confirmation dans la page, puis deconnecte', async () => {
    service.supprimer.and.returnValue(of(undefined));
    await afficher();

    bouton('Supprimer mon compte')!.click();
    await afficher();
    expect(service.supprimer).not.toHaveBeenCalled();
    expect(texte()).toContain('Cette action est définitive');

    bouton('Oui, supprimer définitivement')!.click();
    await afficher();
    expect(service.supprimer).toHaveBeenCalledTimes(1);
    expect(auth.seDeconnecter).toHaveBeenCalled();
    expect(consommerCompteSupprime()).toBeTrue();
    expect(consommerCompteSupprime()).toBeFalse();
  });

  it('annuler la confirmation ne supprime rien ; un echec est explique', async () => {
    service.supprimer.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await afficher();

    bouton('Supprimer mon compte')!.click();
    await afficher();
    bouton('Annuler')!.click();
    await afficher();
    expect(service.supprimer).not.toHaveBeenCalled();
    expect(texte()).not.toContain('Cette action est définitive');

    bouton('Supprimer mon compte')!.click();
    await afficher();
    bouton('Oui, supprimer définitivement')!.click();
    await afficher();
    expect(auth.seDeconnecter).not.toHaveBeenCalled();
    expect(texte()).toContain('La suppression a échoué');
  });

  it('phase de test (inscription fermee) : « Se connecter » seulement, pas de « Créer un compte »', async () => {
    localStorage.removeItem('tabibi.equipe');
    connecte = false;
    moi.set(null);
    await afficher();

    expect(bouton('Créer un compte')).toBeUndefined();
    expect(texte()).not.toContain('Créez votre compte');
    expect(texte()).toContain('Les comptes sont créés sur demande pendant la phase de test');
    expect(fixture.nativeElement.querySelector('a[href="/praticien"]')).not.toBeNull();
    bouton('Se connecter')!.click();
    expect(auth.seConnecter).toHaveBeenCalled();
  });

  it('non connecte : « Se connecter » et « Créer un compte » (inscription), sans suppression', async () => {
    // Inscription ouverte (acces equipe) : le bouton « Créer un compte » est present.
    localStorage.setItem('tabibi.equipe', '1');
    connecte = false;
    moi.set(null);
    await afficher();

    expect(bouton('Supprimer mon compte')).toBeUndefined();
    // Le texte annonce l'inscription par e-mail (c'est ce que fait « Créer un compte »), pas un choix à l'étape suivante.
    expect(texte()).toContain('Créez votre compte avec votre adresse e-mail, ou connectez-vous par téléphone (code SMS)');
    expect(texte()).not.toContain('à l\'étape suivante');
    bouton('Créer un compte')!.click();
    expect(auth.sInscrireParEmail).toHaveBeenCalled();
    bouton('Se connecter')!.click();
    expect(auth.seConnecter).toHaveBeenCalled();
    localStorage.removeItem('tabibi.equipe');
  });

  it('annonce la conservation légale des ordonnances, comme la page de suppression et l\'appli', async () => {
    await afficher();

    expect(texte()).toContain('Les ordonnances et le journal de sécurité sont conservés le temps exigé par la loi');
  });

  it('dit que les rendez-vous passés et la note des avis sont conservés, et que les rendez-vous à venir sont annulés', async () => {
    await afficher();

    expect(texte()).toContain('vos rendez-vous à venir sont annulés');
    expect(texte()).toContain("Vos rendez-vous passés restent, sans aucun lien avec vous, dans l'agenda du médecin");
    expect(texte()).toContain('la note (sans commentaire) de vos avis est conservée');
    expect(texte()).not.toContain('(profil, rendez-vous,');
  });

  describe('en arabe (comme l\'appli)', () => {
    beforeEach(() => TestBed.inject(LangueService).definir(true));
    afterEach(() => localStorage.removeItem('tabibi.langue'));

    it('affiche titre, rôle, accès rapides et suppression en arabe, de droite à gauche', async () => {
      moi.set({ ...PROFIL, roles: ['PATIENT'] });
      await afficher();

      expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
      expect(texte()).toContain('حسابي');
      expect(texte()).toContain('متصل باسم');
      expect(texte()).toContain('الدور : مريض');
      expect(texte()).toContain('ملفي الشخصي');
      expect(texte()).toContain('مواعيدي');
      expect(texte()).toContain('ترشحي كطبيب');
      expect(texte()).toContain('تسجيل الخروج');
      expect(texte()).toContain('حذف حسابي');
      // Même mot que l'appli (texteConfirmationSuppressionCompte) : « صفحتك العامة », pas « بطاقتك ».
      expect(texte()).toContain('تُسحب صفحتك العامة');
      expect(texte()).not.toContain('بطاقتك');
      expect(texte()).not.toContain('Mon compte');
      expect(texte()).not.toContain('Se déconnecter');
    });

    it('la suppression se confirme en arabe puis supprime', async () => {
      service.supprimer.and.returnValue(of(undefined));
      await afficher();

      bouton('حذف حسابي')!.click();
      await afficher();
      expect(texte()).toContain('هذا الإجراء نهائي');
      bouton('نعم، احذف نهائيًا')!.click();
      await afficher();
      expect(service.supprimer).toHaveBeenCalledTimes(1);
    });

    it('non connecté : invitation à se connecter en arabe', async () => {
      connecte = false;
      moi.set(null);
      await afficher();

      expect(bouton('تسجيل الدخول')).toBeDefined();
      expect(texte()).toContain('تُنشأ الحسابات عند الطلب');
      expect(texte()).not.toContain('أنشئ حسابك');
    });
  });
});
