import { defineConfig, devices } from '@playwright/test';

// Parcours automatique de verification : connexion par role, visite de chaque page, capture.
// Lancer : TABIBI_E2E_ADMIN_PW=... TABIBI_E2E_MEDECIN_PW=... TABIBI_E2E_PATIENT_PW=... npx playwright test
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.TABIBI_E2E_URL || 'https://tabibi.doctor',
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
