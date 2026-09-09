import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { MerchantApplicationDetails } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';

@Component({
  selector: 'app-merchant-detail',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState],
  templateUrl: './merchant-detail.html',
  styleUrl: '../../shared/form-page.scss',
})
export class MerchantDetail implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<MerchantApplicationDetails | null>(null);
  readonly showReject = signal(false);
  readonly reason = signal('');
  readonly acting = signal(false);
  readonly actionError = signal<string | null>(null);

  // The real backend has no current-user endpoint, so the operator's actual Maker/Checker role
  // is unknown client-side. Gate by record status instead — the server enforces who may act.
  readonly canSubmit = () => this.row()?.status === 'awaitingMaker';
  readonly canDecide = () => this.row()?.status === 'pendingChecker' && this.auth.canApprove('merchant');

  ngOnInit(): void {
    this.load();
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
    this.actionError.set(null);
    this.api.getMerchantApplication(id).subscribe({
      next: (application) => {
        this.row.set(application);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    const row = this.row();
    if (!row || this.acting()) {
      return;
    }
    this.acting.set(true);
    this.actionError.set(null);
    this.api.submitMerchantApplication(row.applicationId).subscribe({
      next: (updated) => {
        this.row.set(updated);
        this.acting.set(false);
        this.toast.ok('toast.merchantSubmittedToChecker');
      },
      error: (err) => {
        this.acting.set(false);
        this.actionError.set(readApiError(err).message);
        this.load();
      },
    });
  }

  decide(decision: 'approved' | 'rejected'): void {
    const row = this.row();
    if (!row || this.acting() || !row.concurrencyToken) {
      return;
    }
    if (decision === 'rejected' && !this.reason().trim()) {
      return;
    }
    this.acting.set(true);
    this.actionError.set(null);
    this.api
      .decideMerchantApplication(row.applicationId, {
        decision,
        concurrencyToken: row.concurrencyToken,
        rejectionReason: decision === 'rejected' ? this.reason().trim() : undefined,
      })
      .subscribe({
        next: () => {
          this.toast.decision('merchant', decision);
          void this.router.navigateByUrl('/merchants');
        },
        error: (err) => {
          this.acting.set(false);
          this.actionError.set(readApiError(err).message);
          // A 409 means the application changed since we loaded it — refresh before retrying.
          this.load();
        },
      });
  }
}
