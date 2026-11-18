/**
 * Page du site ouverte depuis le lien d'une notification, comme `cibleDuLien` de l'appli (notifications.dart) :
 * seuls les liens qui ont une page correspondante sont suivis ; un lien vide, externe, inconnu ou mal forme renvoie
 * `null` (pas de « Voir », pas de page « introuvable »).
 * Le lien d'API `/ordonnances` (liste) correspond à la page `/mes-ordonnances` du site.
 */
export function cibleDuLien(lien: string | null | undefined): string | null {
  const brut = (lien ?? '').trim();
  if (!brut.startsWith('/') || brut.startsWith('//')) return null;
  const segments = brut.split(/[?#]/)[0].split('/').filter((s) => s.length > 0);
  if (segments.length === 0 || segments.length > 2) return null;
  const [page, id] = segments;
  switch (page) {
    case 'mes-rendez-vous':
    case 'mes-avis':
    case 'liste-attente':
      return id === undefined ? `/${page}` : null;
    case 'ordonnances':
      return id === undefined ? '/mes-ordonnances' : `/ordonnances/${id}`;
    case 'medecins':
      return id === undefined ? null : `/medecins/${id}`;
    case 'messagerie':
    case 'dawini':
      return id === undefined ? `/${page}` : `/${page}/${id}`;
    default:
      return null;
  }
}
