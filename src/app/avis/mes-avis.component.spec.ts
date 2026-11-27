import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { Avis, AvisService } from './avis.service';
import { MesAvisComponent } from './mes-avis.component';

const MEDECIN: Medecin = {
  id: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'generaliste',
  specialiteFr: 'Généraliste',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
};

const ANCIEN: Avis = { id: 'a1', rendezVousId: 'r1', medecinId: 'm1', note: 5, commentaire: 'Très bon accueil.', statut: 'PUBLIE', deposeLe: '2026-09-10T10:00:00Z' };
const RECENT: Avis = { id: 'a2', rendezVousId: 'r2', medecinId: 'm1', note: 2, commentaire: null, statut: 'MASQUE', deposeLe: '2026-09-18T10:00:00Z' };

describe('MesAvisComponent', () => {
  let fixture: ComponentFixture<MesAvisComponent>;
  let service: jasmine.SpyObj<AvisService>;
  let annuaire: jasmine.SpyObj<AnnuaireService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<AvisService>('AvisService', ['mes']);
    service.mes.and.returnValue(of([ANCIEN, RECENT]));
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.returnValue(of(MEDECIN));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [MesAvisComponent],
      providers: [
        provideRouter([]),
        { provide: AvisService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(MesAvisComponent);
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  it('liste mes avis, les plus recents d abord, avec note, statut, date, praticien et commentaire', async () => {
    await afficher();

    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('2 / 5');
    expect(items[0].textContent).toContain('Masqué par la modération');
    expect(items[0].textContent).toContain('18 septembre 2026');
    expect(items[0].textContent).toContain('Dr Amina Belkacem');
    expect(items[1].textContent).toContain('5 / 5');
    expect(items[1].textContent).toContain('Publié');
    expect(items[1].textContent).toContain('Très bon accueil.');
    expect(annuaire.medecin).toHaveBeenCalledTimes(1);
  });

  it('affiche un message et un lien vers mes rendez-vous quand il n y a aucun avis', async () => {
    service.mes.and.returnValue(of([]));
    await afficher();

    expect(texte()).toContain('Aucun avis pour le moment.');
    expect(fixture.nativeElement.querySelector('a[href="/mes-rendez-vous"]')).not.toBeNull();
  });

  it('redirige vers la connexion si l utilisateur n est pas connecte et signale un 403', async () => {
    auth.estConnecte = () => false;
    await afficher();
    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.mes).not.toHaveBeenCalled();

    auth.estConnecte = () => true;
    service.mes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    fixture = TestBed.createComponent(MesAvisComponent);
    await afficher();
    expect(texte()).toContain('Cette page est réservée aux patients.');
  });

  it('affiche la page en arabe (de droite a gauche) avec les memes mots que l appli', async () => {
    TestBed.inject(LangueService).ar.set(true);
    try {
      await afficher();

      expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
      expect(texte()).toContain('آرائي');
      expect(texte()).toContain('أخفته الإدارة');
      expect(texte()).toContain('منشور');
      expect(texte()).not.toContain('Masqué par la modération');
      expect(texte()).toContain('18/09/2026');

      service.mes.and.returnValue(of([]));
      fixture = TestBed.createComponent(MesAvisComponent);
      await afficher();
      expect(texte()).toContain('لا توجد آراء حاليًا.');
      expect(texte()).toContain('مواعيدي');
    } finally {
      TestBed.inject(LangueService).ar.set(false);
    }
  });

  it('un statut d avis autre que publie, signale ou masque est traduit en arabe, comme dans l appli', async () => {
    service.mes.and.returnValue(of([{ ...ANCIEN, statut: 'EN_ATTENTE' }]));
    TestBed.inject(LangueService).ar.set(true);
    try {
      await afficher();
      expect(texte()).toContain('قيد الانتظار');
      expect(texte()).not.toContain('En attente');
    } finally {
      TestBed.inject(LangueService).ar.set(false);
    }
  });

  it('un avis sans date lisible affiche « date inconnue » et passe en fin de liste, comme dans l appli', async () => {
    service.mes.and.returnValue(of([{ ...ANCIEN, id: 'a3', deposeLe: 'illisible' }, ANCIEN, RECENT]));
    await afficher();

    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('18 septembre 2026');
    expect(items[2].textContent).toContain('date inconnue');
  });
});
