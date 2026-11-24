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
    return fixture.componentInstance.questions.find((q) => q.lien?.vers.endsWith('/supprimer-mon-compte'))!;
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

  function pageSuppression(langue?: string) {
    TestBed.configureTestingModule({
      imports: [SupprimerCompteComponent],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: { langue } } } }],
    });
    const fixture = TestBed.createComponent(SupprimerCompteComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('la page arabe est en arabe, avec les libellés de l\'appli (« ملفي الشخصي », « حذف حسابي ») et sans texte français', () => {
    const page = pageSuppression('ar');
    const texte = page.textContent ?? '';
    expect(page.querySelector('main')?.getAttribute('dir')).toBe('rtl');
    expect(texte).toContain('ملفي الشخصي');
    expect(texte).toContain('حسابي');
    expect(texte).toContain('حذف حسابي');
    expect(texte).not.toContain('Supprimer mon compte');
    expect(page.querySelector('a[href="/supprimer-mon-compte"]')?.textContent).toContain('Français');
  });

  it('la page décrit ce que fait l\'API : rendez-vous à venir annulés, passés conservés sans lien, note des avis, médecins', () => {
    const fr = pageSuppression().textContent ?? '';
    expect(fr).toContain('Vos rendez-vous à venir sont annulés');
    expect(fr).toContain("Vos rendez-vous passés, sans aucun lien avec vous, dans l'agenda du médecin");
    expect(fr).toContain('La note (sans commentaire) de vos avis');
    expect(fr).toContain('votre fiche publique est retirée');
    TestBed.resetTestingModule();
    const ar = pageSuppression('ar').textContent ?? '';
    expect(ar).toContain('تُلغى مواعيدك القادمة');
    expect(ar).toContain('مواعيدك السابقة، دون أي صلة بك، في أجندة الطبيب');
    expect(ar).toContain('دون التعليق');
    expect(ar).toContain('تُسحب صفحتك العامة');
  });

  it('la page française propose le lien vers la version arabe', () => {
    const page = pageSuppression();
    expect(page.querySelector('a[href="/ar/supprimer-mon-compte"]')).not.toBeNull();
    expect(page.textContent).not.toContain('حذف حسابي');
  });

  it('l\'aide arabe renvoie vers la page de suppression arabe', () => {
    expect(aide('ar').lien?.vers).toBe('/ar/supprimer-mon-compte');
  });
});
