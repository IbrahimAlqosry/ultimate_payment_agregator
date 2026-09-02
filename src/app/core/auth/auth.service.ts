import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { canApprove, canManageOperators, canMutate, isReadOnly } from '@core/auth/access';
import { apiUrl } from '@core/http/api-url';
import { ApprovalEntity, Audience, AuthUser, LoginResponse, MerchantSignup, OtpStartResponse } from '@core/models';
import { decodeJwtPayload } from './jwt';

const TOKEN_KEY = 'aggregator.token';
const OTP_KEY = 'aggregator.otp';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  audience: Audience;
  role: AuthUser['role'];
  initials: string;
  jobTitleKey: string;
  orgName?: string;
  orgId?: string;
  iat: number;
  exp: number;
}

interface OtpChallenge {
  challengeId: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(this.readStoredToken());
  readonly user = computed(() => this.decode(this.token()));
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly readOnly = computed(() => isReadOnly(this.user()));
  readonly admin = computed(() => canManageOperators(this.user()));
  readonly canMutate = computed(() => canMutate(this.user()));

  canApprove(entity: ApprovalEntity): boolean {
    return canApprove(this.user(), entity);
  }

  login(email: string, password: string, audience: Audience) {
    return this.http
      .post<OtpStartResponse>(apiUrl('/auth/login'), { email, password, audience })
      .pipe(tap((response) => this.storeChallenge(response)));
  }

  verifyOtp(code: string) {
    const challenge = this.readChallenge();
    return this.http
      .post<LoginResponse>(apiUrl('/auth/otp'), { challengeId: challenge?.challengeId, code })
      .pipe(
        tap((response) => {
          this.clearChallenge();
          this.setSession(response.token);
        }),
      );
  }

  resendOtp() {
    const challenge = this.readChallenge();
    return this.http
      .post<OtpStartResponse>(apiUrl('/auth/otp/resend'), { challengeId: challenge?.challengeId })
      .pipe(tap((response) => this.storeChallenge(response)));
  }

  forgot(email: string) {
    return this.http.post(apiUrl('/auth/forgot'), { email });
  }

  register(payload: MerchantSignup) {
    return this.http.post(apiUrl('/auth/register'), payload);
  }

  hasOtpChallenge(): boolean {
    return this.readChallenge() !== null;
  }

  logout(redirect = true): void {
    localStorage.removeItem(TOKEN_KEY);
    this.clearChallenge();
    this.token.set(null);
    if (redirect) {
      void this.router.navigateByUrl('/login');
    }
  }

  setSession(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

  private storeChallenge(response: OtpStartResponse): void {
    sessionStorage.setItem(OTP_KEY, JSON.stringify(response));
  }

  private readChallenge(): OtpChallenge | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(OTP_KEY);
      return raw ? (JSON.parse(raw) as OtpChallenge) : null;
    } catch {
      return null;
    }
  }

  private clearChallenge(): void {
    sessionStorage.removeItem(OTP_KEY);
  }

  private readStoredToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const stored = localStorage.getItem(TOKEN_KEY);
    return this.decode(stored) ? stored : null;
  }

  private decode(token: string | null): AuthUser | null {
    if (!token) {
      return null;
    }
    const payload = decodeJwtPayload<JwtPayload>(token);
    if (!payload || payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      audience: payload.audience ?? 'operator',
      role: payload.role,
      avatarInitials: payload.initials,
      jobTitleKey: payload.jobTitleKey ?? `role.${payload.role}`,
      orgName: payload.orgName,
      orgId: payload.orgId,
    };
  }
}
