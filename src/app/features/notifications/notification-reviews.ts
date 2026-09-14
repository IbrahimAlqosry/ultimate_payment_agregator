import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { apiErrorMessageKey, MISSING_CONCURRENCY_TOKEN_KEY } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { NotificationEndpointConfigurationReview } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { ApprovalActions } from '@shared/approval-actions';

/** Platform side of guide v4.0 §15: every Merchant submission starts at `awaitingMaker` and needs
 * a Platform Maker to move it to `pendingChecker` (maker-submit, no body) before a Checker/Admin
 * can decide it — a real extra step this API has that most other maker-checker flows here don't,
 * since elsewhere the initial submission already lands at `pendingChecker`. No merchant identity
 * is ever included (guide §15.5) — this queue can only be worked by configuration id/version. */
@Component({
  selector: 'app-notification-reviews',
  imports: [DatePipe, FormsModule, TranslocoPipe, DataState, ApprovalActions],
  templateUrl: './notification-reviews.html',
  styleUrl: '../../shared/list-page.scss',
})
export class NotificationReviews {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly loadingMore = signal(false);
  readonly rows = signal<NotificationEndpointConfigurationReview[]>([]);
  readonly nextCursor = signal<string | null>(null);

  readonly actionError = signal<string | null>(null);
  readonly rejecting = signal<NotificationEndpointConfigurationReview | null>(null);
  readonly reason = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listNotificationReviews({ pageSize: 50 }).subscribe({
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
    this.api.listNotificationReviews({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        this.rows.update((rows) => [...rows, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  statusBadgeClass(status: NotificationEndpointConfigurationReview['status']): {
    ok: boolean;
    warn: boolean;
    danger: boolean;
  } {
    return {
      ok: status === 'approved',
      warn: status === 'awaitingMaker' || status === 'pendingChecker',
      danger: status === 'rejected',
    };
  }

  submitForReview(row: NotificationEndpointConfigurationReview): void {
    this.actionError.set(null);
    this.api.makerSubmitNotificationReview(row.configurationId, row.version).subscribe({
      next: () => this.load(),
      error: (err) => this.actionError.set(apiErrorMessageKey(err)),
    });
  }

  askReject(row: NotificationEndpointConfigurationReview): void {
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

  decide(row: NotificationEndpointConfigurationReview, decision: 'approved' | 'rejected', rejectionReason?: string): void {
    this.actionError.set(null);
    if (!row.concurrencyToken) {
      this.actionError.set(MISSING_CONCURRENCY_TOKEN_KEY);
      this.toast.fail(MISSING_CONCURRENCY_TOKEN_KEY);
      return;
    }
    this.api
      .decideNotificationReview(row.configurationId, row.version, {
        decision,
        concurrencyToken: row.concurrencyToken,
        rejectionReason,
      })
      .subscribe({
        next: () => {
          this.toast.decision('notification', decision);
          this.load();
        },
        error: (err) => this.actionError.set(apiErrorMessageKey(err)),
      });
  }
}
