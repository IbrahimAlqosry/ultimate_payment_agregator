export const environment = {
  production: true,
  apiUrl: '/api',
  /** Keep the in-memory API until a real backend is wired. */
  useMockApi: true,
  /** Production hosting must reverse-proxy this path to the real backend (see proxy.conf.json for dev). */
  platformApiUrl: '/pa-api',
};
