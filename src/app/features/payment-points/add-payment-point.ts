import { Component, inject, OnInit, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { submitChecked } from '@core/forms/submit-checked';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { FinancialInstitutionChoice } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

/** Guide v6.0 §12.1 — `GET /financial-institutions/choices` (Merchant session) now provides a
 * real, eligible-FI directory, replacing the earlier out-of-band-UUID workaround. */
@Component({
  selector: 'app-add-payment-point',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './add-payment-point.html',
  styleUrl: '../../shared/form-page.scss',
})
export class AddPaymentPoint implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);
  readonly institutions = signal<FinancialInstitutionChoice[]>([]);
  readonly institutionsLoading = signal(true);
  readonly institutionsFailed = signal(false);

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

  ngOnInit(): void {
    this.loadInstitutions();
  }

  private loadInstitutions(cursor?: string, acc: FinancialInstitutionChoice[] = []): void {
    this.api.getFinancialInstitutionChoices({ pageSize: 50, cursor }).subscribe({
      next: (page) => {
        const items = [...acc, ...page.items];
        if (page.nextCursor) {
          this.loadInstitutions(page.nextCursor, items);
          return;
        }
        this.institutions.set(items);
        this.institutionsLoading.set(false);
      },
      error: () => {
        this.institutionsLoading.set(false);
        this.institutionsFailed.set(true);
      },
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submitChecked(this.form, this.toast, async () => {
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
