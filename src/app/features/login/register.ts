import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { applyPasswordRules, applyPhoneRules } from '@core/forms/field-rules';
import { readApiError } from '@core/http/http-error';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink, TranslocoPipe, AuthScreen, BrandLockup, FieldError],
  templateUrl: './register.html',
  styleUrls: ['./auth-forms.scss', './register.scss'],
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);
  readonly show = signal(false);
  readonly showConfirm = signal(false);

  // Fields match the real backend's SelfServiceMerchantOnboardingRequest exactly — it rejects
  // unknown fields, so there is no city/industry here (the mock's fields, dropped for this flow).
  readonly registerForm = form(
    signal({
      legalName: '',
      contactName: '',
      commercialRegistrationNumber: '',
      email: '',
      phone: '',
      erpSystemId: '',
      password: '',
      confirm: '',
    }),
    (p) => {
      required(p.legalName);
      maxLength(p.legalName, 200);
      required(p.contactName);
      maxLength(p.contactName, 200);
      required(p.commercialRegistrationNumber);
      maxLength(p.commercialRegistrationNumber, 64);
      required(p.email);
      email(p.email);
      applyPhoneRules(p.phone);
      required(p.erpSystemId);
      validate(p.erpSystemId, ({ value }) => (UUID_PATTERN.test(value()) ? undefined : { kind: 'uuid' }));
      applyPasswordRules(p.password);
      applyPasswordRules(p.confirm);
      validate(p.confirm, ({ value, valueOf }) =>
        value() && value() !== valueOf(p.password) ? { kind: 'mismatch' } : undefined,
      );
    },
  );

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submit(this.registerForm, async () => {
      const { legalName, contactName, commercialRegistrationNumber, email, phone, erpSystemId, password } =
        this.registerForm().value();
      try {
        await firstValueFrom(
          this.auth.registerMerchant({
            legalName,
            commercialRegistrationNumber,
            contact: { name: contactName, email, phone },
            erpSystemId,
            password,
          }),
        );
        this.toast.ok('toast.registerOk');
        await this.router.navigateByUrl('/register-pending');
      } catch (err) {
        this.apiError.set(readApiError(err).message);
        this.toast.fail('toast.registerBad');
      }
      return undefined;
    });
  }
}
