import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { applyPhoneRules } from '@core/forms/field-rules';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { PlatformInstitutionType } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-onboard-institution',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './onboard-institution.html',
  styleUrl: '../../shared/form-page.scss',
})
export class OnboardInstitution {
  private readonly api = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);

  // Matches FinancialInstitutionOnboardingRequest exactly — no password (never set by the Maker).
  readonly form = form(
    signal({
      name: '',
      type: 'bank' as PlatformInstitutionType,
      cbyLicense: '',
      contractRef: '',
      signedDate: '',
      contractExpiry: '',
      feePerRequest: '',
      autoRenewal: false,
      terminationRequested: false,
      terminationNoticeDate: '',
      contactName: '',
      email: '',
      phone: '',
    }),
    (p) => {
      required(p.name);
      required(p.type);
      required(p.cbyLicense);
      required(p.contractRef);
      required(p.signedDate);
      required(p.contractExpiry);
      validate(p.contractExpiry, ({ value, valueOf }) => {
        const signed = valueOf(p.signedDate);
        return signed && value() && value() <= signed ? { kind: 'expiryAfterSigned' } : undefined;
      });
      required(p.feePerRequest);
      validate(p.terminationNoticeDate, ({ value, valueOf }) =>
        valueOf(p.terminationRequested) && !value() ? { kind: 'required' } : undefined,
      );
      required(p.contactName);
      required(p.email);
      email(p.email);
      applyPhoneRules(p.phone);
    },
  );

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submit(this.form, async () => {
      const v = this.form().value();
      try {
        await firstValueFrom(
          this.api.createInstitutionApplication({
            legalName: v.name,
            institutionType: v.type,
            cbyLicenceNumber: v.cbyLicense,
            contract: {
              number: v.contractRef,
              signedDate: v.signedDate,
              expiryDate: v.contractExpiry,
              agreedFeePerRequest: Number(v.feePerRequest),
              autoRenewal: v.autoRenewal,
              terminationRequested: v.terminationRequested,
              terminationNoticeDate: v.terminationRequested ? v.terminationNoticeDate : null,
            },
            contact: { name: v.contactName, email: v.email, phone: v.phone },
          }),
        );
        this.toast.ok('toast.fiSubmitted');
        await this.router.navigateByUrl('/institutions');
      } catch (err) {
        this.apiError.set(apiErrorMessageKey(err));
      }
      return undefined;
    });
  }
}
