import { Component, inject, OnDestroy, signal } from '@angular/core';
import { form, minLength, pattern, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { submitChecked } from '@core/forms/submit-checked';
import { apiErrorMessageKey } from '@core/http/http-error';
import { ToastService } from '@core/notifications/toast.service';
import { FieldError } from '@shared/field-error';
import { AuthScreen } from './auth-screen';
import { BrandLockup } from './brand-lockup';

const OTP_SECONDS = 5 * 60;

@Component({
  selector: 'app-otp',
  imports: [RouterLink, TranslocoPipe, AuthScreen, BrandLockup, FieldError],
  templateUrl: './otp.html',
  styleUrls: ['./auth-forms.scss', './otp.scss'],
})
export class Otp implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private timerId = 0;

  readonly digits = signal(['', '', '', '', '', '']);
  readonly apiError = signal(false);
  readonly remainingSeconds = signal(OTP_SECONDS);

  readonly otpForm = form(signal({ code: '' }), (p) => {
    required(p.code);
    minLength(p.code, 6);
    pattern(p.code, /^\d{6}$/);
  });

  constructor() {
    if (!this.auth.hasOtpChallenge()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.startTimer();
  }

  remaining(): string {
    const total = this.remainingSeconds();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const char = input.value.replace(/\D/g, '').slice(-1);
    const next = [...this.digits()];
    next[index] = char;
    this.digits.set(next);
    this.syncCode();
    this.apiError.set(false);
    input.value = char;
    if (char) {
      const sibling = input.parentElement?.children[index + 1] as HTMLInputElement | undefined;
      sibling?.focus();
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      const sibling = input.parentElement?.children[index - 1] as HTMLInputElement | undefined;
      sibling?.focus();
    }
    if (event.key === 'Enter') {
      void this.onVerify();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const chars = text.replace(/\D/g, '').slice(0, 6).split('');
    const next = ['', '', '', '', '', ''];
    chars.forEach((char, i) => {
      next[i] = char;
    });
    this.digits.set(next);
    this.syncCode();
  }

  onBlur(): void {
    this.otpForm.code().markAsTouched();
  }

  async onVerify(event?: Event): Promise<void> {
    event?.preventDefault();
    this.apiError.set(false);
    await submitChecked(this.otpForm, this.toast, async () => {
      try {
        await firstValueFrom(this.auth.verifyOtp(this.otpForm.code().value()));
        this.toast.ok('toast.welcome');
        await this.router.navigateByUrl('/dashboard');
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 423) {
          await this.router.navigateByUrl('/account-locked');
          return undefined;
        }
        this.apiError.set(true);
        // 401 really is "wrong code" — everything else (500, 503, network) gets its actual
        // status-based message instead, so a server/deployment problem doesn't masquerade as a
        // typo'd OTP.
        this.toast.fail(status === 401 ? 'toast.otpBad' : apiErrorMessageKey(err));
      }
      return undefined;
    });
  }

  resend(): void {
    this.digits.set(['', '', '', '', '', '']);
    this.otpForm.code().value.set('');
    this.otpForm().reset();
    this.apiError.set(false);
    this.auth.resendOtp().subscribe({
      next: () => {
        this.toast.ok('toast.otpSent');
        this.startTimer();
      },
      error: () => this.toast.fail('toast.server'),
    });
  }

  ngOnDestroy(): void {
    window.clearInterval(this.timerId);
  }

  private syncCode(): void {
    this.otpForm.code().value.set(this.digits().join(''));
  }

  private startTimer(): void {
    window.clearInterval(this.timerId);
    const expiresAt = this.auth.otpExpiresAt();
    const fromExpiry = expiresAt ? Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000) : NaN;
    this.remainingSeconds.set(fromExpiry > 0 ? fromExpiry : OTP_SECONDS);
    this.timerId = window.setInterval(() => {
      const next = this.remainingSeconds() - 1;
      if (next <= 0) {
        this.remainingSeconds.set(0);
        window.clearInterval(this.timerId);
        return;
      }
      this.remainingSeconds.set(next);
    }, 1000);
  }
}
