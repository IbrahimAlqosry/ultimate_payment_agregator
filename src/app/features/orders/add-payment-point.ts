import { Component, inject, OnInit, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AtlasApi } from '@core/http/atlas-api';
import { InstitutionType, PointKind } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-add-payment-point',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './add-payment-point.html',
  styleUrl: '../../shared/form-page.scss',
})
export class AddPaymentPoint implements OnInit {
  private readonly api = inject(AtlasApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly apiError = signal(false);
  readonly fis = signal<{ name: string; type: InstitutionType }[]>([]);

  readonly form = form(
    signal({
      institutionName: '',
      pointCode: '',
      kind: 'wallet' as PointKind,
    }),
    (p) => {
      required(p.institutionName);
      required(p.pointCode);
      required(p.kind);
    },
  );

  ngOnInit(): void {
    this.api.fiOptions().subscribe({ next: (rows) => this.fis.set(rows) });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.form, async () => {
      try {
        await firstValueFrom(this.api.createPaymentPoint(this.form().value()));
        this.toast.ok('toast.pointSubmitted');
        await this.router.navigateByUrl('/my-payment-points');
      } catch {
        this.apiError.set(true);
      }
      return undefined;
    });
  }
}
