import { Component, inject, signal } from '@angular/core';
import { FormField, form, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { applyPasswordRules } from '@core/forms/field-rules';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

@Component({
  selector: 'app-reset',
  imports: [FormField, RouterLink, TranslocoPipe, AuthScreen, BrandLockup, FieldError],
  templateUrl: './reset.html',
  styleUrls: ['./auth-forms.scss', './reset.scss'],
})
export class Reset {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly show = signal(false);
  readonly showConfirm = signal(false);

  readonly resetForm = form(signal({ password: '', confirm: '' }), (p) => {
    applyPasswordRules(p.password);
    applyPasswordRules(p.confirm);
    validate(p.confirm, ({ value, valueOf }) =>
      value() && value() !== valueOf(p.password) ? { kind: 'mismatch' } : undefined,
    );
  });

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.resetForm, async () => {
      this.toast.ok('toast.passwordUpdated');
      await this.router.navigateByUrl('/reset-success');
      return undefined;
    });
  }
}
