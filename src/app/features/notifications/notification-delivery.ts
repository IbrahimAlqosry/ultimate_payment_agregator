import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessageKey, readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { CallbackAuthenticationMode, CallbackAuthenticationRequest, NotificationEndpointConfigurationMetadata } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { FieldError } from '@shared/field-error';
import { SecretField } from '@shared/secret-field';

/** Real API (guide v4.0 §15): every save is a brand-new, complete, immutable version — there is
 * no partial edit or "keep the old secret" option, and GET never returns any authentication
 * value back (write-only by design). The Merchant only ever sees their latest *submitted*
 * version here; whether it's actually the active one is a separate flag on the same object. */
@Component({
  selector: 'app-notification-delivery',
  imports: [DatePipe, FormField, TranslocoPipe, DataState, FieldError, SecretField],
  templateUrl: './notification-delivery.html',
  styleUrls: ['../../shared/form-page.scss', '../../shared/settings-page.scss'],
})
export class NotificationDelivery implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly apiError = signal<string | null>(null);
  readonly current = signal<NotificationEndpointConfigurationMetadata | null>(null);

  readonly form = form(
    signal({
      callbackUrl: '',
      mode: 'basic' as CallbackAuthenticationMode,
      username: '',
      password: '',
      tokenUrl: '',
      clientId: '',
      clientSecret: '',
      scope: '',
      headerName: '',
      headerValue: '',
      token: '',
    }),
    (p) => {
      required(p.callbackUrl);
      validate(p.callbackUrl, ({ value }) =>
        value() && !value().startsWith('https://') ? { kind: 'httpsOnly' } : undefined,
      );
      validate(p.username, ({ value, valueOf }) =>
        valueOf(p.mode) === 'basic' && !value().trim() ? { kind: 'required' } : undefined,
      );
      validate(p.password, ({ value, valueOf }) =>
        valueOf(p.mode) === 'basic' && !value().trim() ? { kind: 'required' } : undefined,
      );
      validate(p.tokenUrl, ({ value, valueOf }) =>
        valueOf(p.mode) === 'oauth2ClientCredentials' && !value().trim() ? { kind: 'required' } : undefined,
      );
      validate(p.clientId, ({ value, valueOf }) =>
        valueOf(p.mode) === 'oauth2ClientCredentials' && !value().trim() ? { kind: 'required' } : undefined,
      );
      validate(p.clientSecret, ({ value, valueOf }) =>
        valueOf(p.mode) === 'oauth2ClientCredentials' && !value().trim() ? { kind: 'required' } : undefined,
      );
      validate(p.headerName, ({ value, valueOf }) =>
        valueOf(p.mode) === 'customHeader' && !value().trim() ? { kind: 'required' } : undefined,
      );
      validate(p.headerValue, ({ value, valueOf }) =>
        valueOf(p.mode) === 'customHeader' && !value().trim() ? { kind: 'required' } : undefined,
      );
      validate(p.token, ({ value, valueOf }) =>
        valueOf(p.mode) === 'staticBearerJwt' && !value().trim() ? { kind: 'required' } : undefined,
      );
    },
  );

  readonly mode = computed(() => this.form.mode().value());

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.getNotificationSettings().subscribe({
      next: (row) => {
        this.current.set(row);
        this.form().reset({ ...this.form().value(), callbackUrl: row.callbackUrl, mode: row.authenticationMode });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        // 404 is the documented empty state (no configuration submitted yet), not a real error.
        if (readApiError(err).status !== 404) {
          this.error.set(true);
        }
      },
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submit(this.form, async () => {
      try {
        const saved = await firstValueFrom(this.api.submitNotificationSettings(this.payload()));
        this.current.set(saved);
        this.toast.ok('toast.notificationSettingsSubmitted');
      } catch (err) {
        this.apiError.set(apiErrorMessageKey(err));
      }
      return undefined;
    });
  }

  private payload(): { callbackUrl: string; authentication: CallbackAuthenticationRequest } {
    const v = this.form().value();
    let authentication: CallbackAuthenticationRequest;
    switch (v.mode) {
      case 'basic':
        authentication = { mode: 'basic', username: v.username, password: v.password };
        break;
      case 'oauth2ClientCredentials':
        authentication = {
          mode: 'oauth2ClientCredentials',
          tokenUrl: v.tokenUrl,
          clientId: v.clientId,
          clientSecret: v.clientSecret,
          ...(v.scope.trim() ? { scope: v.scope.trim() } : {}),
        };
        break;
      case 'customHeader':
        authentication = { mode: 'customHeader', headerName: v.headerName, headerValue: v.headerValue };
        break;
      case 'staticBearerJwt':
        authentication = { mode: 'staticBearerJwt', token: v.token };
        break;
    }
    return { callbackUrl: v.callbackUrl, authentication };
  }
}
