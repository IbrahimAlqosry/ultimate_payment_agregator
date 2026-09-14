import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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

type ChangeType = 'role' | 'permissions' | 'suspension' | 'reactivation';

/** Guide v5.0 §8.3 — every field of `PlatformOperatorChangeInput` is one submission of exactly
 * one change type; there is no partial-patch API. A "permissions" submission replaces the whole
 * set, so the picker is pre-seeded with the operator's current grants rather than starting empty
 * — otherwise a careless submit would revoke everything instead of adjusting it. */
@Component({
  selector: 'app-operator-detail',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState],
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
  readonly catalog = signal<string[]>([]);

  readonly changeType = signal<ChangeType>('role');
  readonly newRole = signal<PlatformOperatorRole>('reader');
  readonly selectedPermissions = signal<string[]>([]);
  readonly submitting = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly proposed = signal(false);

  readonly roles: PlatformOperatorRole[] = ['maker', 'checker', 'reader', 'admin'];

  constructor() {
    this.load();
    this.api.getOperatorPermissionCatalog().subscribe({
      next: (page) => this.catalog.set(page.permissions),
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
        this.selectedPermissions.set([...row.permissions]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  setChangeType(type: ChangeType): void {
    this.changeType.set(type);
    this.actionError.set(null);
    this.proposed.set(false);
  }

  togglePermission(permission: string): void {
    this.selectedPermissions.update((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
  }

  async propose(): Promise<void> {
    const row = this.row();
    if (!row || this.submitting()) {
      return;
    }
    this.actionError.set(null);
    this.submitting.set(true);
    const body: PlatformOperatorChangeInput = {
      changeType: this.changeType(),
      concurrencyToken: row.concurrencyToken,
      ...(this.changeType() === 'role' ? { role: this.newRole() } : {}),
      ...(this.changeType() === 'permissions' ? { permissions: this.selectedPermissions() } : {}),
    };
    try {
      await firstValueFrom(this.api.requestOperatorChange(row.userId, body));
      this.toast.ok('toast.operatorChangeProposed');
      this.proposed.set(true);
    } catch (err) {
      this.actionError.set(apiErrorMessageKey(err));
    } finally {
      this.submitting.set(false);
    }
  }
}
