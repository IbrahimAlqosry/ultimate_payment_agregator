import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { PaymentPoint } from '@core/models.platform';
import { DataState } from '@shared/data-state';

type PointsMode = 'merchant' | 'institution';

/** New endpoint (2026-09-16 OpenAPI update): `GET /payment-points` — Merchant/FI session only,
 * auto-scoped to the caller's own points. Confirmed live `403` for Platform sessions, so the
 * operator-wide "all payment points" screen (orders.ts) stays on mock data; this real screen
 * covers only the Merchant "My Payment Points" and FI "All Payment Points" routes. */
@Component({
  selector: 'app-real-payment-points',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState],
  templateUrl: './real-payment-points.html',
  styleUrl: '../../shared/list-page.scss',
})
export class RealPaymentPoints {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  readonly locale = inject(LocaleService);

  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly mode = computed<PointsMode>(() => (this.routeData()['mode'] as PointsMode | undefined) ?? 'merchant');
  readonly listPath = computed(() => (this.mode() === 'merchant' ? '/my-payment-points' : '/all-payment-points'));

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly rows = signal<PaymentPoint[]>([]);
  readonly nextCursor = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listPaymentPoints({ pageSize: 50 }).subscribe({
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
    this.api.listPaymentPoints({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        this.rows.update((existing) => [...existing, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }
}
