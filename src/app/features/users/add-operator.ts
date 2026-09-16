import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { submitChecked } from '@core/forms/submit-checked';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { PlatformOperatorRole } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

/** Guide v5.0 §8.2 — confirmed live-fixed 2026-09-13 (see docs/BACKEND_ISSUES.md): the invite
 * email must belong to the test server's configured corporate domain, confirmed with the test
 * team beforehand; permissions are picked from the real 26-value catalog, not a screens list. */
@Component({
  selector: 'app-add-operator',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './add-operator.html',
  styleUrls: ['../../shared/form-page.scss', './operator-detail.scss'],
})
export class AddOperator {
  private readonly api = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);
  readonly catalog = signal<string[]>([]);
  readonly selectedPermissions = signal<string[]>([]);

  readonly roles: { id: PlatformOperatorRole; titleKey: string; hintKey: string }[] = [
    { id: 'maker', titleKey: 'role.maker', hintKey: 'onboard.roleMaker' },
    { id: 'checker', titleKey: 'role.checker', hintKey: 'onboard.roleChecker' },
    { id: 'reader', titleKey: 'role.reader', hintKey: 'onboard.roleReader' },
    { id: 'admin', titleKey: 'role.admin', hintKey: 'onboard.roleAdmin' },
  ];

  readonly form = form(
    signal({
      email: '',
      role: 'reader' as PlatformOperatorRole,
    }),
    (p) => {
      required(p.email);
      email(p.email);
      required(p.role);
    },
  );

  constructor() {
    this.api.getOperatorPermissionCatalog().subscribe({
      next: (page) => this.catalog.set(page.permissions),
    });
  }

  selectRole(role: PlatformOperatorRole): void {
    this.form.role().value.set(role);
  }

  togglePermission(permission: string): void {
    this.selectedPermissions.update((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submitChecked(this.form, this.toast, async () => {
      try {
        await firstValueFrom(
          this.api.inviteOperator({
            email: this.form().value().email,
            role: this.form().value().role,
            permissions: this.selectedPermissions(),
          }),
        );
        this.toast.ok('toast.operatorInvited');
        await this.router.navigateByUrl('/operators?tab=requests');
      } catch (err) {
        this.apiError.set(apiErrorMessageKey(err));
      }
      return undefined;
    });
  }
}
