import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LangueService } from './langue.service';

/**
 * Messages d'erreur reseau/serveur identiques a ceux de l'appli mobile (api_service.dart) :
 * reseau coupe, 429 (limiteur) et 5xx. Les ecrans lisent `e.error?.erreur ?? « repli propre a l'ecran »` : en
 * posant ici `error.erreur`, ces cas affichent un message juste (et en arabe si l'ecran est en arabe) au lieu
 * d'un repli trompeur du type « La reservation a echoue » ou d'un message technique du serveur.
 * Un 409 avec message de l'API est traduit en arabe quand le site est en arabe (comme `traduireErreurServeur` de
 * l'appli) ; 400/403/404 en arabe : voir messageRefusArabe ; 401 garde le message de l'API.
 */
export const erreurApiInterceptor: HttpInterceptorFn = (req, next) => {
  const langue = inject(LangueService);
  return next(req).pipe(
    catchError((e: unknown) => {
      if (!(e instanceof HttpErrorResponse) || !req.url.includes('/api/')) return throwError(() => e);
      const message = messageTechnique(e.status, langue) ?? messageConflit(e, langue) ?? messageRefusArabe(e, langue);
      if (message === VIDE) return throwError(() => reconstruire(e, {}));
      if (!message) return throwError(() => e);
      return throwError(
        () => reconstruire(e, { erreur: message }),
      );
    }),
  );
};

const VIDE = '\u0000';

function reconstruire(e: HttpErrorResponse, error: object): HttpErrorResponse {
  return new HttpErrorResponse({ error, headers: e.headers, status: e.status, statusText: e.statusText, url: e.url ?? undefined });
}

/**
 * Refus 400/403/404 de l'API (message toujours en français) quand le site est en arabe : jamais de français.
 * 400 et 403 : le message est retiré (VIDE) pour que l'écran affiche son repli arabe (`e.error?.erreur ?? t(fr, ar)`).
 * 404 : message arabe générique (certains écrans testent la présence d'un message). Message déjà en arabe : inchangé.
 */
export function messageRefusArabe(e: HttpErrorResponse, langue: LangueService): string | null {
  const texte = e.error?.erreur;
  if (![400, 403, 404].includes(e.status) || !langue.ar() || typeof texte !== 'string' || !texte.trim()) return null;
  if (/[\u0600-\u06FF]/.test(texte)) return null;
  // 400 « chevauche » : le texte d'origine reste, la serie de creneaux (gestion-creneaux) s'en sert pour ignorer un creneau existant.
  if (e.status === 400 && /chevauch/i.test(texte)) return null;
  return e.status === 404 ? 'العنصر المطلوب غير موجود.' : VIDE;
}

/** Message pour un reseau coupe (statut 0), un 429 ou un 5xx ; null pour tout autre statut. */
export function messageTechnique(status: number, langue: LangueService): string | null {
  if (status === 0) return langue.t('Pas de connexion. Vérifiez votre réseau.', 'لا يوجد اتصال. تحقق من الشبكة.');
  if (status === 429) return langue.t('Trop de demandes, réessayez dans une minute.', 'طلبات كثيرة جدًا، حاول مرة أخرى بعد دقيقة.');
  if (status >= 500) return langue.t('Le serveur rencontre un problème. Réessayez plus tard.', 'يواجه الخادم مشكلة. حاول لاحقًا.');
  return null;
}

/**
 * Textes des 409 de l'API (toujours en français) rendus en arabe, comme `traduireErreurServeur` de l'appli mobile :
 * en arabe, un 409 avec message ne laisse plus passer de français. Sans message ou en français : null (message inchangé).
 */
export function messageConflit(e: HttpErrorResponse, langue: LangueService): string | null {
  const texte = e.error?.erreur;
  if (e.status !== 409 || !langue.ar() || typeof texte !== 'string' || !texte.trim()) return null;
  if (/[\u0600-\u06FF]/.test(texte)) return null;
  const m = texte.toLowerCase();
  if (m.includes('rendez-vous à venir') || m.includes('rendez-vous a venir')) return 'لديك بالفعل موعد قادم مع هذا الطبيب: ألغِه لاختيار موعد آخر.';
  if (m.includes('chevauche')) return 'هذا الموعد يتداخل مع موعد آخر لديك.';
  if (m.includes('déjà passé') || m.includes('deja passe')) return 'هذا الموعد قد مضى بالفعل.';
  // Refus propres au cabinet (avant « pris » / « réservé », qui les captaient a tort) : suppression d'un creneau reserve,
  // ouverture d'un creneau deja existant, rendez-vous pris par telephone (patient sans compte).
  if (m.includes("annulez d'abord") || m.includes('annulez d’abord')) return 'هذا الموعد محجوز: ألغِ الحجز أولًا.';
  if (m.includes('créneau existe déjà') || m.includes('creneau existe deja')) return 'يوجد موعد في هذا الوقت بالفعل.';
  if (m.includes('par téléphone') || m.includes('par telephone')) return 'هذا الموعد حُجز عبر الهاتف: ليس للمريض حساب.';
  if (m.includes('pris') || m.includes('réservé')) return 'هذا الموعد حُجز للتوّ.';
  if (m.includes('créneau') || m.includes('creneau')) return 'هذا الموعد لم يعد متاحًا.';
  return 'تعذّر الإجراء: تغيّر الوضع في الأثناء';
}
