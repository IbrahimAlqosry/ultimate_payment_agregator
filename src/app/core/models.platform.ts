/**
 * Types for the real Payment Aggregator backend (see docs/PaymentAggregator-UI-Integration-Guide-v2.md
 * and the live OpenAPI spec). Kept separate from `core/models.ts`'s mock-shaped types — the concepts
 * don't line up 1:1 (e.g. application `status` here is a 5-state machine, not the mock's 3-state one).
 */

export type PlatformAudience = 'operator' | 'merchant' | 'institution';
export type PlatformOperatorRole = 'admin' | 'maker' | 'checker' | 'reader';

/** Every real `platform.*` grant string GET /auth/me can return, named — nothing in `core/auth`
 * or components should spell one out as a raw string literal (see `access.ts`'s `hasPermission`,
 * `DECIDE_PERMISSION`, `SUBMIT_PERMISSION`). Catalog verified live via
 * GET /platform-operator-administration/permissions.
 *
 * A `const` object + derived union, not a TS `enum` — matches this file's own convention for
 * every other fixed backend string set (`ApplicationStatus`, `PlatformOperatorRole`, etc.), and
 * the values stay plain strings, so no cast is needed anywhere a raw `string` from the backend
 * (e.g. `AuthMeResponse.permissions`) needs comparing against one. */
export const PlatformPermission = {
  MerchantOnboardingSubmit: 'platform.merchant-onboarding.submit',
  MerchantOnboardingDecide: 'platform.merchant-onboarding.decide',
  MerchantOnboardingRead: 'platform.merchant-onboarding.read',
  FinancialInstitutionOnboardingSubmit: 'platform.financial-institution-onboarding.submit',
  FinancialInstitutionOnboardingDecide: 'platform.financial-institution-onboarding.decide',
  FinancialInstitutionOnboardingRead: 'platform.financial-institution-onboarding.read',
  IntegrationClientApprovalsSubmit: 'platform.integration-client-approvals.submit',
  IntegrationClientApprovalsDecide: 'platform.integration-client-approvals.decide',
  IntegrationClientApprovalsRead: 'platform.integration-client-approvals.read',
  ErpSystemsSubmit: 'platform.erp-systems.submit',
  ErpSystemsDecide: 'platform.erp-systems.decide',
  ErpSystemsRead: 'platform.erp-systems.read',
  OperatorsInvite: 'platform.operators.invite',
  OperatorsChange: 'platform.operators.change',
  OperatorsDecide: 'platform.operators.decide',
  OperatorsRead: 'platform.operators.read',
  ProfilesSubmit: 'platform.profiles.submit',
  ProfilesDecide: 'platform.profiles.decide',
  ProfilesRead: 'platform.profiles.read',
} as const;

export type PlatformPermission = (typeof PlatformPermission)[keyof typeof PlatformPermission];

export type ApplicationStatus = 'awaitingMaker' | 'pendingChecker' | 'provisioning' | 'active' | 'rejected';
export type ApplicationOrigin = 'selfService' | 'platformAssisted';
export type OnboardingDecision = 'approved' | 'rejected';
export type RotationRequestStatus = 'awaitingMaker' | 'pendingChecker' | 'approved' | 'rejected';
export type PlatformInstitutionType = 'bank' | 'wallet';

export interface OtpChallengeResponse {
  challengeId: string;
  expiresAt: string;
}

export type PlatformAccountType = 'platform' | 'merchant' | 'financialInstitution';

/** GET /auth/me — the only source of real identity/authorization data; the login/OTP-verify
 * responses themselves carry none. Returns exactly these three fields, nothing else (no email,
 * name, or ID) — see guide v3.0 §3.3. */
export interface AuthMeResponse {
  accountType: PlatformAccountType;
  role: PlatformOperatorRole | null;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  challengeId: string;
  code: string;
}

export interface MerchantBootstrapRequest {
  email: string;
  temporaryPassword: string;
  newPassword: string;
}

