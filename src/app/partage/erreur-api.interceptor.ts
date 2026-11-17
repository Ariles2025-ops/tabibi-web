import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LangueService } from './langue.service';

/**
 * Messages d'erreur reseau/serveur identiques a ceux de l'appli mobile (api_service.dart) :
 * reseau coupe, 429 (limiteur) et 5xx. Les ecrans lisent `e.error?.erreur ?? « repli propre a l'ecran »` : en
 * posant ici `error.erreur`, ces cas affichent un message juste (et en arabe si l'ecran est en arabe) au lieu
 * d'un repli trompeur du type « La reservation a echoue » ou d'un message technique du serveur.
 * Les autres statuts (400, 401, 403, 404, 409...) gardent le message de l'API.
 */
export const erreurApiInterceptor: HttpInterceptorFn = (req, next) => {
  const langue = inject(LangueService);
  return next(req).pipe(
    catchError((e: unknown) => {
      if (!(e instanceof HttpErrorResponse) || !req.url.includes('/api/')) return throwError(() => e);
      const message = messageTechnique(e.status, langue);
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
