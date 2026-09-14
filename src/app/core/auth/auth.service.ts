import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { canApprove, canMutate, canSubmit, hasPermission, isReadOnly } from '@core/auth/access';
import { apiUrl } from '@core/http/api-url';
import { LoadingService } from '@core/http/loading.service';
import { PlatformApi } from '@core/http/platform-api';
import { ApprovalEntity, Audience, AuthUser, UserRole } from '@core/models';
import {
  AuthMeResponse,
  FinancialInstitutionBootstrapRequest,
  MerchantBootstrapRequest,
  PlatformAccountType,
  PlatformPermission,
  SelfServiceMerchantOnboardingRequest,
} from '@core/models.platform';

/**
 * A login attempt in progress: stored only in memory (never persisted — the real backend's
 * session cookie + CSRF token don't survive a reload either, so there is nothing to gain
 * from persisting this, and the guide is explicit that a reload should require fresh login).
 */
interface PendingChallenge {
  challengeId: string;
  expiresAt: string;
  email: string;
  password: string;
}

/**
 * Non-sensitive marker persisted across reloads (email only — never the CSRF token or anything
 * security-bearing). The real `__Host-pa-session` cookie itself already survives a reload; this
 * marker just supplies a display email for `restoreSession()`, since GET /auth/me returns no
 * email/name at all — the actual audience/role/permissions always come fresh from that call,
 * never from this marker.
 */
const SESSION_MARKER_KEY = 'aggregator.session-marker';

interface SessionMarker {
  email: string;
}

