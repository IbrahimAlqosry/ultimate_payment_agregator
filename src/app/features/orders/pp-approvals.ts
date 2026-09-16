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
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';

/** Guide v6.0 §12.3 — `GET /payment-points/pending-approval` finally gives the FI a real queue,
 * replacing the earlier "decide by ID" workaround (see decide-payment-point.ts, still reachable
 * as a manual fallback). Direct FI action, not maker-checker: approve/reject applies immediately,
 * no concurrency token. A cursor is only valid while its row is still pending for this FI, so
 * every decision restarts paging from page one rather than patching the loaded row in place. */
@Component({
  selector: 'app-pp-approvals',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState, ApprovalActions],
  templateUrl: './pp-approvals.html',
  styleUrl: '../../shared/list-page.scss',
})
export class PpApprovals {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly rows = signal<PaymentPoint[]>([]);
  readonly nextCursor = signal<string | null>(null);

  readonly acting = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly rejecting = signal<PaymentPoint | null>(null);
  readonly reason = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listPendingPaymentPoints({ pageSize: 50 }).subscribe({
      next: (page) => {
        this.rows.set(page.items);
        this.nextCursor.set(page.nextCursor);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) {
      return;
    }
    this.loadingMore.set(true);
    this.api.listPendingPaymentPoints({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        this.rows.update((existing) => [...existing, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  askReject(row: PaymentPoint): void {
    this.reason.set('');
    this.rejecting.set(row);
  }

  cancelReject(): void {
    this.rejecting.set(null);
    this.reason.set('');
  }

  confirmReject(): void {
    const row = this.rejecting();
    if (!row || !this.reason().trim()) {
      return;
    }
    this.decide(row, 'rejected', this.reason().trim());
    this.cancelReject();
  }

  decide(row: PaymentPoint, decision: 'approved' | 'rejected', rejectionReason?: string): void {
    if (this.acting()) {
      return;
    }
    this.acting.set(true);
    this.actionError.set(null);
    this.api.decidePaymentPoint(row.id, { decision, rejectionReason }).subscribe({
      next: () => {
        this.acting.set(false);
        this.toast.decision('point', decision);
        // A cursor is only valid while its row stays pending — restart from page one.
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.actionError.set(apiErrorMessageKey(err));
      },
    });
  }
}
