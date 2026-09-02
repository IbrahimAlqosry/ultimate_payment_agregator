import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-page-header',
  imports: [TranslocoPipe],
  template: `
    <header class="page-head">
      <div>
        <h1>{{ titleKey() | transloco }}</h1>
        @if (introKey(); as intro) {
          <p>{{ intro | transloco }}</p>
        }
      </div>
      <ng-content />
    </header>
  `,
})
export class PageHeader {
  readonly titleKey = input.required<string>();
  readonly introKey = input<string>();
}
