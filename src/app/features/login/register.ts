import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { applyPasswordRules, applyPhoneRules } from '@core/forms/field-rules';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

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

  readonly apiError = signal(false);
  readonly show = signal(false);
  readonly showConfirm = signal(false);

  readonly registerForm = form(
    signal({
      legalName: '',
      contactName: '',
      crNumber: '',
      email: '',
      industry: '',
      phone: '',
      city: '',
      erpSystem: '',
      password: '',
      confirm: '',
    }),
    (p) => {
      required(p.legalName);
      required(p.contactName);
      required(p.crNumber);
      required(p.email);
      email(p.email);
      required(p.industry);
      applyPhoneRules(p.phone);
      required(p.city);
      required(p.erpSystem);
      applyPasswordRules(p.password);
      applyPasswordRules(p.confirm);
      validate(p.confirm, ({ value, valueOf }) =>
        value() && value() !== valueOf(p.password) ? { kind: 'mismatch' } : undefined,
      );
    },
  );

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.registerForm, async () => {
      const { confirm: _confirm, ...payload } = this.registerForm().value();
      try {
        await firstValueFrom(this.auth.register(payload));
        this.toast.ok('toast.registerOk');
        await this.router.navigateByUrl('/register-pending');
      } catch {
        this.apiError.set(true);
        this.toast.fail('toast.registerBad');
      }
      return undefined;
    });
  }
}
