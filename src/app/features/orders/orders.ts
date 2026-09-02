import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { ToastService } from '@core/notifications/toast.service';
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
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly scope = input<PointScope>('all');
  readonly titleKey = input('points.title');

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly all = signal<PaymentPoint[]>([]);
  readonly tab = signal<ListTab>('all');
  readonly statusFilter = signal('');
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
  }

  onStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
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

  decide(id: string, decision: 'approved' | 'rejected'): void {
    this.api.decide('point', id, decision).subscribe({
      next: () => {
        this.toast.decision('point', decision);
        this.load(true);
      },
    });
  }
}
