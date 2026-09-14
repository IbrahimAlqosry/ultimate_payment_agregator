import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlatformApi } from '@core/http/platform-api';
import { DeliveryAttentionState, NotificationDelivery } from '@core/models.platform';
import { DataState } from '@shared/data-state';

type StateFilter = 'all' | DeliveryAttentionState;

/** Platform operations queue (guide v5.0 §16.1) — only ever returns `authenticationPaused` /
 * `deadLettered` rows; every other delivery state can only be seen by opening a specific
 * delivery by ID (e.g. after a replay). List rows always carry `attempts: []` — use
 * `attemptCount` here and open detail for the actual attempt history. */
@Component({
  selector: 'app-delivery-recovery',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState],
  templateUrl: './delivery-recovery.html',
  styleUrl: '../../shared/list-page.scss',
})
export class DeliveryRecovery {
  private readonly api = inject(PlatformApi);

  readonly state = signal<StateFilter>('all');
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly rows = signal<NotificationDelivery[]>([]);
  readonly nextCursor = signal<string | null>(null);

  constructor() {
    this.load();
  }

  setState(state: StateFilter): void {
    if (state === this.state()) {
      return;
    }
    this.state.set(state);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const state = this.state();
    this.api.listDeliveryAttention({ pageSize: 50, ...(state !== 'all' ? { state } : {}) }).subscribe({
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
    const state = this.state();
    this.api.listDeliveryAttention({ pageSize: 50, cursor, ...(state !== 'all' ? { state } : {}) }).subscribe({
      next: (page) => {
        this.rows.update((rows) => [...rows, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }
}
