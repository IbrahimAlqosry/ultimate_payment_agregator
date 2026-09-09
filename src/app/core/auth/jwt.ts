/**
 * Encodes an unsigned, JWT-shaped token carrying `payload` — used only as a compatibility shim
 * so `mockBackendInterceptor`'s own role-gating (which reads a Bearer token) keeps working for
 * the still-mock-only screens after a real login, which no longer issues a real JWT. Mirrors
 * `decodeJwtPayload` below; never sent to the real backend.
 */
export function encodeJwtPayload(payload: Record<string, unknown>): string {
  const header = toBase64Url({ alg: 'none', typ: 'JWT' });
  const body = toBase64Url(payload);
  return `${header}.${body}.mock`;
}

function toBase64Url(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return btoa(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split('.');
  const payload = parts[1];
  if (parts.length !== 3 || !payload) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(payload)) as T;
  } catch {
    return null;
  }
}

export function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  return decodeURIComponent(
    atob(padded)
      .split('')
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );
}
