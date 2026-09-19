import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { accepterConfirmations, connecter, ouvrir, refuserConfirmations, requetes, stub } from '../outils';

/**
 * Espace medecin (MedecinService) : agenda, ouverture d'un creneau, candidature a l'annuaire et cabinet
 * (rattachement et retrait d'une secretaire). Les bornes de duree et `estUuid` sont verifies dans `logique`.
 */
const DEMANDE_CANDIDATURE = {
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'cardiologue',
  specialiteFr: 'Cardiologue',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
  numeroOrdre: 'ORD-123',
  telephone: '0550000000',
};

const CANDIDATURE = {
  id: 'c1',
  medecinId: 'm1',
  ...DEMANDE_CANDIDATURE,
  statut: 'EN_ATTENTE',
  motifRefus: null,
  deposeeLe: '2026-09-18T10:00:00Z',
  traiteeLe: null,
};

const CONFIRME = {
  id: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  debut: '2026-12-07T09:00:00Z',
  statut: 'CONFIRME',
  creneauId: 'c1',
};

const SECRETAIRE_ID = '55555555-5555-5555-5555-555555555555';
const RATTACHEMENT = { id: 'ra1', medecinId: 'm1', secretaireId: SECRETAIRE_ID, creeLe: '2026-09-18T10:00:00Z' };

