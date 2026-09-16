import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { applyPasswordRules } from '@core/forms/field-rules';
import { submitChecked } from '@core/forms/submit-checked';
import { PlatformApi } from '@core/http/platform-api';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

/** Guide v5.0 §8.5 — public, no CSRF, creates no session. Use the actual delivered invitation
 * secret; the temporary OTP (000000) never substitutes for it. On success, direct the operator to
 * normal login + OTP — acceptance alone does not sign them in. */
@Component({
  selector: 'app-accept-invitation',
  imports: [FormField, RouterLink, TranslocoPipe, AuthScreen, BrandLockup, FieldError],
  templateUrl: './accept-invitation.html',
  styleUrl: './auth-forms.scss',
})
export class AcceptInvitation {
  private readonly api = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal(false);
  readonly show = signal(false);
  readonly showConfirm = signal(false);
  readonly showSecret = signal(false);

  readonly form = form(signal({ invitationSecret: '', password: '', confirm: '' }), (p) => {
    required(p.invitationSecret);
    applyPasswordRules(p.password);
    applyPasswordRules(p.confirm);
    validate(p.confirm, ({ value, valueOf }) =>
      value() && value() !== valueOf(p.password) ? { kind: 'mismatch' } : undefined,
    );
  });

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submitChecked(this.form, this.toast, async () => {
      const { invitationSecret, password } = this.form().value();
      try {
        await firstValueFrom(this.api.acceptOperatorInvitation({ invitationSecret, password }));
        this.toast.ok('toast.invitationAccepted');
        await this.router.navigateByUrl('/login');
      } catch {
        this.apiError.set(true);
        this.toast.fail('toast.invitationBad');
      }
      return undefined;
    });
  }
}
