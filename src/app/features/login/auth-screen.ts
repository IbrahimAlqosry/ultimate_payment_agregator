import { Component, input } from '@angular/core';
import { LanguageSwitch } from '@shared/language-switch';

@Component({
  selector: 'app-auth-screen',
  imports: [LanguageSwitch],
  template: `
    <section class="auth-screen" [class.wide]="wide()">
      <div class="accents" aria-hidden="true">
        <div class="accent accent-tl">
          <span class="bar bar-lg green"></span>
          <span class="bar bar-sm forest"></span>
        </div>
        <div class="accent accent-br">
          <span class="bar bar-sm olive"></span>
          <span class="bar bar-lg green"></span>
        </div>
      </div>
      <div class="auth-card" id="main">
        <ng-content />
      </div>
      <app-language-switch appearance="auth" />
    </section>
  `,
  styleUrl: './auth-screen.scss',
})
export class AuthScreen {
  readonly wide = input(false);
}
