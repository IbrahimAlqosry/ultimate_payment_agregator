import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { NotificationWebhook, WebhookAuthType } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-notification-delivery',
  imports: [FormField, TranslocoPipe, DataState, FieldError],
  templateUrl: './notification-delivery.html',
  styleUrl: '../../shared/form-page.scss',
  styles: `
    .webhook-card {
      width: min(760px, 100%);
      max-width: 760px;
      padding: 0;
      gap: 0;
      border-radius: 16px;
      box-shadow: 0 12px 12px rgba(0, 0, 0, 0.05);
    }

    .card-header {
      padding: 24px 32px 16px;
      border-bottom: 1px solid #dcd5d5;
    }

    .card-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 32px;
    }

    .caps {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #7e7676;
    }

    .secret-input {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      border: 1px solid #dcd5d5;
      border-radius: 8px;
      padding: 0 14px;
      background: #fff;
    }

    .secret-input input {
      flex: 1 1 auto;
      min-height: 0;
      border: 0;
      padding: 12px 0;
      background: transparent;
    }

    .secret-input input:focus-visible {
      outline: none;
      box-shadow: none;
    }

    .show-btn {
      border: 0;
      background: transparent;
      color: #1fa64d;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
    }

    .form-actions.end {
      justify-content: flex-end;
      border-top: 0;
      padding-top: 12px;
    }

    .btn-reset {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #dcd5d5;
      background: #fff;
      color: #444445;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
  `,
})
export class NotificationDelivery implements OnInit {
  private readonly api = inject(AtlasApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly showSecret = signal(false);
  readonly saved = signal<NotificationWebhook | null>(null);

  readonly form = form(
    signal({
      endpointUrl: '',
      port: '',
      authType: 'bearer' as WebhookAuthType,
      username: '',
      password: '',
      accessToken: '',
    }),
    (p) => {
      required(p.endpointUrl);
      required(p.port);
      required(p.authType);
    },
  );

  readonly oauth = computed(() => this.form.authType().value() === 'oauth2');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.webhook().subscribe({
      next: (row) => {
        this.apply(row);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  reset(): void {
    const saved = this.saved();
    if (saved) {
      this.apply(saved);
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, async () => {
      try {
        const saved = await firstValueFrom(this.api.saveWebhook(this.payload()));
        this.apply(saved);
        this.toast.ok('toast.webhookUpdated');
      } catch {
        /* error interceptor already toasts */
      }
      return undefined;
    });
  }

  private apply(row: NotificationWebhook): void {
    this.saved.set(row);
    this.form().reset({
      endpointUrl: row.endpointUrl,
      port: row.port,
      authType: row.authType,
      username: row.username,
      password: row.password,
      accessToken: row.accessToken,
    });
  }

  private payload(): NotificationWebhook {
    const value = this.form().value();
    return {
      status: this.saved()?.status ?? 'approved',
      ...value,
    };
  }
}
