import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { PaymentMatchStatus, PaymentNotificationLogEntry, TransactionStatus } from '@core/models.platform';
import { DataState } from '@shared/data-state';

type HistoryMode = 'merchant' | 'institution';

/** Guide v7.0 §13.4-13.7 — new: Merchant/FI browse their own accepted payment history (all of
 * it, not just a single lookup by FI+transaction id — that remains payment-inquiry.ts's job).
 * Uses acceptance time (`acceptedAt`), not transaction time, for its date filter — matches the
 * real API's `acceptedFrom`/`acceptedTo` window, distinct from the dashboard's fixed 30-day one.
 * A Merchant can carry an unmatched row straight into the existing matching form on
 * payment-inquiry.ts via "Use for match" rather than retyping the FI/transaction id. */
@Component({
  selector: 'app-payment-history',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState],
  templateUrl: './payment-history.html',
  styleUrl: '../../shared/list-page.scss',
})
export class PaymentHistory {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  readonly locale = inject(LocaleService);

  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly mode = computed<HistoryMode>(() => (this.routeData()['mode'] as HistoryMode | undefined) ?? 'merchant');

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly rows = signal<PaymentNotificationLogEntry[]>([]);
  readonly nextCursor = signal<string | null>(null);

  readonly transactionId = signal('');
  readonly transactionStatus = signal<TransactionStatus | ''>('');
  readonly matchStatus = signal<PaymentMatchStatus | ''>('');
  readonly acceptedFrom = signal('');
  readonly acceptedTo = signal('');

  constructor() {
    this.applyInitialFilters();
    this.load();
  }

  /** dashboard.ts's payment-notification breakdown tiles link here with `status`/`match`/
   * `from`/`to` query params (the summary's own `windowStart`/`windowEnd`) so a KPI count is one
   * click from the filtered rows behind it, instead of landing on an unfiltered list. */
  private applyInitialFilters(): void {
    const params = this.route.snapshot.queryParamMap;
    const status = params.get('status');
    if (status === '00002' || status === '00007') {
      this.transactionStatus.set(status);
    }
    const match = params.get('match');
    if (match === 'unmatched' || match === 'matchedByTransactionId' || match === 'matchedByNotificationTap' || match === 'conflict') {
      this.matchStatus.set(match);
    }
    const from = params.get('from');
    if (from) {
      this.acceptedFrom.set(from.slice(0, 10));
    }
    const to = params.get('to');
    if (to) {
      this.acceptedTo.set(to.slice(0, 10));
    }
  }

  private query(cursor?: string) {
    return {
      pageSize: 50,
      cursor,
      transactionId: this.transactionId().trim() || undefined,
      transactionStatus: this.transactionStatus() || undefined,
      matchStatus: this.matchStatus() || undefined,
      acceptedFrom: this.acceptedFrom() ? new Date(this.acceptedFrom()).toISOString() : undefined,
      // Exclusive upper bound — advance one day so a picked end-date's whole day is included.
      acceptedTo: this.acceptedTo()
        ? new Date(new Date(this.acceptedTo()).getTime() + 86_400_000).toISOString()
        : undefined,
    };
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listPaymentHistory(this.query()).subscribe({
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
    this.api.listPaymentHistory(this.query(cursor)).subscribe({
      next: (page) => {
        this.rows.update((existing) => [...existing, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  onFilterChange(): void {
    this.load();
  }

  matchQueryParams(row: PaymentNotificationLogEntry) {
    return {
      fi: row.financialInstitutionId,
      txn: row.transactionId,
      amount: row.amount,
      currency: row.currency,
    };
  }
}
