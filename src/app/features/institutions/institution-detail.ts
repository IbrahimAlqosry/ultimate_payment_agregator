import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { Institution, IntegrationUser, Merchant, PaymentNotification, PaymentPoint } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';

type DetailTab = 'profile' | 'merchants' | 'integration';

interface ConnectedMerchant {
  id: string;
  name: string;
  crNumber: string;
  connectedSince: string;
  transactions: number;
  status: Merchant['status'];
}

@Component({
  selector: 'app-institution-detail',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, DataState],
  templateUrl: './institution-detail.html',
  styleUrl: '../../shared/form-page.scss',
})
export class InstitutionDetail implements OnInit {
  private readonly api = inject(AtlasApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<Institution | null>(null);
  readonly connected = signal<ConnectedMerchant[]>([]);
  readonly integration = signal<IntegrationUser | null>(null);
  readonly tab = signal<DetailTab>('profile');
  readonly showReject = signal(false);
  readonly reason = signal('');

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
    forkJoin({
      institution: this.api.institution(id),
      merchants: this.api.merchants(),
      points: this.api.paymentPoints(),
      users: this.api.integrationUsers(),
      notes: this.api.notifications(),
    }).subscribe({
      next: ({ institution, merchants, points, users, notes }) => {
        this.row.set(institution);
        this.connected.set(this.buildConnected(institution.name, merchants, points, notes));
        this.integration.set(users.find((item) => item.organization === institution.name) ?? null);
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
    this.api.decide('institution', row.id, decision).subscribe({
      next: () => {
        this.toast.decision('institution', decision);
        void this.router.navigateByUrl('/institutions');
      },
    });
  }

  private buildConnected(
    institutionName: string,
    merchants: Merchant[],
    points: PaymentPoint[],
    notes: PaymentNotification[],
  ): ConnectedMerchant[] {
    const linked = points.filter((row) => row.institutionName === institutionName);
    const names = [...new Set(linked.map((row) => row.merchantName))];
    return names.map((name) => {
      const merchant = merchants.find((row) => row.legalName === name);
      const merchantPoints = linked.filter((row) => row.merchantName === name);
      const first = merchantPoints
        .map((row) => row.submittedAt)
        .sort()
        .at(0);
      return {
        id: merchant?.id ?? name,
        name,
        crNumber: merchant?.crNumber ?? merchantPoints[0]?.merchantCr ?? '—',
        connectedSince: first ?? merchant?.onboardedAt ?? '',
        transactions: notes.filter((row) => row.merchantName === name && row.institutionName === institutionName)
          .length,
        status: merchant?.status ?? 'approved',
      };
    });
  }
}
