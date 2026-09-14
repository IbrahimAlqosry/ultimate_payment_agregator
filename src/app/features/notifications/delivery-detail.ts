import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import {
  DeliveryReplayAcceptance,
  DeliveryRemediationReason,
  NotificationDelivery,
  PlatformPermission,
} from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';

/** Recovery (§16.4) and replay (§16.5) are direct Checker/Admin actions — no Maker-submit step,
 * no concurrency token. Replay needs its own Idempotency-Key, generated once per confirmed
 * attempt and reused only for an exact retry of that same attempt (new delivery id, same key). */
@Component({
  selector: 'app-delivery-detail',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState],
  templateUrl: './delivery-detail.html',
  styleUrl: '../../shared/form-page.scss',
})
export class DeliveryDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<NotificationDelivery | null>(null);

  readonly reason = signal<DeliveryRemediationReason>('configurationUpdated');
  readonly actionError = signal<string | null>(null);
  readonly remediating = signal(false);
  readonly replaying = signal(false);
  readonly replayResult = signal<DeliveryReplayAcceptance | null>(null);
  private replayKey = crypto.randomUUID();

  readonly canRemediate = computed(
    () => this.auth.hasPermission(PlatformPermission.NotificationDeliveriesRemediate) && this.isAttention(),
  );
  readonly canReplay = computed(
    () => this.auth.hasPermission(PlatformPermission.NotificationDeliveriesReplay) && this.isAttention(),
  );

  constructor() {
    this.load();
  }

  private isAttention(): boolean {
    const state = this.row()?.state;
    return state === 'authenticationPaused' || state === 'deadLettered';
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    this.api.getDelivery(id).subscribe({
      next: (row) => {
        this.row.set(row);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  async remediate(): Promise<void> {
    const row = this.row();
    if (!row) {
      return;
    }
    this.actionError.set(null);
    this.remediating.set(true);
    try {
      const saved = await firstValueFrom(this.api.remediateDelivery(row.deliveryId, { reason: this.reason() }));
      this.row.set(saved);
      this.toast.ok('toast.deliveryRemediated');
    } catch (err) {
      this.actionError.set(apiErrorMessageKey(err));
    } finally {
      this.remediating.set(false);
    }
  }

  async replay(): Promise<void> {
    const row = this.row();
    if (!row) {
      return;
    }
    this.actionError.set(null);
    this.replaying.set(true);
    try {
      const accepted = await firstValueFrom(this.api.replayDelivery(row.deliveryId, this.replayKey));
      this.replayResult.set(accepted);
      this.toast.ok('toast.deliveryReplayed');
    } catch (err) {
      this.actionError.set(apiErrorMessageKey(err));
    } finally {
      this.replaying.set(false);
    }
  }

  newReplayAttempt(): void {
    this.replayKey = crypto.randomUUID();
    this.replayResult.set(null);
  }
}
