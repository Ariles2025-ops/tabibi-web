import { expect, test } from '@playwright/test';
import { ISSUER_SIMULE, URL_WEB } from '../../playwright.config';
import { ouvrir } from '../outils';

/** Page introuvable (404), robots.txt, plan du site, titres et descriptions SEO, pages privees sans connexion. */
test.describe('Navigation, SEO et pages privées', () => {
  test('une URL inconnue rend « Page introuvable » avec le statut 404, et le lien ramène à l annuaire', async ({ page }) => {
    const reponse = await ouvrir(page, '/page-inexistante');

    expect(reponse?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page introuvable');
    await expect(page).toHaveTitle('Page introuvable | Tabibi');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

    await page.getByRole('link', { name: 'Trouver un médecin' }).click();
    await expect(page).toHaveURL(`${URL_WEB}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trouver un praticien');
    await expect(page).toHaveTitle('Trouver un médecin en Algérie | Tabibi');
  });

  test('un praticien inconnu répond 404 avec « Praticien introuvable »', async ({ page }) => {
    const reponse = await ouvrir(page, '/medecins/inconnu-xyz');

    expect(reponse?.status()).toBe(404);
    // « Praticien introuvable. » (fiche) ou le motif { erreur } du 404 des creneaux, selon la reponse arrivee en dernier.
    await expect(page.getByText(/Praticien introuvable/)).toBeVisible();
    await expect(page).toHaveTitle('Praticien introuvable | Tabibi');
  });

  test('robots.txt exclut les espaces privés et annonce le plan du site', async ({ request }) => {
    const reponse = await request.get('/robots.txt');

    expect(reponse.status()).toBe(200);
    expect(reponse.headers()['content-type']).toContain('text/plain');
    const texte = await reponse.text();
    expect(texte).toContain('User-agent: *');
    for (const chemin of ['/moi', '/mes-', '/medecin/', '/admin', '/secretaire', '/pharmacie', '/messagerie', '/notifications', '/dawini', '/avis', '/liste-attente', '/teleconsultations']) {
      expect(texte).toContain(`Disallow: ${chemin}`);
    }
    expect(texte).not.toContain('Disallow: /medecins');
    expect(texte).toContain(`Sitemap: ${URL_WEB}/sitemap.xml`);
  });

  test('sitemap.xml liste les pages publiques et les fiches des praticiens', async ({ request }) => {
    const reponse = await request.get('/sitemap.xml');

    expect(reponse.status()).toBe(200);
    expect(reponse.headers()['content-type']).toContain('application/xml');
    const xml = await reponse.text();
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${URL_WEB}/</loc>`);
    expect(xml).toContain(`<loc>${URL_WEB}/verifier</loc>`);
    expect(xml).toContain(`<loc>${URL_WEB}/medecins/m1</loc>`);
    expect(xml).toContain(`<loc>${URL_WEB}/medecins/m2</loc>`);
    expect(xml).not.toContain('/mes-rendez-vous');
  });

  test('titres et descriptions rendus par le serveur (sans JavaScript)', async ({ request }) => {
    const accueil = await (await request.get('/')).text();
    expect(accueil).toContain('<title>Trouver un médecin en Algérie | Tabibi</title>');
    expect(accueil).toMatch(/<meta name="description" content="Annuaire des praticiens Tabibi[^"]*">/);
    expect(accueil).toContain(`<link rel="canonical" href="${URL_WEB}/">`);
    expect(accueil).not.toContain('name="robots"');
    // Rendu par le serveur : les praticiens et leurs liens sont deja dans le HTML.
    expect(accueil).toContain('href="/medecins/m1"');
    expect(accueil).toContain('Dr Karim Meziane');

    const fiche = await (await request.get('/medecins/m1')).text();
    expect(fiche).toContain('<title>Dr Amina Belkacem, Généraliste à Alger | Tabibi</title>');
    expect(fiche).toMatch(/<meta name="description" content="Prenez rendez-vous avec Dr Amina Belkacem, généraliste à Alger \(Alger\)[^"]*">/);
    expect(fiche).toContain(`<link rel="canonical" href="${URL_WEB}/medecins/m1">`);

    const verifier = await (await request.get('/verifier')).text();
    expect(verifier).toContain('<title>Vérifier une ordonnance | Tabibi</title>');
  });

  test('la navigation côté client met le titre à jour', async ({ page }) => {
    await ouvrir(page, '/');
    await expect(page).toHaveTitle('Trouver un médecin en Algérie | Tabibi');

    await page.getByRole('link', { name: 'Vérifier une ordonnance' }).click();
    await expect(page).toHaveURL(`${URL_WEB}/verifier`);
    await expect(page).toHaveTitle('Vérifier une ordonnance | Tabibi');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${URL_WEB}/verifier`);

    await page.getByRole('link', { name: 'Accueil' }).click();
    await expect(page).toHaveTitle('Trouver un médecin en Algérie | Tabibi');
  });

  test('une page privée est noindex et renvoie le visiteur vers la page de connexion', async ({ page, request }) => {
    const html = await (await request.get('/mes-rendez-vous')).text();
    expect(html).toContain('<title>Mes rendez-vous | Tabibi</title>');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain('Redirection vers la page de connexion');

    // Pas d'attente de l'hydratation : la page part vers l'issuer des que l'etat de connexion est connu.
    await page.goto('/mes-rendez-vous');
    await page.waitForURL((url) => url.href.startsWith(`${ISSUER_SIMULE}/protocol/openid-connect/auth`));
    const url = new URL(page.url());
    expect(url.searchParams.get('client_id')).toBe('tabibi-web');
    expect(decodeURIComponent(url.searchParams.get('state') ?? '')).toContain('/mes-rendez-vous');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Connexion simulée');
  });

  test('« Mon compte » propose « Se connecter » sans connexion', async ({ page }) => {
    await ouvrir(page, '/moi');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mon compte');
    await expect(page).toHaveTitle('Mon compte | Tabibi');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL((url) => url.href.startsWith(`${ISSUER_SIMULE}/protocol/openid-connect/auth`));
  });
});
