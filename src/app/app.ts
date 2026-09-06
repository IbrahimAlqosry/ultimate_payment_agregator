import { afterNextRender, Component, inject, Injector } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LoadingService } from '@core/http/loading.service';
import { LocaleService } from '@core/i18n/locale.service';
import { PageLoader } from '@shared/page-loader';
import { ToastHost } from '@shared/toast-host';

@Component({
  imports: [RouterOutlet, TranslocoPipe, ToastHost, PageLoader],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly loading = inject(LoadingService);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);
  private readonly injector = inject(Injector);

  constructor() {
    const started = performance.now();
    const hideBoot = () => {
      const wait = Math.max(0, 700 - (performance.now() - started));
      window.setTimeout(() => document.getElementById('app-boot')?.remove(), wait);
    };

    afterNextRender(
      () => {
        this.transloco.load(this.locale.lang()).subscribe({
          next: hideBoot,
          error: hideBoot,
        });
      },
      { injector: this.injector },
    );
  }
}
