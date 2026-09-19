import { Pipe, PipeTransform, inject } from '@angular/core';
import { ClesTraduction } from './fr';
import { ParametresTraduction } from './traducteur';
import { TraductionService } from './traduction.service';

/**
 * `{{ 'nav.annuaire' | t }}`, `{{ 'avis.nombre' | t:{ n: 3 } }}` : libelle de la cle dans la langue courante.
 * Impur : un pipe pur ne serait pas reevalue au changement du signal de langue (sa cle ne change pas).
 * Le cout est une lecture de dictionnaire par cycle de detection.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TPipe implements PipeTransform {
  private i18n = inject(TraductionService);

  transform(cle: ClesTraduction | null | undefined, params?: ParametresTraduction): string {
    return cle ? this.i18n.t(cle, params) : '';
  }
}
