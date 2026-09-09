export const environment = {
  production: false,
  /** Base URL for Aggregator Platform HTTP calls. Feature APIs always go through this. */
  apiUrl: '/api',
  /**
   * When true, `mockBackendInterceptor` answers `/api/*`.
   * Set to false (and point `apiUrl` at a real host) to use a live backend.
   */
  useMockApi: true,
  /**
   * Base URL for the real Payment Aggregator backend (auth, onboarding, Integration Client).
   * A relative path proxied by `proxy.conf.json` (see `npm start`) to avoid the backend's
   * missing CORS configuration — never point this at a raw cross-origin URL.
   */
  platformApiUrl: '/pa-api',
};
