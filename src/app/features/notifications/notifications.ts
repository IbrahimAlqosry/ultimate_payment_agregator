import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { NotificationDeliveryStatus, PaymentNotification } from '@core/models';
import { DataState } from '@shared/data-state';

@Component({
  selector: 'app-notifications-page',
  imports: [TranslocoPipe, DatePipe, DecimalPipe, DataState],
  template: `
    <section class="page">
      <header class="page-head stack">
        <div>
          <h1>{{ 'notes.fiTitle' | transloco }}</h1>
          <p class="page-intro">{{ 'notes.fiIntro' | transloco }}</p>
        </div>
      </header>

      <div class="filter-bar">
        <label class="filter-group">
          <span>{{ 'notes.dateRange' | transloco }}</span>
          <div class="date-row">
            <span class="date-box">
              <input type="date" [value]="from()" (change)="onFrom($event)" />
              <img src="/icons/calendar.svg" width="14" height="14" alt="" />
            </span>
            <span class="date-box">
              <input type="date" [value]="to()" (change)="onTo($event)" />
              <img src="/icons/calendar.svg" width="14" height="14" alt="" />
            </span>
          </div>
        </label>
        <label class="filter-group grow">
          <span>{{ 'notes.deliveryStatus' | transloco }}</span>
          <select class="filter" [value]="status()" (change)="onStatus($event)">
            <option value="">{{ 'notes.allStatuses' | transloco }}</option>
            <option value="completed">{{ 'badge.delivered' | transloco }}</option>
            <option value="pending">{{ 'badge.retrying' | transloco }}</option>
            <option value="failed">{{ 'badge.failed' | transloco }}</option>
          </select>
        </label>
        <button class="btn btn-primary" type="button" (click)="apply()">{{ 'notes.applyFilters' | transloco }}</button>
      </div>

      <div class="card table-card">
        <app-data-state
          [loading]="loading()"
          [error]="error()"
          [empty]="rows().length === 0"
          emptyKey="notes.empty"
          (retry)="load()"
        >
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ 'notes.dateTime' | transloco }}</th>
                  <th>{{ 'notes.merchant' | transloco }}</th>
                  <th>{{ 'notes.point' | transloco }}</th>
                  <th class="num">{{ 'notes.amountYer' | transloco }}</th>
                  <th>{{ 'notes.invoice' | transloco }}</th>
                  <th class="num">{{ 'notes.deliveryCol' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td class="muted">{{ row.occurredAt | date: 'yyyy-MM-dd HH:mm' : undefined : locale.dateLocale() }}</td>
                    <td><strong>{{ row.merchantName }}</strong></td>
                    <td>{{ row.pointCode }}</td>
                    <td class="amount num">{{ row.amount | number }} {{ row.currency }}</td>
                    <td class="muted">{{ row.invoice }}</td>
                    <td class="num">
                      <span
                        class="badge"
                        [class.ok]="row.status === 'completed'"
                        [class.warn]="row.status === 'pending'"
                        [class.danger]="row.status === 'failed'"
                      >
                        {{ badgeKey(row.status) | transloco }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <footer class="table-foot">
            <p>{{ 'notes.showingFi' | transloco: { shown: rows().length, total: all().length } }}</p>
          </footer>
        </app-data-state>
      </div>
    </section>
  `,
  styles: `
    .page-head.stack {
      align-items: flex-start;
    }
    .page-intro {
      margin: 4px 0 0;
      color: #7e7676;
      font-size: 14px;
    }
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 16px;
      width: 100%;
      padding: 20px;
      background: #fff;
      border: 1px solid #dcd5d5;
      border-radius: 12px;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 200px;
    }
    .filter-group.grow {
      flex: 1 1 180px;
    }
    .filter-group > span {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #7e7676;
    }
    .date-row {
      display: flex;
      gap: 8px;
    }
    .date-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 150px;
      height: 40px;
      padding: 0 14px;
      border: 1px solid #dcd5d5;
      border-radius: 8px;
      background: #fff;
    }
    .date-box input {
      border: 0;
      padding: 0;
      min-height: 0;
      width: 100%;
      background: transparent;
      font-size: 13px;
    }
    .amount {
      font-weight: 700;
      color: #1c1c1d;
    }
    @media (max-width: 720px) {
      .filter-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .date-row {
        flex-direction: column;
      }
    }
  `,
})
export class NotificationsPage {
  private readonly api = inject(AtlasApi);
  readonly locale = inject(LocaleService);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly all = signal<PaymentNotification[]>([]);
  readonly from = signal('2026-08-20');
  readonly to = signal('2026-08-31');
  readonly status = signal('');
  readonly appliedFrom = signal('2026-08-20');
  readonly appliedTo = signal('2026-08-31');
  readonly appliedStatus = signal('');

  readonly rows = computed(() => {
    const from = this.appliedFrom();
    const to = this.appliedTo();
    const status = this.appliedStatus();
    return this.all().filter((row) => {
      const day = row.occurredAt.slice(0, 10);
      if (from && day < from) {
        return false;
      }
      if (to && day > to) {
        return false;
      }
      return !status || row.status === status;
    });
  });

  constructor() {
    this.load();
  }

  apply(): void {
    this.appliedFrom.set(this.from());
    this.appliedTo.set(this.to());
    this.appliedStatus.set(this.status());
  }

  onFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  onTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  onStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
  }

  badgeKey(status: NotificationDeliveryStatus): string {
    if (status === 'completed') {
      return 'badge.delivered';
    }
    if (status === 'pending') {
      return 'badge.retrying';
    }
    return `badge.${status}`;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.notifications().subscribe({
      next: (rows) => {
        this.all.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
