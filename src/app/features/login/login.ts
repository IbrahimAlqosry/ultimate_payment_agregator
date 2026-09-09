import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { applyPasswordRules } from '@core/forms/field-rules';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, TranslocoPipe, AuthScreen, BrandLockup, FieldError],
  templateUrl: './login.html',
  styleUrl: './auth-forms.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal(false);
  readonly showPassword = signal(false);

  readonly loginForm = form(signal({ email: '', password: '' }), (p) => {
    required(p.email);
    email(p.email);
    applyPasswordRules(p.password);
  });

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.loginForm, async () => {
      const { email, password } = this.loginForm().value();
      try {
        // The real backend now exposes GET /auth/me, called right after OTP verification — the
        // app discovers the account's real type/role there instead of needing to guess it here.
        await firstValueFrom(this.auth.login(email, password));
        this.toast.ok('toast.otpSent');
        await this.router.navigateByUrl('/otp');
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 423) {
          await this.router.navigateByUrl('/account-locked');
          return undefined;
        }
        this.apiError.set(true);
        this.toast.fail('toast.loginBad');
      }
      return undefined;
    });
  }
}
