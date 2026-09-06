import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { SCREEN_MODULES, defaultScreens } from '@core/auth/screens';
import { AtlasApi } from '@core/http/atlas-api';
import { Operator, OperatorRole, ScreenModule } from '@core/models';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';

@Component({
  selector: 'app-add-operator',
  imports: [FormField, RouterLink, TranslocoPipe, FieldError],
  templateUrl: './add-operator.html',
  styleUrl: '../../shared/form-page.scss',
})
export class AddOperator {
  private readonly api = inject(AtlasApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly apiError = signal(false);
  readonly step = signal<1 | 2>(1);
  readonly operators = signal<Operator[]>([]);
  readonly copyFrom = signal('');
  readonly screens = signal<ScreenModule[]>(defaultScreens('admin'));
  readonly modules = SCREEN_MODULES;

  readonly roles = [
    { id: 'maker' as const, titleKey: 'role.maker', hintKey: 'onboard.roleMaker' },
    { id: 'checker' as const, titleKey: 'role.checker', hintKey: 'onboard.roleChecker' },
    { id: 'reader' as const, titleKey: 'role.reader', hintKey: 'onboard.roleReader' },
    { id: 'admin' as const, titleKey: 'role.admin', hintKey: 'onboard.roleAdmin' },
  ];

  readonly form = form(
    signal({
      name: '',
      email: '',
      role: 'admin' as OperatorRole,
    }),
    (p) => {
      required(p.name);
      required(p.email);
      email(p.email);
      required(p.role);
    },
  );

  constructor() {
    this.api.operators().subscribe({
      next: (rows) => this.operators.set(rows),
    });
  }

  selectRole(role: OperatorRole): void {
    this.form.role().value.set(role);
  }

  toggleScreen(id: ScreenModule): void {
    this.screens.update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  onCopy(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.copyFrom.set(id);
    const source = this.operators().find((row) => row.id === id);
    if (source) {
      this.screens.set(source.screens?.length ? [...source.screens] : defaultScreens(source.role));
    }
  }

  back(): void {
    this.step.set(1);
  }

  async goNext(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.form, async () => {
      this.screens.set(defaultScreens(this.form.role().value()));
      this.copyFrom.set('');
      this.step.set(2);
      return undefined;
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.apiError.set(false);
    await submit(this.form, async () => {
      try {
        await firstValueFrom(
          this.api.createOperator({
            ...this.form().value(),
            screens: this.screens(),
          }),
        );
        this.toast.ok('toast.operatorInvited');
        await this.router.navigateByUrl('/operators');
      } catch {
        this.apiError.set(true);
      }
      return undefined;
    });
  }
}
