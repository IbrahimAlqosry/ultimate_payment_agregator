export const environment = {
  production: true,
  apiUrl: '/api',
  /** Keep the in-memory API until a real backend is wired. */
  useMockApi: true,
  /** UAT cluster deployment (uatnoti.ultimate-pay.net): a direct cross-origin call to the
   * public API domain, NOT reverse-proxied — the opposite of environment.production.ts's setup.
   * This depends on the backend having CORS enabled for https://uatnoti.ultimate-pay.net with
   * credentials allowed (Access-Control-Allow-Origin: https://uatnoti.ultimate-pay.net,
   * Access-Control-Allow-Credentials: true) — unverified as of 2026-09-22, the backend wasn't
   * reachable yet (Cloudflare 503, nothing deployed at the origin). The session cookie itself is
   * fine cross-subdomain (uatnoti/uat-apinoti share the same registrable domain
   * ultimate-pay.net, so SameSite=Strict still applies), but the browser will only attach it to
   * a cross-origin request because auth.interceptor.ts already sets withCredentials: true on
   * every platform-api request — CORS is the one thing that must be confirmed backend-side. If
   * requests fail with a CORS error in the browser console, that confirms it's not configured
   * yet; ask the backend team before assuming the frontend is at fault. */
  platformApiUrl: 'https://uat-apinoti.ultimate-pay.net',
  /** The test backend accepts a fixed OTP (000000); UAT sends real OTPs, so the hint is off there. */
  showTestOtpHint: false,
};
