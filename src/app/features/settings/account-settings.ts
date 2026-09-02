import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { applyPasswordRules } from '@core/forms/field-rules';
import { AtlasApi } from '@core/http/atlas-api';
import { AccountProfile } from '@core/models';
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
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly profile = signal<AccountProfile | null>(null);
  readonly emailOn = signal(true);
  readonly smsOn = signal(false);

  readonly merchantForm = form(
    signal({
      businessName: '',
      crNumber: '',
      erpSystem: '',
      address: '',
      officePhone: '',
      businessEmail: '',
      contactName: '',
      contactRole: '',
      contactPhone: '',
      contactEmail: '',
    }),
    (p) => {
      required(p.businessName);
      required(p.contactName);
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
    await submit(this.merchantForm, async () => {
      try {
        const saved = await firstValueFrom(this.api.updateMerchantProfile(this.merchantForm().value()));
        this.profile.set(saved);
        this.toast.ok('toast.profileUpdated');
      } catch {
        /* interceptor */
      }
      return undefined;
    });
  }

  async onOperator(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.operatorForm, async () => {
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
    await submit(this.passwordForm, async () => {
      try {
        await firstValueFrom(this.api.updatePassword(this.passwordForm().value()));
        this.passwordForm().reset({ current: '', next: '', confirm: '' });
        this.toast.ok('toast.passwordUpdated');
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
        error: () => undefined,
      });
  }

  private apply(profile: AccountProfile): void {
    this.operatorForm().reset({ name: profile.name, phone: profile.phone });
    this.emailOn.set(profile.operator?.emailNotifications ?? true);
    this.smsOn.set(profile.operator?.smsNotifications ?? false);
    if (profile.merchant) {
      this.merchantForm().reset(profile.merchant);
    }
  }
}
