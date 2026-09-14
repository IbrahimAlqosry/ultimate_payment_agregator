import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { AuditAction, AuditEntityType, AuditEvent, AuditOutcome } from '@core/models.platform';
import { DataState } from '@shared/data-state';

/** Platform audit search (guide v5.0 §17) — server-side filtered, cursor-paginated, no total
 * count. There is no GET-by-ID: a row already carries its own complete detail, so "detail" is
 * just expanding the row rather than a separate fetch. `from`/`to` must be UTC with an explicit
 * zero offset; the date inputs here are local-day boundaries converted to UTC on submit. */
@Component({
  selector: 'app-reports',
  imports: [TranslocoPipe, DatePipe, DataState],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  private readonly api = inject(PlatformApi);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly rows = signal<AuditEvent[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly expandedId = signal<string | null>(null);

  readonly from = signal('');
  readonly to = signal('');
  readonly action = signal<AuditAction | ''>('');
  readonly outcome = signal<AuditOutcome | ''>('');
  readonly entityType = signal<AuditEntityType | ''>('');
  readonly correlationId = signal('');
  readonly accountId = signal('');
  readonly entityReference = signal('');

  constructor() {
    this.load();
  }

  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  clearFilters(): void {
    this.from.set('');
    this.to.set('');
    this.action.set('');
    this.outcome.set('');
    this.entityType.set('');
    this.correlationId.set('');
    this.accountId.set('');
    this.entityReference.set('');
    this.load();
  }

  apply(): void {
    this.load();
  }

  private query() {
    // Guide v5.0 §17.1: from/to must be supplied together as a paired UTC interval — never send
    // just one, since that's an incomplete interval, not an open-ended bound.
    const dateRange = this.from() && this.to() ? { from: `${this.from()}T00:00:00Z`, to: `${this.to()}T23:59:59Z` } : {};
    return {
      pageSize: 50,
      ...dateRange,
      ...(this.action() ? { action: this.action() as AuditAction } : {}),
      ...(this.outcome() ? { outcome: this.outcome() as AuditOutcome } : {}),
      ...(this.entityType() ? { entityType: this.entityType() as AuditEntityType } : {}),
      ...(this.correlationId().trim() ? { correlationId: this.correlationId().trim() } : {}),
      ...(this.accountId().trim() ? { accountId: this.accountId().trim() } : {}),
      ...(this.entityReference().trim() ? { entityReference: this.entityReference().trim() } : {}),
    };
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.expandedId.set(null);
    this.api.searchAuditEvents(this.query()).subscribe({
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
    this.api.searchAuditEvents({ ...this.query(), cursor }).subscribe({
      next: (page) => {
        this.rows.update((rows) => [...rows, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  exportCsv(): void {
    const header = ['Time', 'Action', 'Outcome', 'Entity Type', 'Entity Reference', 'Actor Kind', 'Actor ID', 'Correlation ID'];
    const lines = this.rows().map((row) =>
      [
        row.occurredAt,
        row.action,
        row.outcome,
        row.entityType ?? '',
        row.entityReference ?? '',
        row.actorKind,
        row.actorSubjectId ?? '',
        row.correlationId ?? '',
      ]
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
}
