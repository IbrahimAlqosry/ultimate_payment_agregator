import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { ToastService } from '@core/notifications/toast.service';
import { IntegrationRequest } from '@core/models';
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';
import { SearchField } from '@shared/search-field';

@Component({
  selector: 'app-integration-requests',
  imports: [TranslocoPipe, DatePipe, FormsModule, DataState, SearchField, ApprovalActions],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <p class="crumb">{{ 'requests.crumb' | transloco }}</p>
          <div class="title-row">
            <h1>{{ 'requests.title' | transloco }}</h1>
            <span class="badge warn">{{ 'requests.pendingBadge' | transloco: { count: pendingCount() } }}</span>
          </div>
        </div>
      </header>
      <div class="filters">
        <app-search-field [seed]="query" placeholderKey="requests.search" (queryChange)="onQuery($event)" />
      </div>
      <div class="card table-card">
        <app-data-state
          [loading]="loading()"
          [error]="error()"
          [empty]="rows().length === 0"
          emptyKey="requests.empty"
          (retry)="load()"
        >
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ 'requests.code' | transloco }}</th>
                  <th>{{ 'requests.entity' | transloco }}</th>
                  <th>{{ 'requests.type' | transloco }}</th>
                  <th>{{ 'requests.submitted' | transloco }}</th>
                  <th>{{ 'requests.status' | transloco }}</th>
                  <th class="num">{{ 'actions.column' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td>
                      <strong>{{ row.code }}</strong>
                    </td>
                    <td>{{ row.organization }}</td>
                    <td>
                      <span class="badge" [class.warn]="row.kind === 'credential'" [class.ok]="row.kind !== 'credential'">
                        {{ ('requests.kinds.' + row.kind) | transloco }}
                      </span>
                    </td>
                    <td class="muted">{{ row.submittedAt | date: 'mediumDate' : undefined : locale.dateLocale() }}</td>
                    <td>
                      <span
                        class="badge"
                        [class.ok]="row.status === 'approved'"
                        [class.warn]="row.status === 'pending'"
                        [class.danger]="row.status === 'rejected'"
                      >
                        {{ (row.status === 'pending' ? 'badge.pendingApproval' : 'badge.' + row.status) | transloco }}
                      </span>
                    </td>
                    <td>
                      <app-approval-actions
                        variant="decide"
                        [show]="row.status === 'pending' && auth.canApprove('integration')"
                        (approve)="decide(row.id, 'approved')"
                        (reject)="askReject(row)"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-data-state>
      </div>
    </section>

    @if (rejecting(); as row) {
      <div class="overlay-modal">
        <button class="overlay-backdrop" type="button" (click)="cancelReject()" [attr.aria-label]="'actions.cancel' | transloco"></button>
        <article class="overlay-panel" role="dialog" aria-modal="true">
          <header class="overlay-head">
            <h2>{{ 'actions.reject' | transloco }} — {{ row.organization }}</h2>
            <button type="button" class="overlay-close" (click)="cancelReject()">✕</button>
          </header>
          <label class="form-field">
            <span>{{ 'detail.rejectionReason' | transloco }}</span>
            <textarea [ngModel]="reason()" (ngModelChange)="reason.set($event)" rows="3"></textarea>
          </label>
          <div class="overlay-actions">
            <button class="btn-text" type="button" (click)="cancelReject()">{{ 'actions.cancel' | transloco }}</button>
            <button class="btn btn-danger" type="button" [disabled]="!reason().trim()" (click)="confirmReject()">
              {{ 'actions.confirmReject' | transloco }}
            </button>
          </div>
        </article>
      </div>
    }
  `,
})
export class IntegrationRequests {
  private readonly api = inject(AtlasApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly rows = signal<IntegrationRequest[]>([]);
  readonly rejecting = signal<IntegrationRequest | null>(null);
  readonly reason = signal('');
  query = '';

  constructor() {
    this.load();
  }

  pendingCount(): number {
    return this.rows().filter((row) => row.status === 'pending').length;
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
    this.api.integrationRequests(this.query).subscribe({
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

  askReject(row: IntegrationRequest): void {
    this.reason.set('');
    this.rejecting.set(row);
  }

  cancelReject(): void {
    this.rejecting.set(null);
    this.reason.set('');
  }

  confirmReject(): void {
    const row = this.rejecting();
    if (!row || !this.reason().trim()) {
      return;
    }
    this.decide(row.id, 'rejected');
    this.cancelReject();
  }

  decide(id: string, decision: 'approved' | 'rejected'): void {
    this.api.decide('integration', id, decision).subscribe({
      next: () => {
        this.toast.decision('integration', decision);
        this.load(true);
      },
      error: () => this.toast.fail('toast.saveFailed'),
    });
  }
}
