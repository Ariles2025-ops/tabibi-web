import { formatDate } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { ClesTraduction } from './fr';
import { TraductionService } from './traduction.service';

/** Formats nommes, traduits (« EEEE d MMMM yyyy à HH:mm » en francais, « ... 'at' ... » en anglais). */
export type FormatDateNomme = 'jourDateHeure' | 'jourHeure' | 'dateHeure' | 'date' | 'courtHeure';

const CLES_FORMATS: Record<FormatDateNomme, ClesTraduction> = {
  jourDateHeure: 'format.jourDateHeure',
  jourHeure: 'format.jourHeure',
  dateHeure: 'format.dateHeure',
  date: 'format.date',
  courtHeure: 'format.courtHeure',
};

/**
 * `{{ iso | dateLocale:'jourHeure' }}` : comme `date`, mais avec la locale de la langue courante (fr, ar-DZ, en)
 * et un format nomme traduit (le mot « à » n'a pas de sens en anglais ni en arabe). Un format Angular brut
 * (« yyyy-MM-dd ») est aussi accepte. Impur, pour suivre le signal de langue.
 */
@Pipe({ name: 'dateLocale', standalone: true, pure: false })
export class DateLocalePipe implements PipeTransform {
  private i18n = inject(TraductionService);

  transform(valeur: string | number | Date | null | undefined, format: FormatDateNomme | string = 'dateHeure'): string {
    if (valeur === null || valeur === undefined || valeur === '') return '';
    const motif = format in CLES_FORMATS ? this.i18n.t(CLES_FORMATS[format as FormatDateNomme]) : format;
    try {
      return formatDate(valeur, motif, this.i18n.locale());
    } catch {
      return '';
    }
  }
}
