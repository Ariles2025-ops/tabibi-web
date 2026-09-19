import { expect, test } from '@playwright/test';
import { libelleRappels, libelleStatutCandidature } from '../../src/app/admin/admin.formats';
import { LONGUEUR_MAX_COMMENTAIRE, NOTE_MAX, NOTE_MIN, formaterMoyenne, libelleStatutAvis } from '../../src/app/avis/avis.formats';
import { formaterPrix, libelleReponses, libelleStatutBesoin } from '../../src/app/dawini/dawini.formats';
import { LONGUEUR_MAX_MESSAGE, abregerIdentifiant } from '../../src/app/messagerie/messagerie.formats';
import { libelleStatutOrdonnance } from '../../src/app/ordonnances/statut-ordonnance';
import { libelleStatutRendezVous } from '../../src/app/rendezvous/statut-rendez-vous';
import { DUREE_MAX_MINUTES, DUREE_MIN_MINUTES, estUuid } from '../../src/app/secretaire/secretaire.formats';
import { libelleStatutTeleconsultation } from '../../src/app/teleconsultation/statut-teleconsultation';
import { Teleconsultation, salleAccessible } from '../../src/app/teleconsultation/teleconsultation.formats';

/**
 * Libelles, formats, bornes et validations partages par les services : fonctions pures, francais par defaut
 * (les memes fonctions recoivent la fonction de traduction de la langue courante dans l'application). Leur
 * affichage reel est verifie ecran par ecran dans le projet `navigateur`.
 */

test.describe('Libelles de statut', () => {
  test('avis : statuts connus, statut inconnu tel quel, rien sans statut', () => {
    expect(libelleStatutAvis('PUBLIE')).toBe('Publié');
    expect(libelleStatutAvis('SIGNALE')).toBe('Signalé');
    expect(libelleStatutAvis('MASQUE')).toBe('Masqué');
    expect(libelleStatutAvis('ARCHIVE')).toBe('ARCHIVE');
    expect(libelleStatutAvis(null)).toBe('');
  });

  test('candidature : statuts connus, statut inconnu tel quel, rien sans statut', () => {
    expect(libelleStatutCandidature('EN_ATTENTE')).toBe('En attente');
    expect(libelleStatutCandidature('VALIDEE')).toBe('Validée');
    expect(libelleStatutCandidature('REFUSEE')).toBe('Refusée');
    expect(libelleStatutCandidature('ARCHIVEE')).toBe('ARCHIVEE');
    expect(libelleStatutCandidature(null)).toBe('');
  });

  test('besoin Dawini : ouverte, cloturee, statut inconnu tel quel', () => {
    expect(libelleStatutBesoin('OUVERT')).toBe('Ouverte');
    expect(libelleStatutBesoin('CLOTURE')).toBe('Clôturée');
    expect(libelleStatutBesoin('ARCHIVE')).toBe('ARCHIVE');
    expect(libelleStatutBesoin(null)).toBe('');
  });

  test('teleconsultation : statuts connus, statut inconnu tel quel, rien sans statut', () => {
    expect(libelleStatutTeleconsultation('PLANIFIEE')).toBe('Planifiée');
    expect(libelleStatutTeleconsultation('EN_COURS')).toBe('En cours');
    expect(libelleStatutTeleconsultation('TERMINEE')).toBe('Terminée');
    expect(libelleStatutTeleconsultation('ANNULEE')).toBe('Annulée');
    expect(libelleStatutTeleconsultation('REPORTEE')).toBe('REPORTEE');
    expect(libelleStatutTeleconsultation(null)).toBe('');
    expect(libelleStatutTeleconsultation(undefined)).toBe('');
  });

  test('rendez-vous et ordonnance : statuts connus et statut inconnu tel quel', () => {
    expect(libelleStatutRendezVous('CONFIRME')).toBe('Confirmé');
    expect(libelleStatutRendezVous('RESERVE')).toBe('Réservé');
    expect(libelleStatutRendezVous('HONORE')).toBe('Honoré');
    expect(libelleStatutRendezVous('ANNULE')).toBe('Annulé');
    expect(libelleStatutRendezVous('REPORTE')).toBe('REPORTE');

    expect(libelleStatutOrdonnance('EMISE')).toBe('Émise');
    expect(libelleStatutOrdonnance('DELIVREE')).toBe('Délivrée');
    expect(libelleStatutOrdonnance('ANNULEE')).toBe('Annulée');
    expect(libelleStatutOrdonnance('EXPIREE')).toBe('Expirée');
    expect(libelleStatutOrdonnance('ARCHIVEE')).toBe('ARCHIVEE');
    expect(libelleStatutOrdonnance(null)).toBe('');
  });
});

