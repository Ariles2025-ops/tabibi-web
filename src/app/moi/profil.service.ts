import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';

/** Profil de l'utilisateur connecte, quel que soit son role (GET / PUT /api/moi/profil). */
export interface Profil {
  utilisateurId: string;
  nomComplet: string;
  /** Chiffres seulement (ex. 0550123456) ; null si non renseigne. */
  telephone: string | null;
  /** Date au format yyyy-MM-dd ; null si non renseignee. */
  dateNaissance: string | null;
  wilayaCode: string | null;
  /** fr, ar, kab ou en. */
  langue: string;
  /** Date de derniere mise a jour au format ISO 8601. */
  misAJourLe: string;
}

/** Donnees d'enregistrement du profil (PUT /api/moi/profil) ; seul le nom complet est obligatoire. */
export interface DemandeProfil {
  nomComplet: string;
  telephone: string | null;
  dateNaissance: string | null;
  wilayaCode: string | null;
  langue: string;
}

/** Regles du domaine backend (Profil.java), reprises pour la validation cote client. */
export const LONGUEUR_MIN_NOM = 2;
export const LONGUEUR_MAX_NOM = 120;
export const LONGUEUR_MAX_WILAYA = 4;
export const ANNEE_NAISSANCE_MIN = 1900;
export const LANGUE_PAR_DEFAUT = 'fr';

/** Langues de l'interface, dans l'ordre de la liste deroulante ; le libelle est celui de la langue elle-meme. */
export const LANGUES: ReadonlyArray<{ code: string; libelle: string }> = [
  { code: 'fr', libelle: 'Français' },
  { code: 'ar', libelle: 'العربية' },
  { code: 'kab', libelle: 'Taqbaylit' },
  { code: 'en', libelle: 'English' },
];

/** Numero algerien, mobile ou fixe : 9 a 10 chiffres commencant par 0, une fois les espaces retires. */
const TELEPHONE = /^0[0-9]{8,9}$/;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function libelleLangue(code: string | null | undefined): string {
  if (!code) return '';
  return LANGUES.find((l) => l.code === code)?.libelle ?? code;
}

/** « 2026-09-19 » pour la date locale du navigateur (le champ date et la comparaison travaillent sur ce format). */
export function dateLocaleIso(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/**
 * Nettoie les champs saisis (espaces retires, telephone sans espaces, facultatifs vides → null) pour l'envoi ;
 * la langue vide vaut fr, comme cote API.
 */
export function nettoyerProfil(saisie: DemandeProfil): DemandeProfil {
  const facultatif = (valeur: string | null) => {
    const v = (valeur ?? '').trim();
    return v ? v : null;
  };
  const telephone = (saisie.telephone ?? '').replace(/\s+/g, '');
  return {
    nomComplet: saisie.nomComplet.trim(),
    telephone: telephone ? telephone : null,
    dateNaissance: facultatif(saisie.dateNaissance),
    wilayaCode: facultatif(saisie.wilayaCode),
    langue: (saisie.langue ?? '').trim().toLowerCase() || LANGUE_PAR_DEFAUT,
  };
}

/**
 * Validation cote client d'une demande deja nettoyee, coherente avec le backend (400 sinon) : renvoie le premier
 * motif en francais, ou null si tout est correct. `aujourdHui` est la date locale (injectable pour les tests).
 */
export function validerProfil(demande: DemandeProfil, aujourdHui: Date = new Date()): string | null {
  if (demande.nomComplet.length < LONGUEUR_MIN_NOM || demande.nomComplet.length > LONGUEUR_MAX_NOM) {
    return `Le nom complet doit compter de ${LONGUEUR_MIN_NOM} à ${LONGUEUR_MAX_NOM} caractères.`;
  }
  if (demande.telephone !== null && !TELEPHONE.test(demande.telephone)) {
    return 'Le téléphone doit être un numéro algérien de 9 à 10 chiffres commençant par 0 (ex. 0550123456).';
  }
  if (demande.dateNaissance !== null) {
    if (!DATE_ISO.test(demande.dateNaissance) || Number.isNaN(Date.parse(demande.dateNaissance))) {
      return 'Indiquez une date de naissance valide.';
    }
    if (demande.dateNaissance >= dateLocaleIso(aujourdHui)) {
      return 'La date de naissance doit être dans le passé.';
    }
    if (Number(demande.dateNaissance.slice(0, 4)) <= ANNEE_NAISSANCE_MIN) {
      return `La date de naissance doit être postérieure à ${ANNEE_NAISSANCE_MIN}.`;
    }
  }
  if (demande.wilayaCode !== null && demande.wilayaCode.length > LONGUEUR_MAX_WILAYA) {
    return `Le code de wilaya ne peut pas dépasser ${LONGUEUR_MAX_WILAYA} caractères.`;
  }
  if (!LANGUES.some((l) => l.code === demande.langue)) {
    return `La langue doit être l'une de : ${LANGUES.map((l) => l.code).join(', ')}.`;
  }
  return null;
}

/** Mon profil (utilisateur connecte, tous roles ; JWT via l'intercepteur) : lecture (404 tant que non renseigne) et enregistrement. */
@Injectable({ providedIn: 'root' })
export class ProfilService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Mon profil ; 404 { erreur } si je ne l'ai jamais renseigne. */
  monProfil(): Observable<Profil> {
    return this.http.get<Profil>(`${this.base}/api/moi/profil`);
  }

  /** Renseigne ou remplace mon profil (400 { erreur } si une regle n'est pas respectee). */
  enregistrer(demande: DemandeProfil): Observable<Profil> {
    return this.http.put<Profil>(`${this.base}/api/moi/profil`, demande);
  }
}
