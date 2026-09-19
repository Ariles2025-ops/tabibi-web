import { expect, test } from '@playwright/test';
import {
  DemandeProfil,
  dateLocaleIso,
  libelleLangue,
  nettoyerProfil,
  validerProfil,
} from '../../src/app/moi/profil.formats';

/** Nettoyage et validation du profil avant envoi, coherents avec les regles du backend (400 sinon). */
const DEMANDE: DemandeProfil = {
  nomComplet: 'Amina Belkacem',
  telephone: '0550123456',
  dateNaissance: '1990-05-12',
  wilayaCode: '16',
  langue: 'fr',
};

/** 19 septembre 2026, heure locale. */
const AUJOURD_HUI = new Date(2026, 8, 19);

test.describe('nettoyerProfil', () => {
  test('retire les espaces, envoie null pour les facultatifs vides et fr pour la langue vide', () => {
    expect(
      nettoyerProfil({ nomComplet: '  Amina Belkacem ', telephone: '0550 12 34 56', dateNaissance: '', wilayaCode: ' ', langue: '' }),
    ).toEqual({ nomComplet: 'Amina Belkacem', telephone: '0550123456', dateNaissance: null, wilayaCode: null, langue: 'fr' });
    expect(nettoyerProfil({ nomComplet: 'A', telephone: null, dateNaissance: null, wilayaCode: null, langue: ' AR ' }).langue).toBe('ar');
  });
});

test.describe('validerProfil', () => {
  test('accepte un profil complet et un profil reduit au nom', () => {
    expect(validerProfil(DEMANDE, AUJOURD_HUI)).toBeNull();
    expect(validerProfil({ nomComplet: 'Li', telephone: null, dateNaissance: null, wilayaCode: null, langue: 'kab' }, AUJOURD_HUI)).toBeNull();
    expect(validerProfil({ ...DEMANDE, telephone: '021123456', dateNaissance: '2026-09-18' }, AUJOURD_HUI)).toBeNull();
  });

  test('exige un nom de 2 a 120 caracteres', () => {
    expect(validerProfil({ ...DEMANDE, nomComplet: 'A' }, AUJOURD_HUI)).toBe('Le nom complet doit compter de 2 à 120 caractères.');
    expect(validerProfil({ ...DEMANDE, nomComplet: 'A'.repeat(121) }, AUJOURD_HUI)).toContain('120 caractères');
    expect(validerProfil({ ...DEMANDE, nomComplet: 'A'.repeat(120) }, AUJOURD_HUI)).toBeNull();
  });

  test('exige un telephone algerien de 9 a 10 chiffres commencant par 0', () => {
    expect(validerProfil({ ...DEMANDE, telephone: '550123456' }, AUJOURD_HUI)).toContain('numéro algérien');
    expect(validerProfil({ ...DEMANDE, telephone: '05501234567' }, AUJOURD_HUI)).toContain('numéro algérien');
    expect(validerProfil({ ...DEMANDE, telephone: '05 50 12' }, AUJOURD_HUI)).toContain('numéro algérien');
  });

  test('exige une date de naissance passee et posterieure a 1900', () => {
    expect(validerProfil({ ...DEMANDE, dateNaissance: '2026-09-19' }, AUJOURD_HUI)).toBe('La date de naissance doit être dans le passé.');
    expect(validerProfil({ ...DEMANDE, dateNaissance: '2030-01-01' }, AUJOURD_HUI)).toBe('La date de naissance doit être dans le passé.');
    expect(validerProfil({ ...DEMANDE, dateNaissance: '1900-12-31' }, AUJOURD_HUI)).toBe('La date de naissance doit être postérieure à 1900.');
    expect(validerProfil({ ...DEMANDE, dateNaissance: 'hier' }, AUJOURD_HUI)).toBe('Indiquez une date de naissance valide.');
  });

  test('limite le code de wilaya a 4 caracteres et la langue a fr, ar, kab, en', () => {
    expect(validerProfil({ ...DEMANDE, wilayaCode: '16000' }, AUJOURD_HUI)).toBe('Le code de wilaya ne peut pas dépasser 4 caractères.');
    expect(validerProfil({ ...DEMANDE, langue: 'de' }, AUJOURD_HUI)).toBe("La langue doit être l'une de : fr, ar, kab, en.");
  });
});

test.describe('dateLocaleIso et libelleLangue', () => {
  test('formate une date locale en yyyy-MM-dd et traduit les codes de langue', () => {
    expect(dateLocaleIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(libelleLangue('fr')).toBe('Français');
    expect(libelleLangue('ar')).toBe('العربية');
    expect(libelleLangue('kab')).toBe('Taqbaylit');
    expect(libelleLangue('en')).toBe('English');
    expect(libelleLangue('de')).toBe('de');
    expect(libelleLangue(null)).toBe('');
  });
});
