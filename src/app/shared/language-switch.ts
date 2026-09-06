import { Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleService } from '@core/i18n/locale.service';

@Component({
  selector: 'app-language-switch',
  imports: [TranslocoPipe],
  template: `
    <div
      class="lang-switch"
      [class.auth]="appearance() === 'auth'"
      [class.ar]="locale.lang() === 'ar'"
      role="group"
      dir="ltr"
      [attr.aria-label]="'common.language' | transloco"
    >
      <span class="lang-thumb" aria-hidden="true"></span>
      <button
        type="button"
        [class.active]="locale.lang() === 'en'"
        [attr.aria-pressed]="locale.lang() === 'en'"
        (click)="locale.setLang('en')"
      >
        EN
        <span class="visually-hidden">{{ 'common.en' | transloco }}</span>
      </button>
      <button
        type="button"
        [class.active]="locale.lang() === 'ar'"
        [attr.aria-pressed]="locale.lang() === 'ar'"
        (click)="locale.setLang('ar')"
      >
        AR
        <span class="visually-hidden">{{ 'common.ar' | transloco }}</span>
      </button>
    </div>
  `,
})
export class LanguageSwitch {
  readonly locale = inject(LocaleService);
  readonly appearance = input<'default' | 'auth'>('default');
}
