import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { Operator, OperatorRole } from '@core/models';
import { DataState } from '@shared/data-state';
import { SearchField } from '@shared/search-field';

@Component({
  selector: 'app-users',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState, SearchField],
  templateUrl: './users.html',
  styles: `
    .badge.role-admin {
      background: #fdeded;
      color: #c0392b;
    }
    .badge.role-checker {
      background: #eef4fc;
      color: #2f80ed;
    }
    .badge.role-maker {
      background: #e8f6ed;
      color: #1fa64d;
    }
    .badge.role-reader {
      background: #f3f1f1;
      color: #7e7676;
    }
  `,
})
export class Users {
  private readonly api = inject(AtlasApi);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly all = signal<Operator[]>([]);
  readonly tab = signal('all');
  readonly statusFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = 8;
  query = '';

  readonly filtered = computed(() => {
    const status = this.statusFilter();
    return this.all().filter((row) => !status || row.status === status);
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));
  readonly rows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor() {
    this.load();
  }

  onQuery(query: string): void {
    this.query = query;
    this.page.set(1);
    this.load(true);
  }

  setTab(tab: string): void {
    this.tab.set(tab);
  }

  onStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  goTo(page: number): void {
    this.page.set(Math.min(this.pageCount(), Math.max(1, page)));
  }

  roleClass(role: OperatorRole): string {
    return `role-${role}`;
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.error.set(false);
    this.api.operators(this.query).subscribe({
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