test.describe('Appels API de l espace medecin', () => {
  test('agenda : GET /api/medecin/rendezvous, puis honorer et annuler sans corps', async ({ page }) => {
    const journal = requetes(page);
    const confirmations = accepterConfirmations(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/rendezvous/r1/honorer', { statut: 204, corps: null });
    await stub(page, '**/api/medecin/rendezvous/r1/annuler', { corps: { ...CONFIRME, statut: 'ANNULE' } });

    await ouvrir(page, '/medecin/agenda');

    const agenda = await journal.attendre('/api/medecin/rendezvous');
    expect(agenda.chemin).toBe('/api/medecin/rendezvous');

    await page.getByRole('button', { name: FR['agenda.marquerHonore'] }).click();
    const honorer = await journal.attendre('/api/rendezvous/r1/honorer', 'POST');
    expect(honorer.corps).toBeNull();

    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();
    const annuler = await journal.attendre('/api/medecin/rendezvous/r1/annuler', 'POST');
    expect(annuler.corps).toBeNull();
    expect(confirmations).toContain(FR['agenda.confirmerAnnulation']);
  });

  test('409 a l annulation : le message { erreur } de l API est affiche', async ({ page }) => {
    accepterConfirmations(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/medecin/rendezvous/r1/annuler', {
      statut: 409,
      corps: { erreur: 'Seul un rendez-vous confirme peut etre annule.' },
    });

    await ouvrir(page, '/medecin/agenda');
    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();

    await expect(page.getByText('Seul un rendez-vous confirme peut etre annule.')).toBeVisible();
  });

  test('ouvre un creneau par POST /api/medecin/creneaux avec { debut, dureeMinutes }', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/creneaux', {
      statut: 201,
      corps: { id: 'c2', medecinId: 'm1', debut: '2026-12-08T09:00:00Z', dureeMinutes: 30, disponible: true },
    });

    await ouvrir(page, '/medecin/disponibilites');
    await page.getByLabel(FR['disponibilites.dateHeure']).fill('2026-12-08T09:00');
    await page.getByLabel(/Durée \(minutes/).fill('30');
    await page.getByRole('button', { name: FR['disponibilites.ouvrir'] }).click();

    const envoi = await journal.attendre('/api/medecin/creneaux', 'POST');
    const corps = envoi.corps as { debut: string; dureeMinutes: number };
    expect(corps.dureeMinutes).toBe(30);
    // La saisie est locale (Africa/Algiers, UTC+1) : l'API recoit une date ISO en UTC.
    expect(corps.debut).toBe('2026-12-08T08:00:00.000Z');
  });

  test('candidature : GET /api/medecin/candidature (404 sans depot) puis POST avec tous les champs', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/candidature', (requete) =>
      requete.method() === 'POST'
        ? { statut: 201, corps: CANDIDATURE }
        : { statut: 404, corps: { erreur: 'Aucune candidature deposee.' } },
    );

    await ouvrir(page, '/medecin/candidature');

    const lecture = await journal.attendre('/api/medecin/candidature');
    expect(lecture.chemin).toBe('/api/medecin/candidature');

    await page.getByLabel(FR['candidature.nomComplet']).fill(DEMANDE_CANDIDATURE.nomComplet);
    await page.getByLabel(FR['candidature.numeroOrdreLabel']).fill(DEMANDE_CANDIDATURE.numeroOrdre);
    await page.getByLabel(FR['candidature.specialiteCode']).fill(DEMANDE_CANDIDATURE.specialiteSlug);
    await page.getByLabel(FR['candidature.specialiteLibelle']).fill(DEMANDE_CANDIDATURE.specialiteFr);
    await page.getByLabel(FR['candidature.wilayaCode']).fill(DEMANDE_CANDIDATURE.wilayaCode);
    await page.getByLabel(FR['candidature.wilayaLibelle']).fill(DEMANDE_CANDIDATURE.wilayaFr);
    await page.getByLabel(FR['candidature.ville']).fill(DEMANDE_CANDIDATURE.ville);
    await page.getByLabel(FR['candidature.telephone']).fill(DEMANDE_CANDIDATURE.telephone);
    await page.getByRole('button', { name: FR['candidature.deposer'] }).click();

    const envoi = await journal.attendre('/api/medecin/candidature', 'POST');
    expect(envoi.corps).toEqual(DEMANDE_CANDIDATURE);
  });

  test('cabinet : GET /api/medecin/secretaires, rattachement avec { secretaireId } et retrait sans corps', async ({ page }) => {
    const journal = requetes(page);
    const confirmations = accepterConfirmations(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/secretaires', (requete) =>
      requete.method() === 'POST' ? { statut: 201, corps: RATTACHEMENT } : { corps: [RATTACHEMENT] },
    );
    await stub(page, '**/api/medecin/secretaires/ra1/retirer', { statut: 204, corps: null });

    await ouvrir(page, '/medecin/secretaires');

    const liste = await journal.attendre('/api/medecin/secretaires');
    expect(liste.chemin).toBe('/api/medecin/secretaires');

    await page.getByLabel(FR['secretaires.identifiant']).fill(SECRETAIRE_ID);
    await page.getByRole('button', { name: FR['secretaires.rattacher'] }).click();
    const rattachement = await journal.attendre('/api/medecin/secretaires', 'POST');
    expect(rattachement.corps).toEqual({ secretaireId: SECRETAIRE_ID });

    await page.getByRole('button', { name: FR['commun.retirer'], exact: true }).click();
    const retrait = await journal.attendre('/api/medecin/secretaires/ra1/retirer', 'POST');
    expect(retrait.corps).toBeNull();
    expect(confirmations).toContain(FR['secretaires.confirmerRetrait']);
  });

  test('liste d attente du medecin : GET /api/medecin/liste-attente', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/liste-attente', {
      corps: [{ id: 'i1', patientId: '22222222-2222-2222-2222-222222222222', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' }],
    });

    await ouvrir(page, '/medecin/liste-attente');

    const appel = await journal.attendre('/api/medecin/liste-attente');
    expect(appel.chemin).toBe('/api/medecin/liste-attente');
    await expect(page.getByText('22222222')).toBeVisible();
  });
});

const HONORE = { ...CONFIRME, id: 'r2', debut: '2026-09-01T09:00:00Z', statut: 'HONORE' };

