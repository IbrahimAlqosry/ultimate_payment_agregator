import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { apiUrl, isApiRequest } from '@core/http/api-url';
import { isPlatformApiRequest } from '@core/http/platform-api-url';
import { AuthService } from './auth.service';
import { encodeJwtPayload } from './jwt';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (isPlatformApiRequest(req.url)) {
    const headers: Record<string, string> = { 'X-Correlation-ID': crypto.randomUUID() };
    const csrfToken = auth.csrfToken();
    if (csrfToken && req.method !== 'GET') {
      headers['X-CSRF-Token'] = csrfToken;
    }
    return next(req.clone({ setHeaders: headers, withCredentials: true }));
  }

  const isAuth = req.url.startsWith(apiUrl('/auth/'));
  const user = auth.user();
  if (!user || !isApiRequest(req.url) || isAuth) {
    return next(req);
  }

  // Shadow bearer token for the mock backend's own role checks — see encodeJwtPayload().
  const token = encodeJwtPayload({
    sub: user.id,
    email: user.email,
    name: user.name,
    audience: user.audience,
    role: user.role,
    initials: user.avatarInitials,
    jobTitleKey: user.jobTitleKey,
    orgName: user.orgName,
    orgId: user.orgId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  });

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
