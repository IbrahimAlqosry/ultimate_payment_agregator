import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { ApprovalStatus, Merchant } from '@core/models';
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';
import { SearchField } from '@shared/search-field';

type ListTab = 'all' | 'pending';

@Component({
  selector: 'app-products',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState, SearchField, ApprovalActions],
  templateUrl: './products.html',
})
export class Products {
  private readonly api = inject(AtlasApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly all = signal<Merchant[]>([]);
  readonly tab = signal<ListTab>('all');
  readonly statusFilter = signal('');
  readonly cityFilter = signal('');
  readonly erpFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = 6;
  query = '';

  readonly pendingCount = computed(() => this.all().filter((row) => row.status === 'pending').length);
  readonly cities = computed(() => [...new Set(this.all().map((row) => row.city))].sort());
  readonly erps = computed(() => [...new Set(this.all().map((row) => row.erpSystem))].sort());
  readonly filtered = computed(() => {
    let rows = this.all();
    if (this.tab() === 'pending') {
      rows = rows.filter((row) => row.status === 'pending');
    }
    const status = this.statusFilter();
    if (status) {
      rows = rows.filter((row) => row.status === status);
    }
    const city = this.cityFilter();
    if (city) {
      rows = rows.filter((row) => row.city === city);
    }
    const erp = this.erpFilter();
    if (erp) {
      rows = rows.filter((row) => row.erpSystem === erp);
    }
    return rows;
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));
  readonly rows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'pending' || tab === 'all') {
        this.tab.set(tab);
      }
      this.query = params.get('q') ?? '';
      this.page.set(1);
      this.load();
    });
  }

  onQuery(query: string): void {
    this.query = query;
    this.page.set(1);
    this.load(true);
  }

  setTab(tab: ListTab): void {
    this.tab.set(tab);
    this.page.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  onStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  onCity(event: Event): void {
    this.cityFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  onErp(event: Event): void {
    this.erpFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  goTo(page: number): void {
    this.page.set(Math.min(this.pageCount(), Math.max(1, page)));
  }

  badgeKey(status: ApprovalStatus): string {
    return status === 'approved' ? 'badge.active' : `badge.${status}`;
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.error.set(false);
    this.api.merchants(this.query).subscribe({
      next: (rows) => {
        this.all.set(rows);
        this.loading.set(false);
        if (this.page() > this.pageCount()) {
          this.page.set(this.pageCount());
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
