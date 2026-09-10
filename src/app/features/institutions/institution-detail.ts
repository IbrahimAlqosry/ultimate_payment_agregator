import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import {
  FinancialInstitutionApplicationDetails,
  FinancialInstitutionProfileResponse,
  GovernedProfileChangeResponse,
  PlatformInstitutionType,
  PlatformPermission,
} from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-institution-detail',
  imports: [DatePipe, FormsModule, FormField, RouterLink, TranslocoPipe, DataState, FieldError],
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

  // Gated by real GET /auth/me permissions (see core/auth/access.ts's canApprove/canSubmit) — the
  // record status narrows which of those permitted actions makes sense at this point in the flow.
  readonly canSubmit = () => this.row()?.status === 'awaitingMaker' && this.auth.canSubmit('institution');
  readonly canDecide = () => this.row()?.status === 'pendingChecker' && this.auth.canApprove('institution');

  // --- Platform-governed profile changes (only meaningful once the FI is active) --------------
  readonly governedProfile = signal<FinancialInstitutionProfileResponse | null>(null);
  readonly changes = signal<GovernedProfileChangeResponse[]>([]);
  readonly changesLoading = signal(false);
  readonly proposing = signal(false);
  readonly changeApiError = signal<string | null>(null);
  readonly changeActing = signal(false);
  readonly rejectingChange = signal<GovernedProfileChangeResponse | null>(null);
  readonly changeReason = signal('');
  readonly canProposeChange = () => this.auth.hasPermission(PlatformPermission.ProfilesSubmit);
  readonly canDecideChange = () => this.auth.hasPermission(PlatformPermission.ProfilesDecide);

  readonly changeForm = form(
    signal({
      legalName: '',
      institutionType: 'bank' as PlatformInstitutionType,
      cbyLicenceNumber: '',
      contractNumber: '',
      signedDate: '',
      expiryDate: '',
      feePerRequest: '',
      autoRenewal: false,
      terminationRequested: false,
      terminationNoticeDate: '',
    }),
    (p) => {
      required(p.legalName);
      required(p.cbyLicenceNumber);
      required(p.contractNumber);
      required(p.signedDate);
      required(p.expiryDate);
      validate(p.expiryDate, ({ value, valueOf }) => {
        const signed = valueOf(p.signedDate);
        return signed && value() && value() <= signed ? { kind: 'expiryAfterSigned' } : undefined;
      });
      required(p.feePerRequest);
      validate(p.terminationNoticeDate, ({ value, valueOf }) =>
        valueOf(p.terminationRequested) && !value() ? { kind: 'required' } : undefined,
      );
    },
  );

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
        if (application.status === 'active') {
          this.loadGovernedProfile(id);
          this.loadChanges(id);
        }
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadGovernedProfile(applicationId: string): void {
    this.api.getGovernedFiProfile(applicationId).subscribe({
      next: (profile) => this.governedProfile.set(profile),
      error: (err) => this.changeApiError.set(readApiError(err).message),
    });
  }

  private loadChanges(applicationId: string): void {
    this.changesLoading.set(true);
    this.api.listFiProfileChanges({ pageSize: 100 }).subscribe({
      next: (page) => {
        this.changes.set(page.items.filter((item) => item.financialInstitutionId === applicationId));
        this.changesLoading.set(false);
      },
      error: (err) => {
        this.changesLoading.set(false);
        this.changeApiError.set(readApiError(err).message);
      },
    });
  }

  openPropose(): void {
    const profile = this.governedProfile();
    if (!profile) {
      return;
    }
    this.changeForm().reset({
      legalName: profile.legalName,
      institutionType: profile.institutionType,
      cbyLicenceNumber: profile.cbyLicenceNumber,
      contractNumber: profile.contract.number,
      signedDate: profile.contract.signedDate,
      expiryDate: profile.contract.expiryDate,
      feePerRequest: String(profile.contract.agreedFeePerRequest),
      autoRenewal: profile.contract.autoRenewal,
      terminationRequested: profile.contract.terminationRequested,
      terminationNoticeDate: profile.contract.terminationNoticeDate ?? '',
    });
    this.changeApiError.set(null);
    this.proposing.set(true);
  }

  cancelPropose(): void {
    this.proposing.set(false);
  }

  async submitChange(event: Event): Promise<void> {
    event.preventDefault();
    const applicationId = this.row()?.applicationId;
    const profile = this.governedProfile();
    this.changeApiError.set(null);
    if (!applicationId || !profile) {
      return;
    }
    await submit(this.changeForm, async () => {
      const v = this.changeForm().value();
      try {
        await new Promise<void>((resolve, reject) => {
          this.api
            .submitGovernedFiChange(applicationId, {
              legalName: v.legalName,
              institutionType: v.institutionType,
              cbyLicenceNumber: v.cbyLicenceNumber,
              contract: {
                number: v.contractNumber,
                signedDate: v.signedDate,
                expiryDate: v.expiryDate,
                agreedFeePerRequest: Number(v.feePerRequest),
                autoRenewal: v.autoRenewal,
                terminationRequested: v.terminationRequested,
                terminationNoticeDate: v.terminationRequested ? v.terminationNoticeDate : null,
              },
              // Despite the field name, this must be the governed token, not the plain one.
              concurrencyToken: profile.governedConcurrencyToken,
            })
            .subscribe({ next: () => resolve(), error: (err) => reject(err) });
        });
        this.toast.ok('toast.fiChangeSubmitted');
        this.proposing.set(false);
        this.loadGovernedProfile(applicationId);
        this.loadChanges(applicationId);
      } catch (err) {
        this.changeApiError.set(readApiError(err).message);
      }
      return undefined;
    });
  }

  askRejectChange(row: GovernedProfileChangeResponse): void {
    this.rejectingChange.set(row);
    this.changeReason.set('');
  }

  cancelRejectChange(): void {
    this.rejectingChange.set(null);
  }

  decideChange(row: GovernedProfileChangeResponse, decision: 'approved' | 'rejected'): void {
    const applicationId = this.row()?.applicationId;
    if (!applicationId || this.changeActing() || !row.concurrencyToken) {
      return;
    }
    if (decision === 'rejected' && !this.changeReason().trim()) {
      return;
    }
    this.changeActing.set(true);
    this.changeApiError.set(null);
    this.api
      .decideFiProfileChangeRequest(row.requestId, {
        decision,
        concurrencyToken: row.concurrencyToken,
        rejectionReason: decision === 'rejected' ? this.changeReason().trim() : undefined,
      })
      .subscribe({
        next: () => {
          this.changeActing.set(false);
          this.rejectingChange.set(null);
          this.toast.decision('institution', decision);
          this.loadGovernedProfile(applicationId);
          this.loadChanges(applicationId);
        },
        error: (err) => {
          this.changeActing.set(false);
          this.changeApiError.set(readApiError(err).message);
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