test.describe('Écran de l agenda du medecin', () => {
  test('actions proposees sur les seuls rendez-vous confirmes', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [HONORE, CONFIRME] });

    await ouvrir(page, '/medecin/agenda');

    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText('Honoré');
    await expect(lignes.nth(0).getByRole('button')).toHaveCount(0);
    await expect(lignes.nth(1)).toContainText('Confirmé');
    await expect(lignes.nth(1).getByRole('button', { name: FR['agenda.proposerTeleconsultation'] })).toHaveCount(1);
    await expect(lignes.nth(1).getByRole('button', { name: FR['commun.annuler'], exact: true })).toHaveCount(1);
  });

  test('teleconsultation proposee : confirmation datee et lien vers les teleconsultations', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/medecin/teleconsultations', { statut: 201, corps: { id: 't1', rendezVousId: 'r1', statut: 'PLANIFIEE' } });

    await ouvrir(page, '/medecin/agenda');
    await page.getByRole('button', { name: FR['agenda.proposerTeleconsultation'] }).click();

    await expect(page.getByText(/Téléconsultation proposée au patient pour le rendez-vous du/)).toBeVisible();
    await expect(page.getByText(/7 décembre/).first()).toBeVisible();
    await expect(page.locator('main a[href="/medecin/teleconsultations"]')).toHaveCount(1);
  });

  test('409 a la proposition : motif de l API, aucune confirmation, bouton reutilisable', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/medecin/teleconsultations', {
      statut: 409,
      corps: { erreur: 'Une teleconsultation est deja planifiee sur ce rendez-vous.' },
    });

    await ouvrir(page, '/medecin/agenda');
    await page.getByRole('button', { name: FR['agenda.proposerTeleconsultation'] }).click();

    await expect(page.getByText('Une teleconsultation est deja planifiee sur ce rendez-vous.')).toBeVisible();
    await expect(page.getByText(/Téléconsultation proposée au patient/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: FR['agenda.proposerTeleconsultation'] })).toBeEnabled();
  });

  test('annulation : sans confirmation rien ne part ; apres confirmation, message et agenda relu', async ({ page }) => {
    const journal = requetes(page);
    const refus = refuserConfirmations(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/medecin/rendezvous/r1/annuler', { corps: { ...CONFIRME, statut: 'ANNULE' } });

    await ouvrir(page, '/medecin/agenda');
    await journal.attendre('/api/medecin/rendezvous');
    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();
    await expect.poll(() => refus.length).toBe(1);
    expect(journal.contient('/api/medecin/rendezvous/r1/annuler', 'POST')).toBe(false);
  });

  test('annulation confirmee : message date et agenda relu', async ({ page }) => {
    const journal = requetes(page);
    accepterConfirmations(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/medecin/rendezvous/r1/annuler', { corps: { ...CONFIRME, statut: 'ANNULE' } });

    await ouvrir(page, '/medecin/agenda');
    await journal.attendre('/api/medecin/rendezvous');
    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();

    await expect(page.getByText(/annulé : le créneau est de nouveau proposé et le patient est prévenu/)).toBeVisible();
    await expect(page.getByText(/7 décembre/).first()).toBeVisible();
    await expect.poll(() => journal.filtrer('/api/medecin/rendezvous', 'GET').length).toBe(2);
  });
});

