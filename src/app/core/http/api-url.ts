import { environment } from '@env/environment';

/** The app's actual deployed root, from the `<base href>` tag Angular itself reads for
 * routing — e.g. `/UltimatePay/` when hosted under an IIS sub-application, `/` at a site root.
 * `environment.apiUrl` is written as if the app were at the domain root, so a relative target
 * needs this prefixed in too, or a sub-path deploy 404s (the base href only auto-applies to the
 * router and *relative* URLs, never to a hardcoded leading-slash path used directly in an HTTP
 * call). An absolute target (a real origin, e.g. 'http://host:port') must NOT have this
 * prepended — it already names its own origin. */
function resolvedBase(): string {
  const target = environment.apiUrl.replace(/\/$/, '');
  if (/^https?:\/\//i.test(target)) {
    return target;
  }
  const href = document.querySelector('base')?.getAttribute('href') ?? '/';
  return href.replace(/\/$/, '') + target;
}

/** Join `environment.apiUrl` with a path such as `/dashboard`. */
export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${resolvedBase()}${suffix}`;
}

export function isApiRequest(url: string): boolean {
  const base = resolvedBase();
  if (/^https?:\/\//i.test(base)) {
    return url === base || url.startsWith(`${base}/`);
  }
  const path = requestPath(url);
  return path === base || path.startsWith(`${base}/`);
}

/** Pathname of a relative or absolute HTTP URL (`/api/dashboard`). */
export function requestPath(url: string): string {
  try {
    return new URL(url, 'http://local.invalid').pathname;
  } catch {
    return (url.split('?')[0] ?? url) || '/';
  }
}
