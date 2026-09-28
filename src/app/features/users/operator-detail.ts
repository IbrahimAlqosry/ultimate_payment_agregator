import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { PlatformOperatorChangeInput, PlatformOperatorDetails, PlatformOperatorRole } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
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

type ChangeType = 'role' | 'permissions' | 'suspension' | 'reactivation';

/**
 * Guide v5.0 §8.3 + the permission-assignment contract. Each submission is one change type.
 *
 * - **permissions**: a complete replacement array for the operator's *current* role, pre-seeded
 *   with the current grants (so a careless submit doesn't revoke everything). Stored grants the
 *   role can't hold are listed and left out explicitly — never dropped silently.
 * - **role**: may omit `permissions` (the server keeps and snapshots them) only when every
 *   current grant fits both the old and the new role. Otherwise the Maker must review a
 *   replacement set — keep the ones that still apply, or start from the new role's defaults —
 *   sent as one combined role + grants request. `[]` means "remove all", omitted means "keep".
 */
@Component({
  selector: 'app-operator-detail',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState, PermissionPicker],
  templateUrl: './operator-detail.html',
  styleUrls: ['../../shared/form-page.scss', '../../shared/settings-page.scss', './operator-detail.scss'],
})
export class OperatorDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<PlatformOperatorDetails | null>(null);
  readonly catalog = signal<NormalizedCatalog | null>(null);

  readonly changeType = signal<ChangeType>('role');
  readonly newRole = signal<PlatformOperatorRole>('reader');
  /** Permissions tab: the replacement set for the current role. */
  readonly selectedPermissions = signal<string[]>([]);
  /** Role tab: `null` = keep current grants (role-only request); an array = reviewed replacement. */
  readonly roleReplacement = signal<string[] | null>(null);
  /** Keys the server rejected for the proposed role (forces a replacement even if we missed it). */
  readonly serverDropped = signal<string[]>([]);
  readonly submitting = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly proposed = signal(false);

  readonly roles: PlatformOperatorRole[] = ['maker', 'checker', 'reader', 'admin'];

  /** Current grants the current role can't use (stored before this contract). */
  readonly storedInapplicable = computed(() => {
    const catalog = this.catalog();
    const op = this.row();
    return catalog && op ? inapplicableKeys(catalog, op.permissions, op.role) : [];
  });

  /** Current grants that can't be retained through the proposed role change. */
  readonly roleDropped = computed(() => {
    const catalog = this.catalog();
    const op = this.row();
    if (!catalog || !op || this.newRole() === op.role) {
      return [];
    }
    const dropped = new Set([
      ...inapplicableKeys(catalog, op.permissions, this.newRole()),
      ...inapplicableKeys(catalog, op.permissions, op.role),
      ...this.serverDropped(),
    ]);
    return op.permissions.filter((key) => dropped.has(key));
  });

  readonly canSubmitRole = computed(() => {
    const op = this.row();
    return !!op && this.newRole() !== op.role && (this.roleDropped().length === 0 || this.roleReplacement() !== null);
  });

  readonly canSubmit = computed(() => {
    switch (this.changeType()) {
      case 'role':
        return this.canSubmitRole();
      case 'permissions':
        return !!this.catalog();
      default:
        return true;
    }
  });

  constructor() {
    this.load();
    this.api.getOperatorPermissionCatalog().subscribe({
      next: (raw) => this.catalog.set(normalizeCatalog(raw)),
    });
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    this.api.getOperator(id).subscribe({
      next: (row) => {
        this.row.set(row);
        this.newRole.set(row.role);
        this.roleReplacement.set(null);
        this.serverDropped.set([]);
        this.selectedPermissions.set([...row.permissions]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  definitionsFor(role: PlatformOperatorRole) {
    const catalog = this.catalog();
    return catalog ? applicableDefinitions(catalog, role) : [];
  }

  defaultsFor(role: PlatformOperatorRole): string[] {
    const catalog = this.catalog();
    return catalog ? roleDefaults(catalog, role) : [];
  }

  labelFor(key: string): string {
    const catalog = this.catalog();
    return (catalog && definitionFor(catalog, key)?.label) || key;
  }

  /** The permissions-tab selection, minus stored grants the role can't hold (listed separately). */
  permissionsToSubmit(): string[] {
    const excluded = new Set(this.storedInapplicable());
    return this.selectedPermissions().filter((key) => !excluded.has(key));
  }

  setChangeType(type: ChangeType): void {
    this.changeType.set(type);
    this.actionError.set(null);
    this.proposed.set(false);
  }

  setNewRole(role: PlatformOperatorRole): void {
    this.newRole.set(role);
    this.roleReplacement.set(null);
    this.serverDropped.set([]);
    this.actionError.set(null);
    this.proposed.set(false);
  }

  /** Role tab, when every grant can be kept: opt into sending an explicit set too. */
  toggleAlsoChangePermissions(on: boolean): void {
    const op = this.row();
    this.roleReplacement.set(on && op ? [...op.permissions] : null);
  }

  keepApplicable(): void {
    const dropped = new Set(this.roleDropped());
    this.roleReplacement.set((this.row()?.permissions ?? []).filter((key) => !dropped.has(key)));
  }

  useNewRoleDefaults(): void {
    this.roleReplacement.set(this.defaultsFor(this.newRole()));
  }

  async propose(): Promise<void> {
    const row = this.row();
    if (!row || this.submitting() || !this.canSubmit()) {
      return;
    }
    this.actionError.set(null);
    this.submitting.set(true);
    const type = this.changeType();
    const replacement = this.roleReplacement();
    const body: PlatformOperatorChangeInput = {
      changeType: type,
      concurrencyToken: row.concurrencyToken,
      ...(type === 'role' ? { role: this.newRole(), ...(replacement !== null ? { permissions: replacement } : {}) } : {}),
      ...(type === 'permissions' ? { permissions: this.permissionsToSubmit() } : {}),
    };
    try {
      await firstValueFrom(this.api.requestOperatorChange(row.userId, body));
      this.toast.ok('toast.operatorChangeProposed');
      this.proposed.set(true);
    } catch (err) {
      const problem = readPermissionProblem(err);
      if (problem) {
        this.actionError.set(`perms.error.${problem.code}`);
        if (type === 'role') {
          this.serverDropped.set(problem.keys);
          this.roleReplacement.set(null);
        }
      } else if (err instanceof HttpErrorResponse && err.status === 409) {
        // Stale target version — refresh it; the Maker re-reviews and submits a fresh request.
        this.actionError.set('perms.error.stale');
        this.load();
      } else {
        this.actionError.set(apiErrorMessageKey(err));
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
