import { DatePipe } from '@angular/common';
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { SCREEN_MODULES, defaultScreens } from '@core/auth/screens';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { AuditEvent, Operator, OperatorRole, OperatorStatus, ScreenModule } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { ApprovalActions } from '@shared/approval-actions';
import { DataState } from '@shared/data-state';
import { SearchField } from '@shared/search-field';

type OperatorTab = 'all' | 'permissions' | 'logs';

@Component({
  selector: 'app-users',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, ApprovalActions, DataState, SearchField],
  templateUrl: './users.html',
  styles: `
    .badge.role-admin {
      background: #fdeded;
      color: #c0392b;
    }
    .badge.role-checker {
      background: #eef4fc;
      color: #2f80ed;
    }
    .badge.role-maker {
      background: #e8f6ed;
      color: #1fa64d;
    }
    .badge.role-reader {
      background: #f3f1f1;
      color: #7e7676;
    }
    .admin-only {
      margin: 0 0 12px auto;
      width: fit-content;
      padding: 6px 12px;
      border-radius: 999px;
      background: #fdeded;
      color: #c0392b;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .perm-matrix th,
    .perm-matrix td {
      white-space: nowrap;
    }
    .perm-matrix .center {
      text-align: center;
    }
    @media (max-width: 860px) {
      .role-option {
        width: 100%;
      }
    }
    .perm-check {
      color: #1fa64d;
      font-weight: 700;
    }
    .block {
      display: block;
      margin-top: 2px;
      font-size: 12px;
    }
    .status-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 13px;
      color: #7e7676;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .caps {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #7e7676;
    }
    .form-field input,
    .input-readonly {
      height: 44px;
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      padding: 0 14px;
      font-size: 14px;
    }
    .input-readonly {
      background: #f7f5f5;
      color: #999;
    }
    .role-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 16px;
    }
    .role-option {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      width: 220px;
      cursor: pointer;
    }
    .role-option em {
      display: block;
      font-style: normal;
      font-size: 11px;
      color: #7e7676;
    }
    .deactivate {
      display: flex;
      gap: 10px;
      align-items: center;
      color: #c33;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .perm-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .perm-box input {
      width: 18px;
      height: 18px;
      margin: 0;
      accent-color: #1fa64d;
      cursor: pointer;
    }
    .perm-box input:disabled {
      cursor: not-allowed;
    }
    .perm-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px 8px;
      border-top: 1px solid #f0eaea;
    }
    .perm-actions .btn-primary {
      padding: 12px 24px;
    }
    button.table-link {
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      font: inherit;
    }
  `,
})
export class Users {
  private readonly api = inject(AtlasApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly all = signal<Operator[]>([]);
  readonly logs = signal<AuditEvent[]>([]);
  readonly tab = signal<OperatorTab>('all');
  readonly statusFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = 8;
  query = '';
  readonly editing = signal<Operator | null>(null);
  readonly editName = signal('');
  readonly editRole = signal<OperatorRole>('reader');
  readonly deactivate = signal(false);
  readonly saving = signal(false);
  readonly drafts = signal<Record<string, ScreenModule[]>>({});
  readonly savingPerms = signal(false);

  readonly modules = SCREEN_MODULES;
  readonly roles: { id: OperatorRole; titleKey: string; hintKey: string }[] = [
    { id: 'maker', titleKey: 'role.maker', hintKey: 'onboard.roleMaker' },
    { id: 'checker', titleKey: 'role.checker', hintKey: 'onboard.roleChecker' },
    { id: 'reader', titleKey: 'role.reader', hintKey: 'onboard.roleReader' },
    { id: 'admin', titleKey: 'role.admin', hintKey: 'onboard.roleAdmin' },
  ];

  readonly filtered = computed(() => {
    const status = this.statusFilter();
    return this.all().filter((row) => !status || row.status === status);
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));
  readonly rows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor() {
    this.load();
    this.loadLogs();
  }

  onQuery(query: string): void {
    this.query = query;
    this.page.set(1);
    this.load(true);
  }

  setTab(tab: OperatorTab): void {
    this.tab.set(tab);
  }

  onStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  goTo(page: number): void {
    this.page.set(Math.min(this.pageCount(), Math.max(1, page)));
  }

  roleClass(role: OperatorRole): string {
    return `role-${role}`;
  }

  screensFor(row: Operator): ScreenModule[] {
    return this.drafts()[row.id] ?? (row.screens?.length ? [...row.screens] : defaultScreens(row.role));
  }

  isChecked(row: Operator, module: ScreenModule): boolean {
    return this.screensFor(row).includes(module);
  }

  togglePerm(row: Operator, module: ScreenModule): void {
    const current = this.screensFor(row);
    const next = current.includes(module) ? current.filter((item) => item !== module) : [...current, module];
    this.drafts.update((map) => ({ ...map, [row.id]: next }));
  }

  readonly permDirty = computed(() =>
    this.all().some((row) => {
      const draft = this.drafts()[row.id];
      if (!draft) {
        return false;
      }
      const original = row.screens?.length ? row.screens : defaultScreens(row.role);
      return [...draft].sort().join() !== [...original].sort().join();
    }),
  );

  savePermissions(): void {
    if (!this.permDirty() || this.savingPerms()) {
      return;
    }
    const updates = this.all()
      .filter((row) => this.drafts()[row.id])
      .map((row) =>
        this.api.updateOperator(row.id, {
          name: row.name,
          role: row.role,
          status: row.status,
          screens: this.screensFor(row),
        }),
      );
    if (!updates.length) {
      return;
    }
    this.savingPerms.set(true);
    forkJoin(updates).subscribe({
      next: () => {
        this.savingPerms.set(false);
        this.drafts.set({});
        this.toast.ok('toast.permissionsSaved');
        this.load(true);
      },
      error: () => {
        this.savingPerms.set(false);
        this.toast.fail('toast.saveFailed');
      },
    });
  }

  resetPermissions(): void {
    this.drafts.set({});
  }

  openEdit(row: Operator): void {
    this.editing.set(row);
    this.editName.set(row.name);
    this.editRole.set(row.role);
    this.deactivate.set(row.status === 'inactive');
  }

  closeEdit(): void {
    this.editing.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.editing()) {
      this.closeEdit();
    }
  }

  saveEdit(): void {
    const row = this.editing();
    if (!row || this.saving()) {
      return;
    }
    const status: OperatorStatus = this.deactivate() ? 'inactive' : row.status === 'invited' ? 'invited' : 'active';
    this.saving.set(true);
    this.api
      .updateOperator(row.id, {
        name: this.editName().trim() || row.name,
        role: this.editRole(),
        status,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.ok('toast.operatorUpdated');
          this.closeEdit();
          this.load(true);
        },
        error: () => {
          this.saving.set(false);
          this.toast.fail('toast.saveFailed');
        },
      });
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.error.set(false);
    this.api.operators(this.query).subscribe({
      next: (rows) => {
        this.all.set(rows);
        this.loading.set(false);
        if (this.page() > this.pageCount()) {
          this.page.set(this.pageCount());
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private loadLogs(): void {
    this.api.audit().subscribe({
      next: (rows) => {
        this.logs.set(rows.filter((row) => row.role === 'admin' || row.role === 'maker' || row.role === 'checker' || row.role === 'reader'));
      },
    });
  }
}
