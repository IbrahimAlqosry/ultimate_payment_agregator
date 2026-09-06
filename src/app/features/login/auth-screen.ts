import { afterNextRender, Component, inject, Injector, input } from '@angular/core';
import { LoadingService } from '@core/http/loading.service';
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
      <div class="auth-lang">
        <app-language-switch appearance="auth" />
      </div>
    </section>
  `,
  styleUrl: './auth-screen.scss',
})
export class AuthScreen {
  private readonly loading = inject(LoadingService);
  private readonly injector = inject(Injector);
  readonly wide = input(false);

  constructor() {
    afterNextRender(() => this.loading.uncover(), { injector: this.injector });
  }
}
