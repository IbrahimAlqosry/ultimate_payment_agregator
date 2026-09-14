import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { allowedAudiencesForPath } from './nav';
import { Audience } from '@core/models';

export const authGuard: CanActivateFn = () => requireSession();
export const authMatch: CanMatchFn = () => requireSession();

export const guestGuard: CanActivateFn = () => rejectIfSignedIn();
export const guestMatch: CanMatchFn = () => rejectIfSignedIn();

export const audienceGuard =
  (allowed: Audience[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user();
    if (!user) {
      return router.createUrlTree(['/login']);
    }
    return allowed.includes(user.audience) ? true : router.createUrlTree(['/dashboard']);
  };

export const routeAudienceGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) {
    return router.createUrlTree(['/login']);
  }
  const path = `/${route.routeConfig?.path ?? ''}`;
  const allowed = allowedAudiencesForPath(path);
  if (!allowed) {
    return true;
  }
  return allowed.includes(user.audience) ? true : router.createUrlTree(['/dashboard']);
};

function requireSession() {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
}

function rejectIfSignedIn() {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
}
