/**
 * Configuration de l'application : forme, valeurs par defaut, normalisation et lecture des variables
 * d'environnement du serveur de rendu. Aucune dependance Angular, pour etre importe tel quel par les tests du
 * projet `logique` (node) et par `server.ts` ; `ConfigService` reexporte ce module.
 */

/** Configuration de l'application, lue a l'execution dans `assets/config.json` (remplace au deploiement). */
export interface ConfigurationApplication {
  /** Origine de l'API Tabibi, sans barre oblique finale (ex. https://api.tabibi.dz). */
  apiUrl: string;
  /** Issuer OIDC du realm Keycloak (ex. https://auth.tabibi.dz/realms/tabibi). */
  keycloakIssuer: string;
  /** Client public OIDC du front web. */
  keycloakClientId: string;
}

/** Chemin du fichier, relatif a la base du document (`<base href>`), pour fonctionner aussi sous un sous-chemin. */
export const CHEMIN_CONFIGURATION = 'assets/config.json';

/** Valeurs de repli, celles du poste de developpement (API et Keycloak lances en local). */
export const CONFIGURATION_PAR_DEFAUT: ConfigurationApplication = {
  apiUrl: 'http://localhost:8080',
  keycloakIssuer: 'http://localhost:8081/realms/tabibi',
  keycloakClientId: 'tabibi-web',
};

/**
 * Configuration complete a partir de ce qui a ete lu : barre oblique finale retiree des URL, champ manquant ou
 * vide complete par sa valeur par defaut.
 */
export function normaliserConfiguration(lue: Partial<ConfigurationApplication> | null | undefined): ConfigurationApplication {
  return {
    apiUrl: sansBarreFinale(valeur(lue?.apiUrl, CONFIGURATION_PAR_DEFAUT.apiUrl)),
    keycloakIssuer: sansBarreFinale(valeur(lue?.keycloakIssuer, CONFIGURATION_PAR_DEFAUT.keycloakIssuer)),
    keycloakClientId: valeur(lue?.keycloakClientId, CONFIGURATION_PAR_DEFAUT.keycloakClientId),
  };
}

/**
 * Configuration lue dans les variables d'environnement du serveur de rendu : les memes que celles de l'image Docker
 * (`TABIBI_API_URL`, `TABIBI_KEYCLOAK_ISSUER`, `TABIBI_KEYCLOAK_CLIENT_ID`) ; sans elles, `DOMAINE` (le `.env` de
 * docker-compose.prod.yml) donne `https://api.DOMAINE` et `https://auth.DOMAINE/realms/tabibi` ; sinon un champ
 * absent est complete par sa valeur par defaut a l'application (`charger()`).
 */
export function configurationDepuisEnvironnement(env: Record<string, string | undefined>): Partial<ConfigurationApplication> {
  const domaine = env['DOMAINE']?.trim();
  return {
    apiUrl: env['TABIBI_API_URL'] || (domaine ? `https://api.${domaine}` : undefined),
    keycloakIssuer: env['TABIBI_KEYCLOAK_ISSUER'] || (domaine ? `https://auth.${domaine}/realms/tabibi` : undefined),
    keycloakClientId: env['TABIBI_KEYCLOAK_CLIENT_ID'],
  };
}

/** La valeur lue si c'est une chaine non vide (espaces retires), sinon la valeur par defaut. */
function valeur(lue: unknown, parDefaut: string): string {
  return typeof lue === 'string' && lue.trim() ? lue.trim() : parDefaut;
}

/** « https://api.tabibi.dz/ » → « https://api.tabibi.dz » (les chemins sont ensuite concatenes avec `/api/...`). */
function sansBarreFinale(url: string): string {
  return url.replace(/\/+$/, '');
}
