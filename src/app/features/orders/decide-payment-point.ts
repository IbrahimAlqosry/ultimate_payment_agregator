import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { PaymentPoint } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';

/** There is no list/GET endpoint for payment points at all (confirmed in the v3.0 guide's
 * OpenAPI spec — only create and this decision endpoint exist), so the FI operator can't browse
 * to a pending point the way every other approval screen in this app works. They get the point's
 * `id` from the Merchant out-of-band and decide on it directly by pasting it in here; the record
 * shown below the form is only ever the one just decided (the decision response), not a lookup. */
@Component({
  selector: 'app-decide-payment-point',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe],
  templateUrl: './decide-payment-point.html',
  styleUrl: '../../shared/form-page.scss',
})
export class DecidePaymentPoint {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  readonly pointId = signal('');
  readonly reason = signal('');
  readonly acting = signal(false);
  readonly apiError = signal<string | null>(null);
  readonly decided = signal<PaymentPoint | null>(null);

  decide(decision: 'approved' | 'rejected'): void {
    const id = this.pointId().trim();
    if (!id || this.acting()) {
      return;
    }
    if (decision === 'rejected' && !this.reason().trim()) {
      return;
    }
    this.acting.set(true);
    this.apiError.set(null);
    this.api
      .decidePaymentPoint(id, {
        decision,
        rejectionReason: decision === 'rejected' ? this.reason().trim() : undefined,
      })
      .subscribe({
        next: (point) => {
          this.acting.set(false);
          this.decided.set(point);
          this.toast.decision('point', decision);
        },
        error: (err) => {
          this.acting.set(false);
          this.apiError.set(apiErrorMessageKey(err));
        },
      });
  }

  reset(): void {
    this.pointId.set('');
    this.reason.set('');
    this.decided.set(null);
    this.apiError.set(null);
  }
}
