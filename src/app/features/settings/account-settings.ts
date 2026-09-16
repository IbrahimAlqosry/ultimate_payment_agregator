import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, required, validate } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { applyPasswordRules } from '@core/forms/field-rules';
import { submitChecked } from '@core/forms/submit-checked';
import { AtlasApi } from '@core/http/atlas-api';
import { apiErrorMessageKey, MISSING_CONCURRENCY_TOKEN_KEY } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { AccountProfile } from '@core/models';
import { MerchantProfileResponse } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-account-settings',
  imports: [FormField, TranslocoPipe, DataState, FieldError],
  templateUrl: './account-settings.html',
  styleUrls: ['../../shared/form-page.scss', '../../shared/settings-page.scss'],
})
export class AccountSettings {
  private readonly api = inject(AtlasApi);
  private readonly platformApi = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly profile = signal<AccountProfile | null>(null);
  readonly emailOn = signal(true);
  readonly smsOn = signal(false);

  /** Real GET /profiles/merchant — the mock `AccountProfile.merchant`'s richer shape
   * (address/officePhone/businessEmail/contactRole) has no equivalent on the real backend, so
   * the merchant section is sourced from here instead, not from `apply()`. */
  readonly merchantApiError = signal<string | null>(null);
  private merchantConcurrencyToken: string | null = null;
  private merchantErpSystemId = '';

  readonly merchantForm = form(
    signal({
      legalName: '',
      commercialRegistrationNumber: '',
      erpSystemName: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
    }),
    (p) => {
      required(p.legalName);
      required(p.contactName);
      required(p.contactEmail);
      email(p.contactEmail);
    },
  );

  readonly operatorForm = form(signal({ name: '', phone: '' }), (p) => {
    required(p.name);
  });

  readonly passwordForm = form(signal({ current: '', next: '', confirm: '' }), (p) => {
    required(p.current);
    applyPasswordRules(p.next);
    applyPasswordRules(p.confirm);
    validate(p.confirm, ({ value, valueOf }) =>
      value() && value() !== valueOf(p.next) ? { kind: 'mismatch' } : undefined,
    );
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.profile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.apply(profile);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  onEmail(event: Event): void {
    this.emailOn.set((event.target as HTMLInputElement).checked);
    this.persistPrefs();
  }

  onSms(event: Event): void {
    this.smsOn.set((event.target as HTMLInputElement).checked);
    this.persistPrefs();
  }

  async onMerchant(event: Event): Promise<void> {
    event.preventDefault();
    this.merchantApiError.set(null);
    await submitChecked(this.merchantForm, this.toast, async () => {
      if (!this.merchantConcurrencyToken) {
        this.merchantApiError.set(MISSING_CONCURRENCY_TOKEN_KEY);
        return undefined;
      }
      const value = this.merchantForm().value();
      try {
        const saved = await firstValueFrom(
          this.platformApi.updateOwnMerchantProfile({
            legalName: value.legalName,
            commercialRegistrationNumber: value.commercialRegistrationNumber,
            contact: { name: value.contactName, email: value.contactEmail, phone: value.contactPhone },
            erpSystemId: this.merchantErpSystemId,
            concurrencyToken: this.merchantConcurrencyToken,
          }),
        );
        this.applyMerchantProfile(saved);
        this.toast.ok('toast.profileUpdated');
      } catch (err) {
        this.merchantApiError.set(apiErrorMessageKey(err));
      }
      return undefined;
    });
  }

  async onOperator(event: Event): Promise<void> {
    event.preventDefault();
    await submitChecked(this.operatorForm, this.toast, async () => {
      try {
        const saved = await firstValueFrom(
          this.api.updateOperatorProfile({
            ...this.operatorForm().value(),
            emailNotifications: this.emailOn(),
            smsNotifications: this.smsOn(),
          }),
        );
        this.profile.set(saved);
        this.toast.ok('toast.profileUpdated');
      } catch {
        /* interceptor */
      }
      return undefined;
    });
  }

  async onPassword(event: Event): Promise<void> {
    event.preventDefault();
    await submitChecked(this.passwordForm, this.toast, async () => {
      const { current, next } = this.passwordForm().value();
      try {
        // Success revokes the session server-side — sign the user out rather than just
        // resetting the form, so the UI doesn't keep acting on a session that's already dead.
        await firstValueFrom(this.platformApi.changePassword({ currentPassword: current, newPassword: next }));
        this.passwordForm().reset({ current: '', next: '', confirm: '' });
        this.toast.ok('toast.passwordUpdated');
        this.auth.logout(true);
      } catch {
        /* interceptor */
      }
      return undefined;
    });
  }

  simulate(status: 401 | 404 | 501 | 503): void {
    this.api.simulate(status).subscribe({ error: () => undefined });
  }

  private persistPrefs(): void {
    if (this.auth.readOnly()) {
      return;
    }
    this.api
      .updateOperatorProfile({
        ...this.operatorForm().value(),
        emailNotifications: this.emailOn(),
        smsNotifications: this.smsOn(),
      })
      .subscribe({
        next: (saved) => this.profile.set(saved),
        error: () => {
          this.emailOn.set(this.profile()?.operator?.emailNotifications ?? true);
          this.smsOn.set(this.profile()?.operator?.smsNotifications ?? false);
        },
      });
  }

  private apply(profile: AccountProfile): void {
    this.operatorForm().reset({ name: profile.name, phone: profile.phone });
    this.emailOn.set(profile.operator?.emailNotifications ?? true);
    this.smsOn.set(profile.operator?.smsNotifications ?? false);
    if (profile.audience === 'merchant') {
      this.loadMerchantProfile();
    }
  }

  private loadMerchantProfile(): void {
    this.platformApi.getOwnMerchantProfile().subscribe({
      next: (saved) => this.applyMerchantProfile(saved),
      error: (err: unknown) => this.merchantApiError.set(apiErrorMessageKey(err)),
    });
  }

  private applyMerchantProfile(saved: MerchantProfileResponse): void {
    this.merchantConcurrencyToken = saved.concurrencyToken;
    this.merchantErpSystemId = saved.erpSystem.erpSystemId;
    this.merchantForm().reset({
      legalName: saved.legalName,
      commercialRegistrationNumber: saved.commercialRegistrationNumber,
      erpSystemName: saved.erpSystem.systemName,
      contactName: saved.contact.name,
      contactPhone: saved.contact.phone,
      contactEmail: saved.contact.email,
    });
  }
}
