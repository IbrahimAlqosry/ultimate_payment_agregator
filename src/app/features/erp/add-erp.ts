import { Component, inject, OnInit, signal } from '@angular/core';
import { FormField, email, form, required, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { readApiError } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

/** Handles both creation (`/erp-systems/new`) and update (`/erp-systems/:id/edit`) — the real
 * API's update body is the same six fields as creation plus the record's concurrencyToken, so
 * one form covers both rather than duplicating it. */
@Component({
  selector: 'app-add-erp',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './add-erp.html',
  styleUrl: '../../shared/form-page.scss',
})
export class AddErp implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal<string | null>(null);
  readonly loadingRecord = signal(false);
  readonly loadError = signal(false);
  readonly erpSystemId = signal<string | null>(null);
  private concurrencyToken: string | null = null;

  readonly form = form(
    signal({
      systemName: '',
      providerCompanyName: '',
      contactPersonName: '',
      contactEmail: '',
      contractDate: '',
      expiryDate: '',
    }),
    (p) => {
      required(p.systemName);
      required(p.providerCompanyName);
      required(p.contactPersonName);
      required(p.contactEmail);
      email(p.contactEmail);
      required(p.contractDate);
      required(p.expiryDate);
      validate(p.expiryDate, ({ value, valueOf }) => {
        const contractDate = valueOf(p.contractDate);
        return contractDate && value() && value() <= contractDate ? { kind: 'expiryAfterSigned' } : undefined;
      });
    },
  );

  get isEdit(): boolean {
    return this.erpSystemId() !== null;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.erpSystemId.set(id);
    this.loadingRecord.set(true);
    this.api.getErpSystem(id).subscribe({
      next: (record) => {
        this.concurrencyToken = record.concurrencyToken;
        this.form().reset({
          systemName: record.systemName,
          providerCompanyName: record.providerCompanyName,
          contactPersonName: record.contact.name,
          contactEmail: record.contact.email,
          contractDate: record.contractDate ?? '',
          expiryDate: record.expiryDate ?? '',
        });
        this.loadingRecord.set(false);
      },
      error: () => {
        this.loadingRecord.set(false);
        this.loadError.set(true);
      },
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(null);
    await submit(this.form, async () => {
      const body = this.form().value();
      const id = this.erpSystemId();
      try {
        if (id) {
          if (!this.concurrencyToken) {
            throw new Error('Missing concurrency token — reload and try again.');
          }
          await firstValueFrom(this.api.submitErpUpdate(id, { ...body, concurrencyToken: this.concurrencyToken }));
        } else {
          await firstValueFrom(this.api.submitErpCreation(body));
        }
        this.toast.ok('toast.erpSubmitted');
        await this.router.navigateByUrl(id ? `/erp-systems/${id}` : '/erp-systems');
      } catch (err) {
        this.apiError.set(readApiError(err).message);
      }
      return undefined;
    });
  }
}
