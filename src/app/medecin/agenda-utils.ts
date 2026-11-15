import { RendezVous } from '../rendezvous/rendezvous.service';

/** Elements regroupes par jour (heure locale) ; `debut` du premier element sert a afficher la date. */
export interface Journee<T extends { debut: string }> {
  cle: string;
  debut: string;
  elements: T[];
}

/** Cle du jour local (« 2026-11-15 ») d'une date ISO 8601. */
export function cleJour(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Trie par `debut` (croissant ou decroissant) puis regroupe par jour local. */
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

/** Minuit (heure locale) du jour de `maintenant`. */
function debutDuJour(maintenant: number): number {
  const d = new Date(maintenant);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
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

/** Un rendez-vous ne peut etre marque honore qu'une fois commence, et s'il est confirme. */
export function peutHonorer(r: RendezVous, maintenant = Date.now()): boolean {
  return r.statut === 'CONFIRME' && Date.parse(r.debut) <= maintenant;
}

/** Une teleconsultation ne se propose que sur un rendez-vous confirme qui n'a pas encore commence. */
export function peutProposerTeleconsultation(r: RendezVous, maintenant = Date.now()): boolean {
  return r.statut === 'CONFIRME' && Date.parse(r.debut) > maintenant;
}

/** Action en cours sur un element d'une liste (seul le bouton clique affiche « … »). */
export interface ActionEnCours {
  id: string;
  action: string;
}

/** Valeur « yyyy-MM-ddTHH:mm » (heure locale) attendue par un champ datetime-local. */
export function valeurDateHeureLocale(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
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
