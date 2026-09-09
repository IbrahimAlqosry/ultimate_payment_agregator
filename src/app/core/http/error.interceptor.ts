import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/notifications/toast.service';
import { apiUrl, isApiRequest, requestPath } from './api-url';
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
      } else if (error.status === 0) {
        toast.fail('toast.network');
      } else if (!onPlatformApi && error.status === 403) {
        toast.fail('toast.forbidden');
      } else if (!onPlatformApi && !onAuth && error.status === 400) {
        toast.fail('toast.badRequest');
      } else if (!onPlatformApi && !onAuth && error.status === 404) {
        toast.fail('toast.notFound');
      } else if (!onPlatformApi && !onAuth && error.status >= 500 && error.status !== 501 && error.status !== 503) {
        toast.fail('toast.server');
      }
      // Platform-API 400/403/404/409/5xx are left for the calling component: the guide's error
      // model (concurrencyToken conflicts, per-field validation, maker=checker, empty states like
      // integration-client's 404) needs contextual handling readApiError()'s problem+json parsing
      // supports, not a blanket toast.

      return throwError(() => error);
    }),
  );
};
