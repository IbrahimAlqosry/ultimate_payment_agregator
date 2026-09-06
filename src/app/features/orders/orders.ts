import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { PaymentPoint, PointScope } from '@core/models';
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';
import { SearchField } from '@shared/search-field';

type ListTab = 'all' | 'pending';
type PointLayout = 'merchant' | 'fi-pending' | 'fi-all' | 'operator';

@Component({
  selector: 'app-orders',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState, SearchField, ApprovalActions],
  templateUrl: './orders.html',
  styleUrl: '../../shared/list-page.scss',
})
export class Orders {
  private readonly api = inject(AtlasApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly scope = computed<PointScope>(() => (this.routeData()['scope'] as PointScope | undefined) ?? 'all');
  readonly titleKey = computed(() => (this.routeData()['titleKey'] as string | undefined) ?? 'points.title');

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly all = signal<PaymentPoint[]>([]);
  readonly tab = signal<ListTab>('all');
  readonly statusFilter = signal('');
  readonly statusDraft = signal('');
  readonly fromDraft = signal('');
  readonly toDraft = signal('');
  readonly appliedFrom = signal('');
  readonly appliedTo = signal('');
  readonly page = signal(1);
  readonly pageSize = 8;
  query = '';

  readonly layout = computed<PointLayout>(() => {
    switch (this.scope()) {
      case 'mine':
        return 'merchant';
      case 'pending':
        return 'fi-pending';
      case 'institution':
        return 'fi-all';
      default:
        return 'operator';
    }
  });

  readonly pendingCount = computed(() => this.all().filter((row) => row.status === 'pending').length);
  readonly filtered = computed(() => {
    let rows = this.all();
    if (this.layout() === 'fi-pending') {
      return rows.filter((row) => row.status === 'pending');
    }
    if (this.tab() === 'pending') {
      rows = rows.filter((row) => row.status === 'pending');
    }
    const status = this.statusFilter();
    if (status) {
      rows = rows.filter((row) => row.status === status);
    }
    if (this.layout() === 'fi-all') {
      const from = this.appliedFrom();
      const to = this.appliedTo();
      rows = rows.filter((row) => {
        const day = row.submittedAt.slice(0, 10);
        if (from && day < from) {
          return false;
        }
        if (to && day > to) {
          return false;
        }
        return true;
      });
    }
    return rows;
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));
  readonly rows = computed(() => {
    if (this.layout() === 'fi-pending') {
      return this.filtered();
    }
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.query = params.get('q') ?? '';
      const tab = params.get('tab');
      if (tab === 'pending' || tab === 'all') {
        this.tab.set(tab);
      }
      this.statusFilter.set(params.get('status') ?? '');
      this.statusDraft.set(params.get('status') ?? '');
      this.page.set(1);
      this.load(true);
    });
    effect(() => {
      this.scope();
      untracked(() => this.load());
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

  onStatusDraft(event: Event): void {
    this.statusDraft.set((event.target as HTMLSelectElement).value);
  }

  applyFilters(): void {
    this.appliedFrom.set(this.fromDraft());
    this.appliedTo.set(this.toDraft());
    this.page.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: this.statusDraft() || null },
      queryParamsHandling: 'merge',
    });
  }

  clearFilters(): void {
    this.statusDraft.set('');
    this.statusFilter.set('');
    this.fromDraft.set('');
    this.toDraft.set('');
    this.appliedFrom.set('');
    this.appliedTo.set('');
    this.page.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: null },
      queryParamsHandling: 'merge',
    });
  }

  goTo(page: number): void {
    this.page.set(Math.min(this.pageCount(), Math.max(1, page)));
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.error.set(false);
    this.api.paymentPoints(this.query, this.scope()).subscribe({
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