export interface FinancialInstitutionBootstrapRequest {
  email: string;
  temporaryPassword: string;
  newPassword: string;
}

export interface ContactRequest {
  name: string;
  email: string;
  phone: string;
}

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
}

export interface SelfServiceMerchantOnboardingRequest {
  legalName: string;
  commercialRegistrationNumber: string;
  contact: ContactRequest;
  erpSystemId: string;
  password: string;
}

export interface AssistedMerchantOnboardingRequest {
  legalName: string;
  commercialRegistrationNumber: string;
  contact: ContactRequest;
  erpSystemId: string;
}

export interface MerchantOnboardingReceipt {
  applicationId: string;
  status: 'awaitingMaker';
  createdAt: string;
}

export interface MerchantApplicationDetails {
  applicationId: string;
  legalName: string;
  commercialRegistrationNumber: string;
  contact: ContactDetails;
  erpSystemId: string;
  origin: ApplicationOrigin;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  makerSubmittedAt: string | null;
  decidedAt: string | null;
  activatedAt: string | null;
  rejectedAt: string | null;
  concurrencyToken: string | null;
}

export interface MerchantApplicationPage {
  items: MerchantApplicationDetails[];
  nextCursor: string | null;
}

export interface FinancialInstitutionContractRequest {
  number: string;
  signedDate: string;
  expiryDate: string;
  agreedFeePerRequest: number;
  autoRenewal: boolean;
  terminationRequested: boolean;
  terminationNoticeDate: string | null;
}

export type FinancialInstitutionContractDetails = FinancialInstitutionContractRequest;

export interface FinancialInstitutionOnboardingRequest {
  legalName: string;
  institutionType: PlatformInstitutionType;
  cbyLicenceNumber: string;
  contract: FinancialInstitutionContractRequest;
  contact: ContactRequest;
}

export interface FinancialInstitutionApplicationDetails {
  applicationId: string;
  legalName: string;
  institutionType: PlatformInstitutionType;
  cbyLicenceNumber: string;
  contract: FinancialInstitutionContractDetails;
  contact: ContactDetails;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  makerSubmittedAt: string | null;
  decidedAt: string | null;
  activatedAt: string | null;
  rejectedAt: string | null;
  concurrencyToken: string | null;
}

export interface FinancialInstitutionApplicationPage {
  items: FinancialInstitutionApplicationDetails[];
  nextCursor: string | null;
}

export interface OnboardingDecisionRequest {
  decision: OnboardingDecision;
  concurrencyToken: string;
  rejectionReason?: string;
}

export interface IntegrationClientMetadata {
  exists: boolean;
  active: boolean;
  createdAt: string;
  lastRotatedAt: string | null;
  apiBaseUrl: string;
  tokenUrl: string;
}

export interface IntegrationClientCredentialOnce {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  tokenUrl: string;
  displayedOnce: true;
}

export interface IntegrationClientRotationOtpChallenge {
  challengeId: string;
  expiresAt: string;
}

/** Merchant rotation: send `{}`. FI rotation: send `{ otpChallengeId, otpCode }`. */
export type IntegrationClientRotateRequest = Record<string, never> | { otpChallengeId: string; otpCode: string };

export interface IntegrationClientRotationRequestMetadata {
  requestId: string;
  integrationClientId: string;
  accountId: string;
  requestedByUserId: string;
  status: RotationRequestStatus;
  requestedAt: string;
  makerUserId: string | null;
  makerSubmittedAt: string | null;
  checkerUserId: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
}

export interface IntegrationClientRotationRequestPage {
  items: IntegrationClientRotationRequestMetadata[];
  nextCursor: string | null;
}

export interface IntegrationClientRotationDecisionRequest {
  decision: OnboardingDecision;
  rejectionReason?: string;
}

