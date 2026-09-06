import { afterNextRender, Component, computed, ElementRef, inject, Injector, OnInit, signal, viewChild } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { IntegrationCredentials } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { FieldError } from '@shared/field-error';
import { SecretField } from '@shared/secret-field';

@Component({
  selector: 'app-integration-user',
  imports: [FormField, TranslocoPipe, DataState, FieldError, SecretField],
  templateUrl: './integration-user.html',
  styleUrl: '../../shared/form-page.scss',
  styles: `
    .split {
      display: flex;
      align-items: flex-start;
      gap: 24px;
      width: 100%;
    }

    .cred-card,
    .request-card {
      padding: 0;
      gap: 0;
      border-radius: 16px;
      box-shadow: 0 12px 12px rgba(0, 0, 0, 0.05);
    }

    .cred-card {
      flex: 1 1 auto;
      min-width: 0;
    }

    .request-card {
      width: min(480px, 100%);
      flex: 0 1 480px;
    }

    .card-header {
      padding: 24px;
      border-bottom: 1px solid #dcd5d5;
    }

    .card-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
    }

    .caps {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #7e7676;
    }

    .readonly-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 44px;
      padding: 0 14px;
      border: 1px solid #dcd5d5;
      border-radius: 8px;
      background: #f7f5f5;
      font-size: 13px;
    }

    .change-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      border: 1px solid #dcd5d5;
      background: #fff;
      color: #444445;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .change-btn:hover:not(:disabled) {
      background: #f7f5f5;
    }

    .change-btn.active {
      border-color: #1fa64d;
      color: #1fa64d;
      background: #f3faf5;
    }

    .change-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .request-actions {
      gap: 12px;
    }

    .request-actions .cta {
      flex: 1 1 auto;
    }

    .request-card textarea {
      min-height: 120px;
    }

    .form-actions {
      border-top: 0;
      padding-top: 12px;
    }

    .cancel-link {
      background: none;
    }

    .page-intro {
      margin: 4px 0 0;
      color: #7e7676;
      font-size: 14px;
    }

    .page-head.stack {
      align-items: flex-start;
    }

    .card-header.row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .fi-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: min(400px, 100%);
      flex: 0 1 400px;
    }

    .fi-actions .request-card {
      width: 100%;
      flex: none;
    }

    .outline-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      border: 1px solid #dcd5d5;
      background: #fff;
      color: #1c1c1d;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .outline-btn.green {
      border-color: #1fa64d;
      color: #1fa64d;
    }

    .outline-btn.active {
      border-color: #1fa64d;
      color: #1fa64d;
      background: #f3faf5;
    }

    .outline-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .hint {
      margin: -8px 0 8px;
      font-size: 12px;
      color: #7e7676;
    }

    .confirm {
      border: 1px solid #1fa64d;
    }

    @media (max-width: 960px) {
      .split {
        flex-direction: column;
      }
      .request-card,
      .fi-actions {
        width: 100%;
        flex: 1 1 auto;
      }
    }
  `,
})
export class IntegrationUserPage implements OnInit {
  private readonly api = inject(AtlasApi);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<IntegrationCredentials | null>(null);
  readonly showPass = signal(false);
  readonly requesting = signal(false);
  readonly confirmRegen = signal(false);
  readonly regenBusy = signal(false);
  readonly merchant = computed(() => this.auth.user()?.audience === 'merchant');
  private readonly reasonField = viewChild<ElementRef<HTMLTextAreaElement>>('reasonField');

  readonly requestForm = form(signal({ reason: '' }), (p) => {
    required(p.reason);
  });

  ngOnInit(): void {
    this.load();
  }

  startRequest(): void {
    if (this.auth.readOnly()) {
      return;
    }
    this.confirmRegen.set(false);
    const alreadyOpen = this.requesting();
    this.requesting.set(true);
    const focusReason = () => {
      const field = this.reasonField()?.nativeElement;
      field?.focus();
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if (alreadyOpen) {
      focusReason();
      return;
    }
    afterNextRender(focusReason, { injector: this.injector });
  }

  cancelRequest(): void {
    this.requestForm().reset({ reason: '' });
    this.requesting.set(false);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.credentials().subscribe({
      next: (row) => {
        this.row.set(row);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.requestForm, async () => {
      try {
        await firstValueFrom(this.api.requestCredentialChange(this.requestForm.reason().value()));
        this.toast.ok('toast.changeRequested');
        this.requestForm().reset({ reason: '' });
        this.requesting.set(false);
      } catch {
        /* interceptor */
      }
      return undefined;
    });
  }

  async regenerate(): Promise<void> {
    this.regenBusy.set(true);
    try {
      const saved = await firstValueFrom(this.api.regenerateCredentials());
      this.row.set(saved);
      this.showPass.set(true);
      this.confirmRegen.set(false);
      this.toast.ok('toast.credsRegenerated');
    } catch {
      /* interceptor */
    } finally {
      this.regenBusy.set(false);
    }
  }
}
