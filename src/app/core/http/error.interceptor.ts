import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/notifications/toast.service';
import { apiUrl, isApiRequest, requestPath } from './api-url';
import { apiErrorMessageKey } from './http-error';
import { isPlatformApiRequest, platformApiUrl } from './platform-api-url';

const STATUS_PATHS = new Set(['/401', '/404', '/423', '/501', '/503']);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const onPlatformApi = isPlatformApiRequest(req.url);
      if (!isApiRequest(req.url) && !onPlatformApi) {
        return throwError(() => error);
      }

      const pathname = requestPath(req.url);
      const onAuth =
        pathname.startsWith(`${apiUrl('/auth')}/`) ||
        pathname === apiUrl('/auth') ||
        pathname.startsWith(`${platformApiUrl('/api/v1/auth')}/`);
      const alreadyOnStatus = STATUS_PATHS.has(router.url.split('?')[0] ?? '');
      const simulated = /\/simulate\/(401|404|501|503)$/.exec(pathname);

      if (error.status === 423 && !alreadyOnStatus) {
        // OTP lockout on the real backend — stop attempts, no invented remaining-time counter.
        void router.navigateByUrl('/account-locked');
      } else if (error.status === 401 && !onAuth) {
        auth.logout(false);
        if (!alreadyOnStatus) {
          void router.navigateByUrl('/401');
        }
      } else if (error.status === 503 && !alreadyOnStatus) {
        void router.navigateByUrl('/503');
      } else if (error.status === 501 && !alreadyOnStatus) {
        void router.navigateByUrl('/501');
      } else if (
        error.status === 404 &&
        (simulated?.[1] === '404' || pathname.includes('/simulate/')) &&
        !alreadyOnStatus
      ) {
        void router.navigateByUrl('/404');
      } else if (!onAuth) {
        // Every other request error — any status, platform API or legacy, load or submit,
        // anywhere in the app — surfaces as one translated toast here, so no screen can ship a
        // silent or raw-text failure. Components still set their own inline apiError signal
        // (via the same apiErrorMessageKey) for contextual per-field copy; this is just the
        // guaranteed, can't-forget-it notification layer on top. Auth screens (login/otp/
        // register/accept-invitation/set-password/forgot) are excluded because they already show
        // their own status-aware, friendlier copy (e.g. "wrong password" for a 401 instead of a
        // generic "unauthorized") and would otherwise be double-toasted.
        toast.fail(error.status === 0 ? 'toast.network' : apiErrorMessageKey(error));
      }

      return throwError(() => error);
    }),
  );
};
