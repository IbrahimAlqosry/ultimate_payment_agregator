import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { ApplicationStatus, MerchantApplicationDetails } from '@core/models.platform';
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';
import { SearchField } from '@shared/search-field';

type ListTab = 'all' | 'pending';

const PENDING_STATUSES: ApplicationStatus[] = ['awaitingMaker', 'pendingChecker', 'provisioning'];

@Component({
  selector: 'app-products',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState, SearchField, ApprovalActions],
  templateUrl: './products.html',
})
export class Products {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly all = signal<MerchantApplicationDetails[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly tab = signal<ListTab>('all');
  readonly statusFilter = signal('');
  readonly query = signal('');

  readonly pendingCount = computed(() => this.all().filter((row) => PENDING_STATUSES.includes(row.status)).length);
  readonly filtered = computed(() => {
    let rows = this.all();
    if (this.tab() === 'pending') {
      rows = rows.filter((row) => PENDING_STATUSES.includes(row.status));
    }
    const status = this.statusFilter();
    if (status) {
      rows = rows.filter((row) => row.status === status);
    }
    const q = this.query().trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (row) =>
          row.legalName.toLowerCase().includes(q) ||
          row.commercialRegistrationNumber.toLowerCase().includes(q) ||
          row.contact.email.toLowerCase().includes(q),
      );
    }
    return rows;
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'pending' || tab === 'all') {
        this.tab.set(tab);
      }
    });
    this.load();
  }

  onQuery(query: string): void {
    this.query.set(query);
  }

  setTab(tab: ListTab): void {
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  onStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  statusBadgeClass(status: ApplicationStatus): { ok: boolean; warn: boolean; danger: boolean } {
    return { ok: status === 'active', warn: PENDING_STATUSES.includes(status), danger: status === 'rejected' };
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listMerchantApplications({ pageSize: 50 }).subscribe({
      next: (page) => {
        this.all.set(page.items);
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
    this.api.listMerchantApplications({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        this.all.update((rows) => [...rows, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }
}
