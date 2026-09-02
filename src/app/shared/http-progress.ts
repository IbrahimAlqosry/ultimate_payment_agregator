import { Component, inject } from '@angular/core';
import { LoadingService } from '@core/http/loading.service';

@Component({
  selector: 'app-http-progress',
  template: `
    @if (loading.active()) {
      <div class="http-progress" role="progressbar" aria-hidden="true"></div>
    }
  `,
})
export class HttpProgress {
  readonly loading = inject(LoadingService);
}
