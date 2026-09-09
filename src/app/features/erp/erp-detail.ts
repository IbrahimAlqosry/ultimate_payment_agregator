import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { PlatformApi } from '@core/http/platform-api';
import { LocaleService } from '@core/i18n/locale.service';
import { ErpSystemDetails } from '@core/models.platform';
import { DataState } from '@shared/data-state';

/**
 * Real ERP system record detail (`GET /erp-systems/{id}`) — read-only. Approving/rejecting a
 * *change* to this record happens on the "Pending Changes" tab of the list screen, not here,
 * since the real API models the record and its change-requests as separate resources.
 */
@Component({
  selector: 'app-erp-detail',
  imports: [DatePipe, RouterLink, TranslocoPipe, DataState],
  templateUrl: './erp-detail.html',
  styleUrl: '../../shared/form-page.scss',
})
export class ErpDetail implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<ErpSystemDetails | null>(null);

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
    this.api.getErpSystem(id).subscribe({
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
