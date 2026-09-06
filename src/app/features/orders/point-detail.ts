import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { PaymentPoint } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';

@Component({
  selector: 'app-point-detail',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState],
  templateUrl: './point-detail.html',
  styleUrl: '../../shared/form-page.scss',
})
export class PointDetail implements OnInit {
  private readonly api = inject(AtlasApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<PaymentPoint | null>(null);
  readonly showReject = signal(false);
  readonly reason = signal('');

  ngOnInit(): void {
    this.load();
  }

  listPath(): string {
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/my-payment-points')) {
      return '/my-payment-points';
    }
    if (url.startsWith('/all-payment-points')) {
      return '/all-payment-points';
    }
    if (url.startsWith('/pp-approvals')) {
      return '/pp-approvals';
    }
    return '/payment-points';
  }

  crumbKey(): string {
    return this.auth.user()?.audience === 'institution' ? 'detail.pointFiCrumb' : 'detail.pointCrumb';
  }

  backKey(): string {
    if (this.auth.user()?.audience === 'institution') {
      return this.router.url.startsWith('/all-payment-points') ? 'actions.backToList' : 'detail.backToPending';
    }
    return 'onboard.backToPoints';
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

  decide(decision: 'approved' | 'rejected'): void {
    const row = this.row();
    if (!row) {
      return;
    }
    this.api.decide('point', row.id, decision).subscribe({
      next: () => {
        this.toast.decision('point', decision);
        void this.router.navigateByUrl(this.listPath());
      },
    });
  }
}