export interface IntegrationClientRotationDecisionResult {
  request: IntegrationClientRotationRequestMetadata;
  clientId?: string;
  clientSecret?: string;
  apiBaseUrl?: string;
  tokenUrl?: string;
  displayedOnce?: true;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId: string;
  errors?: Record<string, string[]>;
}

export interface PagedQuery {
  pageSize?: number;
  cursor?: string;
}

export interface ErpChoice {
  erpSystemId: string;
  systemName: string;
}

export interface ErpChoicePage {
  items: ErpChoice[];
  nextCursor: string | null;
}

export interface ErpSystemDetails {
  erpSystemId: string;
  systemName: string;
  providerCompanyName: string;
  contact: ContactDetails;
  contractDate: string | null;
  expiryDate: string | null;
  isApproved: boolean;
  isLegacyIncomplete: boolean;
  createdAt: string;
  updatedAt: string;
  concurrencyToken: string;
}

export interface ErpSystemDetailsPage {
  items: ErpSystemDetails[];
  nextCursor: string | null;
}

/** Flat submission body for both creation (POST /erp-systems/requests) and update
 * (POST /erp-systems/{id}/requests, which additionally needs the ERP record's concurrencyToken). */
export interface ErpSystemRequestBody {
  systemName: string;
  providerCompanyName: string;
  contactPersonName: string;
  contactEmail: string;
  contractDate: string;
  expiryDate: string;
}

export interface ErpSystemUpdateRequestBody extends ErpSystemRequestBody {
  concurrencyToken: string;
}

export type ErpChangeKind = 'creation' | 'update';
/** Unlike onboarding/rotation requests, ERP requests have no maker-submit step at all —
 * creation/update itself lands directly in pendingChecker (guide §9.3), so there is no
 * `awaitingMaker` state here. */
export type ErpRequestStatus = 'pendingChecker' | 'approved' | 'rejected';

export interface ErpSystemChangeRequest {
  requestId: string;
  erpSystemId: string | null;
  changeKind: ErpChangeKind;
  requested: {
    systemName: string;
    providerCompanyName: string;
    contact: ContactDetails;
    contractDate: string;
    expiryDate: string;
  };
  status: ErpRequestStatus;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  concurrencyToken: string;
}

export interface ErpSystemChangeRequestPage {
  items: ErpSystemChangeRequest[];
  nextCursor: string | null;
}

// --- Platform Operator administration --------------------------------------

export type PlatformOperatorStatus = 'pendingActivation' | 'active' | 'suspended' | 'disabled';

/** No email/name field exists on this resource at all — the real API only ever
 * identifies an operator by userId (guide v3.0 §10). The UI can't show a directory
 * of human-readable operator names; it can only show role/status/permissions per id. */
export interface PlatformOperatorDetails {
  userId: string;
  role: PlatformOperatorRole;
  status: PlatformOperatorStatus;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  concurrencyToken: string;
}

export interface PlatformOperatorPage {
  items: PlatformOperatorDetails[];
  nextCursor: string | null;
}

export type PlatformOperatorChangeType = 'invitation' | 'role' | 'permissions' | 'suspension' | 'reactivation';
/** Distinct from `ApplicationStatus`/`ErpRequestStatus` — invitations alone go through
 * `applying`/`pendingAcceptance`/`applied`/`applicationFailed` states that nothing else has. */
export type PlatformOperatorChangeStatus =
  | 'awaitingMaker'
  | 'pendingChecker'
  | 'applying'
  | 'pendingAcceptance'
  | 'applied'
  | 'rejected'
  | 'applicationFailed';

export interface PlatformOperatorChangeDetails {
  requestId: string;
  changeType: PlatformOperatorChangeType;
  targetUserId: string | null;
  requestedRole: PlatformOperatorRole | null;
  permissions: string[];
  status: PlatformOperatorChangeStatus;
  createdAt: string;
  updatedAt: string;
  makerSubmittedAt: string | null;
  decidedAt: string | null;
  completedAt: string | null;
  concurrencyToken: string | null;
}

