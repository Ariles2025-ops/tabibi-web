import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Creneau } from '../annuaire/annuaire.service';
import { DeplacerRendezVousComponent, MESSAGE_CRENEAU_PRIS, MESSAGE_CRENEAU_PRIS_CABINET } from './deplacer-rendez-vous.component';
import { RendezVous } from './rendezvous.service';

const RDV: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2099-01-05T09:00:00Z', statut: 'CONFIRME', creneauId: 'c1' };
const creneau = (id: string, medecinId = 'm1', disponible = true): Creneau => ({ id, medecinId, debut: '2099-01-06T10:00:00Z', dureeMinutes: 30, disponible });

describe('DeplacerRendezVousComponent', () => {
  function creer(deplacer: () => unknown, rdv: RendezVous = RDV) {
    registerLocaleData(localeFr);
    TestBed.configureTestingModule({ imports: [DeplacerRendezVousComponent], providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
    const fixture = TestBed.createComponent(DeplacerRendezVousComponent);
    fixture.componentRef.setInput('rendezVous', rdv);
    fixture.componentRef.setInput('lister', () => of([creneau('c1'), creneau('c2'), creneau('c3', 'autre'), creneau('c4', 'm1', false)]));
    fixture.componentRef.setInput('deplacer', deplacer);
    fixture.detectChanges();
    return fixture;
  }

  it("propose seulement les creneaux libres du meme medecin, hors creneau actuel", () => {
    const f = creer(() => of({}));
    expect(f.componentInstance.libres().map((c) => c.id)).toEqual(['c2']);
  });

  it('confirme puis emet le creneau choisi', () => {
    const f = creer(() => of({}));
    const emis: Creneau[] = [];
    f.componentInstance.deplace.subscribe((c) => emis.push(c));
    f.componentInstance.choisi.set(creneau('c2'));
    f.componentInstance.confirmer(creneau('c2'));
    expect(emis.map((c) => c.id)).toEqual(['c2']);
  });

  it("affiche un message clair si le creneau vient d'etre pris (409)", () => {
    const f = creer(() => throwError(() => new HttpErrorResponse({ status: 409 })));
    f.componentInstance.confirmer(creneau('c2'));
    expect(f.componentInstance.erreur()).toBe(MESSAGE_CRENEAU_PRIS);
    expect(f.componentInstance.libres()).toEqual([]);
  });

  it("cote cabinet (medecin, secretaire), le message ne parle pas de « votre » rendez-vous, comme l'appli", () => {
    const f = creer(() => throwError(() => new HttpErrorResponse({ status: 409 })));
    f.componentRef.setInput('avertirPatient', true);
    f.componentInstance.confirmer(creneau('c2'));
    expect(f.componentInstance.erreur()).toBe(MESSAGE_CRENEAU_PRIS_CABINET);
    expect(f.componentInstance.erreur()).not.toContain('Votre');
  });

  it('cote cabinet en arabe : « لم يتغيّر الموعد » et non « موعدك »', () => {
    const f = creer(() => throwError(() => new HttpErrorResponse({ status: 409 })));
    f.componentRef.setInput('arabe', true);
    f.componentRef.setInput('avertirPatient', true);
    f.componentInstance.confirmer(creneau('c2'));
    expect(f.componentInstance.erreur()).toBe('هذا الموعد حُجز للتوّ. لم يتغيّر الموعد: اختر موعدًا آخر.');
  });

  it('affiche le panneau et le message « creneau pris » en arabe quand l ecran est en arabe', () => {
    const f = creer(() => throwError(() => new HttpErrorResponse({ status: 409 })));
    f.componentRef.setInput('arabe', true);
    f.componentInstance.confirmer(creneau('c2'));
    f.detectChanges();
    const texte = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(texte).toContain('اختر موعدًا جديدًا');
    expect(texte).toContain('إغلاق');
    expect(texte).toContain('هذا الموعد حُجز للتوّ');
    expect(texte).not.toContain('Fermer');
    expect(texte).not.toContain('Choisissez');
  });

  describe('information sur le patient (ecrans medecin / secretaire)', () => {
    const texteApresChoix = (f: ReturnType<typeof creer>) => {
      f.componentInstance.choisi.set(creneau('c2'));
      f.detectChanges();
      return (f.nativeElement as HTMLElement).textContent ?? '';
    };

    it('ne dit rien sur l ecran du patient lui-meme', () => {
      const f = creer(() => of({}));
      const texte = texteApresChoix(f);
      expect(texte).not.toContain('prévenu');
      expect(texte).not.toContain('prévenir');
    });

    it('annonce que le patient sera prevenu (rendez-vous pris sur la plateforme)', () => {
      const f = creer(() => of({}));
      f.componentRef.setInput('avertirPatient', true);
      expect(texteApresChoix(f)).toContain('Le patient sera prévenu.');
    });

    it('demande de prevenir par telephone un patient sans compte', () => {
      const f = creer(() => of({}), { ...RDV, source: 'TELEPHONE' });
      f.componentRef.setInput('avertirPatient', true);
      const texte = texteApresChoix(f);
      expect(texte).toContain('Pensez à prévenir le patient par téléphone.');
      expect(texte).not.toContain('Le patient sera prévenu.');
    });

    it('les deux messages existent en arabe, comme dans l appli', () => {
      const f = creer(() => of({}), { ...RDV, source: 'TELEPHONE' });
      f.componentRef.setInput('arabe', true);
      f.componentRef.setInput('avertirPatient', true);
      expect(texteApresChoix(f)).toContain('يرجى إبلاغ المريض هاتفيًا.');
      f.componentRef.setInput('rendezVous', RDV);
      f.detectChanges();
      expect((f.nativeElement as HTMLElement).textContent).toContain('سيتم إعلام المريض.');
    });
  });
});
