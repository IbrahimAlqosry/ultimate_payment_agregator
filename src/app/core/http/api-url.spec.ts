import { isApiRequest } from './api-url';

// Regression: on the UAT root deploy (base href "/", apiUrl "/api"), real cross-origin calls to
// https://uat-apinoti…/api/v1/… were matched as mock-API requests and answered 401 in-browser.
describe('isApiRequest', () => {
  it('matches the app\'s own relative API paths', () => {
    expect(isApiRequest('/api/dashboard')).toBe(true);
    expect(isApiRequest(`${window.location.origin}/api/dashboard`)).toBe(true);
  });

  it('ignores another origin even when its path starts with /api', () => {
    expect(isApiRequest('https://uat-apinoti.ultimate-pay.net/api/v1/auth/login')).toBe(false);
    expect(isApiRequest('https://uat-apinoti.ultimate-pay.net/api/v1/erp-systems/choices')).toBe(false);
  });

  it('ignores unrelated same-origin paths', () => {
    expect(isApiRequest('/i18n/en.json')).toBe(false);
  });
});
