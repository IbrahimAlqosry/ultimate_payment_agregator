import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { apiErrorMessageKey } from '@core/http/http-error';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { MerchantApplicationDetails, PaymentPoint } from '@core/models.platform';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { MerchantLookup } from './merchant-lookup';

/** FI review of one payment point — `GET /payment-points/{id}` + `POST …/{id}/decision`.
 * Single-approver (guide v6.0 §12.3): no maker-checker and no concurrency token, so the decision
 * applies immediately. Merchant name / CR / ERP come best-effort from MerchantLookup (falls back
 * to the raw merchant ID). The design's point type, linked account and submitter have no API
 * source yet, so they aren't shown. */
@Component({
  selector: 'app-review-payment-point',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState],
  templateUrl: './review-payment-point.html',
  styleUrl: '../../shared/form-page.scss',
})
export class ReviewPaymentPoint implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly lookup = inject(MerchantLookup);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly point = signal<PaymentPoint | null>(null);
  readonly merchant = signal<MerchantApplicationDetails | null>(null);
  readonly erpName = signal<string | null>(null);
  readonly showReject = signal(false);
  readonly reason = signal('');
  readonly acting = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly isPending = () => this.point()?.status === 'pendingFinancialInstitution';

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
    this.actionError.set(null);
    this.api.getPaymentPoint(id).subscribe({
      next: (point) => {
        this.point.set(point);
        this.loading.set(false);
        this.loadMerchant(point.merchantId);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  decide(decision: 'approved' | 'rejected'): void {
    const point = this.point();
    if (!point || this.acting()) {
      return;
    }
    if (decision === 'rejected' && !this.reason().trim()) {
      return;
    }
    this.acting.set(true);
    this.actionError.set(null);
    this.api
      .decidePaymentPoint(point.id, {
        decision,
        rejectionReason: decision === 'rejected' ? this.reason().trim() : undefined,
      })
      .subscribe({
        next: () => {
          this.toast.decision('point', decision);
          void this.router.navigateByUrl('/pp-approvals');
        },
        error: (err) => {
          this.acting.set(false);
          this.actionError.set(apiErrorMessageKey(err));
          this.load();
        },
      });
  }

  private loadMerchant(merchantId: string): void {
    if (this.merchant()?.applicationId === merchantId) {
      return;
    }
    this.lookup.merchant(merchantId).subscribe((merchant) => {
      this.merchant.set(merchant);
      if (merchant) {
        this.lookup.erpNames().subscribe((names) => this.erpName.set(names.get(merchant.erpSystemId) ?? null));
      }
    });
  }
}