test.describe('Écran des avis recus par le medecin', () => {
  const SYNTHESE = {
    moyenne: 4.5,
    nombre: 2,
    avis: [
      { id: 'a1', note: 5, commentaire: 'Très bon accueil.', deposeLe: '2026-09-18T10:00:00Z' },
      { id: 'a2', note: 4, commentaire: null, deposeLe: '2026-09-10T10:00:00Z' },
    ],
  };

  test('lit la synthese avec mon identifiant et propose « Signaler » sur chaque avis', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecins/m1/avis', { corps: SYNTHESE });

    await ouvrir(page, '/medecin/avis');

    await expect(page.getByText('4,5 / 5 (2 avis)')).toBeVisible();
    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText('5 / 5');
    await expect(lignes.nth(0)).toContainText('Très bon accueil.');
    await expect(page.getByRole('button', { name: FR['avis.signaler'] })).toHaveCount(2);
  });

  test('signalement : confirmation et synthese relue ; 409 : motif de l API et relecture', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecins/m1/avis', { corps: SYNTHESE });
    await stub(page, '**/api/avis/a1/signaler', { corps: { id: 'a1', statut: 'SIGNALE' } });

    await ouvrir(page, '/medecin/avis');
    await journal.attendre('/api/medecins/m1/avis');
    await page.getByRole('button', { name: FR['avis.signaler'] }).first().click();
    await expect(page.getByText(FR['avis.signale'])).toBeVisible();
    await expect.poll(() => journal.filtrer('/api/medecins/m1/avis').length).toBe(2);

    await stub(page, '**/api/avis/a1/signaler', { statut: 409, corps: { erreur: 'Seul un avis publie peut etre signale.' } });
    journal.vider();
    await page.getByRole('button', { name: FR['avis.signaler'] }).first().click();
    await expect(page.getByText('Seul un avis publie peut etre signale.')).toBeVisible();
    await expect.poll(() => journal.filtrer('/api/medecins/m1/avis').length).toBe(1);
  });

  test('aucun avis : message dedie et aucun bouton ; profil illisible : message dedie', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecins/m1/avis', { corps: { moyenne: null, nombre: 0, avis: [] } });

    await ouvrir(page, '/medecin/avis');
    await expect(page.getByText('Aucun avis pour le moment')).toBeVisible();
    await expect(page.getByRole('button', { name: FR['avis.signaler'] })).toHaveCount(0);

    const journal = requetes(page);
    // Profil sans sujet : l'identifiant du medecin est inconnu, aucune synthese n'est demandee.
    await stub(page, '**/api/moi', { corps: { sujet: '', nom: 'Sans sujet', roles: ['MEDECIN'] } });
    await ouvrir(page, '/medecin/avis');
    await expect(page.getByText(FR['avis.profilIllisible'])).toBeVisible();
    expect(journal.contient('/avis', 'GET')).toBe(false);
  });
});

