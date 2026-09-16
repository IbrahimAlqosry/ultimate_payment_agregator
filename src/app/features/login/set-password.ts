import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { applyPasswordRules } from '@core/forms/field-rules';
import { submitChecked } from '@core/forms/submit-checked';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

type BootstrapAudience = 'merchant' | 'institution';

/**
 * First-time password setup for an approved, activated assisted Merchant/FI (BR-AUTH-11 /
 * the real backend's merchant-bootstrap / financial-institution-bootstrap endpoints). Self-service
 * Merchants already chose their own password at sign-up and never land here.
 */
@Component({
  selector: 'app-set-password',
  imports: [FormField, RouterLink, TranslocoPipe, AuthScreen, BrandLockup, FieldError],
  templateUrl: './set-password.html',
  styleUrl: './auth-forms.scss',
})
export class SetPassword {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly apiError = signal(false);
  readonly showTemp = signal(false);
  readonly show = signal(false);
  readonly showConfirm = signal(false);
  readonly audience = signal<BootstrapAudience>('merchant');

  readonly audiences: { id: BootstrapAudience; label: string }[] = [
    { id: 'merchant', label: 'login.role.merchant' },
    { id: 'institution', label: 'login.role.institution' },
  ];

  readonly setPasswordForm = form(
    signal({ email: '', temporaryPassword: '', newPassword: '', confirm: '' }),
    (p) => {
      required(p.email);
      email(p.email);
      required(p.temporaryPassword);
      applyPasswordRules(p.newPassword);
      applyPasswordRules(p.confirm);
      validate(p.confirm, ({ value, valueOf }) =>
        value() && value() !== valueOf(p.newPassword) ? { kind: 'mismatch' } : undefined,
      );
    },
  );

  constructor() {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.setPasswordForm.email().value.set(email);
    }
  }

  selectAudience(audience: BootstrapAudience): void {
    this.audience.set(audience);
    this.apiError.set(false);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submitChecked(this.setPasswordForm, this.toast, async () => {
      const { email: emailValue, temporaryPassword, newPassword } = this.setPasswordForm().value();
      const body = { email: emailValue, temporaryPassword, newPassword };
      const request$ =
        this.audience() === 'merchant' ? this.auth.bootstrapMerchant(body) : this.auth.bootstrapFinancialInstitution(body);
      try {
        await firstValueFrom(request$);
        this.toast.ok('toast.setPasswordOk');
        await this.router.navigateByUrl('/login');
      } catch {
        this.apiError.set(true);
        this.toast.fail('toast.setPasswordBad');
      }
      return undefined;
    });
  }
}