function audienceFromAccountType(accountType: PlatformAccountType): Audience {
  if (accountType === 'merchant') {
    return 'merchant';
  }
  if (accountType === 'financialInstitution') {
    return 'institution';
  }
  return 'operator';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformApi = inject(PlatformApi);
  private readonly router = inject(Router);
  private readonly loading = inject(LoadingService);

  private readonly pending = signal<PendingChallenge | null>(null);
  // csrfToken is null right after a reload-restore — the cookie session is live but the guide
  // gives no way to recover the CSRF token itself without a fresh login (see restoreSession()).
  private readonly session = signal<{ user: AuthUser; csrfToken: string | null } | null>(null);

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly readOnly = computed(() => isReadOnly(this.user()));
  readonly canMutate = computed(() => canMutate(this.user()));
  readonly csrfToken = computed(() => this.session()?.csrfToken ?? null);
  readonly otpExpiresAt = computed(() => this.pending()?.expiresAt ?? null);
  /** True once a reload-restore left us with a live session but no CSRF token — mutating
   * requests will fail until the user signs in again. Screens can use this to prompt clearly. */
  readonly needsFreshLogin = computed(() => {
    const s = this.session();
    return s !== null && s.csrfToken === null;
  });

  canApprove(entity: ApprovalEntity): boolean {
    return canApprove(this.user(), entity);
  }

  /** Mirrors canApprove() for the Maker-side submit action on the same entity. */
  canSubmit(entity: ApprovalEntity): boolean {
    return canSubmit(this.user(), entity);
  }

  /** Real grant check against GET /auth/me's permissions. */
  hasPermission(permission: PlatformPermission): boolean {
    return hasPermission(this.user(), permission);
  }

  login(email: string, password: string) {
    return this.platformApi.login({ email, password }).pipe(
      tap((response) => {
        this.pending.set({ ...response, email, password });
      }),
    );
  }

  verifyOtp(code: string) {
    const challenge = this.pending();
    if (!challenge) {
      throw new Error('No login in progress.');
    }
    return this.platformApi.verifyOtp({ challengeId: challenge.challengeId, code }).pipe(
      switchMap((response) => {
        const csrfToken = response.headers.get('X-CSRF-Token');
        if (!csrfToken) {
          throw new Error('The login CSRF header was unavailable.');
        }
        // GET /auth/me is the only source of real accountType/role/permissions — nothing in the
        // login/OTP responses carries them. Wait for it before setting `session` at all, so a
        // guard or component reading `user()` mid-flight never sees a half-composed identity.
        return this.platformApi.getMe().pipe(map((me) => ({ csrfToken, me })));
      }),
      switchMap(({ csrfToken, me }) => this.buildUser(challenge.email, me).pipe(map((user) => ({ csrfToken, user })))),
      tap(({ csrfToken, user }) => {
        this.session.set({ user, csrfToken });
        this.pending.set(null);
        this.persistMarker({ email: challenge.email });
      }),
      map(() => undefined),
    );
  }

  /**
   * Runs once at app startup (see provideAppInitializer in app.config.ts), before any route
   * guard evaluates. The `__Host-pa-session` cookie survives a reload even though our in-memory
   * CSRF token doesn't — so GET /auth/me (the real source of identity, not a guess) tells us
   * whether that cookie is still valid rather than assuming every reload means logged-out.
   *
   * A live session restores `user` (so guards pass and GETs work) but leaves `csrfToken` null —
   * there is no API to recover it without a fresh login, so mutating requests still require one
   * (see `needsFreshLogin`). This never weakens security: the server enforces the real session
   * either way, this only affects what the client believes before it tries anything.
   */
  restoreSession(): Observable<void> {
    const marker = this.readMarker();
    return this.platformApi.getMe().pipe(
      switchMap((me) => this.buildUser(marker?.email ?? '', me)),
      tap((user) => {
        this.session.set({ user, csrfToken: null });
      }),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.clearMarker();
        }
        return of(null);
      }),
      map(() => undefined),
    );
  }

  /** There is no dedicated resend endpoint on the real backend — restart login instead. */
  resendOtp() {
    const challenge = this.pending();
    if (!challenge) {
      throw new Error('No login in progress.');
    }
    return this.login(challenge.email, challenge.password);
  }

  hasOtpChallenge(): boolean {
    return this.pending() !== null;
  }

  logout(redirect = true): void {
    if (redirect) {
      this.loading.cover();
    }
    const csrfToken = this.csrfToken();
    const finish = (): void => {
      this.session.set(null);
      this.pending.set(null);
      this.clearMarker();
      if (redirect) {
        void this.router.navigateByUrl('/login');
      }
    };
    if (csrfToken) {
      // A 401 here can simply mean the session is already gone server-side — clear local
      // state regardless rather than blocking logout on that.
      this.platformApi
        .logout()
        .pipe(catchError(() => of(null)))
        .subscribe(finish);
    } else {
      finish();
    }
  }

  bootstrapMerchant(body: MerchantBootstrapRequest) {
    return this.platformApi.bootstrapMerchant(body);
  }

  bootstrapFinancialInstitution(body: FinancialInstitutionBootstrapRequest) {
    return this.platformApi.bootstrapFinancialInstitution(body);
  }

  registerMerchant(payload: SelfServiceMerchantOnboardingRequest) {
    return this.platformApi.registerMerchantSelfService(payload);
  }

  /** Mock-only forgot-password — the real backend has no equivalent yet. */
  forgot(email: string) {
    return this.http.post(apiUrl('/auth/forgot'), { email });
  }

  /** email may be '' when restoring without a marker (see restoreSession) — accountType, role,
   * and permissions always come from the real `me` response, never guessed.
   *
   * For Merchant/FI audiences, also fetches the account's own profile to fill in `orgName`/
   * `orgId` — `GET /auth/me` itself carries neither. Those two fields gate real scoping/display
   * logic in several still-mock-backed screens (e.g. "My Payment Points"), which fail closed
   * (show nothing) rather than leak other orgs' data when they're missing — but leaving them
   * genuinely unset there is a real usability bug, not just a display nicety, so this is not
   * optional. A profile-fetch failure degrades to no org name/id rather than failing the login. */
  private buildUser(email: string, me: AuthMeResponse): Observable<AuthUser> {
    const audience = audienceFromAccountType(me.accountType);
    // Marker missing is a rare edge case (e.g. sessionStorage cleared but the cookie survived) —
    // /auth/me itself never returns an email, so there is nothing better to show here.
    const name = email ? displayNameFromEmail(email) : 'Account';
    const role: UserRole = audience === 'operator' ? (me.role ?? 'reader') : audience;
    const base: AuthUser = {
      id: email || audience,
      email,
      name,
      audience,
      role,
      avatarInitials: initialsFromName(name),
      jobTitleKey: `role.${role}`,
      permissions: me.permissions,
    };
    if (audience === 'merchant') {
      return this.platformApi.getOwnMerchantProfile().pipe(
        map((profile) => ({ ...base, orgName: profile.legalName, orgId: profile.merchantId })),
        catchError(() => of(base)),
      );
    }
    if (audience === 'institution') {
      return this.platformApi.getOwnFinancialInstitutionProfile().pipe(
        map((profile) => ({ ...base, orgName: profile.legalName, orgId: profile.financialInstitutionId })),
        catchError(() => of(base)),
      );
    }
    return of(base);
  }

  private persistMarker(marker: SessionMarker): void {
    try {
      sessionStorage.setItem(SESSION_MARKER_KEY, JSON.stringify(marker));
    } catch {
      /* sessionStorage unavailable (e.g. private mode) — reload-restore just won't work */
    }
  }

  private readMarker(): SessionMarker | null {
    try {
      const raw = sessionStorage.getItem(SESSION_MARKER_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<SessionMarker>;
      if (typeof parsed.email !== 'string') {
        return null;
      }
      return { email: parsed.email };
    } catch {
      return null;
    }
  }

  private clearMarker(): void {
    try {
      sessionStorage.removeItem(SESSION_MARKER_KEY);
    } catch {
      /* nothing to clear */
    }
  }
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  const words = local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.length ? words.join(' ') : email;
}

function initialsFromName(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return initials || '?';
}

