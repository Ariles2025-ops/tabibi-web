import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AnnuaireSeoComponent } from './annuaire-seo.component';
import { REPONSE_HTTP } from './statut-http';

/** Pages de l'annuaire : vraie 404 au rendu serveur, rubrique Pharmacies a part, accords « un / une ». */
describe('AnnuaireSeoComponent', () => {
  let reponse: { status: jasmine.Spy };
  let annuaire: jasmine.SpyObj<AnnuaireService>;

  function creer(params: Record<string, string>) {
    reponse = { status: jasmine.createSpy('status') };
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercher']);
    annuaire.rechercher.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [AnnuaireSeoComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} }, paramMap: of(convertToParamMap(params)) } },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: REPONSE_HTTP, useValue: reponse },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireSeoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('repond 404 (et non 200) pour une specialite ou une wilaya inexistante', () => {
    const f = creer({ specialite: 'nimportequoi' });
    expect(reponse.status).toHaveBeenCalledWith(404);
    expect(f.componentInstance.introuvable).toBeTrue();
    expect(annuaire.rechercher).not.toHaveBeenCalled();
  });

  it('ne touche pas au statut d une page existante', () => {
    creer({ specialite: 'cardiologue', wilaya: 'alger' });
    expect(reponse.status).not.toHaveBeenCalled();
    expect(annuaire.rechercher).toHaveBeenCalledWith('cardiologue', '16');
  });

  it('page wilaya : lien « Pharmacies à Alger », pharmacies absentes du maillage des specialites', () => {
    const f = creer({ wilaya: 'alger' });
    const el: HTMLElement = f.nativeElement;
    const lien = el.querySelector('a[href="/specialites/pharmacie/alger"]');
    expect(lien?.textContent).toContain('Pharmacies à Alger');
    expect(el.querySelectorAll('a[href="/specialites/pharmacie/alger"]').length).toBe(1);
    expect(f.componentInstance.specialitesAlpha.some((s) => s.slug === 'pharmacie')).toBeFalse();
  });

  it('page /specialites/pharmacie/alger : existe, sans « prendre rendez-vous »', () => {
    const f = creer({ specialite: 'pharmacie', wilaya: 'alger' });
    expect(reponse.status).not.toHaveBeenCalled();
    expect(f.componentInstance.titre).toBe('Pharmacies à Alger');
    expect(f.componentInstance.intro).not.toContain('rendez-vous');
    expect(annuaire.rechercher).toHaveBeenCalledWith('pharmacie', '16');
  });

  it('accorde l article : « une sage-femme », « un ORL »', () => {
    let f = creer({ specialite: 'sage-femme' });
    expect(f.componentInstance.intro).toContain('Trouvez une sage-femme');
    TestBed.resetTestingModule();
    f = creer({ specialite: 'ORL', wilaya: 'oran' });
    expect(f.componentInstance.cible).toBe('avec un ORL à Oran');
  });
});
