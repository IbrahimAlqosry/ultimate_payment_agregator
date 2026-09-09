import { environment } from '@env/environment';

/** Join `environment.platformApiUrl` with a path such as `/api/v1/auth/login`. */
export function platformApiUrl(path: string): string {
  const base = environment.platformApiUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function isPlatformApiRequest(url: string): boolean {
  const base = environment.platformApiUrl.replace(/\/$/, '');
  const path = requestPath(url);
  return path === base || path.startsWith(`${base}/`);
}

function requestPath(url: string): string {
  try {
    return new URL(url, 'http://local.invalid').pathname;
  } catch {
    return (url.split('?')[0] ?? url) || '/';
  }
}
