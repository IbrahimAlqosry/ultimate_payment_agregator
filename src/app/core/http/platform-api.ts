import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssistedMerchantOnboardingRequest,
  AuthMeResponse,
  ErpChoicePage,
  ErpSystemChangeRequest,
  ErpSystemChangeRequestPage,
  ErpSystemDetails,
  ErpSystemDetailsPage,
  ErpSystemRequestBody,
  ErpSystemUpdateRequestBody,
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
  CreatePaymentPointRequest,
  FinancialInstitutionContactUpdateRequest,
  FinancialInstitutionProfileResponse,
  FinancialInstitutionSelfProfileResponse,
  GovernedProfileChangePage,
  GovernedProfileChangeRequestBody,
  GovernedProfileChangeResponse,
  MerchantProfileResponse,
  MerchantProfileUpdateRequest,
  OtpChallengeResponse,
  PagedQuery,
  PaymentPoint,
  PaymentPointDecisionRequest,
  PlatformOperatorChangeDetails,
  PlatformOperatorChangeInput,
  PlatformOperatorChangePage,
  PlatformOperatorDetails,
  PlatformOperatorInvitationAcceptanceRequest,
  PlatformOperatorInvitationRequest,
  PlatformOperatorPage,
  PlatformOperatorPermissionCatalog,
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
 * Typed client for the real Payment Aggregator backend. Per the v3.0 guide this now covers
 * auth, onboarding, Integration Client, Platform Operator administration, ERP systems,
 * Merchant/FI profiles, and payment points (create + FI decide only — no list/GET API exists
 * for payment points). Dashboard, ERP-choice-independent payment-point browsing, reports,
 * settlements, and notification-webhook config still have no real backend and stay on
 * `AtlasApi`/the mock.
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

  /** The only source of real accountType/role/permissions — nothing else in the login flow
   * returns them. Requires only the session cookie, no CSRF (it's a GET). */
  getMe() {
    return this.http.get<AuthMeResponse>(platformApiUrl('/api/v1/auth/me'));
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

  // --- ERP choices (public) -------------------------------------------------

  /** Public — used by both self-service and assisted Merchant registration, and the Merchant
   * profile editor's ERP selector. */
  getErpChoices(query: PagedQuery = {}) {
    return this.http.get<ErpChoicePage>(platformApiUrl('/api/v1/erp-systems/choices'), { params: pageParams(query) });
  }

  // --- ERP systems (Platform) -----------------------------------------------

  listErpSystems(query: PagedQuery = {}) {
    return this.http.get<ErpSystemDetailsPage>(platformApiUrl('/api/v1/erp-systems'), { params: pageParams(query) });
  }

  getErpSystem(erpSystemId: string) {
    return this.http.get<ErpSystemDetails>(platformApiUrl(`/api/v1/erp-systems/${erpSystemId}`));
  }

  submitErpCreation(body: ErpSystemRequestBody) {
    return this.http.post<ErpSystemChangeRequest>(platformApiUrl('/api/v1/erp-systems/requests'), body);
  }

  submitErpUpdate(erpSystemId: string, body: ErpSystemUpdateRequestBody) {
    return this.http.post<ErpSystemChangeRequest>(platformApiUrl(`/api/v1/erp-systems/${erpSystemId}/requests`), body);
  }

  listErpRequests(query: PagedQuery = {}) {
    return this.http.get<ErpSystemChangeRequestPage>(platformApiUrl('/api/v1/erp-systems/requests'), {
      params: pageParams(query),
    });
  }

  getErpRequest(requestId: string) {
    return this.http.get<ErpSystemChangeRequest>(platformApiUrl(`/api/v1/erp-systems/requests/${requestId}`));
  }

  decideErpRequest(requestId: string, body: OnboardingDecisionRequest) {
    return this.http.post<ErpSystemChangeRequest>(platformApiUrl(`/api/v1/erp-systems/requests/${requestId}/decision`), body);
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

  // --- Platform Operator administration -------------------------------------

  listOperators(query: PagedQuery = {}) {
    return this.http.get<PlatformOperatorPage>(platformApiUrl('/api/v1/platform-operator-administration/operators'), {
      params: pageParams(query),
    });
  }

  getOperator(userId: string) {
    return this.http.get<PlatformOperatorDetails>(
      platformApiUrl(`/api/v1/platform-operator-administration/operators/${userId}`),
    );
  }

  inviteOperator(body: PlatformOperatorInvitationRequest) {
    return this.http.post<PlatformOperatorChangeDetails>(
      platformApiUrl('/api/v1/platform-operator-administration/invitations'),
      body,
    );
  }

  requestOperatorChange(userId: string, body: PlatformOperatorChangeInput) {
    return this.http.post<PlatformOperatorChangeDetails>(
      platformApiUrl(`/api/v1/platform-operator-administration/operators/${userId}/changes`),
      body,
    );
  }

  listOperatorRequests(query: PagedQuery = {}) {
    return this.http.get<PlatformOperatorChangePage>(
      platformApiUrl('/api/v1/platform-operator-administration/requests'),
      { params: pageParams(query) },
    );
  }

  getOperatorRequest(requestId: string) {
    return this.http.get<PlatformOperatorChangeDetails>(
      platformApiUrl(`/api/v1/platform-operator-administration/requests/${requestId}`),
    );
  }

  decideOperatorRequest(requestId: string, body: OnboardingDecisionRequest) {
    return this.http.post<PlatformOperatorChangeDetails>(
      platformApiUrl(`/api/v1/platform-operator-administration/requests/${requestId}/decision`),
      body,
    );
  }

  getOperatorPermissionCatalog() {
    return this.http.get<PlatformOperatorPermissionCatalog>(
      platformApiUrl('/api/v1/platform-operator-administration/permissions'),
    );
  }

  /** Public — no session cookie exists yet at this point in the flow. */
  acceptOperatorInvitation(body: PlatformOperatorInvitationAcceptanceRequest) {
    return this.http.post<void>(platformApiUrl('/api/v1/auth/platform-operator-invitation'), body);
  }

  // --- Merchant / Financial Institution profiles -----------------------------

  getOwnMerchantProfile() {
    return this.http.get<MerchantProfileResponse>(platformApiUrl('/api/v1/profiles/merchant'));
  }

  updateOwnMerchantProfile(body: MerchantProfileUpdateRequest) {
    return this.http.put<MerchantProfileResponse>(platformApiUrl('/api/v1/profiles/merchant'), body);
  }

  getOwnFinancialInstitutionProfile() {
    return this.http.get<FinancialInstitutionSelfProfileResponse>(
      platformApiUrl('/api/v1/profiles/financial-institution'),
    );
  }

  updateOwnFinancialInstitutionContact(body: FinancialInstitutionContactUpdateRequest) {
    return this.http.put<FinancialInstitutionSelfProfileResponse>(
      platformApiUrl('/api/v1/profiles/financial-institution'),
      body,
    );
  }

  /** Platform-side view — carries the extra `governedConcurrencyToken` the self-view doesn't. */
  getGovernedFiProfile(applicationId: string) {
    return this.http.get<FinancialInstitutionProfileResponse>(
      platformApiUrl(`/api/v1/profiles/financial-institutions/${applicationId}`),
    );
  }

  submitGovernedFiChange(applicationId: string, body: GovernedProfileChangeRequestBody) {
    return this.http.post<GovernedProfileChangeResponse>(
      platformApiUrl(`/api/v1/profiles/financial-institutions/${applicationId}/changes`),
      body,
    );
  }

  listFiProfileChanges(query: PagedQuery = {}) {
    return this.http.get<GovernedProfileChangePage>(platformApiUrl('/api/v1/profiles/financial-institution-changes'), {
      params: pageParams(query),
    });
  }

  getFiProfileChangeRequest(requestId: string) {
    return this.http.get<GovernedProfileChangeResponse>(
      platformApiUrl(`/api/v1/profiles/financial-institution-changes/${requestId}`),
    );
  }

  decideFiProfileChangeRequest(requestId: string, body: OnboardingDecisionRequest) {
    return this.http.post<GovernedProfileChangeResponse>(
      platformApiUrl(`/api/v1/profiles/financial-institution-changes/${requestId}/decision`),
      body,
    );
  }

  // --- Payment points ---------------------------------------------------------

  createPaymentPoint(body: CreatePaymentPointRequest) {
    return this.http.post<PaymentPoint>(platformApiUrl('/api/v1/payment-points'), body);
  }

  decidePaymentPoint(paymentPointId: string, body: PaymentPointDecisionRequest) {
    return this.http.post<PaymentPoint>(platformApiUrl(`/api/v1/payment-points/${paymentPointId}/decision`), body);
  }
}
