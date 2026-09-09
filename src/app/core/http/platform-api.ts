import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssistedMerchantOnboardingRequest,
  FinancialInstitutionApplicationDetails,
  FinancialInstitutionApplicationPage,
  FinancialInstitutionBootstrapRequest,
  FinancialInstitutionOnboardingRequest,
  IntegrationClientCredentialOnce,
  IntegrationClientMetadata,
  IntegrationClientRotateRequest,
  IntegrationClientRotationDecisionRequest,
  IntegrationClientRotationDecisionResult,
  IntegrationClientRotationOtpChallenge,
  IntegrationClientRotationRequestPage,
  LoginRequest,
  MerchantApplicationDetails,
  MerchantApplicationPage,
  MerchantBootstrapRequest,
  MerchantOnboardingReceipt,
  OnboardingDecisionRequest,
  OtpChallengeResponse,
  PagedQuery,
  SelfServiceMerchantOnboardingRequest,
  VerifyOtpRequest,
} from '@core/models.platform';
import { platformApiUrl } from './platform-api-url';

function pageParams(query: PagedQuery = {}): HttpParams {
  let params = new HttpParams().set('pageSize', String(query.pageSize ?? 50));
  if (query.cursor) {
    params = params.set('cursor', query.cursor);
  }
  return params;
}

/**
 * Typed client for the real Payment Aggregator backend (auth, onboarding, Integration Client).
 * Every other feature (dashboard, payment points, ERP list, operators, reports, settlements,
 * notifications, forgot-password) has no real backend yet and stays on `AtlasApi`/the mock.
 */
@Injectable({ providedIn: 'root' })
export class PlatformApi {
  private readonly http = inject(HttpClient);

  // --- Auth ---------------------------------------------------------------

  login(body: LoginRequest) {
    return this.http.post<OtpChallengeResponse>(platformApiUrl('/api/v1/auth/login'), body);
  }

  /** Returns the raw response so callers can read the `X-CSRF-Token` header. */
  verifyOtp(body: VerifyOtpRequest): Observable<HttpResponse<null>> {
    return this.http.post<null>(platformApiUrl('/api/v1/auth/otp/verify'), body, { observe: 'response' });
  }

  logout() {
    return this.http.post(platformApiUrl('/api/v1/auth/logout'), null);
  }

  bootstrapMerchant(body: MerchantBootstrapRequest) {
    return this.http.post(platformApiUrl('/api/v1/auth/merchant-bootstrap'), body);
  }

  bootstrapFinancialInstitution(body: FinancialInstitutionBootstrapRequest) {
    return this.http.post(platformApiUrl('/api/v1/auth/financial-institution-bootstrap'), body);
  }

  // --- Merchant onboarding -------------------------------------------------

  registerMerchantSelfService(body: SelfServiceMerchantOnboardingRequest) {
    return this.http.post<MerchantOnboardingReceipt>(platformApiUrl('/api/v1/merchant-onboarding/self-service'), body);
  }

  createMerchantApplication(body: AssistedMerchantOnboardingRequest) {
    return this.http.post<MerchantApplicationDetails>(platformApiUrl('/api/v1/merchant-onboarding/applications'), body);
  }

  listMerchantApplications(query: PagedQuery = {}) {
    return this.http.get<MerchantApplicationPage>(platformApiUrl('/api/v1/merchant-onboarding/applications'), {
      params: pageParams(query),
    });
  }

  getMerchantApplication(applicationId: string) {
    return this.http.get<MerchantApplicationDetails>(
      platformApiUrl(`/api/v1/merchant-onboarding/applications/${applicationId}`),
    );
  }

  submitMerchantApplication(applicationId: string) {
    return this.http.post<MerchantApplicationDetails>(
      platformApiUrl(`/api/v1/merchant-onboarding/applications/${applicationId}/maker-submit`),
      null,
    );
  }

  decideMerchantApplication(applicationId: string, body: OnboardingDecisionRequest) {
    return this.http.post<MerchantApplicationDetails>(
      platformApiUrl(`/api/v1/merchant-onboarding/applications/${applicationId}/decision`),
      body,
    );
  }

  // --- Financial Institution onboarding ------------------------------------

  createInstitutionApplication(body: FinancialInstitutionOnboardingRequest) {
    return this.http.post<FinancialInstitutionApplicationDetails>(
      platformApiUrl('/api/v1/financial-institution-onboarding/applications'),
      body,
    );
  }

  listInstitutionApplications(query: PagedQuery = {}) {
    return this.http.get<FinancialInstitutionApplicationPage>(
      platformApiUrl('/api/v1/financial-institution-onboarding/applications'),
      { params: pageParams(query) },
    );
  }

  getInstitutionApplication(applicationId: string) {
    return this.http.get<FinancialInstitutionApplicationDetails>(
      platformApiUrl(`/api/v1/financial-institution-onboarding/applications/${applicationId}`),
    );
  }

  submitInstitutionApplication(applicationId: string) {
    return this.http.post<FinancialInstitutionApplicationDetails>(
      platformApiUrl(`/api/v1/financial-institution-onboarding/applications/${applicationId}/maker-submit`),
      null,
    );
  }

  decideInstitutionApplication(applicationId: string, body: OnboardingDecisionRequest) {
    return this.http.post<FinancialInstitutionApplicationDetails>(
      platformApiUrl(`/api/v1/financial-institution-onboarding/applications/${applicationId}/decision`),
      body,
    );
  }

  // --- Integration Client ---------------------------------------------------

  getIntegrationClient() {
    return this.http.get<IntegrationClientMetadata>(platformApiUrl('/api/v1/integration-client'));
  }

  createIntegrationClient() {
    return this.http.post<IntegrationClientCredentialOnce>(platformApiUrl('/api/v1/integration-client'), null);
  }

  requestIntegrationClientRotationOtp() {
    return this.http.post<IntegrationClientRotationOtpChallenge>(
      platformApiUrl('/api/v1/integration-client/rotation-otp'),
      null,
    );
  }

  rotateIntegrationClient(body: IntegrationClientRotateRequest) {
    return this.http.post(platformApiUrl('/api/v1/integration-client/rotate'), body);
  }

  listIntegrationClientRotationRequests(query: PagedQuery = {}) {
    return this.http.get<IntegrationClientRotationRequestPage>(
      platformApiUrl('/api/v1/integration-client/rotation-requests'),
      { params: pageParams(query) },
    );
  }

  submitIntegrationClientRotationRequest(requestId: string) {
    return this.http.post(platformApiUrl(`/api/v1/integration-client/rotation-requests/${requestId}/maker-submit`), null);
  }

  decideIntegrationClientRotationRequest(requestId: string, body: IntegrationClientRotationDecisionRequest) {
    return this.http.post<IntegrationClientRotationDecisionResult>(
      platformApiUrl(`/api/v1/integration-client/rotation-requests/${requestId}/decision`),
      body,
    );
  }
}
