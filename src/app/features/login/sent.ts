import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/notifications/toast.service';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

@Component({
  selector: 'app-sent',
  imports: [RouterLink, TranslocoPipe, AuthScreen, BrandLockup],
  templateUrl: './sent.html',
  styleUrl: './auth-forms.scss',
})
export class Sent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  resend(): void {
    const email = this.route.snapshot.queryParamMap.get('email') ?? '';
    if (email) {
      this.auth.forgot(email).subscribe({
        next: () => this.toast.ok('toast.resetSent'),
        error: () => this.toast.fail('toast.server'),
      });
    }
  }
}
