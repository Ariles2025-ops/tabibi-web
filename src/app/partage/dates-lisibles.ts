/**
 * Dates de l'API absentes ou illisibles : meme regle que l'appli mobile (notifications.dart, ordonnances.dart, avis.dart) —
 * on affiche « date inconnue » et l'element passe en fin de liste, au lieu d'un texte vide, d'une erreur du filtre `date`
 * ou d'un tri desordonne (Date.parse(...) = NaN).
 */

/** Instant (ms) d'une date ISO 8601 ; null si elle est absente ou illisible. */
export function instantLisible(iso: string | null | undefined): number | null {
  const instant = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(instant) ? null : instant;
}

/** Copie triee de la plus recente a la plus ancienne ; les dates absentes ou illisibles vont en fin de liste. */
export function trierParDateRecenteDabord<T>(elements: T[], date: (e: T) => string | null | undefined): T[] {
  return [...elements].sort((a, b) => {
    const da = instantLisible(date(a));
    const db = instantLisible(date(b));
    if (da === null) return db === null ? 0 : 1;
    if (db === null) return -1;
    return db - da;
  });
}

/** Copie triee de la plus ancienne a la plus recente ; les dates absentes ou illisibles vont aussi en fin de liste. */
export function trierParDateAncienneDabord<T>(elements: T[], date: (e: T) => string | null | undefined): T[] {
  return [...elements].sort((a, b) => {
    const da = instantLisible(date(a));
    const db = instantLisible(date(b));
    if (da === null) return db === null ? 0 : 1;
    if (db === null) return -1;
    return da - db;
  });
}
