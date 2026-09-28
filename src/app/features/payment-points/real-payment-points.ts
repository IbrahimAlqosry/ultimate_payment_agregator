import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { EMPTY, expand, reduce } from 'rxjs';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { MerchantApplicationDetails, PaymentPoint, PaymentPointStatus } from '@core/models.platform';
import { DataState } from '@shared/data-state';
import { DateFilter } from '@shared/date-filter';
import { MerchantLookup } from './merchant-lookup';

type PointsMode = 'merchant' | 'institution';
type StatusFilter = PaymentPointStatus | 'all';

const PAGE_SIZE = 10;
/** Safety cap on how many API pages (100 rows each) one visit will pull. */
const MAX_API_PAGES = 20;

/** New endpoint (2026-09-16 OpenAPI update): `GET /payment-points` — Merchant/FI session only,
 * auto-scoped to the caller's own points. Confirmed live `403` for Platform sessions, so the
 * operator-wide "all payment points" screen (orders.ts) stays on mock data; this real screen
 * covers only the Merchant "My Payment Points" and FI "All Payment Points" routes.
 *
 * The endpoint takes only `cursor` + `pageSize` — no status/date filters and no total count — so
 * the design's filter bar and numbered pager work client-side over every row, fetched up front.
 * The design's Point Type and Actioned By columns have no API source yet and are left out. */
@Component({
  selector: 'app-real-payment-points',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState, DateFilter],
  templateUrl: './real-payment-points.html',
  styleUrl: '../../shared/list-page.scss',
})
export class RealPaymentPoints {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  private readonly lookup = inject(MerchantLookup);
  readonly locale = inject(LocaleService);

  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly mode = computed<PointsMode>(() => (this.routeData()['mode'] as PointsMode | undefined) ?? 'merchant');

  readonly statusOptions: PaymentPointStatus[] = ['pendingFinancialInstitution', 'approved', 'rejected', 'disabled'];

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly rows = signal<PaymentPoint[]>([]);
  readonly merchants = signal<Readonly<Record<string, MerchantApplicationDetails | null>>>({});

  /** Edited in the filter bar; only take effect on Apply. */
  readonly draftStatus = signal<StatusFilter>('all');
  readonly draftFrom = signal('');
  readonly draftTo = signal('');
  private readonly applied = signal<{ status: StatusFilter; from: string; to: string }>({ status: 'all', from: '', to: '' });

  readonly page = signal(1);

  readonly filtered = computed(() => {
    const { status, from, to } = this.applied();
    return this.rows().filter((row) => {
      if (status !== 'all' && row.status !== status) {
        return false;
      }
      const day = localDay(row.createdAt);
      return (!from || day >= from) && (!to || day <= to);
    });
  });

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly pageRows = computed(() => this.filtered().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));

  /** Up to five page numbers around the current one. */
  readonly pageNumbers = computed(() => {
    const count = this.pageCount();
    const start = Math.max(1, Math.min(this.page() - 2, count - 4));
    return Array.from({ length: Math.min(5, count) }, (_, i) => start + i);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    let fetched = 0;
    this.api
      .listPaymentPoints({ pageSize: 100 })
      .pipe(
        expand((page) =>
          page.nextCursor && ++fetched < MAX_API_PAGES
            ? this.api.listPaymentPoints({ pageSize: 100, cursor: page.nextCursor })
            : EMPTY,
        ),
        reduce((all, page) => [...all, ...page.items], [] as PaymentPoint[]),
      )
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.page.set(1);
          this.loading.set(false);
          if (this.mode() === 'institution') {
            this.lookup
              .many(rows.map((row) => row.merchantId))
              .subscribe(([id, merchant]) => this.merchants.update((all) => ({ ...all, [id]: merchant })));
          }
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  applyFilters(): void {
    this.applied.set({ status: this.draftStatus(), from: this.draftFrom(), to: this.draftTo() });
    this.page.set(1);
  }

  clearFilters(): void {
    this.draftStatus.set('all');
    this.draftFrom.set('');
    this.draftTo.set('');
    this.applyFilters();
  }

  /** Design labels: Pending / Approved / Rejected / Disabled. */
  statusKey(status: PaymentPointStatus): string {
    return status === 'pendingFinancialInstitution' ? 'badge.pending' : `badge.${status}`;
  }

  goTo(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.pageCount()));
  }
}

/** `YYYY-MM-DD` in the viewer's time zone, to compare against `<input type="date">` values. */
function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
