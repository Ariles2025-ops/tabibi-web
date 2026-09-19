import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { REPONSE_SERVEUR, ReponseServeur } from '../seo/reponse-serveur';
import { SeoService } from '../seo/seo.service';
import { PageIntrouvableComponent } from './page-introuvable.component';

/** Route `**` : message, liens de sortie, titre « Page introuvable » et statut 404 transmis au serveur de rendu. */
describe('PageIntrouvableComponent', () => {
  let fixture: ComponentFixture<PageIntrouvableComponent>;
  let reponse: ReponseServeur;
  let seo: SeoService;

  beforeEach(() => {
    reponse = { statut: 200 };
    TestBed.configureTestingModule({
      imports: [PageIntrouvableComponent],
      providers: [provideRouter([]), { provide: REPONSE_SERVEUR, useValue: reponse }],
    });
    seo = TestBed.inject(SeoService);
    spyOn(seo, 'introuvable').and.callThrough();
    fixture = TestBed.createComponent(PageIntrouvableComponent);
    fixture.detectChanges();
  });

  it('affiche « Page introuvable » et les liens vers l annuaire et la verification', () => {
    const html: HTMLElement = fixture.nativeElement;
    expect(html.querySelector('h1')?.textContent).toBe('Page introuvable');
    const liens = Array.from(html.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(liens).toEqual(['/', '/verifier']);
  });

  it('declare la page introuvable au service SEO : titre, noindex et statut 404', () => {
    expect(seo.introuvable).toHaveBeenCalledOnceWith();
    expect(document.title).toBe('Page introuvable | Tabibi');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    expect(reponse.statut).toBe(404);
  });
});
