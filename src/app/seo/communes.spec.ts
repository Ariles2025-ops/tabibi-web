import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AnnuaireSeoComponent } from './annuaire-seo.component';
import { communesDe, slugCommune } from './communes';
import { REPONSE_HTTP } from './statut-http';

const med = (id: number, ville: string): Medecin => ({
  id: String(id), nomComplet: `Dr Test ${id}`, specialiteSlug: 'pediatre', specialiteFr: 'Pédiatre',
  wilayaCode: '16', wilayaFr: 'Alger', ville,
});

describe('communes', () => {
  it('slug : minuscules, sans accents, tirets', () => {
    expect(slugCommune('Bab Ezzouar')).toBe('bab-ezzouar');
    expect(slugCommune('  ÉL-Biar ')).toBe('el-biar');
    expect(slugCommune('')).toBe('');
    expect(slugCommune(null)).toBe('');
  });

  it('regroupe « Alger » / « ALGER », ignore ville = wilaya et vide, seuil de 3 praticiens', () => {
    const liste = [
      ...[1, 2, 3].map((i) => med(i, i === 2 ? 'BAB EZZOUAR' : 'Bab Ezzouar')),
      med(4, 'Staoueli'), med(5, 'Staoueli'),
      med(6, 'ALGER'), med(7, 'Alger'), med(8, 'Alger'), med(9, ''),
    ];
    const c = communesDe(liste, 'alger', ['Alger']);
    expect(c.map((x) => x.slug)).toEqual(['bab-ezzouar']);
    expect(c[0].nom).toBe('Bab Ezzouar');
    expect(c[0].medecins).toBe(3);
  });
});

describe('Page commune', () => {
  let reponse: { status: jasmine.Spy };
  function creer(commune: string, liste: Medecin[]) {
    reponse = { status: jasmine.createSpy('status') };
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['rechercher', 'communes']);
    annuaire.rechercher.and.returnValue(of(liste));
    annuaire.communes.and.returnValue(of([{ slug: 'bab-ezzouar', nom: 'Bab Ezzouar', nombre: 8 }]));
    TestBed.configureTestingModule({
      imports: [AnnuaireSeoComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} }, paramMap: of(convertToParamMap({ specialite: 'pediatre', wilaya: 'alger', commune })) } },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: REPONSE_HTTP, useValue: reponse },
      ],
    });
    const f = TestBed.createComponent(AnnuaireSeoComponent);
    f.detectChanges();
    return f;
  }

  it('>= 3 praticiens : 200, titre, liste, JSON-LD ItemList', () => {
    const f = creer('bab-ezzouar', [1, 2, 3].map((i) => med(i, 'Bab Ezzouar')));
    expect(reponse.status).not.toHaveBeenCalled();
    expect(f.componentInstance.titre).toBe('Pédiatre à Bab Ezzouar (Alger)');
    expect(document.title).toContain('Pédiatre à Bab Ezzouar (Alger) — prendre rendez-vous | Ndawik');
    expect(f.nativeElement.querySelectorAll('.seo-med').length).toBe(3);
    const graphe = JSON.parse(document.head.querySelector('script#ld-page')!.textContent!)['@graph'] as { '@type': string }[];
    const ld = graphe.find((n) => n['@type'] === 'ItemList') as unknown as { itemListElement: { item: { address: { addressLocality: string } } }[] };
    expect(ld.itemListElement.length).toBe(3);
    expect(ld.itemListElement[0].item.address.addressLocality).toBe('Bab Ezzouar');
  });

  it('< 3 praticiens ou commune inconnue : 404', () => {
    creer('staoueli', [1, 2].map((i) => med(i, 'Staoueli')));
    expect(reponse.status).toHaveBeenCalledWith(404);
    TestBed.resetTestingModule();
    creer('nimporte-quoi', [1, 2, 3].map((i) => med(i, 'Bab Ezzouar')));
    expect(reponse.status).toHaveBeenCalledWith(404);
  });
});
