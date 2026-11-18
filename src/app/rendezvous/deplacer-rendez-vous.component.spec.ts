import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Creneau } from '../annuaire/annuaire.service';
import { DeplacerRendezVousComponent, MESSAGE_CRENEAU_PRIS } from './deplacer-rendez-vous.component';
import { RendezVous } from './rendezvous.service';

const RDV: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2099-01-05T09:00:00Z', statut: 'CONFIRME', creneauId: 'c1' };
const creneau = (id: string, medecinId = 'm1', disponible = true): Creneau => ({ id, medecinId, debut: '2099-01-06T10:00:00Z', dureeMinutes: 30, disponible });

describe('DeplacerRendezVousComponent', () => {
  function creer(deplacer: () => unknown) {
    registerLocaleData(localeFr);
    TestBed.configureTestingModule({ imports: [DeplacerRendezVousComponent], providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
    const fixture = TestBed.createComponent(DeplacerRendezVousComponent);
    fixture.componentRef.setInput('rendezVous', RDV);
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
});
