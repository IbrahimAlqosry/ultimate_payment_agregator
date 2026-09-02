import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { applyPhoneRules } from '@core/forms/field-rules';
import { AtlasApi } from '@core/http/atlas-api';
import { InstitutionType } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-onboard-institution',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './onboard-institution.html',
  styleUrl: '../../shared/form-page.scss',
})
export class OnboardInstitution {
  private readonly api = inject(AtlasApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal(false);

  readonly form = form(
    signal({
      name: '',
      type: 'bank' as InstitutionType,
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
      required(p.feePerRequest);
      required(p.contactName);
      required(p.email);
      email(p.email);
      applyPhoneRules(p.phone);
    },
  );

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.form, async () => {
      try {
        await firstValueFrom(this.api.createInstitution(this.form().value()));
        this.toast.ok('toast.fiSubmitted');
        await this.router.navigateByUrl('/institutions');
      } catch {
        this.apiError.set(true);
      }
      return undefined;
    });
  }
}
