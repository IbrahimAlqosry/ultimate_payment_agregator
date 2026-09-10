import { environment } from '@env/environment';
import { requestPath } from './api-url';

/** See the matching comment in api-url.ts's baseHref() — same sub-path deploy problem, same fix.
 * Only applies when `environment.platformApiUrl` is itself relative (e.g. '/pa-api', to be
 * reverse-proxied from the app's own origin) — an absolute target (e.g. 'http://host:port', a
 * direct cross-origin call) already names a real origin and must not have the app's own
 * deployed sub-path glued onto the front of it. */
function resolvedBase(): string {
  const target = environment.platformApiUrl.replace(/\/$/, '');
  if (/^https?:\/\//i.test(target)) {
    return target;
  }
  const href = document.querySelector('base')?.getAttribute('href') ?? '/';
  return href.replace(/\/$/, '') + target;
}

/** Join `environment.platformApiUrl` with a path such as `/api/v1/auth/login`. */
export function platformApiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${resolvedBase()}${suffix}`;
}

export function isPlatformApiRequest(url: string): boolean {
  const base = resolvedBase();
  if (/^https?:\/\//i.test(base)) {
    // Absolute target: compare the full URL, not just its pathname — the base's own path is
    // empty here, so a pathname-only check would match nearly every request.
    return url === base || url.startsWith(`${base}/`);
  }
  const path = requestPath(url);
  return path === base || path.startsWith(`${base}/`);
}
