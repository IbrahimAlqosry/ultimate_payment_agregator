import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { DashboardSummaryResponse, PlatformAccountType } from '@core/models.platform';
import { DataState } from '@shared/data-state';

/** Guide v7.0 §18 — real GET /dashboard/summary, replacing the previous mock dashboard's
 * time-range selector, SLA donut, weekly-activity chart, and recent-activity tables: none of
 * that has a real equivalent (the summary is one fixed, non-configurable snapshot per
 * accountType — see docs/BUSINESS_AND_API.md and DashboardSummaryResponse's doc comment). */
@Component({
  selector: 'app-dashboard',
  imports: [TranslocoPipe, DatePipe, DataState, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly api = inject(PlatformApi);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly data = signal<DashboardSummaryResponse | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.getDashboardSummary().subscribe({
      next: (payload) => {
        this.data.set(payload);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  historyPath(accountType: PlatformAccountType): string {
    return accountType === 'merchant' ? '/my-payment-history' : '/all-payment-history';
  }

  /** For the payment-notifications breakdown tiles: the summary's own window, plus the tile's
   * status/match filter, so a tap lands on the already-filtered payment-history rows instead of
   * an unfiltered list. */
  historyParams(
    windowStart: string,
    windowEnd: string,
    extra: { status?: string; match?: string } = {},
  ): Record<string, string> {
    return { from: windowStart, to: windowEnd, ...extra };
  }
}
