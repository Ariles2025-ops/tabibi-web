import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { ProfilService } from '../moi/profil.service';
import { Ordonnance, OrdonnanceService } from './ordonnance.service';
import { LangueService } from '../partage/langue.service';
import { OrdonnanceDetailComponent } from './ordonnance-detail.component';

/** Detail d'ordonnance : meme message que l'appli quand l'ordonnance n'a aucun medicament. */
describe('OrdonnanceDetailComponent', () => {
  async function afficher(lignes: Ordonnance['lignes'], statut = 'EMISE', arabe = false, emise = false) {
    const ordonnance = {
      id: 'o1', patientId: 'p1', medecinId: 'm1', emiseLe: '2026-12-04T09:00:00Z',
      statut, codeVerification: 'AB12CD34', lignes,
    } as Ordonnance;
    const service = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['parId']);
    service.parId.and.returnValue(of(ordonnance));
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.returnValue(of({ id: 'm1', nomComplet: 'Dr Test' } as any));
    const profils = jasmine.createSpyObj<ProfilService>('ProfilService', ['monProfil']);
    profils.monProfil.and.returnValue(of({ utilisateurId: 'p1', nomComplet: 'Test' } as any));
    TestBed.configureTestingModule({
      imports: [OrdonnanceDetailComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: OrdonnanceService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: ProfilService, useValue: profils },
        { provide: AuthService, useValue: { pret: async () => {}, estConnecte: () => true, seConnecter: () => {} } },
      ],
    });
    TestBed.inject(LangueService).ar.set(arabe);
    if (emise) {
      spyOn(TestBed.inject(Router), 'getCurrentNavigation').and.returnValue({ extras: { state: { ordonnanceEmise: true } } } as any);
    }
    const fixture = TestBed.createComponent(OrdonnanceDetailComponent);
    fixture.componentInstance['charger']('o1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche « Aucun médicament sur cette ordonnance. » et pas de tableau vide', async () => {
    const el = await afficher([]);
    expect(el.textContent).toContain('Aucun médicament sur cette ordonnance.');
    expect(el.querySelector('table')).toBeNull();
  });

  it('le lien « Vérifier une ordonnance » mène à /ar/verifier en arabe et à /verifier en français', async () => {
    expect((await afficher([])).querySelector('a[href^="/verifier"]')).not.toBeNull();
    TestBed.resetTestingModule();
    const el = await afficher([], 'EMISE', true);
    expect(el.querySelector('a[href^="/ar/verifier"]')).not.toBeNull();
    expect(el.querySelector('a[href^="/verifier"]')).toBeNull();
  });

  it('confirme « Ordonnance émise. » (FR/AR) juste après l\'émission, et pas quand on ouvre ou recharge la page', async () => {
    expect((await afficher([])).querySelector('.ordonnance-emise')).toBeNull();
    TestBed.resetTestingModule();
    expect((await afficher([], 'EMISE', false, true)).querySelector('.ordonnance-emise')?.textContent).toContain('Ordonnance émise.');
    TestBed.resetTestingModule();
    expect((await afficher([], 'EMISE', true, true)).querySelector('.ordonnance-emise')?.textContent).toContain('تم إصدار الوصفة.');
  });

  it('affiche le tableau quand l\'ordonnance a des médicaments', async () => {
    const el = await afficher([{ medicament: 'Doliprane', posologie: '1 par jour', duree: '5 jours' }]);
    expect(el.textContent).not.toContain('Aucun médicament');
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('affiche « - » quand la posologie ou la durée manque, comme l\'appli', async () => {
    const el = await afficher([{ medicament: 'Doliprane', posologie: '', duree: null } as any]);
    const cellules = Array.from(el.querySelectorAll('tbody tr td')).map((c) => c.textContent?.trim());
    expect(cellules).toEqual(['Doliprane', '-', '-']);
  });

  it('propose « Copier le code », copie le code et confirme « Code copié »', async () => {
    const ecrire = jasmine.createSpy('writeText').and.resolveTo();
    spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText: ecrire } as unknown as Clipboard);
    const el = await afficher([]);
    const bouton = el.querySelector('.bouton-copier') as HTMLButtonElement;
    expect(bouton.textContent).toContain('Copier le code');
    expect(el.textContent).not.toContain('Code copié');
    bouton.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(ecrire).toHaveBeenCalledWith('AB12CD34');
  });

  it('dit « À présenter en pharmacie » seulement tant que l\'ordonnance est utilisable', async () => {
    expect((await afficher([], 'EMISE')).querySelector('.a-presenter')).not.toBeNull();
    TestBed.resetTestingModule();
    expect((await afficher([], 'ANNULEE')).querySelector('.a-presenter')).toBeNull();
    TestBed.resetTestingModule();
    expect((await afficher([], 'DELIVREE')).querySelector('.a-presenter')).toBeNull();
  });

  it('s\'affiche en arabe (sens RTL, statut, colonnes, code) quand la langue est l\'arabe, comme l\'appli', async () => {
    const el = await afficher([{ medicament: 'Doliprane', posologie: '1 par jour', duree: '5 jours' }], 'EMISE', true);
    const txt = el.textContent ?? '';
    expect(el.querySelector('main')?.getAttribute('dir')).toBe('rtl');
    expect(txt).toContain('الوصفة الطبية');
    expect(txt).toContain('صادرة');
    expect(txt).toContain('الدواء');
    expect(txt).toContain('نسخ الرمز');
    expect(txt).toContain('يُقدَّم في الصيدلية');
    expect(txt).not.toContain('Copier le code');
    expect(txt).not.toContain('Posologie');
  });

  it('une ordonnance annulée ou délivrée est expliquée en arabe', async () => {
    expect((await afficher([], 'ANNULEE', true)).textContent).toContain('ألغاها الطبيب');
    TestBed.resetTestingModule();
    expect((await afficher([], 'DELIVREE', true)).textContent).toContain('صُرفت في الصيدلية');
  });

  it('reste en français par défaut', async () => {
    const el = await afficher([], 'EMISE', false);
    expect(el.querySelector('main')?.getAttribute('dir')).toBeNull();
    expect(el.textContent).toContain('Code de vérification');
  });
});
