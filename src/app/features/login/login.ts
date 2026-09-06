import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { applyPasswordRules } from '@core/forms/field-rules';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@core/http/mock-data';
import { Audience } from '@core/models';
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
  readonly swapping = signal(false);
  readonly audience = signal<Audience>('operator');
  readonly demoPassword = DEMO_PASSWORD;
  readonly visibleAccounts = computed(() =>
    DEMO_ACCOUNTS.filter((account) => account.audience === this.audience()),
  );

  readonly loginForm = form(signal({ email: '', password: '' }), (p) => {
    required(p.email);
    email(p.email);
    applyPasswordRules(p.password);
  });

  readonly audiences: { id: Audience; label: string }[] = [
    { id: 'operator', label: 'login.role.operator' },
    { id: 'merchant', label: 'login.role.merchant' },
    { id: 'institution', label: 'login.role.institution' },
  ];

  private swapTimer = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => window.clearTimeout(this.swapTimer));
  }

  selectAudience(audience: Audience): void {
    if (audience === this.audience()) {
      return;
    }
    window.clearTimeout(this.swapTimer);
    this.swapping.set(true);
    this.swapTimer = window.setTimeout(() => {
      this.audience.set(audience);
      this.apiError.set(false);
      window.requestAnimationFrame(() => this.swapping.set(false));
    }, 160);
  }

  useAccount(account: (typeof DEMO_ACCOUNTS)[number]): void {
    this.selectAudience(account.audience);
    this.loginForm().reset({ email: account.email, password: account.password });
    this.showPassword.set(false);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.loginForm, async () => {
      const { email, password } = this.loginForm().value();
      try {
        await firstValueFrom(this.auth.login(email, password, this.audience()));
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
