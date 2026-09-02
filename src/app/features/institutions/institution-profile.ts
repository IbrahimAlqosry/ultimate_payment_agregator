import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { LocaleService } from '@core/i18n/locale.service';
import { Institution } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { DataState } from '@shared/data-state';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-institution-profile',
  imports: [DatePipe, FormField, TranslocoPipe, DataState, FieldError],
  templateUrl: './institution-profile.html',
  styleUrls: ['../../shared/form-page.scss', '../../shared/settings-page.scss'],
})
export class InstitutionProfile {
  private readonly api = inject(AtlasApi);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslocoService);
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly row = signal<Institution | null>(null);

  readonly contactForm = form(
    signal({
      contactName: '',
      jobTitle: '',
      department: '',
      phone: '',
      email: '',
    }),
    (p) => {
      required(p.contactName);
      required(p.email);
    },
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.myInstitution().subscribe({
      next: (row) => {
        this.row.set(row);
        this.contactForm().reset({
          contactName: row.contactName,
          jobTitle: this.i18n.translate(this.auth.user()?.jobTitleKey ?? 'title.opsOfficer'),
          department: row.department || 'Operations',
          phone: row.phone,
          email: row.email,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.contactForm, async () => {
      try {
        const saved = await firstValueFrom(this.api.updateInstitutionContact(this.contactForm().value()));
        this.row.set(saved);
        this.toast.ok('toast.contactUpdated');
      } catch {
        /* interceptor */
      }
      return undefined;
    });
  }
}
