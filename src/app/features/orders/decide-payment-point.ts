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

/** Guide v6.0 §12.3 added a real pending-approval queue for the FI (see pp-approvals.ts, now the
 * primary screen for this workflow). This "decide by ID" form stays as a manual fallback — e.g.
 * a point the loaded queue page hasn't reached yet — since there's still no general list/GET-by-id
 * endpoint (only create + this decision endpoint + the FI's own pending list exist). The record
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
