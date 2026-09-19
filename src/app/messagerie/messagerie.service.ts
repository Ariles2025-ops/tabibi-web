import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';

// Bornes et abreviations : module pur (`./messagerie.formats`), reexporte pour les imports existants.
export { LONGUEUR_MAX_MESSAGE, abregerIdentifiant } from './messagerie.formats';

/**
 * Conversation entre un patient et un medecin (une seule par couple), vue par l'utilisateur connecte :
 * `nonLus` est le nombre de messages de l'autre participant qu'il n'a pas encore lus.
 */
export interface Conversation {
  id: string;
  patientId: string;
  medecinId: string;
  /** Dates au format ISO 8601 ; dernierMessageLe vaut la date d'ouverture tant qu'aucun message n'est envoye. */
  creeLe: string;
  dernierMessageLe: string;
  nonLus: number;
}

/** Message d'une conversation ; luLe vaut null tant que l'autre participant ne l'a pas lu. */
export interface Message {
  id: string;
  conversationId: string;
  auteurId: string;
  contenu: string;
  envoyeLe: string;
  luLe: string | null;
}

/**
 * Messagerie patient-medecin : ouverture d'une conversation par le patient (apres un rendez-vous), liste
 * des conversations, lecture (qui marque lus les messages recus) et envoi (JWT via l'intercepteur ;
 * erreurs { erreur } 400 / 403 / 404 traduites par les composants).
 */
@Injectable({ providedIn: 'root' })
export class MessagerieService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /** Origine de l'API, lue a l'execution dans assets/config.json. */
  private get base(): string {
    return this.config.apiUrl;
  }

  /** Ouvre (201) ou retrouve (200) la conversation du patient connecte avec un medecin ; 403 sans rendez-vous commun. */
  ouvrir(medecinId: string): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.base}/api/conversations`, { medecinId });
  }

  /** Mes conversations, la plus recente activite d'abord (role PATIENT ou MEDECIN). */
  mesConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.base}/api/conversations`);
  }

  /** Messages du plus ancien au plus recent ; les messages recus sont marques lus par cette lecture (403 pour un tiers, 404). */
  messages(conversationId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.base}/api/conversations/${conversationId}/messages`);
  }

  /** Envoi d'un message (201 ; 400 si vide ou au-dela de 2000 caracteres) ; l'autre participant est prevenu. */
  envoyer(conversationId: string, contenu: string): Observable<Message> {
    return this.http.post<Message>(`${this.base}/api/conversations/${conversationId}/messages`, { contenu });
  }
}