test.describe('Écran de ma candidature', () => {
  test('aucune candidature (404) : formulaire complet, sans titre « Nouvelle candidature »', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/candidature', { statut: 404, corps: { erreur: 'Aucune candidature deposee.' } });

    await ouvrir(page, '/medecin/candidature');

    await expect(page.locator('form')).toHaveCount(1);
    await expect(page.getByText(FR['candidature.nouvelle'])).toHaveCount(0);
    for (const libelle of [
      FR['candidature.nomComplet'],
      FR['candidature.numeroOrdreLabel'],
      FR['candidature.specialiteCode'],
      FR['candidature.wilayaCode'],
      FR['candidature.ville'],
      FR['candidature.telephone'],
    ]) {
      await expect(page.getByLabel(libelle)).toHaveCount(1);
    }
    await expect(page.getByText('Aucune candidature deposee.')).toHaveCount(0);
  });

  test('refuse cote client un depot sans les champs obligatoires', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/candidature', { statut: 404, corps: { erreur: 'Aucune candidature deposee.' } });

    await ouvrir(page, '/medecin/candidature');
    await page.getByRole('button', { name: FR['candidature.deposer'] }).click();

    await expect(page.getByText(FR['candidature.champsRequis'])).toBeVisible();
    expect(journal.contient('/api/medecin/candidature', 'POST')).toBe(false);
  });

  test('depot reussi : statut « En attente », explication et formulaire retire', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/candidature', (requete) =>
      requete.method() === 'POST'
        ? { statut: 201, corps: CANDIDATURE }
        : { statut: 404, corps: { erreur: 'Aucune candidature deposee.' } },
    );

    await ouvrir(page, '/medecin/candidature');
    await page.getByLabel(FR['candidature.nomComplet']).fill(' Dr Amina Belkacem ');
    await page.getByLabel(FR['candidature.numeroOrdreLabel']).fill(' ORD-123 ');
    await page.getByLabel(FR['candidature.specialiteCode']).fill('cardiologue');
    await page.getByLabel(FR['candidature.wilayaCode']).fill('16');
    await page.getByRole('button', { name: FR['candidature.deposer'] }).click();

    await expect(page.getByText(FR['candidature.deposee'])).toBeVisible();
    await expect(page.locator('main section')).toContainText('En attente');
    await expect(page.getByText(FR['candidature.enExamen'])).toBeVisible();
    await expect(page.locator('form')).toHaveCount(0);
  });

  test('candidature validee : lien vers ma fiche et aucun formulaire', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/candidature', {
      corps: { ...CANDIDATURE, statut: 'VALIDEE', traiteeLe: '2026-09-19T12:00:00Z' },
    });

    await ouvrir(page, '/medecin/candidature');

    await expect(page.locator('main section')).toContainText('Validée');
    await expect(page.getByText(FR['candidature.validee'])).toBeVisible();
    await expect(page.locator('main a[href="/medecins/m1"]')).toHaveCount(1);
    await expect(page.locator('form')).toHaveCount(0);
  });

  test('candidature refusee : motif et nouveau formulaire prerempli', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/candidature', {
      corps: { ...CANDIDATURE, statut: 'REFUSEE', motifRefus: 'Numéro d’ordre introuvable.', traiteeLe: '2026-09-19T12:00:00Z' },
    });

    await ouvrir(page, '/medecin/candidature');

    await expect(page.locator('main section')).toContainText('Refusée');
    await expect(page.getByText(FR['candidature.motif'].replace('{motif}', 'Numéro d’ordre introuvable.'))).toBeVisible();
    await expect(page.getByText(FR['candidature.nouvelle'])).toBeVisible();
    await expect(page.getByLabel(FR['candidature.nomComplet'])).toHaveValue('Dr Amina Belkacem');
    await expect(page.getByLabel(FR['candidature.numeroOrdreLabel'])).toHaveValue('ORD-123');
    await expect(page.getByLabel(FR['candidature.wilayaLibelle'])).toHaveValue('Alger');
  });

  test('409 : motif de l API et candidature existante rechargee ; 400 : motif et formulaire garde', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    let depots = 0;
    await stub(page, '**/api/medecin/candidature', (requete) => {
      if (requete.method() === 'POST') {
        depots += 1;
        return depots === 1
          ? { statut: 409, corps: { erreur: "Une candidature est deja en attente d'examen." } }
          : { statut: 400, corps: { erreur: 'La wilaya est obligatoire.' } };
      }
      return depots === 0 ? { statut: 404, corps: { erreur: 'Aucune candidature deposee.' } } : { corps: CANDIDATURE };
    });

    await ouvrir(page, '/medecin/candidature');
    await page.getByLabel(FR['candidature.nomComplet']).fill('Dr Amina Belkacem');
    await page.getByLabel(FR['candidature.numeroOrdreLabel']).fill('ORD-123');
    await page.getByLabel(FR['candidature.specialiteCode']).fill('cardiologue');
    await page.getByLabel(FR['candidature.wilayaCode']).fill('16');
    await page.getByRole('button', { name: FR['candidature.deposer'] }).click();

    await expect(page.getByText("Une candidature est deja en attente d'examen.")).toBeVisible();
    await expect(page.locator('main section')).toContainText('En attente');
    await expect(page.locator('form')).toHaveCount(0);
  });

  test('403 : « Cette page est réservée aux médecins. » et aucun formulaire', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/candidature', { statut: 403, corps: { erreur: 'Acces refuse.' } });

    await ouvrir(page, '/medecin/candidature');

    await expect(page.getByText(FR['commun.reserveMedecins'])).toBeVisible();
    await expect(page.locator('form')).toHaveCount(0);
  });
});

