import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { applyPasswordRules } from '@core/forms/field-rules';
import { submitChecked } from '@core/forms/submit-checked';
import { apiErrorMessageKey } from '@core/http/http-error';
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
    await submitChecked(this.loginForm, this.toast, async () => {
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
        // 401 really is "wrong email/password" — everything else (500, 503, network) gets its
        // actual status-based message instead of the misleading "bad credentials" copy, so a
        // server/deployment problem doesn't masquerade as a typo.
        this.toast.fail(status === 401 ? 'toast.loginBad' : apiErrorMessageKey(err));
      }
      return undefined;
    });
  }
}
