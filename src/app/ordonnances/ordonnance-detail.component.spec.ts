import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { OrdonnanceDetailComponent, motifErreurBlob } from './ordonnance-detail.component';
import { Ordonnance, OrdonnanceService } from './ordonnance.service';

const ORDONNANCE: Ordonnance = {
  id: 'o1',
  medecinId: 'm1',
  patientId: 'p1',
  rendezVousId: 'r1',
  lignes: [{ medicament: 'Amoxicilline 1 g', posologie: '1 comprime matin et soir', duree: '7 jours' }],
  emiseLe: '2026-09-18T10:00:00Z',
  codeVerification: 'TBB-2026-0001',
  statut: 'EMISE',
};

const MEDECIN: Medecin = {
  id: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'generaliste',
  specialiteFr: 'Généraliste',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
};

describe('OrdonnanceDetailComponent', () => {
  let fixture: ComponentFixture<OrdonnanceDetailComponent>;
  let service: jasmine.SpyObj<OrdonnanceService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };
  let estMedecin: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['parId', 'pdf']);
    service.parId.and.returnValue(of(ORDONNANCE));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };
    estMedecin = signal(false);
    const annuaire = { medecin: () => of(MEDECIN) };

    TestBed.configureTestingModule({
      imports: [OrdonnanceDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'o1' })) } },
        { provide: OrdonnanceService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: { estMedecin } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(OrdonnanceDetailComponent);
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Le motif d'erreur est lu dans un Blob (asynchrone, hors zone) : un court delai avant de relire la vue. */
  async function attendreErreurPdf() {
    await new Promise((resolve) => setTimeout(resolve, 50));
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function bouton(libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.includes(libelle));
  }

  it('affiche l ordonnance : praticien, patient, lignes, code et boutons Imprimer / Télécharger le PDF', async () => {
    await afficher();

    expect(service.parId).toHaveBeenCalledWith('o1');
    expect(texte()).toContain('Dr Amina Belkacem');
    expect(texte()).toContain('p1');
    expect(texte()).toContain('Amoxicilline 1 g');
    expect(texte()).toContain('TBB-2026-0001');
    expect(texte()).toContain('18 septembre 2026');
    expect(bouton('Imprimer')).toBeDefined();
    expect(bouton('Télécharger le PDF')).toBeDefined();
    expect(bouton('Télécharger le PDF')!.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('a[href="/mes-ordonnances"]')).not.toBeNull();
  });

  it('propose le retour vers les ordonnances redigees pour un medecin', async () => {
    estMedecin.set(true);
    await afficher();

    expect(fixture.nativeElement.querySelector('a[href="/medecin/ordonnances"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/mes-ordonnances"]')).toBeNull();
  });

  it('« Télécharger le PDF » demande le PDF puis declenche un lien de telechargement ordonnance-<code>.pdf et libere l URL objet', async () => {
    const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    service.pdf.and.returnValue(of(pdf));
    const createObjectURL = spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/pdf-1');
    const revokeObjectURL = spyOn(URL, 'revokeObjectURL');
    let lienClique: HTMLAnchorElement | null = null;
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      lienClique = this;
    });
    await afficher();
    jasmine.clock().install();
    try {
      bouton('Télécharger le PDF')!.click();
      fixture.detectChanges();

      expect(service.pdf).toHaveBeenCalledWith('o1');
      expect(createObjectURL).toHaveBeenCalledWith(pdf);
      expect(lienClique).not.toBeNull();
      expect(lienClique!.getAttribute('href')).toBe('blob:http://localhost/pdf-1');
      expect(lienClique!.download).toBe('ordonnance-TBB-2026-0001.pdf');
      expect(lienClique!.isConnected).toBeFalse();
      expect(revokeObjectURL).not.toHaveBeenCalled();
      jasmine.clock().tick(10_000);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/pdf-1');
      expect(texte()).not.toContain('Impossible de générer le PDF');
      expect(bouton('Télécharger le PDF')!.disabled).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('affiche le motif { erreur } de l API quand le PDF echoue (corps Blob JSON)', async () => {
    const corps = new Blob([JSON.stringify({ erreur: 'Ordonnance annulée : pas de PDF.' })], { type: 'application/json' });
    service.pdf.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: corps })));
    await afficher();

    bouton('Télécharger le PDF')!.click();
    await attendreErreurPdf();

    expect(texte()).toContain('Ordonnance annulée : pas de PDF.');
    expect(bouton('Télécharger le PDF')!.disabled).toBeFalse();
  });

  it('affiche un message generique quand le PDF echoue sans motif', async () => {
    service.pdf.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: new Blob(['boom']) })));
    await afficher();

    bouton('Télécharger le PDF')!.click();
    await attendreErreurPdf();

    expect(texte()).toContain('Impossible de générer le PDF de cette ordonnance.');
  });

  it('motifErreurBlob lit { erreur } dans un Blob ou un objet, sinon null', async () => {
    expect(await motifErreurBlob(new HttpErrorResponse({ error: new Blob(['{"erreur":"Motif"}']) }))).toBe('Motif');
    expect(await motifErreurBlob(new HttpErrorResponse({ error: { erreur: 'Objet' } }))).toBe('Objet');
    expect(await motifErreurBlob(new HttpErrorResponse({ error: new Blob(['pas du json']) }))).toBeNull();
    expect(await motifErreurBlob(new HttpErrorResponse({ error: null }))).toBeNull();
  });

  it('affiche « Ordonnance introuvable. » sur un 404, sans bouton PDF', async () => {
    service.parId.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await afficher();
    expect(texte()).toContain('Ordonnance introuvable.');
    expect(bouton('Télécharger le PDF')).toBeUndefined();
  });

  it('affiche « Vous n avez pas accès à cette ordonnance. » sur un 403', async () => {
    service.parId.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await afficher();
    expect(texte()).toContain("Vous n'avez pas accès à cette ordonnance.");
  });

  it('redirige vers la connexion si l utilisateur n est pas connecte', async () => {
    auth.estConnecte = () => false;
    await afficher();

    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.parId).not.toHaveBeenCalled();
    expect(texte()).toContain('Redirection vers la page de connexion');
  });

  it('page privee : titre « Ordonnance | Tabibi » et robots noindex', async () => {
    await afficher();

    expect(document.title).toBe('Ordonnance | Tabibi');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });
});
