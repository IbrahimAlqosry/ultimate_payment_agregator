import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { IntegrationUser, Merchant, PaymentNotification, PaymentPoint } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';

type DetailTab = 'profile' | 'points' | 'notifications' | 'integration';

@Component({
  selector: 'app-merchant-detail',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState],
  templateUrl: './merchant-detail.html',
  styleUrl: '../../shared/form-page.scss',
})
export class MerchantDetail implements OnInit {
  private readonly api = inject(AtlasApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<Merchant | null>(null);
  readonly points = signal<PaymentPoint[]>([]);
  readonly notes = signal<PaymentNotification[]>([]);
  readonly integration = signal<IntegrationUser | null>(null);
  readonly tab = signal<DetailTab>('profile');
  readonly showReject = signal(false);
  readonly reason = signal('');

  readonly lastDelivery = computed(() => this.notes().find((row) => row.status === 'completed') ?? null);
  readonly successRate = computed(() => {
    const rows = this.notes();
    if (!rows.length) {
      return null;
    }
    const ok = rows.filter((row) => row.status === 'completed').length;
    return Math.round((ok / rows.length) * 1000) / 10;
  });

  ngOnInit(): void {
    this.load();
  }

  industryLabel(industry: string): string {
    const known = ['retail', 'health', 'fuel', 'other'];
    return known.includes(industry) ? `register.industries.${industry}` : industry;
  }

  pointType(point: PaymentPoint): string {
    return point.kind === 'wallet' ? 'kind.ecommerce' : 'kind.pos';
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
    forkJoin({
      merchant: this.api.merchant(id),
      points: this.api.paymentPoints(),
      users: this.api.integrationUsers(),
      notes: this.api.notifications(),
    }).subscribe({
      next: ({ merchant, points, users, notes }) => {
        this.row.set(merchant);
        this.points.set(points.filter((row) => row.merchantName === merchant.legalName));
        this.integration.set(users.find((row) => row.organization === merchant.legalName) ?? null);
        this.notes.set(notes.filter((row) => row.merchantName === merchant.legalName));
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
    this.api.decide('merchant', row.id, decision).subscribe({
      next: () => {
        this.toast.decision('merchant', decision);
        void this.router.navigateByUrl('/merchants');
      },
    });
  }
}