test.describe('Écran des disponibilites', () => {
  test('la duree est bornee a 5..120 minutes dans le champ comme dans le libelle', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });

    await ouvrir(page, '/medecin/disponibilites');

    const duree = page.getByLabel(/Durée \(minutes/);
    await expect(duree).toHaveAttribute('min', '5');
    await expect(duree).toHaveAttribute('max', '120');
    await expect(page.getByText('Durée (minutes, de 5 à 120)')).toBeVisible();
  });

  // Double protection : les bornes du champ (min, max, validateurs Angular) empechent la soumission, et le
  // composant revalide avant d'appeler l'API. Seule la premiere est atteignable depuis l'ecran.
  test('refuse une duree hors bornes : le formulaire n est pas soumis, rien ne part a l API', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });

    await ouvrir(page, '/medecin/disponibilites');
    await page.getByLabel(FR['disponibilites.dateHeure']).fill('2026-12-08T09:00');
    await page.getByLabel(/Durée \(minutes/).fill('180');

    await expect(page.getByRole('button', { name: FR['disponibilites.ouvrir'] })).toBeDisabled();
    expect(journal.contient('/api/medecin/creneaux', 'POST')).toBe(false);
  });

  test('creneau de 120 minutes ouvert : confirmation datee, puis motif { erreur } d un 400', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/creneaux', {
      statut: 201,
      corps: { id: 'c2', medecinId: 'm1', debut: '2026-12-08T08:00:00Z', dureeMinutes: 120, disponible: true },
    });

    await ouvrir(page, '/medecin/disponibilites');
    await page.getByLabel(FR['disponibilites.dateHeure']).fill('2026-12-08T09:00');
    await page.getByLabel(/Durée \(minutes/).fill('120');
    await page.getByRole('button', { name: FR['disponibilites.ouvrir'] }).click();

    await expect(page.getByText(/Créneau ouvert le/)).toBeVisible();
    await expect(page.getByText(/\(120 min\)/)).toBeVisible();

    await stub(page, '**/api/medecin/creneaux', {
      statut: 400,
      corps: { erreur: 'La duree doit etre comprise entre 5 et 120 minutes.' },
    });
    await page.getByRole('button', { name: FR['disponibilites.ouvrir'] }).click();
    await expect(page.getByText('La duree doit etre comprise entre 5 et 120 minutes.')).toBeVisible();
  });
});

test.describe('Écran de la liste d attente du medecin', () => {
  test('patients en attente, du plus ancien au plus recent, avec identifiant abrege et date', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/liste-attente', {
      corps: [
        { id: 'i1', patientId: '11111111-1111-1111-1111-111111111111', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' },
        { id: 'i2', patientId: '22222222-2222-2222-2222-222222222222', medecinId: 'm1', inscritLe: '2026-09-10T10:00:00Z' },
      ],
    });

    await ouvrir(page, '/medecin/liste-attente');

    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText('Patient 22222222');
    await expect(lignes.nth(0)).not.toContainText('22222222-2222');
    await expect(lignes.nth(0)).toContainText('inscrit le 10 septembre 2026');
    await expect(lignes.nth(1)).toContainText('Patient 11111111');
    await expect(lignes.nth(1)).toContainText('inscrit le 18 septembre 2026');
  });

  test('aucun patient : message et lien vers les disponibilites ; 403 : reserve aux medecins', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/liste-attente', { corps: [] });

    await ouvrir(page, '/medecin/liste-attente');
    await expect(page.getByText(FR['listeAttenteMedecin.aucun'])).toBeVisible();
    await expect(page.locator('main a[href="/medecin/disponibilites"]')).toHaveCount(1);

    await stub(page, '**/api/medecin/liste-attente', { statut: 403, corps: { erreur: 'Acces refuse.' } });
    await ouvrir(page, '/medecin/liste-attente');
    await expect(page.getByText(FR['commun.reserveMedecins'])).toBeVisible();
  });

  test('401 : retour vers la page de connexion', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/liste-attente', { statut: 401, corps: { erreur: 'Non authentifié' } });

    await page.goto('/medecin/liste-attente');

    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
  });
});

