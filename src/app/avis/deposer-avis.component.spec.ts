import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RendezVous, RendezVousService } from '../rendezvous/rendezvous.service';
import { Avis, AvisService } from './avis.service';
import { DeposerAvisComponent } from './deposer-avis.component';

const HONORE: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2026-09-01T09:00:00Z', statut: 'HONORE', creneauId: 'c1' };

const MEDECIN: Medecin = {
  id: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'generaliste',
  specialiteFr: 'Généraliste',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
};

const AVIS: Avis = {
  id: 'a1',
  rendezVousId: 'r1',
  medecinId: 'm1',
  note: 4,
  commentaire: 'Très bon accueil.',
  statut: 'PUBLIE',
  deposeLe: '2026-09-18T10:00:00Z',
};

describe('DeposerAvisComponent', () => {
  let fixture: ComponentFixture<DeposerAvisComponent>;
  let service: jasmine.SpyObj<AvisService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<AvisService>('AvisService', ['deposer']);
    const rendezVous = jasmine.createSpyObj<RendezVousService>('RendezVousService', ['mes']);
    rendezVous.mes.and.returnValue(of([HONORE]));
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.returnValue(of(MEDECIN));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [DeposerAvisComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ rendezVousId: 'r1' }) } } },
        { provide: AvisService, useValue: service },
        { provide: RendezVousService, useValue: rendezVous },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(DeposerAvisComponent);
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

  function radios(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]'));
  }

  function formulaire(): HTMLFormElement | null {
    return fixture.nativeElement.querySelector('form');
  }

  async function choisirNote(n: number) {
    const radio = radios()[n - 1];
    radio.click();
    radio.dispatchEvent(new Event('change'));
    await afficher();
  }

  async function saisirCommentaire(valeur: string) {
    const zone: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    zone.value = valeur;
    zone.dispatchEvent(new Event('input'));
    await afficher();
  }

  function soumettre() {
    formulaire()!.dispatchEvent(new Event('submit'));
  }

  it('rappelle le rendez-vous et le praticien, propose cinq notes sans emoji et un commentaire borne a 500', async () => {
    await afficher();

    expect(texte()).toContain('Rendez-vous du');
    expect(texte()).toContain('1 septembre');
    expect(texte()).toContain('avec Dr Amina Belkacem');
    expect(radios().length).toBe(5);
    const etiquettes: HTMLLabelElement[] = Array.from(fixture.nativeElement.querySelectorAll('label.note'));
    expect(etiquettes.map((l) => l.textContent?.trim())).toEqual(['1', '2', '3', '4', '5']);
    expect(etiquettes[2].getAttribute('aria-label')).toBe('Note 3 sur 5');
    expect(texte()).toContain('Choisissez une note de 1 à 5');
    expect(texte()).toContain('0 / 500');
  });

  it('refuse un envoi sans note', async () => {
    await afficher();

    soumettre();
    await afficher();

    expect(service.deposer).not.toHaveBeenCalled();
    expect(texte()).toContain('Choisissez une note de 1 à 5.');
  });

  it('envoie la note choisie et le commentaire nettoye, puis confirme avec un lien vers mes avis', async () => {
    service.deposer.and.returnValue(of(AVIS));
    await afficher();

    await choisirNote(4);
    expect(fixture.nativeElement.querySelectorAll('.note-choisie').length).toBe(1);
    expect(texte()).toContain('4 / 5');
    await saisirCommentaire('  Très bon accueil.  ');
    soumettre();
    await afficher();

    expect(service.deposer).toHaveBeenCalledWith('r1', 4, 'Très bon accueil.');
    expect(texte()).toContain('Merci, votre avis a été enregistré.');
    expect(fixture.nativeElement.querySelector('a[href="/mes-avis"]')).not.toBeNull();
    expect(formulaire()).toBeNull();
  });

  it('envoie un commentaire null quand il est vide', async () => {
    service.deposer.and.returnValue(of({ ...AVIS, note: 5, commentaire: null }));
    await afficher();

    await choisirNote(5);
    soumettre();
    await afficher();

    expect(service.deposer).toHaveBeenCalledWith('r1', 5, null);
  });

  it('indique qu un avis a deja ete donne sur un 409 et garde le formulaire', async () => {
    service.deposer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Un avis a deja ete depose pour ce rendez-vous.' } })),
    );
    await afficher();

    await choisirNote(3);
    soumettre();
    await afficher();

    expect(texte()).toContain('Vous avez déjà donné votre avis pour ce rendez-vous.');
    expect(formulaire()).not.toBeNull();
  });

  it('affiche le { erreur } d un 400', async () => {
    service.deposer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'La note doit etre comprise entre 1 et 5.' } })),
    );
    await afficher();

    await choisirNote(2);
    soumettre();
    await afficher();

    expect(texte()).toContain('La note doit etre comprise entre 1 et 5.');
  });

  it('redirige vers la connexion si l utilisateur n est pas connecte', async () => {
    auth.estConnecte = () => false;
    await afficher();

    expect(auth.seConnecter).toHaveBeenCalled();
    expect(formulaire()).toBeNull();
    expect(texte()).toContain('Redirection vers la page de connexion');
  });
});