export interface PlatformOperatorChangePage {
  items: PlatformOperatorChangeDetails[];
  nextCursor: string | null;
}

export interface PlatformOperatorInvitationRequest {
  email: string;
  role: PlatformOperatorRole;
  permissions: string[];
}

export interface PlatformOperatorChangeInput {
  changeType: 'role' | 'permissions' | 'suspension' | 'reactivation';
  concurrencyToken: string;
  role?: PlatformOperatorRole;
  permissions?: string[];
}

export interface PlatformOperatorPermissionCatalog {
  permissions: string[];
}

export interface PlatformOperatorInvitationAcceptanceRequest {
  invitationSecret: string;
  password: string;
}

// --- Merchant / Financial Institution profiles ------------------------------

export interface MerchantProfileResponse {
  merchantId: string;
  legalName: string;
  commercialRegistrationNumber: string;
  contact: ContactDetails;
  erpSystem: ErpChoice;
  updatedAt: string;
  concurrencyToken: string;
}

export interface MerchantProfileUpdateRequest {
  legalName: string;
  commercialRegistrationNumber: string;
  contact: ContactRequest;
  erpSystemId: string;
  concurrencyToken: string;
}

export interface FinancialInstitutionSelfProfileResponse {
  financialInstitutionId: string;
  legalName: string;
  institutionType: PlatformInstitutionType;
  cbyLicenceNumber: string;
  contract: FinancialInstitutionContractDetails;
  contact: ContactDetails;
  updatedAt: string;
  concurrencyToken: string;
}

export interface FinancialInstitutionContactUpdateRequest {
  contact: ContactRequest;
  concurrencyToken: string;
}

/** The Platform-side view of an FI's profile — same fields as the FI's own self-view, plus
 * `governedConcurrencyToken`, the token that gates Platform-initiated governed changes (see
 * `GovernedProfileChangeRequestBody` below). */
export interface FinancialInstitutionProfileResponse extends FinancialInstitutionSelfProfileResponse {
  governedConcurrencyToken: string;
}

export type GovernedProfileChangeStatus = 'pendingChecker' | 'approved' | 'rejected';

export interface GovernedProfileChangeRequestBody {
  legalName: string;
  institutionType: PlatformInstitutionType;
  cbyLicenceNumber: string;
  contract: FinancialInstitutionContractRequest;
  /** Despite the field name, the real backend validates this against the FI profile's
   * `governedConcurrencyToken` — a distinct value from the FI's own plain `concurrencyToken`
   * (guide v3.0 §11.4's "two-token" governed-change model). Passing the wrong one is a 409. */
  concurrencyToken: string;
}

export interface GovernedProfileChangeResponse {
  requestId: string;
  financialInstitutionId: string;
  legalName: string;
  institutionType: PlatformInstitutionType;
  cbyLicenceNumber: string;
  contract: FinancialInstitutionContractDetails;
  status: GovernedProfileChangeStatus;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  concurrencyToken: string | null;
}

export interface GovernedProfileChangePage {
  items: GovernedProfileChangeResponse[];
  nextCursor: string | null;
}

// --- Payment points -----------------------------------------------------------
// No list/GET-by-id endpoint exists at all (confirmed in the live OpenAPI spec) — only create
// and the FI's decide action. A Merchant gets the created record's `id` from the create
// response; there is no other way to look one up later.

export interface CreatePaymentPointRequest {
  financialInstitutionId: string;
  pointNumber: string;
}

export type PaymentPointStatus = 'pendingFinancialInstitution' | 'approved' | 'rejected' | 'disabled';

export interface PaymentPoint {
  id: string;
  merchantId: string;
  financialInstitutionId: string;
  pointNumber: string;
  status: PaymentPointStatus;
  rejectionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** No `concurrencyToken` at all — unlike every other decision request in this API. */
export interface PaymentPointDecisionRequest {
  decision: OnboardingDecision;
  rejectionReason?: string | null;
}
