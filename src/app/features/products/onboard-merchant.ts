import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { applyPhoneRules } from '@core/forms/field-rules';
import { readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-onboard-merchant',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './onboard-merchant.html',
  styleUrl: '../../shared/form-page.scss',
})
export class OnboardMerchant {
  private readonly api = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);

  // Matches AssistedMerchantOnboardingRequest exactly — no password (the Maker never sets one)
  // and no city/industry (the real backend doesn't carry those fields).
  readonly form = form(
    signal({
      legalName: '',
      contactName: '',
      commercialRegistrationNumber: '',
      email: '',
      phone: '',
      erpSystemId: '',
    }),
    (p) => {
      required(p.legalName);
      required(p.contactName);
      required(p.commercialRegistrationNumber);
      required(p.email);
      email(p.email);
      applyPhoneRules(p.phone);
      required(p.erpSystemId);
      validate(p.erpSystemId, ({ value }) => (UUID_PATTERN.test(value()) ? undefined : { kind: 'uuid' }));
    },
  );

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submit(this.form, async () => {
      const { legalName, contactName, commercialRegistrationNumber, email: contactEmail, phone, erpSystemId } =
        this.form().value();
      try {
        await firstValueFrom(
          this.api.createMerchantApplication({
            legalName,
            commercialRegistrationNumber,
            contact: { name: contactName, email: contactEmail, phone },
            erpSystemId,
          }),
        );
        this.toast.ok('toast.merchantSubmitted');
        await this.router.navigateByUrl('/merchants');
      } catch (err) {
        this.apiError.set(readApiError(err).message);
      }
      return undefined;
    });
  }
}
