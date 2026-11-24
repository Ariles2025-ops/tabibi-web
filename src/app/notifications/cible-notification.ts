import { VISIO_ACTIVE } from '../lancement';

/**
 * Page du site ouverte depuis le lien d'une notification, comme `cibleDuLien` de l'appli (notifications.dart) :
 * seuls les liens qui ont une page correspondante sont suivis ; un lien vide, externe, inconnu ou mal forme renvoie
 * `null` (pas de « Voir », pas de page « introuvable »).
 * Les liens envoyes aux medecins (`/medecin/agenda`, `/medecin/avis`, `/medecin/secretaires`), aux secretaires
 * (`/secretaire`) et aux invitations (`/invitations`) sont suivis aussi ; `/teleconsultations` seulement quand la visio
 * est ouverte (« Bientot » : rien a ouvrir).
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
    case 'medecin':
      return id === 'agenda' || id === 'avis' || id === 'secretaires' || id === 'candidature' ? `/medecin/${id}` : null;
    case 'admin':
      return id === 'candidatures' || id === 'demandes' || id === 'avis' ? `/admin/${id}` : null;
    case 'secretaire':
    case 'invitations':
      return id === undefined ? `/${page}` : null;
    case 'teleconsultations':
      return id === undefined && VISIO_ACTIVE ? '/teleconsultations' : null;
    default:
      return null;
  }
}
