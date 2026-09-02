export const environment = {
  production: false,
  /** Base URL for Aggregator Platform HTTP calls. Feature APIs always go through this. */
  apiUrl: '/api',
  /**
   * When true, `mockBackendInterceptor` answers `/api/*`.
   * Set to false (and point `apiUrl` at a real host) to use a live backend.
   */
  useMockApi: true,
};
