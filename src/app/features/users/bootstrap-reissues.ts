import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { BootstrapReissueDetails, PlatformPermission } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';

type ReissueKind = 'merchant' | 'financialInstitution';

/** Guide v6.0 §7.2-7.4 — first-time credential reissue review queue. Separate permission family
 * from ordinary onboarding grants; a Maker submits from the application's own detail screen
 * (merchant-detail.ts / institution-detail.ts), this screen is only the Checker/Admin decide
 * queue (Reader can view with `.read`). Merchant and FI reissues are two distinct API
 * collections sharing the exact same shape, toggled here by tab rather than duplicated. */
@Component({
  selector: 'app-bootstrap-reissues',
  imports: [DatePipe, FormsModule, TranslocoPipe, ApprovalActions, DataState],
  templateUrl: './bootstrap-reissues.html',
  styleUrl: '../../shared/list-page.scss',
})
export class BootstrapReissues {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly kind = signal<ReissueKind>('merchant');
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly rows = signal<BootstrapReissueDetails[]>([]);
  readonly nextCursor = signal<string | null>(null);

  readonly rejecting = signal<BootstrapReissueDetails | null>(null);
  readonly reason = signal('');
  readonly acting = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly canDecide = computed(() =>
    this.kind() === 'merchant'
      ? this.auth.hasPermission(PlatformPermission.MerchantBootstrapReissueDecide)
      : this.auth.hasPermission(PlatformPermission.FinancialInstitutionBootstrapReissueDecide),
  );

  constructor() {
    this.load();
  }

  setKind(kind: ReissueKind): void {
    if (this.kind() === kind) {
      return;
    }
    this.kind.set(kind);
    this.load();
  }

  private listFn(cursor?: string) {
    return this.kind() === 'merchant'
      ? this.api.listMerchantBootstrapReissues({ pageSize: 50, cursor })
      : this.api.listFinancialInstitutionBootstrapReissues({ pageSize: 50, cursor });
  }

  private decideFn(requestId: string, body: Parameters<PlatformApi['decideMerchantBootstrapReissue']>[1]) {
    return this.kind() === 'merchant'
      ? this.api.decideMerchantBootstrapReissue(requestId, body)
      : this.api.decideFinancialInstitutionBootstrapReissue(requestId, body);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.listFn().subscribe({
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
    this.listFn(cursor).subscribe({
      next: (page) => {
        this.rows.update((existing) => [...existing, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  askReject(row: BootstrapReissueDetails): void {
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

  decide(row: BootstrapReissueDetails, decision: 'approved' | 'rejected', rejectionReason?: string): void {
    if (this.acting()) {
      return;
    }
    this.acting.set(true);
    this.actionError.set(null);
    this.decideFn(row.requestId, { decision, concurrencyToken: row.concurrencyToken, rejectionReason }).subscribe({
      next: () => {
        this.acting.set(false);
        this.toast.ok(decision === 'approved' ? 'toast.reissueApproved' : 'toast.reissueRejected');
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.actionError.set(apiErrorMessageKey(err));
        this.load();
      },
    });
  }
}
