import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AideComponent } from './aide.component';
import { SupprimerCompteComponent } from './supprimer-compte.component';

/** Les libelles de la demarche de suppression doivent etre ceux de l'appli (« Mon profil ») et du site (« Mon compte »). */
describe('Suppression de compte : libelles identiques a l\'appli', () => {
  it('la page publique cite « Mon profil » (appli) et « Mon compte » (site)', () => {
    TestBed.configureTestingModule({ imports: [SupprimerCompteComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SupprimerCompteComponent);
    fixture.detectChanges();
    const texte: string = fixture.nativeElement.textContent;
    expect(texte).toContain('Mon profil');
    expect(texte).toContain('Mon compte');
    expect(texte).toContain('Supprimer mon compte');
  });

  function aide(langue?: string) {
    TestBed.configureTestingModule({
      imports: [AideComponent],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: { langue } } } }],
    });
    const fixture = TestBed.createComponent(AideComponent);
    fixture.detectChanges();
    return fixture.componentInstance.questions.find((q) => q.lien?.vers === '/supprimer-mon-compte')!;
  }

  it('l\'aide française cite « Mon profil » pour l\'appli et « Mon compte » pour le site', () => {
    const r = aide().r;
    expect(r).toContain('« Mon profil »');
    expect(r).toContain('« Mon compte »');
  });

  it('l\'aide arabe cite « ملفي الشخصي » (comme l\'appli) et « حسابي » (site)', () => {
    const r = aide('ar').r;
    expect(r).toContain('ملفي الشخصي');
    expect(r).toContain('حسابي');
  });
});
