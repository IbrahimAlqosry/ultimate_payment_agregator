import { decodeJwtPayload } from './jwt';

describe('decodeJwtPayload', () => {
  it('reads a three-part token payload', () => {
    const payload = btoa(JSON.stringify({ sub: 'u-1', exp: 9_999_999_999 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const token = `eyJhbGciOiJub25lIn0.${payload}.sig`;
    expect(decodeJwtPayload<{ sub: string }>(token)?.sub).toBe('u-1');
  });

  it('returns null for a malformed token', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
  });
});
