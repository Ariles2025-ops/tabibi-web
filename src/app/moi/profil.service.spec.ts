import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DemandeProfil, Profil, ProfilService, dateLocaleIso, libelleLangue, nettoyerProfil, validerProfil } from './profil.service';

const BASE = 'http://localhost:8080';

const DEMANDE: DemandeProfil = {
  nomComplet: 'Amina Belkacem',
  telephone: '0550123456',
  dateNaissance: '1990-05-12',
  wilayaCode: '16',
  langue: 'fr',
};

const PROFIL: Profil = {
  utilisateurId: 'u1',
  ...DEMANDE,
  misAJourLe: '2026-09-18T10:00:00Z',
};

describe('ProfilService', () => {
  let service: ProfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit mon profil sur GET /api/moi/profil', () => {
    let recu: Profil | undefined;
    service.monProfil().subscribe((p) => (recu = p));

    const requete = http.expectOne(`${BASE}/api/moi/profil`);
    expect(requete.request.method).toBe('GET');
    requete.flush(PROFIL);

    expect(recu).toEqual(PROFIL);
  });

  it('transmet le 404 tant que le profil n est pas renseigne', () => {
    let statut = 0;
    let message = '';
    service.monProfil().subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });

    http.expectOne(`${BASE}/api/moi/profil`).flush({ erreur: 'Profil non renseigne.' }, { status: 404, statusText: 'Not Found' });

    expect(statut).toBe(404);
    expect(message).toBe('Profil non renseigne.');
  });

  it('enregistre par PUT /api/moi/profil avec { nomComplet, telephone, dateNaissance, wilayaCode, langue }', () => {
    let recu: Profil | undefined;
    service.enregistrer(DEMANDE).subscribe((p) => (recu = p));

    const requete = http.expectOne(`${BASE}/api/moi/profil`);
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.body).toEqual(DEMANDE);
    requete.flush(PROFIL);

    expect(recu).toEqual(PROFIL);
  });

  it('transmet le { erreur } d un 400 (profil invalide)', () => {
    let statut = 0;
    let message = '';
    service.enregistrer({ ...DEMANDE, telephone: '12' }).subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });

    http.expectOne(`${BASE}/api/moi/profil`)
      .flush({ erreur: 'Le telephone doit etre un numero algerien de 9 a 10 chiffres commencant par 0 (ex. 0550123456).' }, { status: 400, statusText: 'Bad Request' });

    expect(statut).toBe(400);
    expect(message).toContain('numero algerien');
  });

  describe('nettoyerProfil', () => {
    it('retire les espaces, envoie null pour les facultatifs vides et fr pour la langue vide', () => {
      expect(nettoyerProfil({ nomComplet: '  Amina Belkacem ', telephone: '0550 12 34 56', dateNaissance: '', wilayaCode: ' ', langue: '' }))
        .toEqual({ nomComplet: 'Amina Belkacem', telephone: '0550123456', dateNaissance: null, wilayaCode: null, langue: 'fr' });
      expect(nettoyerProfil({ nomComplet: 'A', telephone: null, dateNaissance: null, wilayaCode: null, langue: ' AR ' }).langue).toBe('ar');
    });
  });

  describe('validerProfil', () => {
    const AUJOURD_HUI = new Date(2026, 8, 19); // 19 septembre 2026, heure locale

    it('accepte un profil complet et un profil reduit au nom', () => {
      expect(validerProfil(DEMANDE, AUJOURD_HUI)).toBeNull();
      expect(validerProfil({ nomComplet: 'Li', telephone: null, dateNaissance: null, wilayaCode: null, langue: 'kab' }, AUJOURD_HUI)).toBeNull();
      expect(validerProfil({ ...DEMANDE, telephone: '021123456', dateNaissance: '2026-09-18' }, AUJOURD_HUI)).toBeNull();
    });

    it('exige un nom de 2 a 120 caracteres', () => {
      expect(validerProfil({ ...DEMANDE, nomComplet: 'A' }, AUJOURD_HUI)).toBe('Le nom complet doit compter de 2 à 120 caractères.');
      expect(validerProfil({ ...DEMANDE, nomComplet: 'A'.repeat(121) }, AUJOURD_HUI)).toContain('120 caractères');
      expect(validerProfil({ ...DEMANDE, nomComplet: 'A'.repeat(120) }, AUJOURD_HUI)).toBeNull();
    });

    it('exige un telephone algerien de 9 a 10 chiffres commencant par 0', () => {
      expect(validerProfil({ ...DEMANDE, telephone: '550123456' }, AUJOURD_HUI)).toContain('numéro algérien');
      expect(validerProfil({ ...DEMANDE, telephone: '05501234567' }, AUJOURD_HUI)).toContain('numéro algérien');
      expect(validerProfil({ ...DEMANDE, telephone: '05 50 12' }, AUJOURD_HUI)).toContain('numéro algérien');
    });

    it('exige une date de naissance passee et posterieure a 1900', () => {
      expect(validerProfil({ ...DEMANDE, dateNaissance: '2026-09-19' }, AUJOURD_HUI)).toBe('La date de naissance doit être dans le passé.');
      expect(validerProfil({ ...DEMANDE, dateNaissance: '2030-01-01' }, AUJOURD_HUI)).toBe('La date de naissance doit être dans le passé.');
      expect(validerProfil({ ...DEMANDE, dateNaissance: '1900-12-31' }, AUJOURD_HUI)).toBe('La date de naissance doit être postérieure à 1900.');
      expect(validerProfil({ ...DEMANDE, dateNaissance: 'hier' }, AUJOURD_HUI)).toBe('Indiquez une date de naissance valide.');
    });

    it('limite le code de wilaya a 4 caracteres et la langue a fr, ar, kab, en', () => {
      expect(validerProfil({ ...DEMANDE, wilayaCode: '16000' }, AUJOURD_HUI)).toBe('Le code de wilaya ne peut pas dépasser 4 caractères.');
      expect(validerProfil({ ...DEMANDE, langue: 'de' }, AUJOURD_HUI)).toBe("La langue doit être l'une de : fr, ar, kab, en.");
    });
  });

  it('formate une date locale en yyyy-MM-dd et traduit les codes de langue', () => {
    expect(dateLocaleIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(libelleLangue('fr')).toBe('Français');
    expect(libelleLangue('ar')).toBe('العربية');
    expect(libelleLangue('kab')).toBe('Taqbaylit');
    expect(libelleLangue('en')).toBe('English');
    expect(libelleLangue('de')).toBe('de');
    expect(libelleLangue(null)).toBe('');
  });
});
