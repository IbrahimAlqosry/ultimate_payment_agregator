import { Component, inject, OnInit, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { applyPhoneRules } from '@core/forms/field-rules';
import { submitChecked } from '@core/forms/submit-checked';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { ErpChoice } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-onboard-merchant',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './onboard-merchant.html',
  styleUrl: '../../shared/form-page.scss',
})
export class OnboardMerchant implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);
  readonly erps = signal<ErpChoice[]>([]);
  readonly erpsLoading = signal(true);
  readonly erpsFailed = signal(false);

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
    },
  );

  ngOnInit(): void {
    this.loadErps();
  }

  private loadErps(cursor?: string, acc: ErpChoice[] = []): void {
    this.api.getErpChoices({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        const items = [...acc, ...page.items];
        if (page.nextCursor) {
          this.loadErps(page.nextCursor, items);
          return;
        }
        this.erps.set(items);
        this.erpsLoading.set(false);
      },
      error: () => {
        this.erpsLoading.set(false);
        this.erpsFailed.set(true);
      },
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submitChecked(this.form, this.toast, async () => {
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
        this.apiError.set(apiErrorMessageKey(err));
      }
      return undefined;
    });
  }
}
