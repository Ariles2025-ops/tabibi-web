import { Component, inject } from '@angular/core';
import { LangueService } from './langue.service';

/** Bouton « العربية / Français » des ecrans prives. */
@Component({
  selector: 'app-selecteur-langue',
  template: `
    <button type="button" class="bouton-secondaire" (click)="langue.basculer()" [attr.lang]="langue.ar() ? 'fr' : 'ar'"
            style="padding:6px 14px;font-size:.85rem">{{ langue.ar() ? 'Français' : 'العربية' }}</button>
  `,
})
export class SelecteurLangueComponent {
  langue = inject(LangueService);
}
