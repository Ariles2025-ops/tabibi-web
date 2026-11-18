import { RendezVous } from '../rendezvous/rendezvous.service';

/** Elements regroupes par jour (heure d'Algerie) ; `debut` du premier element sert a afficher la date. */
export interface Journee<T extends { debut: string }> {
  cle: string;
  debut: string;
  elements: T[];
}

/** Heure de l'Algerie : UTC+1 toute l'annee (pas d'heure d'ete), quel que soit le fuseau du navigateur. */
export const DECALAGE_ALGER_MS = 60 * 60_000;

/** Cle du jour en heure d'Algerie (« 2026-11-15 ») d'une date ISO 8601. */
export function cleJour(iso: string): string {
  return new Date(Date.parse(iso) + DECALAGE_ALGER_MS).toISOString().slice(0, 10);
}

/** Instant ISO 8601 (UTC) d'une date « yyyy-MM-dd » et d'une heure « HH:mm » saisies en heure d'Algerie ; NaN si invalide. */
export function instantAlger(date: string, heure: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(heure)) return NaN;
  return Date.parse(`${date}T${heure.length === 5 ? heure + ':00' : heure}+01:00`);
}

/** Trie par `debut` (croissant ou decroissant) puis regroupe par jour (heure d'Algerie). */
export function grouperParJour<T extends { debut: string }>(liste: T[], ordre: 'croissant' | 'decroissant' = 'croissant'): Journee<T>[] {
  const signe = ordre === 'croissant' ? 1 : -1;
  const tries = [...liste].sort((a, b) => signe * (Date.parse(a.debut) - Date.parse(b.debut)));
  const jours: Journee<T>[] = [];
  for (const e of tries) {
    const cle = cleJour(e.debut);
    const dernier = jours[jours.length - 1];
    if (dernier && dernier.cle === cle) dernier.elements.push(e);
    else jours.push({ cle, debut: e.debut, elements: [e] });
  }
  return jours;
}

/** Minuit (heure d'Algerie) du jour de `maintenant`. */
function debutDuJour(maintenant: number): number {
  return Date.parse(`${cleJour(new Date(maintenant).toISOString())}T00:00:00+01:00`);
}

/** Rendez-vous d'aujourd'hui et a venir, du plus proche au plus lointain, par jour. */
export function rendezVousAVenir(liste: RendezVous[], maintenant = Date.now()): Journee<RendezVous>[] {
  const borne = debutDuJour(maintenant);
  return grouperParJour(liste.filter((r) => Date.parse(r.debut) >= borne), 'croissant');
}

/** Rendez-vous des jours passes, du plus recent au plus ancien, par jour. */
export function rendezVousPasses(liste: RendezVous[], maintenant = Date.now()): Journee<RendezVous>[] {
  const borne = debutDuJour(maintenant);
  return grouperParJour(liste.filter((r) => Date.parse(r.debut) < borne), 'decroissant');
}

/**
 * Rendez-vous en cours de validite : CONFIRME, ou RESERVE (statut renvoye par la reservation du patient) traite
 * comme confirme — les actions (honorer, absent, annuler) restent proposees au medecin et a la secretaire.
 */
export function estConfirme(r: { statut: string }): boolean {
  return r.statut === 'CONFIRME' || r.statut === 'RESERVE';
}

/** Un rendez-vous ne peut etre marque honore qu'une fois commence, et s'il est confirme. */
export function peutHonorer(r: RendezVous, maintenant = Date.now()): boolean {
  return estConfirme(r) && Date.parse(r.debut) <= maintenant;
}

/** Un patient ne peut etre signale absent que sur un rendez-vous confirme deja commence (memes regles que « honore »). */
export function peutMarquerAbsent(r: RendezVous, maintenant = Date.now()): boolean {
  return peutHonorer(r, maintenant);
}

/** Une teleconsultation ne se propose que sur un rendez-vous confirme qui n'a pas encore commence. */
export function peutProposerTeleconsultation(r: RendezVous, maintenant = Date.now()): boolean {
  return estConfirme(r) && Date.parse(r.debut) > maintenant;
}

/** Action en cours sur un element d'une liste (seul le bouton clique affiche « … »). */
export interface ActionEnCours {
  id: string;
  action: string;
}

/** Valeur « yyyy-MM-ddTHH:mm » (heure d'Algerie) attendue par un champ datetime-local. */
export function valeurDateHeureLocale(d: Date): string {
  return new Date(d.getTime() + DECALAGE_ALGER_MS).toISOString().slice(0, 16);
}

/** Style d'un onglet (« À venir » / « Passés », « Un créneau » / « Une série »). */
export function styleOnglet(actif: boolean): Record<string, string> {
  return {
    padding: '8px 16px',
    borderRadius: '999px',
    font: 'inherit',
    fontWeight: '700',
    cursor: 'pointer',
    border: '1.5px solid ' + (actif ? 'var(--blue)' : 'var(--border)'),
    background: actif ? 'var(--blue-l)' : '#fff',
    color: actif ? 'var(--blue-d)' : 'var(--text2)',
  };
}
