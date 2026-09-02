import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
  imports: [TranslocoPipe, DatePipe, DataState, SearchField, ApprovalActions],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>{{ 'requests.title' | transloco }}</h1>
      </header>
      <div class="filters">
        <app-search-field placeholderKey="requests.search" (queryChange)="onQuery($event)" />
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
                  <th>{{ 'requests.requester' | transloco }}</th>
                  <th>{{ 'requests.org' | transloco }}</th>
                  <th>{{ 'requests.kind' | transloco }}</th>
                  <th>{{ 'requests.email' | transloco }}</th>
                  <th>{{ 'requests.submitted' | transloco }}</th>
                  <th>{{ 'requests.status' | transloco }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td><span class="table-link">{{ row.requester }}</span></td>
                    <td>{{ row.organization }}</td>
                    <td class="muted">{{ ('requests.kinds.' + row.kind) | transloco }}</td>
                    <td class="muted">{{ row.email }}</td>
                    <td class="muted">{{ row.submittedAt | date: 'mediumDate' : undefined : locale.dateLocale() }}</td>
                    <td>
                      <span
                        class="badge"
                        [class.ok]="row.status === 'approved'"
                        [class.warn]="row.status === 'pending'"
                        [class.danger]="row.status === 'rejected'"
                      >
                        {{ ('badge.' + row.status) | transloco }}
                      </span>
                    </td>
                    <td>
                      <app-approval-actions
                        [show]="row.status === 'pending' && auth.canApprove('integration')"
                        (approve)="decide(row.id, 'approved')"
                        (reject)="decide(row.id, 'rejected')"
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

  decide(id: string, decision: 'approved' | 'rejected'): void {
    this.api.decide('integration', id, decision).subscribe({
      next: () => {
        this.toast.decision('integration', decision);
        this.load(true);
      },
    });
  }
}