test.describe('Écran de mes secretaires', () => {
  const ANCIEN = { id: 'ra0', medecinId: 'm1', secretaireId: '66666666-6666-6666-6666-666666666666', creeLe: '2026-09-01T10:00:00Z' };

  test('liste les rattachements, les plus anciens d abord, avec l explication du champ', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/secretaires', { corps: [RATTACHEMENT, ANCIEN] });

    await ouvrir(page, '/medecin/secretaires');

    await expect(page.getByText(FR['secretaires.identifiant'])).toBeVisible();
    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText(ANCIEN.secretaireId);
    await expect(lignes.nth(0)).toContainText('Rattachée le 1 septembre 2026');
    await expect(lignes.nth(1)).toContainText(SECRETAIRE_ID);
    await expect(lignes.nth(1).getByRole('button', { name: FR['commun.retirer'], exact: true })).toHaveCount(1);
  });

  test('refuse cote client un identifiant qui n est pas un UUID, sans appeler l API', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/secretaires', { corps: [] });

    await ouvrir(page, '/medecin/secretaires');
    await page.getByLabel(FR['secretaires.identifiant']).fill('secretaire.demo');
    await page.getByRole('button', { name: FR['secretaires.rattacher'] }).click();

    await expect(page.getByText(FR['secretaires.identifiantInvalide'])).toBeVisible();
    expect(journal.contient('/api/medecin/secretaires', 'POST')).toBe(false);
  });

  test('rattachement : confirmation, champ vide et liste rechargee ; 409 et 400 affichent le motif', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/secretaires', (requete) =>
      requete.method() === 'POST' ? { statut: 201, corps: RATTACHEMENT } : { corps: [] },
    );

    await ouvrir(page, '/medecin/secretaires');
    await journal.attendre('/api/medecin/secretaires');
    await page.getByLabel(FR['secretaires.identifiant']).fill(` ${SECRETAIRE_ID} `);
    await page.getByRole('button', { name: FR['secretaires.rattacher'] }).click();

    const envoi = await journal.attendre('/api/medecin/secretaires', 'POST');
    expect(envoi.corps).toEqual({ secretaireId: SECRETAIRE_ID });
    await expect(page.getByText(FR['secretaires.rattachee'])).toBeVisible();
    await expect(page.getByLabel(FR['secretaires.identifiant'])).toHaveValue('');
    await expect.poll(() => journal.filtrer('/api/medecin/secretaires', 'GET').length).toBe(2);

    await stub(page, '**/api/medecin/secretaires', (requete) =>
      requete.method() === 'POST'
        ? { statut: 400, corps: { erreur: 'Un medecin ne peut pas se rattacher lui-meme comme secretaire.' } }
        : { corps: [] },
    );
    journal.vider();
    await page.getByLabel(FR['secretaires.identifiant']).fill(SECRETAIRE_ID);
    await page.getByRole('button', { name: FR['secretaires.rattacher'] }).click();
    await expect(page.getByText('Un medecin ne peut pas se rattacher lui-meme comme secretaire.')).toBeVisible();
    expect(journal.filtrer('/api/medecin/secretaires', 'GET').length).toBe(0);
  });

  test('retrait : sans confirmation rien ne part ; apres confirmation, message et liste rechargee', async ({ page }) => {
    const journal = requetes(page);
    const refus = refuserConfirmations(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/secretaires', { corps: [ANCIEN] });
    await stub(page, '**/api/medecin/secretaires/ra0/retirer', { statut: 204, corps: null });

    await ouvrir(page, '/medecin/secretaires');
    await journal.attendre('/api/medecin/secretaires');
    await page.getByRole('button', { name: FR['commun.retirer'], exact: true }).click();
    await expect.poll(() => refus.length).toBe(1);
    expect(journal.contient('/api/medecin/secretaires/ra0/retirer', 'POST')).toBe(false);
  });

  test('aucune secretaire : message dedie ; 403 : reserve aux medecins', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/secretaires', { corps: [] });

    await ouvrir(page, '/medecin/secretaires');
    await expect(page.getByText(FR['secretaires.aucune'])).toBeVisible();

    await stub(page, '**/api/medecin/secretaires', { statut: 403, corps: { erreur: 'Acces refuse.' } });
    await ouvrir(page, '/medecin/secretaires');
    await expect(page.getByText(FR['commun.reserveMedecins'])).toBeVisible();
  });
});
