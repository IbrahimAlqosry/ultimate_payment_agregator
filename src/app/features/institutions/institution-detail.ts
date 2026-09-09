import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { FinancialInstitutionApplicationDetails } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';

@Component({
  selector: 'app-institution-detail',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState],
  templateUrl: './institution-detail.html',
  styleUrl: '../../shared/form-page.scss',
})
export class InstitutionDetail implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<FinancialInstitutionApplicationDetails | null>(null);
  readonly showReject = signal(false);
  readonly reason = signal('');
  readonly acting = signal(false);
  readonly actionError = signal<string | null>(null);

  // The real backend has no current-user endpoint, so the operator's actual Maker/Checker role
  // is unknown client-side. Gate by record status instead — the server enforces who may act.
  readonly canSubmit = () => this.row()?.status === 'awaitingMaker';
  readonly canDecide = () => this.row()?.status === 'pendingChecker' && this.auth.canApprove('institution');

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
    this.api.getInstitutionApplication(id).subscribe({
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
    this.api.submitInstitutionApplication(row.applicationId).subscribe({
      next: (updated) => {
        this.row.set(updated);
        this.acting.set(false);
        this.toast.ok('toast.fiSubmittedToChecker');
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
      .decideInstitutionApplication(row.applicationId, {
        decision,
        concurrencyToken: row.concurrencyToken,
        rejectionReason: decision === 'rejected' ? this.reason().trim() : undefined,
      })
      .subscribe({
        next: () => {
          this.toast.decision('institution', decision);
          void this.router.navigateByUrl('/institutions');
        },
        error: (err) => {
          this.acting.set(false);
          this.actionError.set(readApiError(err).message);
          this.load();
        },
      });
  }
}
