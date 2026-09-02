import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AtlasApi } from '@core/http/atlas-api';
import { OperatorRole } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-add-operator',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './add-operator.html',
  styleUrl: '../../shared/form-page.scss',
})
export class AddOperator {
  private readonly api = inject(AtlasApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly apiError = signal(false);

  readonly roles = [
    { id: 'maker' as const, titleKey: 'role.maker', hintKey: 'onboard.roleMaker' },
    { id: 'checker' as const, titleKey: 'role.checker', hintKey: 'onboard.roleChecker' },
    { id: 'reader' as const, titleKey: 'role.reader', hintKey: 'onboard.roleReader' },
    { id: 'admin' as const, titleKey: 'role.admin', hintKey: 'onboard.roleAdmin' },
  ];

  readonly form = form(
    signal({
      name: '',
      email: '',
      role: 'admin' as OperatorRole,
    }),
    (p) => {
      required(p.name);
      required(p.email);
      email(p.email);
      required(p.role);
    },
  );

  selectRole(role: OperatorRole): void {
    this.form.role().value.set(role);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.form, async () => {
      try {
        await firstValueFrom(this.api.createOperator(this.form().value()));
        this.toast.ok('toast.operatorInvited');
        await this.router.navigateByUrl('/operators');
      } catch {
        this.apiError.set(true);
      }
      return undefined;
    });
  }
}
