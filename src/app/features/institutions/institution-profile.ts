import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, required, submit } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { FinancialInstitutionSelfProfileResponse } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-institution-profile',
  imports: [DatePipe, FormField, TranslocoPipe, DataState, FieldError],
  templateUrl: './institution-profile.html',
  styleUrls: ['../../shared/form-page.scss', '../../shared/settings-page.scss'],
})
export class InstitutionProfile {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly apiError = signal<string | null>(null);
  readonly row = signal<FinancialInstitutionSelfProfileResponse | null>(null);
  private concurrencyToken: string | null = null;

  readonly contactForm = form(
    signal({
      contactName: '',
      phone: '',
      email: '',
    }),
    (p) => {
      required(p.contactName);
      required(p.email);
      email(p.email);
    },
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.getOwnFinancialInstitutionProfile().subscribe({
      next: (row) => {
        this.apply(row);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submit(this.contactForm, async () => {
      if (!this.concurrencyToken) {
        this.apiError.set('Missing concurrency token — reload and try again.');
        return undefined;
      }
      const value = this.contactForm().value();
      try {
        const saved = await firstValueFrom(
          this.api.updateOwnFinancialInstitutionContact({
            contact: { name: value.contactName, email: value.email, phone: value.phone },
            concurrencyToken: this.concurrencyToken,
          }),
        );
        this.apply(saved);
        this.toast.ok('toast.contactUpdated');
      } catch (err) {
        this.apiError.set(readApiError(err).message);
      }
      return undefined;
    });
  }

  private apply(row: FinancialInstitutionSelfProfileResponse): void {
    this.row.set(row);
    this.concurrencyToken = row.concurrencyToken;
    this.contactForm().reset({
      contactName: row.contact.name,
      phone: row.contact.phone,
      email: row.contact.email,
    });
  }
}
