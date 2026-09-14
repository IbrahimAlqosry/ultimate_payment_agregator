import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { apiErrorMessageKey, MISSING_CONCURRENCY_TOKEN_KEY } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import {
  PlatformOperatorChangeDetails,
  PlatformOperatorChangeStatus,
  PlatformOperatorDetails,
  PlatformPermission,
} from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';

type OperatorTab = 'all' | 'requests';

/**
 * Platform Operator administration (guide v5.0 §8), replacing the old mock CRUD screen. There is
 * no email/name on this resource at all — only `userId`. `GET .../operators` is still confirmed
 * live-broken as of 2026-09-14 (returns only the caller's own record for every role — see
 * docs/BACKEND_ISSUES.md Issue 3), so the "All Operators" tab currently only ever shows yourself;
 * built to the real contract regardless so it's correct the moment that's fixed.
 */
@Component({
  selector: 'app-users',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, ApprovalActions, DataState],
  templateUrl: './users.html',
  styleUrl: '../../shared/list-page.scss',
})
export class Users {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly PlatformPermission = PlatformPermission;

  readonly tab = signal<OperatorTab>('all');

  // --- Operators directory ---
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly operators = signal<PlatformOperatorDetails[]>([]);
  readonly operatorsNextCursor = signal<string | null>(null);

  // --- Pending change requests ---
  readonly requestsLoaded = signal(false);
  readonly requestsLoading = signal(false);
  readonly requestsLoadingMore = signal(false);
  readonly requestsError = signal(false);
  readonly requests = signal<PlatformOperatorChangeDetails[]>([]);
  readonly requestsNextCursor = signal<string | null>(null);
  readonly pendingCount = computed(() => this.requests().filter((row) => row.status === 'pendingChecker').length);

  readonly rejecting = signal<PlatformOperatorChangeDetails | null>(null);
  readonly reason = signal('');
  readonly actionError = signal<string | null>(null);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'requests' || tab === 'all') {
        this.setTab(tab, false);
      }
    });
    this.loadOperators();
  }

  setTab(tab: OperatorTab, updateUrl = true): void {
    this.tab.set(tab);
    if (tab === 'requests' && !this.requestsLoaded()) {
      this.loadRequests();
    }
    if (updateUrl) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
    }
  }

  statusBadgeClass(status: PlatformOperatorChangeStatus): { ok: boolean; warn: boolean; danger: boolean } {
    return {
      ok: status === 'applied',
      warn: status === 'awaitingMaker' || status === 'pendingChecker' || status === 'applying' || status === 'pendingAcceptance',
      danger: status === 'rejected' || status === 'applicationFailed',
    };
  }

  loadOperators(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listOperators({ pageSize: 50 }).subscribe({
      next: (page) => {
        this.operators.set(page.items);
        this.operatorsNextCursor.set(page.nextCursor);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  loadMoreOperators(): void {
    const cursor = this.operatorsNextCursor();
    if (!cursor || this.loadingMore()) {
      return;
    }
    this.loadingMore.set(true);
    this.api.listOperators({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        this.operators.update((rows) => [...rows, ...page.items]);
        this.operatorsNextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  loadRequests(): void {
    this.requestsLoading.set(true);
    this.requestsError.set(false);
    this.api.listOperatorRequests({ pageSize: 50 }).subscribe({
      next: (page) => {
        this.requests.set(page.items);
        this.requestsNextCursor.set(page.nextCursor);
        this.requestsLoading.set(false);
        this.requestsLoaded.set(true);
      },
      error: () => {
        this.requestsLoading.set(false);
        this.requestsError.set(true);
      },
    });
  }

  loadMoreRequests(): void {
    const cursor = this.requestsNextCursor();
    if (!cursor || this.requestsLoadingMore()) {
      return;
    }
    this.requestsLoadingMore.set(true);
    this.api.listOperatorRequests({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        this.requests.update((rows) => [...rows, ...page.items]);
        this.requestsNextCursor.set(page.nextCursor);
        this.requestsLoadingMore.set(false);
      },
      error: () => this.requestsLoadingMore.set(false),
    });
  }

  askReject(row: PlatformOperatorChangeDetails): void {
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

  decide(row: PlatformOperatorChangeDetails, decision: 'approved' | 'rejected', rejectionReason?: string): void {
    this.actionError.set(null);
    if (!row.concurrencyToken) {
      this.actionError.set(MISSING_CONCURRENCY_TOKEN_KEY);
      this.toast.fail(MISSING_CONCURRENCY_TOKEN_KEY);
      return;
    }
    this.api.decideOperatorRequest(row.requestId, { decision, concurrencyToken: row.concurrencyToken, rejectionReason }).subscribe({
      next: () => {
        this.toast.ok(decision === 'approved' ? 'toast.operatorRequestApproved' : 'toast.operatorRequestRejected');
        this.loadRequests();
      },
      error: (err) => {
        this.actionError.set(apiErrorMessageKey(err));
        this.loadRequests();
      },
    });
  }
}
