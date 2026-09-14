import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import {
  PaymentCurrency,
  PaymentInquiryResponse,
  PaymentMatchMethod,
  PaymentMatchResponse,
} from '@core/models.platform';
import { FieldError } from '@shared/field-error';

/** Merchant payment inquiry (guide v4.0 §13) + matching (§14). Inquiry has no FI directory to pick
 * from — same out-of-band UUID convention already used by add-payment-point.ts. A found,
 * unmatched transaction can be carried straight into the match form below via "useForMatch()"
 * rather than retyping its FI/transaction id.
 *
 * Idempotency-Key handling (guide §14.4): one key per distinct reviewed attempt, reused only for
 * an exact retry of that same attempt. A plain resubmit with the form unchanged (e.g. after a
 * timeout) must reuse the key; editing method/FI/transaction/invoice/amount/currency makes it a
 * *different* attempt and reusing the old key there would just get a guaranteed 409 (key reuse
 * with a changed payload) instead of a fresh evaluation. So the key is regenerated automatically
 * whenever the outgoing request differs from the last one actually sent — not left for the user
 * to remember via "Start a New Match", which stays available as an explicit reset. */
@Component({
  selector: 'app-payment-inquiry',
  imports: [DatePipe, FormField, TranslocoPipe, FieldError],
  templateUrl: './payment-inquiry.html',
  styleUrls: ['../../shared/form-page.scss', '../../shared/settings-page.scss'],
})
export class PaymentInquiry {
  private readonly api = inject(PlatformApi);

  readonly lookupError = signal<string | null>(null);
  readonly result = signal<PaymentInquiryResponse | null>(null);

  readonly lookupForm = form(
    signal({ financialInstitutionId: '', transactionId: '' }),
    (p) => {
      required(p.financialInstitutionId);
      required(p.transactionId);
    },
  );

  readonly matchError = signal<string | null>(null);
  readonly matchResult = signal<PaymentMatchResponse | null>(null);
  private idempotencyKey = crypto.randomUUID();
  private lastSubmittedSignature: string | null = null;

  readonly matchForm = form(
    signal({
      method: 'transactionId' as PaymentMatchMethod,
      financialInstitutionId: '',
      transactionId: '',
      invoiceReference: '',
      expectedAmount: '',
      currency: 'YER' as PaymentCurrency,
    }),
    (p) => {
      required(p.financialInstitutionId);
      required(p.transactionId);
      required(p.invoiceReference);
      required(p.expectedAmount);
    },
  );

  readonly matchMethod = computed(() => this.matchForm.method().value());

  async onLookup(event: Event): Promise<void> {
    event.preventDefault();
    this.lookupError.set(null);
    this.result.set(null);
    await submit(this.lookupForm, async () => {
      try {
        const found = await firstValueFrom(this.api.inquirePayment(this.lookupForm().value()));
        this.result.set(found);
      } catch (err) {
        this.lookupError.set(apiErrorMessageKey(err));
      }
      return undefined;
    });
  }

  useForMatch(): void {
    const found = this.result();
    if (!found) {
      return;
    }
    this.idempotencyKey = crypto.randomUUID();
    this.lastSubmittedSignature = null;
    this.matchResult.set(null);
    this.matchError.set(null);
    this.matchForm().reset({
      ...this.matchForm().value(),
      financialInstitutionId: found.financialInstitutionId,
      transactionId: found.transactionId,
      currency: found.currency,
      expectedAmount: String(found.amount),
    });
  }

  newMatch(): void {
    this.idempotencyKey = crypto.randomUUID();
    this.lastSubmittedSignature = null;
    this.matchResult.set(null);
    this.matchError.set(null);
    this.matchForm().reset({
      method: this.matchForm().value().method,
      financialInstitutionId: '',
      transactionId: '',
      invoiceReference: '',
      expectedAmount: '',
      currency: 'YER',
    });
  }

  async onMatch(event: Event): Promise<void> {
    event.preventDefault();
    this.matchError.set(null);
    await submit(this.matchForm, async () => {
      const v = this.matchForm().value();
      const body = {
        financialInstitutionId: v.financialInstitutionId,
        transactionId: v.transactionId,
        invoiceReference: v.invoiceReference,
        expectedAmount: Number(v.expectedAmount),
        currency: v.currency,
      };
      const signature = JSON.stringify([v.method, body]);
      if (signature !== this.lastSubmittedSignature) {
        this.idempotencyKey = crypto.randomUUID();
      }
      this.lastSubmittedSignature = signature;
      try {
        const outcome = await firstValueFrom(
          v.method === 'transactionId'
            ? this.api.matchByTransactionId(body, this.idempotencyKey)
            : this.api.matchByNotificationTap(body, this.idempotencyKey),
        );
        this.matchResult.set(outcome);
      } catch (err) {
        this.matchError.set(apiErrorMessageKey(err));
      }
      return undefined;
    });
  }
}
