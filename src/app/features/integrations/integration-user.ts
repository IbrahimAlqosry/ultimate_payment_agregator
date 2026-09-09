import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { IntegrationClientCredentialOnce, IntegrationClientMetadata } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { SecretField } from '@shared/secret-field';

type FiRotationStep = 'idle' | 'otp' | 'result';

/**
 * Integration Client — the Merchant/FI's machine credential pair (real backend). Unlike the old
 * mock model, the real API never returns the client secret except once, at creation or FI
 * rotation time — there is no "unmask saved password" here, and no generic "request detail
 * change" endpoint (only credential rotation exists on the real backend).
 */
@Component({
  selector: 'app-integration-user',
  imports: [DatePipe, FormsModule, TranslocoPipe, DataState, SecretField],
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
      width: min(420px, 100%);
      flex: 0 1 420px;
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

    .card-header.row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
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
      direction: ltr;
      unicode-bidi: isolate;
      word-break: break-all;
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

    .otp-row {
      display: flex;
      gap: 8px;
    }

    .otp-row input {
      flex: 1 1 auto;
      height: 44px;
      border: 1px solid #dcd5d5;
      border-radius: 8px;
      padding: 0 14px;
      font-size: 16px;
      letter-spacing: 0.2em;
      text-align: center;
    }

    .form-actions {
      border-top: 0;
      padding-top: 12px;
    }

    .cancel-link {
      background: none;
    }

    @media (max-width: 960px) {
      .split {
        flex-direction: column;
      }
      .request-card {
        width: 100%;
        flex: 1 1 auto;
      }
    }
  `,
})
export class IntegrationUserPage implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly notFound = signal(false);
  readonly metadata = signal<IntegrationClientMetadata | null>(null);
  readonly merchant = computed(() => this.auth.user()?.audience === 'merchant');

  readonly creating = signal(false);
  readonly created = signal<IntegrationClientCredentialOnce | null>(null);

  readonly rotationStep = signal<FiRotationStep>('idle');
  readonly otpChallengeId = signal<string | null>(null);
  readonly otpCode = signal('');
  readonly rotating = signal(false);
  readonly rotationResult = signal<IntegrationClientCredentialOnce | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly requestingRotation = signal(false);
  readonly rotationRequested = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.notFound.set(false);
    this.api.getIntegrationClient().subscribe({
      next: (data) => {
        this.metadata.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) {
          this.notFound.set(true);
        } else {
          this.error.set(true);
        }
      },
    });
  }

  async create(): Promise<void> {
    if (this.creating()) {
      return;
    }
    this.creating.set(true);
    this.actionError.set(null);
    try {
      const result = await firstValueFrom(this.api.createIntegrationClient());
      this.created.set(result);
      this.notFound.set(false);
    } catch (err) {
      this.actionError.set(readApiError(err).message);
    } finally {
      this.creating.set(false);
    }
  }

  dismissCreated(): void {
    this.created.set(null);
    this.load();
  }

  requestFiRotationOtp(): void {
    this.actionError.set(null);
    this.rotating.set(true);
    this.api.requestIntegrationClientRotationOtp().subscribe({
      next: (challenge) => {
        this.otpChallengeId.set(challenge.challengeId);
        this.rotationStep.set('otp');
        this.rotating.set(false);
      },
      error: (err) => {
        this.rotating.set(false);
        this.actionError.set(readApiError(err).message);
      },
    });
  }

  confirmFiRotation(): void {
    const challengeId = this.otpChallengeId();
    if (!challengeId || this.rotating()) {
      return;
    }
    this.rotating.set(true);
    this.actionError.set(null);
    this.api.rotateIntegrationClient({ otpChallengeId: challengeId, otpCode: this.otpCode() }).subscribe({
      next: (result) => {
        this.rotationResult.set(result as IntegrationClientCredentialOnce);
        this.rotationStep.set('result');
        this.rotating.set(false);
        this.toast.ok('toast.credsRegenerated');
      },
      error: (err) => {
        this.rotating.set(false);
        this.actionError.set(readApiError(err).message);
      },
    });
  }

  cancelFiRotation(): void {
    this.rotationStep.set('idle');
    this.otpChallengeId.set(null);
    this.otpCode.set('');
  }

  dismissFiRotationResult(): void {
    this.rotationResult.set(null);
    this.rotationStep.set('idle');
    this.otpCode.set('');
    this.load();
  }

  requestMerchantRotation(): void {
    if (this.requestingRotation()) {
      return;
    }
    this.requestingRotation.set(true);
    this.actionError.set(null);
    this.api.rotateIntegrationClient({}).subscribe({
      next: () => {
        this.requestingRotation.set(false);
        this.rotationRequested.set(true);
        this.toast.ok('toast.changeRequested');
      },
      error: (err) => {
        this.requestingRotation.set(false);
        this.actionError.set(readApiError(err).message);
      },
    });
  }
}
