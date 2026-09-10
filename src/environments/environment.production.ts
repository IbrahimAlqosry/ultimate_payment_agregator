export const environment = {
  production: true,
  apiUrl: '/api',
  /** Keep the in-memory API until a real backend is wired. */
  useMockApi: true,
  /** Reverse-proxied by web.config's ReverseProxyPaApi rule to http://localhost:8080 — same-origin
   * from the browser's perspective, so no CORS config is needed on the backend at all. This is
   * the setup that's actually been proven to work (matches proxy.conf.json's role in dev, which
   * this app has used reliably all along). Do not switch this back to an absolute
   * 'http://localhost:8080' — that path depends on backend CORS support that isn't there yet
   * (confirmed live: 405 on the CORS preflight OPTIONS request). */
  platformApiUrl: '/pa-api',
};
