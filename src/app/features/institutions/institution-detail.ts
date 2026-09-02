import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { Institution } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';

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
    this.api.institution(id).subscribe({
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
    this.api.decide('institution', row.id, decision).subscribe({
      next: () => {
        this.toast.decision('institution', decision);
        void this.router.navigateByUrl('/institutions');
      },
    });
  }
}
