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
 * l'appli) ; les autres statuts (400, 401, 403, 404...) gardent le message de l'API.
 */
export const erreurApiInterceptor: HttpInterceptorFn = (req, next) => {
  const langue = inject(LangueService);
  return next(req).pipe(
    catchError((e: unknown) => {
      if (!(e instanceof HttpErrorResponse) || !req.url.includes('/api/')) return throwError(() => e);
      const message = messageTechnique(e.status, langue) ?? messageConflit(e, langue);
      if (!message) return throwError(() => e);
      return throwError(
        () =>
          new HttpErrorResponse({
            error: { erreur: message },
            headers: e.headers,
            status: e.status,
            statusText: e.statusText,
            url: e.url ?? undefined,
          }),
      );
    }),
  );
};

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
  if (m.includes('rendez-vous à venir')) return 'لديك بالفعل موعد قادم مع هذا الطبيب: ألغِه لاختيار موعد آخر.';
  if (m.includes('chevauche')) return 'هذا الموعد يتداخل مع موعد آخر لديك.';
  if (m.includes('déjà passé') || m.includes('deja passe')) return 'هذا الموعد قد مضى بالفعل.';
  if (m.includes('pris') || m.includes('réservé')) return 'هذا الموعد حُجز للتوّ.';
  if (m.includes('créneau') || m.includes('creneau')) return 'هذا الموعد لم يعد متاحًا.';
  return 'تعذّر الإجراء: تغيّر الوضع في الأثناء';
}