test.describe('Formats et compteurs', () => {
  test('moyenne des avis : virgule decimale, sur 5, nombre d avis ; sinon « Aucun avis pour le moment »', () => {
    expect(formaterMoyenne(4.5, 12)).toBe('4,5 / 5 (12 avis)');
    expect(formaterMoyenne(5, 1)).toBe('5,0 / 5 (1 avis)');
    expect(formaterMoyenne(3.75, 4)).toBe('3,8 / 5 (4 avis)');
    expect(formaterMoyenne(null, 0)).toBe('Aucun avis pour le moment');
    expect(formaterMoyenne(4, 0)).toBe('Aucun avis pour le moment');
  });

  test('prix Dawini : dinars, milliers separes, rien sans prix', () => {
    expect(formaterPrix(850)).toBe('850 DA');
    expect(formaterPrix(1250)).toBe('1 250 DA');
    expect(formaterPrix(0)).toBe('0 DA');
    expect(formaterPrix(null)).toBe('');
    expect(formaterPrix(undefined)).toBe('');
  });

  test('accords : reponses Dawini et rappels de l administration', () => {
    expect(libelleReponses(0)).toBe('0 réponse');
    expect(libelleReponses(1)).toBe('1 réponse');
    expect(libelleReponses(3)).toBe('3 réponses');

    expect(libelleRappels(0)).toBe('0 rappel envoyé');
    expect(libelleRappels(1)).toBe('1 rappel envoyé');
    expect(libelleRappels(3)).toBe('3 rappels envoyés');
  });

  test('identifiant abrege a huit caracteres', () => {
    expect(abregerIdentifiant('22222222-2222-2222-2222-222222222222')).toBe('22222222');
    expect(abregerIdentifiant('p1')).toBe('p1');
  });
});

test.describe('Bornes du domaine (memes regles que le backend)', () => {
  test('avis, message et duree de creneau', () => {
    expect(NOTE_MIN).toBe(1);
    expect(NOTE_MAX).toBe(5);
    expect(LONGUEUR_MAX_COMMENTAIRE).toBe(500);
    expect(LONGUEUR_MAX_MESSAGE).toBe(2000);
    expect(DUREE_MIN_MINUTES).toBe(5);
    expect(DUREE_MAX_MINUTES).toBe(120);
  });

  test('estUuid reconnait un sujet de jeton Keycloak, quelle que soit la casse', () => {
    expect(estUuid('55555555-5555-5555-5555-555555555555')).toBe(true);
    expect(estUuid('3F2504E0-4F89-11D3-9A0C-0305E82C3301')).toBe(true);
    expect(estUuid('secretaire.demo')).toBe(false);
    expect(estUuid('55555555-5555-5555-5555')).toBe(false);
    expect(estUuid('')).toBe(false);
  });
});

test.describe('salleAccessible', () => {
  const PLANIFIEE: Teleconsultation = {
    id: 't1',
    rendezVousId: 'r1',
    patientId: 'p1',
    medecinId: 'm1',
    statut: 'PLANIFIEE',
    consentementPatientLe: null,
    lienSalle: null,
    creeLe: '2026-09-18T10:00:00Z',
    demarreeLe: null,
    termineeLe: null,
  };
  const CONSENTIE: Teleconsultation = {
    ...PLANIFIEE,
    consentementPatientLe: '2026-09-18T10:05:00Z',
    lienSalle: 'https://meet.jit.si/tabibi-0123456789abcdef0123456789abcdef',
  };

  test('exige un lien de salle et un statut planifiee ou en cours', () => {
    expect(salleAccessible(PLANIFIEE)).toBe(false);
    expect(salleAccessible(CONSENTIE)).toBe(true);
    expect(salleAccessible({ ...CONSENTIE, statut: 'EN_COURS' })).toBe(true);
    expect(salleAccessible({ ...CONSENTIE, statut: 'TERMINEE' })).toBe(false);
    expect(salleAccessible({ ...CONSENTIE, statut: 'ANNULEE' })).toBe(false);
    expect(salleAccessible({ ...CONSENTIE, lienSalle: '' })).toBe(false);
  });
});
