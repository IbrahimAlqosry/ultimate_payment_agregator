import { Component, computed, inject, signal } from '@angular/core';
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
import {
  applicableDefinitions,
  definitionFor,
  inapplicableKeys,
  NormalizedCatalog,
  normalizeCatalog,
  readPermissionProblem,
  roleDefaults,
} from './permission-catalog';
import { PermissionPicker } from './permission-picker';

/** Selected keys the new role can't hold, awaiting the user's explicit decision. */
interface RoleSwitchReview {
  fromRole: PlatformOperatorRole;
  keys: string[];
}

/** Guide v5.0 §8.2 + the permission-assignment contract: the invite email must belong to the
 * test server's configured corporate domain; the picker lists only grants the *selected target
 * role* may hold. Role defaults pre-fill a fresh form once and are never re-applied while
 * editing; a role switch that leaves selected grants inapplicable pauses submission until the
 * user removes or replaces them — nothing is dropped or activated silently. `[]` is a valid,
 * explicit choice. */
@Component({
  selector: 'app-add-operator',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError, PermissionPicker],
  templateUrl: './add-operator.html',
  styleUrls: ['../../shared/form-page.scss', './operator-detail.scss'],
})
export class AddOperator {
  private readonly api = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);
  readonly catalog = signal<NormalizedCatalog | null>(null);
  readonly catalogError = signal(false);
  readonly selectedPermissions = signal<string[]>([]);
  readonly review = signal<RoleSwitchReview | null>(null);
  /** Once the user edits the selection, defaults are never applied again. */
  private touched = false;

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

  readonly role = computed(() => this.form.role().value());
  readonly definitions = computed(() => {
    const catalog = this.catalog();
    return catalog ? applicableDefinitions(catalog, this.role()) : [];
  });
  readonly defaults = computed(() => {
    const catalog = this.catalog();
    return catalog ? roleDefaults(catalog, this.role()) : [];
  });

  constructor() {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.catalogError.set(false);
    this.api.getOperatorPermissionCatalog().subscribe({
      next: (raw) => {
        const catalog = normalizeCatalog(raw);
        this.catalog.set(catalog);
        if (!this.touched) {
          this.selectedPermissions.set(roleDefaults(catalog, this.role()));
        }
      },
      error: () => this.catalogError.set(true),
    });
  }

  labelFor(key: string): string {
    const catalog = this.catalog();
    return (catalog && definitionFor(catalog, key)?.label) || key;
  }

  selectRole(role: PlatformOperatorRole): void {
    const fromRole = this.role();
    if (role === fromRole) {
      return;
    }
    this.form.role().value.set(role);
    this.apiError.set(null);
    const catalog = this.catalog();
    const keys = catalog ? inapplicableKeys(catalog, this.selectedPermissions(), role) : [];
    // Keep the earliest "from" role if the user hops through several roles mid-review.
    this.review.set(keys.length ? { fromRole: this.review()?.fromRole ?? fromRole, keys } : null);
  }

  onPermissionsChange(keys: string[]): void {
    this.touched = true;
    this.selectedPermissions.set(keys);
  }

  removeInapplicable(): void {
    const review = this.review();
    if (review) {
      this.onPermissionsChange(this.selectedPermissions().filter((key) => !review.keys.includes(key)));
      this.review.set(null);
    }
  }

  replaceWithDefaults(): void {
    this.onPermissionsChange(this.defaults());
    this.review.set(null);
  }

  revertRole(): void {
    const review = this.review();
    if (review) {
      this.form.role().value.set(review.fromRole);
      this.review.set(null);
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    if (this.review() || !this.catalog()) {
      return;
    }
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
        const problem = readPermissionProblem(err);
        if (problem?.keys.length) {
          // The server is authoritative: surface its keys through the same review panel.
          this.review.set({ fromRole: this.role(), keys: problem.keys });
        }
        this.apiError.set(problem ? `perms.error.${problem.code}` : apiErrorMessageKey(err));
      }
      return undefined;
    });
  }
}
