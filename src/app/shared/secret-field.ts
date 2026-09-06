import { booleanAttribute, Component, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-secret-field',
  imports: [TranslocoPipe],
  template: `
    @if (value() === undefined) {
      <ng-content />
    } @else {
      <span>{{ revealed() ? value() : '••••••••' }}</span>
    }
    <button
      class="show-btn"
      type="button"
      (click)="revealed.set(!revealed())"
      [attr.aria-pressed]="revealed()"
    >
      @if (eye()) {
        <img src="icons/eye.svg" width="14" height="14" alt="" />
      }
      {{ (revealed() ? hideKey() : revealKey()) | transloco }}
    </button>
  `,
  host: {
    '[class.is-open]': 'revealed()',
    '[class.readonly]': 'value() !== undefined',
  },
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-height: 44px;
      padding: 0 14px;
      border: 1px solid #dcd5d5;
      border-radius: 8px;
      background: #fff;
      font-size: 13px;
      box-sizing: border-box;
    }

    :host(.readonly) {
      justify-content: space-between;
      background: #f7f5f5;
    }

    :host(:not(.readonly):focus-within) {
      border-color: #1fa64d;
      box-shadow: 0 0 0 3px rgba(31, 166, 77, 0.18);
    }

    :host span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .show-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 0;
      background: transparent;
      color: #1fa64d;
      font-size: 12px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }
  `,
})
export class SecretField {
  readonly value = input<string | undefined>(undefined);
  readonly eye = input(false, { transform: booleanAttribute });
  readonly revealKey = input('notes.show');
  readonly hideKey = input('notes.hide');
  readonly revealed = model(false);
}
