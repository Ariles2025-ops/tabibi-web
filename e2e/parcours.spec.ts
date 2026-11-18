import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';

const DIR = 'e2e/captures';
mkdirSync(DIR, { recursive: true });

/** Connexion par email + mot de passe (methode « equipe »), depuis la page d'accueil. */
async function connecter(page: Page, email: string, motDePasse: string) {
  await page.goto('/moi');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.getByRole('link', { name: /mot de passe/i }).click();
  await page.getByRole('button', { name: /utilisateur et mot de passe/i }).click();
  await page.fill('#username', email);
  await page.fill('#password', motDePasse);
  await page.click('#kc-login');
  await page.waitForURL((u) => u.hostname === new URL(page.url()).hostname && !u.pathname.includes('/realms/'), { timeout: 30_000 });
}

const ROLES: { role: string; email: string; pw?: string; pages: [string, string][] }[] = [
  {
    role: 'admin', email: 'admin@tabibi.doctor', pw: process.env.TABIBI_E2E_ADMIN_PW,
    pages: [['accueil', '/'], ['tableau-de-bord', '/admin'], ['candidatures', '/admin/candidatures'], ['moderation', '/admin/avis'], ['mon-compte', '/moi']],
  },
  {
    role: 'medecin', email: 'medecin@tabibi.doctor', pw: process.env.TABIBI_E2E_MEDECIN_PW,
    pages: [['accueil', '/'], ['agenda', '/medecin/agenda'], ['disponibilites', '/medecin/disponibilites'], ['ordonnances', '/medecin/ordonnances'], ['teleconsultations', '/medecin/teleconsultations'], ['candidature', '/medecin/candidature'], ['avis', '/medecin/avis'], ['liste-attente', '/medecin/liste-attente'], ['secretaires', '/medecin/secretaires'], ['mon-compte', '/moi']],
  },
  {
    role: 'patient', email: 'patient@tabibi.doctor', pw: process.env.TABIBI_E2E_PATIENT_PW,
    pages: [['accueil', '/'], ['mes-rendez-vous', '/mes-rendez-vous'], ['mes-ordonnances', '/mes-ordonnances'], ['teleconsultations', '/teleconsultations'], ['messagerie', '/messagerie'], ['mes-avis', '/mes-avis'], ['dawini', '/dawini'], ['liste-attente', '/liste-attente'], ['mon-compte', '/moi']],
  },
];

for (const r of ROLES) {
  test(`parcours ${r.role}`, async ({ page }) => {
    test.skip(!r.pw, `TABIBI_E2E_${r.role.toUpperCase()}_PW absent`);
    const erreurs: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
    await connecter(page, r.email, r.pw!);
    for (const [nom, chemin] of r.pages) {
      await page.goto(chemin);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${DIR}/${r.role}-${nom}.png`, fullPage: true });
    }
    if (erreurs.length) console.log(`[${r.role}] erreurs console:`, erreurs.slice(0, 5));
  });
}

/**
 * Deplacer un rendez-vous : le patient reserve, deplace, puis le nouvel horaire s'affiche des deux cotes.
 * Necessite deux creneaux libres du medecin de test et les deux mots de passe.
 */
test('deplacer un rendez-vous (patient puis medecin)', async ({ page, browser }) => {
  const pwPatient = process.env.TABIBI_E2E_PATIENT_PW;
  const pwMedecin = process.env.TABIBI_E2E_MEDECIN_PW;
  test.skip(!pwPatient || !pwMedecin, 'mots de passe patient et medecin absents');

  await connecter(page, 'patient@tabibi.doctor', pwPatient!);
  await page.goto('/mes-rendez-vous');
  const avant = await page.locator('.mr-carte .mr-quand').first().textContent();
  await page.getByRole('button', { name: 'Déplacer' }).first().click();
  const creneau = page.locator('.creneau-libre').first();
  const nouvelHoraire = (await creneau.textContent())!.trim();
  await creneau.click();
  await page.locator('.confirmer-deplacement').click();
  await page.getByText(/Rendez-vous déplacé au/).waitFor();
  const heure = nouvelHoraire.match(/\d{2}:\d{2}/)![0];
  await page.locator('.mr-carte .mr-quand', { hasText: heure }).first().waitFor();
  test.info().annotations.push({ type: 'ancien horaire', description: avant ?? '' });

  const ctxMedecin = await browser.newContext();
  const pageMedecin = await ctxMedecin.newPage();
  await connecter(pageMedecin, 'medecin@tabibi.doctor', pwMedecin!);
  await pageMedecin.goto('/medecin/agenda');
  await pageMedecin.getByText(heure).first().waitFor();
  await ctxMedecin.close();
});
