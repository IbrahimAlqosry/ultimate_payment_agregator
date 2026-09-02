import { Component, inject, OnInit, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { applyPhoneRules } from '@core/forms/field-rules';
import { AtlasApi } from '@core/http/atlas-api';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-onboard-merchant',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './onboard-merchant.html',
  styleUrl: '../../shared/form-page.scss',
})
export class OnboardMerchant implements OnInit {
  private readonly api = inject(AtlasApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal(false);
  readonly erps = signal<string[]>([]);

  readonly form = form(
    signal({
      legalName: '',
      contactName: '',
      crNumber: '',
      email: '',
      industry: '',
      phone: '',
      city: '',
      erpSystem: '',
    }),
    (p) => {
      required(p.legalName);
      required(p.contactName);
      required(p.crNumber);
      required(p.email);
      email(p.email);
      required(p.industry);
      applyPhoneRules(p.phone);
      required(p.city);
      required(p.erpSystem);
    },
  );

  ngOnInit(): void {
    this.api.erpOptions().subscribe({ next: (rows) => this.erps.set(rows) });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.form, async () => {
      try {
        await firstValueFrom(this.api.createMerchant(this.form().value()));
        this.toast.ok('toast.merchantSubmitted');
        await this.router.navigateByUrl('/merchants');
      } catch {
        this.apiError.set(true);
      }
      return undefined;
    });
  }
}
