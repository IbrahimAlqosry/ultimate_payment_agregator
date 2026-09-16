import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { submitChecked } from '@core/forms/submit-checked';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

@Component({
  selector: 'app-forgot',
  imports: [FormField, RouterLink, TranslocoPipe, AuthScreen, BrandLockup, FieldError],
  templateUrl: './forgot.html',
  styleUrl: './auth-forms.scss',
})
export class Forgot {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly forgotForm = form(signal({ email: '' }), (p) => {
    required(p.email);
    email(p.email);
  });

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submitChecked(this.forgotForm, this.toast, async () => {
      const emailValue = this.forgotForm.email().value();
      try {
        await firstValueFrom(this.auth.forgot(emailValue));
        this.toast.ok('toast.resetSent');
        await this.router.navigate(['/email-sent'], { queryParams: { email: emailValue } });
      } catch {
        this.toast.fail('toast.server');
        return undefined;
      }
      return undefined;
    });
  }
}
