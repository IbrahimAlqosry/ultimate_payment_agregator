import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlatformInstitutionType } from '@core/models.platform';

/** A merchant or financial institution shown by its current legal name (plus the FI's bank /
 * wallet type), falling back to the raw ID when the backend's display summary is `null` or
 * absent — a missing label never hides the record itself. */
@Component({
  selector: 'app-counterparty',
  imports: [TranslocoPipe],
  template: `
    @if (name(); as label) {
      <span class="cp">
        <strong>{{ label }}</strong>
        @if (institutionType(); as type) {
          <span class="badge" [class.bank]="type === 'bank'" [class.wallet]="type === 'wallet'">{{ ('type.' + type) | transloco }}</span>
        }
      </span>
    } @else {
      <span class="mono cp-id">{{ id() }}</span>
    }
  `,
  styles: `
    .cp {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .cp-id {
      word-break: break-all;
    }
  `,
})
export class Counterparty {
  readonly name = input<string | null | undefined>(null);
  readonly id = input.required<string>();
  readonly institutionType = input<PlatformInstitutionType | null | undefined>(null);
}
