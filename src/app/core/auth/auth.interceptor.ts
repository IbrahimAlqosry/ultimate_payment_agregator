import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { apiUrl, isApiRequest } from '@core/http/api-url';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const isAuth = req.url.startsWith(apiUrl('/auth/'));

  if (!token || !isApiRequest(req.url) || isAuth) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
