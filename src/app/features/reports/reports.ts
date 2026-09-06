import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { AuditEvent, AuditEventType } from '@core/models';
import { DataState } from '@shared/data-state';

@Component({
  selector: 'app-reports',
  imports: [TranslocoPipe, DatePipe, DataState],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>{{ 'reports.title' | transloco }}</h1>
      </header>
      <div class="card filter-card">
        <label class="filter-group">
          <span>{{ 'reports.from' | transloco }}</span>
          <input class="filter" type="date" [value]="from()" (change)="from.set($any($event.target).value)" />
        </label>
        <label class="filter-group">
          <span>{{ 'reports.to' | transloco }}</span>
          <input class="filter" type="date" [value]="to()" (change)="to.set($any($event.target).value)" />
        </label>
        <label class="filter-group">
          <span>{{ 'reports.eventType' | transloco }}</span>
          <select class="filter" [value]="eventType()" (change)="eventType.set($any($event.target).value)">
            <option value="all">{{ 'reports.allEvents' | transloco }}</option>
            <option value="login">{{ 'reports.types.login' | transloco }}</option>
            <option value="approval">{{ 'reports.types.approval' | transloco }}</option>
            <option value="modification">{{ 'reports.types.modification' | transloco }}</option>
            <option value="rejection">{{ 'reports.types.rejection' | transloco }}</option>
          </select>
        </label>
        <button class="btn btn-primary" type="button" (click)="apply()">{{ 'reports.apply' | transloco }}</button>
        <button class="btn btn-export" type="button" (click)="exportCsv()" [disabled]="filtered().length === 0">
          <img src="icons/file-text.svg" width="14" height="14" alt="" />
          {{ 'reports.export' | transloco }}
        </button>
      </div>
      <div class="card table-card">
        <app-data-state
          [loading]="loading()"
          [error]="error()"
          [empty]="filtered().length === 0"
          emptyKey="reports.empty"
          (retry)="load()"
        >
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ 'reports.at' | transloco }}</th>
                  <th>{{ 'reports.event' | transloco }}</th>
                  <th>{{ 'reports.description' | transloco }}</th>
                  <th>{{ 'reports.performedBy' | transloco }}</th>
                  <th>{{ 'reports.ip' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of pageRows(); track row.id) {
                  <tr>
                    <td class="muted">{{ row.at | date: 'medium' : undefined : locale.dateLocale() }}</td>
                    <td>
                      <span class="badge" [class]="eventClass(row.eventType)">
                        {{ ('reports.types.' + (row.eventType || 'modification')) | transloco }}
                      </span>
                    </td>
                    <td>{{ row.detail || row.action }}</td>
                    <td>
                      <strong>{{ row.actor }}</strong>
                    </td>
                    <td class="muted">{{ row.ipAddress || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <footer class="table-foot">
            <p>{{ 'reports.showing' | transloco: { shown: pageRows().length, total: filtered().length } }}</p>
            <div class="pager">
              <button class="page-btn ghost" type="button" (click)="goTo(page() - 1)" [disabled]="page() === 1">
                <img src="icons/chevron-left.svg" width="14" height="14" alt="" />
              </button>
              @for (n of pages(); track n) {
                <button class="page-btn" type="button" [class.active]="page() === n" (click)="goTo(n)">{{ n }}</button>
              }
              <button class="page-btn" type="button" (click)="goTo(page() + 1)" [disabled]="page() >= pageCount()">
                <img src="icons/chevron-right.svg" width="14" height="14" alt="" />
              </button>
            </div>
          </footer>
        </app-data-state>
      </div>
    </section>
  `,
  styles: `
    .filter-card {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 16px;
      padding: 20px 24px;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .filter-group > span {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #7e7676;
    }
    .filter-card .btn-primary {
      border-radius: 6px;
      padding: 10px 20px;
    }
    .filter-card .btn-export {
      margin-inline-start: auto;
      border-radius: 6px;
      padding: 10px 20px;
    }
    .filter-card .btn-export img {
      width: 14px;
      height: 14px;
    }
    @media (max-width: 860px) {
      .filter-card {
        padding: 16px;
      }
      .filter-group,
      .filter-card .btn-primary,
      .filter-card .btn-export {
        width: 100%;
        margin-inline-start: 0;
      }
    }
    .badge.login {
      background: #ebf2ff;
      color: #36c;
    }
    .badge.approval {
      background: #e8f6ed;
      color: #1fa64d;
    }
    .badge.modification {
      background: #fef5ec;
      color: #e67e22;
    }
    .badge.rejection {
      background: #fdeded;
      color: #c0392b;
    }
  `,
})
export class Reports {
  private readonly api = inject(AtlasApi);
  readonly locale = inject(LocaleService);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly all = signal<AuditEvent[]>([]);
  readonly from = signal('2026-08-01');
  readonly to = signal('2026-08-31');
  readonly eventType = signal('all');
  readonly appliedFrom = signal('2026-08-01');
  readonly appliedTo = signal('2026-08-31');
  readonly appliedType = signal('all');
  readonly page = signal(1);
  readonly pageSize = 8;

  readonly filtered = computed(() => {
    const from = this.appliedFrom();
    const to = this.appliedTo();
    const type = this.appliedType();
    return this.all().filter((row) => {
      const day = row.at.slice(0, 10);
      if (from && day < from) {
        return false;
      }
      if (to && day > to) {
        return false;
      }
      return type === 'all' || row.eventType === type;
    });
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));
  readonly pageRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor() {
    this.load();
  }

  apply(): void {
    this.appliedFrom.set(this.from());
    this.appliedTo.set(this.to());
    this.appliedType.set(this.eventType());
    this.page.set(1);
    this.load(true);
  }

  goTo(page: number): void {
    this.page.set(Math.min(this.pageCount(), Math.max(1, page)));
  }

  eventClass(type?: AuditEventType): string {
    return type || 'modification';
  }

  exportCsv(): void {
    const header = ['Timestamp', 'Event Type', 'Description', 'Performed By', 'IP Address'];
    const lines = this.filtered().map((row) =>
      [row.at, row.eventType ?? 'modification', row.detail || row.action, row.actor, row.ipAddress ?? '']
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-log.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.error.set(false);
    this.api.audit('', { from: this.from(), to: this.to(), type: this.eventType() }).subscribe({
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
