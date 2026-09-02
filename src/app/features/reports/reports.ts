import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { AuditEvent } from '@core/models';
import { DataState } from '@shared/data-state';
import { SearchField } from '@shared/search-field';

@Component({
  selector: 'app-reports',
  imports: [TranslocoPipe, DatePipe, DataState, SearchField],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>{{ 'reports.title' | transloco }}</h1>
      </header>
      <div class="filters">
        <app-search-field placeholderKey="reports.search" (queryChange)="onQuery($event)" />
      </div>
      <div class="card table-card">
        <app-data-state
          [loading]="loading()"
          [error]="error()"
          [empty]="rows().length === 0"
          emptyKey="reports.empty"
          (retry)="load()"
        >
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ 'reports.at' | transloco }}</th>
                  <th>{{ 'reports.actor' | transloco }}</th>
                  <th>{{ 'reports.role' | transloco }}</th>
                  <th>{{ 'reports.action' | transloco }}</th>
                  <th>{{ 'reports.entity' | transloco }}</th>
                  <th>{{ 'reports.detail' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td class="muted">{{ row.at | date: 'medium' : undefined : locale.dateLocale() }}</td>
                    <td>{{ row.actor }}</td>
                    <td>{{ ('role.' + row.role) | transloco }}</td>
                    <td>{{ row.action }}</td>
                    <td>{{ row.entity }}</td>
                    <td class="muted">{{ row.detail }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-data-state>
      </div>
    </section>
  `,
})
export class Reports {
  private readonly api = inject(AtlasApi);
  readonly locale = inject(LocaleService);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly rows = signal<AuditEvent[]>([]);
  query = '';

  constructor() {
    this.load();
  }

  onQuery(query: string): void {
    this.query = query;
    this.load(true);
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.error.set(false);
    this.api.audit(this.query).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
