import { Component, inject, OnInit, signal } from '@angular/core';
import { FormField, email, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { applyPasswordRules, applyPhoneRules } from '@core/forms/field-rules';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { ErpChoice } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink, TranslocoPipe, AuthScreen, BrandLockup, FieldError],
  templateUrl: './register.html',
  styleUrls: ['./auth-forms.scss', './register.scss'],
})
export class Register implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly platformApi = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);
  readonly show = signal(false);
  readonly showConfirm = signal(false);
  readonly erps = signal<ErpChoice[]>([]);
  readonly erpsLoading = signal(true);
  readonly erpsFailed = signal(false);

  // Fields match the real backend's SelfServiceMerchantOnboardingRequest exactly — it rejects
  // unknown fields, so there is no city/industry here (the mock's fields, dropped for this flow).
  readonly registerForm = form(
    signal({
      legalName: '',
      contactName: '',
      commercialRegistrationNumber: '',
      email: '',
      phone: '',
      erpSystemId: '',
      password: '',
      confirm: '',
    }),
    (p) => {
      required(p.legalName);
      maxLength(p.legalName, 200);
      required(p.contactName);
      maxLength(p.contactName, 200);
      required(p.commercialRegistrationNumber);
      maxLength(p.commercialRegistrationNumber, 64);
      required(p.email);
      email(p.email);
      applyPhoneRules(p.phone);
      required(p.erpSystemId);
      applyPasswordRules(p.password);
      applyPasswordRules(p.confirm);
      validate(p.confirm, ({ value, valueOf }) =>
        value() && value() !== valueOf(p.password) ? { kind: 'mismatch' } : undefined,
      );
    },
  );

  ngOnInit(): void {
    this.loadErps();
  }

  /** Fetches every page of choices (usually few) so the selector isn't silently missing options
   * past the first page — the guide is explicit this endpoint has no server-side search. */
  private loadErps(cursor?: string, acc: ErpChoice[] = []): void {
    this.platformApi.getErpChoices({ pageSize: 50, cursor }).subscribe({
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
    await submit(this.registerForm, async () => {
      const { legalName, contactName, commercialRegistrationNumber, email, phone, erpSystemId, password } =
        this.registerForm().value();
      try {
        await firstValueFrom(
          this.auth.registerMerchant({
            legalName,
            commercialRegistrationNumber,
            contact: { name: contactName, email, phone },
            erpSystemId,
            password,
          }),
        );
        this.toast.ok('toast.registerOk');
        await this.router.navigateByUrl('/register-pending');
      } catch (err) {
        this.apiError.set(apiErrorMessageKey(err));
      }
      return undefined;
    });
  }
}
