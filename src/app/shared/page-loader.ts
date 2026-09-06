import { booleanAttribute, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-page-loader',
  imports: [TranslocoPipe],
  template: `
    <div class="pay-loader" role="status" dir="ltr">
      @if (cover()) {
        <div class="pay-accents" aria-hidden="true">
          <div class="pay-accent pay-accent-tl">
            <span class="pay-bar pay-bar-lg"></span>
            <span class="pay-bar pay-bar-sm forest"></span>
          </div>
          <div class="pay-accent pay-accent-br">
            <span class="pay-bar pay-bar-sm olive"></span>
            <span class="pay-bar pay-bar-lg"></span>
          </div>
        </div>
      }
      <div class="logo-row">
        <img class="flag-bars" src="brand/flag-bars.svg" width="52.923" height="29.116" alt="" />
        <p class="wordmark">
          <strong>Ultimate</strong>
          <span>pay</span>
        </p>
      </div>
      <svg class="pay-nfc" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <circle cx="4.2" cy="12" r="1.5" />
        <path class="w1" d="M8 9.2a5.2 5.2 0 0 1 0 5.6" />
        <path class="w2" d="M11.4 6.6a8.4 8.4 0 0 1 0 10.8" />
        <path class="w3" d="M14.8 4a11.6 11.6 0 0 1 0 16" />
      </svg>
      <span class="visually-hidden">{{ 'common.loading' | transloco }}</span>
    </div>
  `,
  host: {
    '[class.cover]': 'cover()',
  },
  styles: `
    :host {
      display: flex;
      flex: 1 1 auto;
      width: 100%;
      min-height: 220px;
      align-items: center;
      justify-content: center;
    }

    :host.cover {
      position: fixed;
      inset: 0;
      z-index: 100;
      overflow: hidden;
      min-height: 0;
      background: #efe8e8;
    }

    :host.cover .pay-loader {
      width: 100%;
      height: 100%;
    }
  `,
})
export class PageLoader {
  readonly cover = input(false, { transform: booleanAttribute });
}
