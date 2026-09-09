import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { ErpChangeKind, ErpRequestStatus, ErpSystemChangeRequest, ErpSystemDetails } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';
import { SearchField } from '@shared/search-field';

type ListTab = 'all' | 'pending';

/**
 * Unlike Merchant/FI onboarding, "all records" and "pending changes" are genuinely separate
 * real endpoints here (GET /erp-systems vs GET /erp-systems/requests) — not one collection
 * filtered by status. Each tab loads its own collection, lazily for "pending".
 */
@Component({
  selector: 'app-erp-systems',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState, SearchField, ApprovalActions],
  templateUrl: './erp-systems.html',
  styleUrl: '../../shared/list-page.scss',
})
export class ErpSystems {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly tab = signal<ListTab>('all');
  query = '';

  // --- All records ---
  readonly recordsLoading = signal(true);
  readonly recordsLoadingMore = signal(false);
  readonly recordsError = signal(false);
  readonly records = signal<ErpSystemDetails[]>([]);
  readonly recordsNextCursor = signal<string | null>(null);
  readonly filteredRecords = computed(() => {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      return this.records();
    }
    return this.records().filter(
      (row) => row.systemName.toLowerCase().includes(q) || row.providerCompanyName.toLowerCase().includes(q),
    );
  });

  // --- Pending change requests ---
  readonly requestsLoaded = signal(false);
  readonly requestsLoading = signal(false);
  readonly requestsLoadingMore = signal(false);
  readonly requestsError = signal(false);
  readonly requests = signal<ErpSystemChangeRequest[]>([]);
  readonly requestsNextCursor = signal<string | null>(null);
  readonly pendingCount = computed(() => this.requests().filter((row) => row.status === 'pendingChecker').length);

  readonly rejecting = signal<ErpSystemChangeRequest | null>(null);
  readonly reason = signal('');
  readonly actionError = signal<string | null>(null);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'pending' || tab === 'all') {
        this.setTab(tab, false);
      }
    });
    this.loadRecords();
  }

  onQuery(query: string): void {
    this.query = query;
  }

  setTab(tab: ListTab, updateUrl = true): void {
    this.tab.set(tab);
    if (tab === 'pending' && !this.requestsLoaded()) {
      this.loadRequests();
    }
    if (updateUrl) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
    }
  }

  changeKindLabel(kind: ErpChangeKind): string {
    return kind === 'creation' ? 'erp.changeCreation' : 'erp.changeUpdate';
  }

  statusBadgeClass(status: ErpRequestStatus): { ok: boolean; warn: boolean; danger: boolean } {
    return { ok: status === 'approved', warn: status === 'pendingChecker', danger: status === 'rejected' };
  }

  loadRecords(): void {
    this.recordsLoading.set(true);
    this.recordsError.set(false);
    this.api.listErpSystems({ pageSize: 50 }).subscribe({
      next: (page) => {
        this.records.set(page.items);
        this.recordsNextCursor.set(page.nextCursor);
        this.recordsLoading.set(false);
      },
      error: () => {
        this.recordsLoading.set(false);
        this.recordsError.set(true);
      },
    });
  }

  loadMoreRecords(): void {
    const cursor = this.recordsNextCursor();
    if (!cursor || this.recordsLoadingMore()) {
      return;
    }
    this.recordsLoadingMore.set(true);
    this.api.listErpSystems({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        this.records.update((rows) => [...rows, ...page.items]);
        this.recordsNextCursor.set(page.nextCursor);
        this.recordsLoadingMore.set(false);
      },
      error: () => this.recordsLoadingMore.set(false),
    });
  }

  loadRequests(): void {
    this.requestsLoading.set(true);
    this.requestsError.set(false);
    this.api.listErpRequests({ pageSize: 50 }).subscribe({
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
    this.api.listErpRequests({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        this.requests.update((rows) => [...rows, ...page.items]);
        this.requestsNextCursor.set(page.nextCursor);
        this.requestsLoadingMore.set(false);
      },
      error: () => this.requestsLoadingMore.set(false),
    });
  }

  askReject(row: ErpSystemChangeRequest): void {
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

  decide(row: ErpSystemChangeRequest, decision: 'approved' | 'rejected', rejectionReason?: string): void {
    this.actionError.set(null);
    this.api
      .decideErpRequest(row.requestId, { decision, concurrencyToken: row.concurrencyToken, rejectionReason })
      .subscribe({
        next: () => {
          this.toast.decision('erp', decision);
          this.loadRequests();
          this.loadRecords();
        },
        error: (err) => {
          this.actionError.set(readApiError(err).message);
          this.loadRequests();
        },
      });
  }
}
