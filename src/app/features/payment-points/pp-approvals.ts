import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { PaymentPoint } from '@core/models.platform';
import { Counterparty } from '@shared/counterparty';
import { DataState } from '@shared/data-state';

/** Guide v6.0 §12.3 — `GET /payment-points/pending-approval`, the FI's queue. Each row opens the
 * Review screen (review-payment-point.ts), where the actual approve/reject happens. Merchant names
 * come from the row's own `merchant` summary (ID fallback). Point type / linked account have no
 * API source yet, so those design columns are left out. */
@Component({
  selector: 'app-pp-approvals',
  imports: [DatePipe, RouterLink, TranslocoPipe, Counterparty, DataState],
  templateUrl: './pp-approvals.html',
  styleUrl: '../../shared/list-page.scss',
})
export class PpApprovals {
  private readonly api = inject(PlatformApi);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly rows = signal<PaymentPoint[]>([]);
  readonly nextCursor = signal<string | null>(null);

  /** Only the loaded pages are known — show "50+" while more pages remain. */
  readonly pendingCount = computed(() => `${this.rows().length}${this.nextCursor() ? '+' : ''}`);

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
}
