import { environment } from '@env/environment';

/** Join `environment.apiUrl` with a path such as `/dashboard`. */
export function apiUrl(path: string): string {
  const base = environment.apiUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function isApiRequest(url: string): boolean {
  const base = environment.apiUrl.replace(/\/$/, '');
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
