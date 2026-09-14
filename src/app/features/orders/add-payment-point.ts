import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

/** The real API has no Financial Institution directory endpoint (confirmed in the v3.0 guide's
 * OpenAPI spec — only `POST /payment-points` and `POST /payment-points/{id}/decision` exist, no
 * list/GET), so `financialInstitutionId` is a plain UUID the Merchant must obtain out-of-band
 * from their FI, not a dropdown. */
@Component({
  selector: 'app-add-payment-point',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './add-payment-point.html',
  styleUrl: '../../shared/form-page.scss',
})
export class AddPaymentPoint {
  private readonly api = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);

  readonly form = form(
    signal({
      financialInstitutionId: '',
      pointNumber: '',
    }),
    (p) => {
      required(p.financialInstitutionId);
      required(p.pointNumber);
    },
  );

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submit(this.form, async () => {
      try {
        await firstValueFrom(this.api.createPaymentPoint(this.form().value()));
        this.toast.ok('toast.pointSubmitted');
        await this.router.navigateByUrl('/my-payment-points');
      } catch (err) {
        this.apiError.set(apiErrorMessageKey(err));
      }
      return undefined;
    });
  }
}
