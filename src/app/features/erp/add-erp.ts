import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AtlasApi } from '@core/http/atlas-api';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-add-erp',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './add-erp.html',
  styleUrl: '../../shared/form-page.scss',
})
export class AddErp {
  private readonly api = inject(AtlasApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly apiError = signal(false);

  readonly form = form(
    signal({
      name: '',
      vendor: '',
      contactName: '',
      email: '',
      contractDate: '',
      contractExpiry: '',
    }),
    (p) => {
      required(p.name);
      required(p.vendor);
      required(p.contactName);
      required(p.email);
      email(p.email);
      required(p.contractDate);
      required(p.contractExpiry);
    },
  );

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.form, async () => {
      try {
        await firstValueFrom(this.api.createErp(this.form().value()));
        this.toast.ok('toast.erpSubmitted');
        await this.router.navigateByUrl('/erp-systems');
      } catch {
        this.apiError.set(true);
      }
      return undefined;
    });
  }
}
