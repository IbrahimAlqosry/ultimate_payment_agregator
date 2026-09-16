import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { PaymentPoint } from '@core/models';
import { DataState } from '@shared/data-state';

/** Mock-only — `/payment-points/:id`, the Platform-operator-wide payment-point view. Real
 * `GET /payment-points`/`GET /payment-points/{id}` (2026-09-16 OpenAPI update) confirmed live
 * `403` for Platform sessions, so this stays on mock data; see real-payment-points.ts for the
 * Merchant/FI equivalents, which are real. */
@Component({
  selector: 'app-point-detail',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState],
  templateUrl: './point-detail.html',
  styleUrl: '../../shared/form-page.scss',
})
export class PointDetail implements OnInit {
  private readonly api = inject(AtlasApi);
  private readonly route = inject(ActivatedRoute);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<PaymentPoint | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    this.api.paymentPoint(id).subscribe({
      next: (row) => {
        this.row.set(row);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
