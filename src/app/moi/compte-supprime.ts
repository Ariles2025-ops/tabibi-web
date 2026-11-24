/**
 * Confirmation « Votre compte a été supprimé. » (comme l'appli) : la déconnexion Keycloak quitte le site, la page
 * « Mon compte » disparaît donc avant d'avoir pu l'afficher. On laisse un drapeau en sessionStorage, lu une seule
 * fois au retour sur le site par la coque de l'application.
 */
const CLE = 'ndawik.compte-supprime';

export function marquerCompteSupprime(): void {
  try { sessionStorage.setItem(CLE, '1'); } catch { /* stockage indisponible : pas de confirmation */ }
}

/** Vrai une seule fois après une suppression de compte. */
export function consommerCompteSupprime(): boolean {
  try {
    const marque = sessionStorage.getItem(CLE) === '1';
    sessionStorage.removeItem(CLE);
    return marque;
  } catch {
    return false;
  }
}
