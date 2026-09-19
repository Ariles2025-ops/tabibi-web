import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ISSUER_SIMULE, URL_API } from '../playwright.config';
import { arreter, demarrerApiSimulee, PORT_API_SIMULEE } from './api-simulee';

/** Configuration du navigateur (assets/config.json du build), remplacee comme au deploiement (docker/entrypoint.sh). */
const CONFIG_NAVIGATEUR = resolve(__dirname, '../dist/tabibi-web/browser/assets/config.json');

/**
 * Avant les tests : ecrit la configuration du navigateur (la meme API simulee que le serveur SSR, sinon le
 * navigateur appellerait localhost:8080 apres l'hydratation et le cache de transfert ne servirait a rien), puis
 * demarre l'API simulee. Le serveur SSR (webServer de playwright.config.ts) est deja lance : il ne lit le fichier
 * et n'appelle l'API qu'a la demande.
 */
export default async function preparer(): Promise<() => Promise<void>> {
  if (!existsSync(resolve(CONFIG_NAVIGATEUR, '..'))) {
    throw new Error(`Build introuvable (${CONFIG_NAVIGATEUR}) : lancer « npx ng build » d'abord (npm run e2e le fait).`);
  }
  writeFileSync(
    CONFIG_NAVIGATEUR,
    JSON.stringify({ apiUrl: URL_API, keycloakIssuer: ISSUER_SIMULE, keycloakClientId: 'tabibi-web' }, null, 2) + '\n',
  );
  const api = await demarrerApiSimulee(PORT_API_SIMULEE);
  console.log(`API simulée à l'écoute sur ${URL_API} ; assets/config.json du build réécrit pour la viser.`);
  return () => arreter(api);
}
