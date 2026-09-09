import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { IntegrationClientRotationRequestMetadata, RotationRequestStatus } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';
import { SecretField } from '@shared/secret-field';

const PENDING_STATUSES: RotationRequestStatus[] = ['awaitingMaker', 'pendingChecker'];

/**
 * Platform queue for Merchant Integration Client rotation requests (the real backend's
 * `/integration-client/rotation-requests`). FI self-rotates via OTP and never appears here.
 * The API returns only opaque account/client UUIDs — no merchant name lookup is available yet.
 */
@Component({
  selector: 'app-integration-requests',
  imports: [TranslocoPipe, DatePipe, FormsModule, DataState, ApprovalActions, SecretField],
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
      @if (actionError(); as message) {
        <p class="form-error" role="alert">{{ message }}</p>
      }
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
                  <th>{{ 'requests.requestId' | transloco }}</th>
                  <th>{{ 'requests.accountId' | transloco }}</th>
                  <th>{{ 'requests.submitted' | transloco }}</th>
                  <th>{{ 'requests.status' | transloco }}</th>
                  <th class="num">{{ 'actions.column' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.requestId) {
                  <tr>
                    <td class="muted"><span class="mono">{{ row.requestId }}</span></td>
                    <td class="muted"><span class="mono">{{ row.accountId }}</span></td>
                    <td class="muted">{{ row.requestedAt | date: 'medium' : undefined : locale.dateLocale() }}</td>
                    <td>
                      <span
                        class="badge"
                        [class.ok]="row.status === 'approved'"
                        [class.warn]="row.status === 'awaitingMaker' || row.status === 'pendingChecker'"
                        [class.danger]="row.status === 'rejected'"
                      >
                        {{ (row.status === 'approved' ? 'badge.active' : 'appStatus.' + row.status) | transloco }}
                      </span>
                    </td>
                    <td>
                      @if (row.status === 'awaitingMaker') {
                        <button class="btn-review" type="button" [disabled]="acting()" (click)="submitRow(row)">
                          {{ 'requests.makerSubmit' | transloco }}
                        </button>
                      } @else {
                        <app-approval-actions
                          variant="decide"
                          [show]="row.status === 'pendingChecker' && auth.canApprove('integration')"
                          (approve)="decide(row, 'approved')"
                          (reject)="askReject(row)"
                        />
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <footer class="table-foot">
            <p>{{ 'list.showing' | transloco: { shown: rows().length, total: rows().length } }}</p>
            @if (nextCursor()) {
              <button class="page-btn" type="button" [disabled]="loadingMore()" (click)="loadMore()">
                {{ (loadingMore() ? 'list.loading' : 'list.loadMore') | transloco }}
              </button>
            }
          </footer>
        </app-data-state>
      </div>
    </section>

    @if (rejecting(); as row) {
      <div class="overlay-modal">
        <button class="overlay-backdrop" type="button" (click)="cancelReject()" [attr.aria-label]="'actions.cancel' | transloco"></button>
        <article class="overlay-panel" role="dialog" aria-modal="true">
          <header class="overlay-head">
            <h2>{{ 'actions.reject' | transloco }} — {{ row.requestId }}</h2>
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

    @if (approvedCredentials(); as creds) {
      <div class="overlay-modal">
        <article class="overlay-panel" role="dialog" aria-modal="true">
          <header class="overlay-head">
            <h2>{{ 'requests.oneTimeTitle' | transloco }}</h2>
          </header>
          <p class="note-box">{{ 'requests.oneTimeWarn' | transloco }}</p>
          <div class="form-field">
            <span class="caps">{{ 'integration.clientId' | transloco }}</span>
            <div class="readonly-box">{{ creds.clientId }}</div>
          </div>
          <div class="form-field">
            <span class="caps">{{ 'integration.clientSecret' | transloco }}</span>
            <app-secret-field [value]="creds.clientSecret" [eye]="true" [revealed]="true" />
          </div>
          <div class="overlay-actions">
            <button class="btn btn-primary" type="button" (click)="approvedCredentials.set(null)">
              {{ 'integration.savedIt' | transloco }}
            </button>
          </div>
        </article>
      </div>
    }
  `,
  styles: `
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      /* Inline span, not the <td> itself — isolates the UUID's character order without
         touching the cell's own text-align:start (which must stay language-aware to match
         sibling columns in both LTR and RTL). */
      direction: ltr;
      unicode-bidi: isolate;
    }
    .readonly-box {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 0 14px;
      border: 1px solid #dcd5d5;
      border-radius: 8px;
      background: #f7f5f5;
      font-size: 13px;
      word-break: break-all;
      direction: ltr;
      unicode-bidi: isolate;
    }
    .btn-review {
      background: #fff;
      color: #1c1c1d;
      border: 1px solid #dcd5d5;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
  `,
})
export class IntegrationRequests {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly acting = signal(false);
  readonly rows = signal<IntegrationClientRotationRequestMetadata[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly rejecting = signal<IntegrationClientRotationRequestMetadata | null>(null);
  readonly reason = signal('');
  readonly approvedCredentials = signal<{ clientId: string; clientSecret: string } | null>(null);
  readonly actionError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  pendingCount(): number {
    return this.rows().filter((row) => PENDING_STATUSES.includes(row.status)).length;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listIntegrationClientRotationRequests({ pageSize: 50 }).subscribe({
      next: (page) => {
        this.rows.set(page.items);
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
    this.api.listIntegrationClientRotationRequests({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        this.rows.update((rows) => [...rows, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  submitRow(row: IntegrationClientRotationRequestMetadata): void {
    if (this.acting()) {
      return;
    }
    this.acting.set(true);
    this.actionError.set(null);
    this.api.submitIntegrationClientRotationRequest(row.requestId).subscribe({
      next: () => {
        this.acting.set(false);
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.actionError.set(readApiError(err).message);
        this.load();
      },
    });
  }

  askReject(row: IntegrationClientRotationRequestMetadata): void {
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
    this.decide(row, 'rejected', this.reason().trim());
    this.cancelReject();
  }

  decide(row: IntegrationClientRotationRequestMetadata, decision: 'approved' | 'rejected', rejectionReason?: string): void {
    this.actionError.set(null);
    this.api.decideIntegrationClientRotationRequest(row.requestId, { decision, rejectionReason }).subscribe({
      next: (result) => {
        this.toast.decision('integration', decision);
        if (decision === 'approved' && result.clientId && result.clientSecret) {
          this.approvedCredentials.set({ clientId: result.clientId, clientSecret: result.clientSecret });
        }
        this.load();
      },
      error: (err) => {
        this.actionError.set(readApiError(err).message);
        this.load();
      },
    });
  }
}
