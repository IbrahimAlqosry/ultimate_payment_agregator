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
  /** Live-verified via `/auth/me` against the real backend (guide v4.0 §15): Maker carries
   * `.submit`, Admin carries `.decide`, both carry `.read` — same maker-checker shape as every
   * other entity here, despite the API path itself being `notification-endpoint-configurations`. */
  NotificationEndpointsSubmit: 'platform.notification-endpoints.submit',
  NotificationEndpointsDecide: 'platform.notification-endpoints.decide',
  NotificationEndpointsRead: 'platform.notification-endpoints.read',
  /** Guide v5.0 §16 — direct Checker/Admin actions, not a maker-submit/decide pair. */
  NotificationDeliveriesRead: 'platform.notification-deliveries.read',
  NotificationDeliveriesRemediate: 'platform.notification-deliveries.remediate',
  NotificationDeliveriesReplay: 'platform.notification-deliveries.replay',
  /** Guide v5.0 §17 — read-only. */
  AuditRead: 'platform.audit.read',
  /** Guide v6.0 §7.2 — separate from the ordinary onboarding grants. Gates the Platform
   * "request a replacement first-time password" recovery action for an already-`active`
   * assisted Merchant/FI whose user never completed first-time setup (expired/failed
   * credential). Maker submits, a different Checker/Admin decides, Reader can only view. */
  MerchantBootstrapReissueSubmit: 'platform.merchant-bootstrap-reissue.submit',
  MerchantBootstrapReissueDecide: 'platform.merchant-bootstrap-reissue.decide',
  MerchantBootstrapReissueRead: 'platform.merchant-bootstrap-reissue.read',
  FinancialInstitutionBootstrapReissueSubmit: 'platform.financial-institution-bootstrap-reissue.submit',
  FinancialInstitutionBootstrapReissueDecide: 'platform.financial-institution-bootstrap-reissue.decide',
  FinancialInstitutionBootstrapReissueRead: 'platform.financial-institution-bootstrap-reissue.read',
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

/** `POST /auth/password/change` — any authenticated portal session (Platform/Merchant/FI).
 * Success revokes the current session (the server expires `__Host-pa-session` in the response),
 * so the UI must treat a `204` here as an implicit logout, not just a form reset. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
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

/** Guide v6.0 §8.1: both list rows and direct detail now carry `email`. List scope still
 * differs by the caller's own role — Admin sees operators across every Platform account, while
 * Maker/Checker/Reader still see only their own account's operators (same as before) — but
 * direct `GET /operators/{userId}` remains scoped to the caller's own account even for Admin, so
 * an Admin can see a cross-account row in the list yet get 404 opening its detail. */
export interface PlatformOperatorDetails {
  userId: string;
  email: string;
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
// Guide v6.0 §12: the FI now has a real pending-approval queue (`GET
// /payment-points/pending-approval`) and the Merchant now has a real FI directory (`GET
// /financial-institutions/choices`). There is STILL no general list/GET-by-id, no Merchant
// own-point list, and no FI "all points" (approved/rejected history) endpoint — those gaps
// remain and stay on mock data. A Merchant otherwise gets the created record's `id` from the
// create response only.

export interface FinancialInstitutionChoice {
  financialInstitutionId: string;
  legalName: string;
  institutionType: PlatformInstitutionType;
}

export interface FinancialInstitutionChoicePage {
  items: FinancialInstitutionChoice[];
  nextCursor: string | null;
}

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

/** `GET /payment-points/pending-approval` (FI session) — only ever `pendingFinancialInstitution`
 * rows for the signed-in FI, ordered by pointNumber then id ascending. A cursor is only valid
 * while its row is still pending for this FI, so restart from page one after any decision. */
export interface PaymentPointPage {
  items: PaymentPoint[];
  nextCursor: string | null;
}

/** No `concurrencyToken` at all — unlike every other decision request in this API. */
export interface PaymentPointDecisionRequest {
  decision: OnboardingDecision;
  rejectionReason?: string | null;
}

// --- Merchant payment inquiry (guide v4.0 §13) --------------------------------

export interface PaymentInquiryRequest {
  financialInstitutionId: string;
  transactionId: string;
}

export type TransactionStatus = '00002' | '00007';
export type PaymentMatchStatus =
  | 'unmatched'
  | 'matchedByTransactionId'
  | 'matchedByNotificationTap'
  | 'conflict';
export type PaymentCurrency = 'USD' | 'SAR' | 'YER';

export interface PaymentInquiryResponse {
  financialInstitutionId: string;
  transactionId: string;
  /** '00002' = Paid, '00007' = Refunded — kept as a string, not parsed into a boolean/enum, per
   * the guide: treat unrecognized codes defensively rather than assuming only these two exist. */
  transactionStatus: TransactionStatus;
  transactionDate: string;
  amount: number;
  currency: PaymentCurrency;
  pointNumber: string;
  matchStatus: PaymentMatchStatus;
}

// --- Merchant payment matching (guide v4.0 §14) -------------------------------
// Two actions (by-transaction-id, by-notification-tap) share the same request/response shape and
// validation. Every attempt needs one Idempotency-Key header — a real, load-bearing retry key,
// not decoration — see PlatformApi.matchByTransactionId/matchByNotificationTap.

export interface PaymentMatchRequest {
  financialInstitutionId: string;
  transactionId: string;
  invoiceReference: string;
  expectedAmount: number;
  currency: PaymentCurrency;
}

export type PaymentMatchMethod = 'transactionId' | 'notificationTap';
export type PaymentMatchOutcome = 'matched' | 'conflict';
/** A conflict is a normal, expected HTTP 200 business outcome, not an error — see
 * PaymentMatchResponse's own doc comment. */
export type PaymentMatchConflictKind = 'amount' | 'reference' | 'duplicate' | 'noNotification' | null;

/** HTTP 200 does not mean "matched" — always check `outcome` first. A `conflict` outcome is a
 * normal business result the UI must render as a conflict, not a thrown error (guide §14.3). */
export interface PaymentMatchResponse {
  method: PaymentMatchMethod;
  outcome: PaymentMatchOutcome;
  conflictKind: PaymentMatchConflictKind;
  recordedAt: string;
  matchedAt: string | null;
}

// --- Merchant notification settings + Platform review (guide v4.0 §15) -------

export type CallbackAuthenticationMode = 'basic' | 'oauth2ClientCredentials' | 'customHeader' | 'staticBearerJwt';

export interface BasicCallbackAuthentication {
  mode: 'basic';
  username: string;
  password: string;
}

export interface OAuth2CallbackAuthentication {
  mode: 'oauth2ClientCredentials';
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}

export interface CustomHeaderCallbackAuthentication {
  mode: 'customHeader';
  headerName: string;
  headerValue: string;
}

export interface StaticBearerJwtCallbackAuthentication {
  mode: 'staticBearerJwt';
  token: string;
}

/** A discriminated union on `mode` — send exactly the fields for the selected mode, nothing
 * else. There is no "none" mode. */
export type CallbackAuthenticationRequest =
  | BasicCallbackAuthentication
  | OAuth2CallbackAuthentication
  | CustomHeaderCallbackAuthentication
  | StaticBearerJwtCallbackAuthentication;

export type NotificationConfigurationStatus = 'awaitingMaker' | 'pendingChecker' | 'approved' | 'rejected';

export interface NotificationEndpointConfigurationInput {
  callbackUrl: string;
  authentication: CallbackAuthenticationRequest;
}

/** GET /notification-endpoint-configurations (Merchant) — the latest *submitted* version, which
 * may not be the active one. Never carries any authentication secret back — GET cannot recover
 * what was entered, by design (guide §15.1). */
export interface NotificationEndpointConfigurationMetadata {
  configurationId: string;
  version: number;
  callbackUrl: string;
  authenticationMode: CallbackAuthenticationMode;
  status: NotificationConfigurationStatus;
  isActive: boolean;
  isVerified: boolean;
  approvalRequired: boolean;
  createdAt: string;
  staticJwtExpiresAt: string | null;
}

/** The Platform review shape — same 10 Merchant-visible fields plus 7 approval fields. Still no
 * Merchant identity and no authentication values (guide §15.5). */
export interface NotificationEndpointConfigurationReview extends NotificationEndpointConfigurationMetadata {
  approvalRequestId: string | null;
  makerSubmittedAt: string | null;
  makerVerifiedAt: string | null;
  activationVerifiedAt: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  concurrencyToken: string | null;
}

export interface NotificationEndpointConfigurationReviewPage {
  items: NotificationEndpointConfigurationReview[];
  /** Opaque 27-character string, NOT a UUID like every other cursor in this API — omit on the
   * first page rather than sending an empty string (guide §15.5). */
  nextCursor: string | null;
}

export interface NotificationEndpointConfigurationDecisionRequest {
  decision: OnboardingDecision;
  concurrencyToken: string;
  rejectionReason?: string;
}

// --- Platform delivery recovery and replay (guide v5.0 §16) ------------------
// Reads need `.read`; remediation/replay are direct Checker/Admin actions gated by their own
// permission — there is no separate maker-submit step here, unlike every other entity in this file.

export type NotificationDeliveryState =
  | 'authenticationPaused'
  | 'deadLettered'
  | 'replayPending'
  | 'processing'
  | 'retryPublishing'
  | 'retryScheduled'
  | 'deadLetterPublishing'
  | 'succeeded'
  | 'permanentlyFailed';

/** The attention list (§16.1) only ever returns `authenticationPaused`/`deadLettered` rows; the
 * other states can appear when reading a specific delivery (e.g. a replay) by ID. */
export type DeliveryAttentionState = 'authenticationPaused' | 'deadLettered';

export type DeliveryFailureClass =
  | 'none'
  | 'callbackAuthentication'
  | 'oauthAuthentication'
  | 'endpointPaused'
  | 'configurationUnavailable'
  | 'destinationPolicy'
  | 'dnsFailure'
  | 'connectFailure'
  | 'tlsFailure'
  | 'networkFailure'
  | 'timeout'
  | 'http408'
  | 'http429'
  | 'http5xx'
  | 'redirectDenied'
  | 'http4xx'
  | 'protocolFailure'
  | 'dependencyUnavailable'
  | 'retryExhausted';

export type DeliveryAttemptOutcome =
  | 'interruptedUnknown'
  | 'succeeded'
  | 'authenticationFailed'
  | 'transientFailed'
  | 'permanentlyFailed';

export interface DeliveryAttempt {
  attemptId: string;
  attemptNumber: number;
  retryTier: number;
  endpointConfigurationVersion: number;
  outcome: DeliveryAttemptOutcome;
  httpStatus: number | null;
  /** 0 = no HTTP status recorded; 1-5 = the corresponding HTTP response class. */
  statusClass: number;
  failureClass: DeliveryFailureClass;
  latencyMilliseconds: number | null;
  startedAt: string;
  completedAt: string | null;
}

export type DeliveryRemediationReason = 'configurationUpdated' | 'endpointRecovered' | 'operatorVerified';

export interface DeliveryRemediation {
  remediationId: string;
  action: 'resume';
  reason: DeliveryRemediationReason;
  endpointConfigurationVersion: number;
  recordedAt: string;
}

/** Shared shape for both the attention-list rows and single-delivery detail — list rows always
 * carry `attempts: []` (not proof of no attempts; use `attemptCount` and open detail for history). */
export interface NotificationDelivery {
  deliveryId: string;
  eventId: string;
  state: NotificationDeliveryState;
  failureClass: DeliveryFailureClass;
  retryTier: number;
  attemptCount: number;
  publishedEndpointConfigurationVersion: number;
  activeEndpointConfigurationVersion: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  originalDeliveryId: string | null;
  replayDeliveryId: string | null;
  remediation: DeliveryRemediation | null;
  attempts: DeliveryAttempt[];
}

export interface NotificationDeliveryPage {
  items: NotificationDelivery[];
  /** Opaque 32-character string, NOT a UUID. */
  nextCursor: string | null;
}

export interface DeliveryRemediationRequest {
  reason: DeliveryRemediationReason;
}

export interface DeliveryReplayAcceptance {
  commandId: string;
  originalDeliveryId: string;
  deliveryId: string;
  eventId: string;
  status: 'accepted' | 'published';
  acceptedAt: string;
}

// --- Platform audit search (guide v5.0 §17) -----------------------------------

export type AuditActorKind = 'anonymous' | 'system' | 'interactiveUser' | 'integrationClient';

export type AuditAction =
  | 'passwordAuthentication'
  | 'otpAuthentication'
  | 'sessionRevocation'
  | 'approvalSubmitted'
  | 'approvalDecided'
  | 'integrationClientCreated'
  | 'integrationClientCredentialsRotated'
  | 'notificationEndpointVersionSubmitted'
  | 'notificationEndpointActivated'
  | 'paymentPointDecided'
  | 'paymentNotificationConflict'
  | 'paymentMatchingConflict'
  | 'deliveryAuthenticationPaused'
  | 'deliveryDeadLettered'
  | 'deliveryRemediated'
  | 'deliveryReplayAccepted'
  | 'deliveryReplayPublished'
  | 'deliveryReplayTerminal'
  | 'platformOperatorInvitationSubmitted'
  | 'platformOperatorChangeSubmitted'
  | 'platformOperatorChangeApplied'
  /** Guide v6.0 — system-actor event recording a successful background completion of
   * Merchant/FI onboarding once credential delivery finally succeeds. */
  | 'credentialDeliveryReconciled';

export type AuditOutcome =
  | 'succeeded'
  | 'invalid'
  | 'expiredOrReplayed'
  | 'locked'
  | 'revoked'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'conflict'
  | 'paused'
  | 'deadLettered'
  | 'accepted'
  | 'published'
  | 'permanentlyFailed';

export type AuditEntityType =
  | 'account'
  | 'interactiveUser'
  | 'otpChallenge'
  | 'portalSession'
  | 'approvalRequest'
  | 'integrationClient'
  | 'notificationEndpointConfiguration'
  | 'paymentPoint'
  | 'paymentNotification'
  | 'paymentMatchCommand'
  | 'notificationDelivery'
  | 'platformOperatorInvitation'
  | 'platformOperatorChange';

export type AuditMetadataStatus = 'pending' | 'active' | 'suspended' | 'reactivated' | 'processing' | 'succeeded' | 'failed';

export type AuditReasonClass =
  | 'credentials'
  | 'otpInvalid'
  | 'otpExpiredOrReplayed'
  | 'attemptLimit'
  | 'logout'
  | 'passwordReset'
  | 'accountSuspended'
  | 'userSuspended'
  | 'roleChanged'
  | 'permissionsChanged'
  | 'securityStampRotated'
  | 'duplicatePayload'
  | 'amountConflict'
  | 'referenceConflict'
  | 'duplicateMatch'
  | 'missingNotification'
  | 'endpointAuthentication'
  | 'retryExhausted'
  | 'configurationUpdated'
  | 'endpointRecovered'
  | 'operatorVerified';

export type AuditHttpStatusClass = '1xx' | '2xx' | '3xx' | '4xx' | '5xx';

export type AuditWorkflow =
  | 'merchantOnboarding'
  | 'financialInstitutionOnboarding'
  | 'platformOperator'
  | 'erpSystem'
  | 'governedProfile'
  | 'integrationClient'
  | 'notificationEndpointConfiguration';

/** When present, all six keys are present and each value can independently be null. */
export interface AuditEventMetadata {
  status: AuditMetadataStatus | null;
  reasonClass: AuditReasonClass | null;
  version: number | null;
  retryTier: number | null;
  httpStatusClass: AuditHttpStatusClass | null;
  workflow: AuditWorkflow | null;
}

export interface AuditEvent {
  auditEventId: string;
  actorKind: AuditActorKind;
  actorSubjectId: string | null;
  affectedAccountId: string | null;
  action: AuditAction;
  entityType: AuditEntityType | null;
  entityReference: string | null;
  occurredAt: string;
  outcome: AuditOutcome;
  /** Safe support reference, 1-64 chars; not necessarily a distributed trace ID. */
  correlationId: string | null;
  metadata: AuditEventMetadata | null;
}

export interface AuditEventPage {
  items: AuditEvent[];
  /** Opaque 32-character string, NOT a UUID. */
  nextCursor: string | null;
}

export interface AuditSearchQuery {
  accountId?: string;
  action?: AuditAction;
  outcome?: AuditOutcome;
  entityType?: AuditEntityType;
  entityReference?: string;
  correlationId?: string;
  /** UTC timestamps with explicit zero offset; `from` inclusive, `to` exclusive, `from` < `to`. */
  from?: string;
  to?: string;
  pageSize?: number;
  cursor?: string;
}

// --- First-time credential reissue (guide v6.0 §7.2-7.4) ----------------------
// New this version: first-time Merchant/FI passwords now have a fixed 24-hour lifetime. This
// is the Platform recovery flow for an already-`active` application whose user never completed
// first-time setup because their credential expired, failed to deliver, or exhausted delivery
// attempts — a Maker submits, a different Checker/Admin decides, using separate
// `platform.{merchant,financial-institution}-bootstrap-reissue.*` grants (not the ordinary
// onboarding grants). Eligibility is checked server-side only — there is no eligibility/
// delivery-status GET, so a `409` on submit just means "not eligible right now."

export type BootstrapReissueStatus = 'pendingChecker' | 'approved' | 'rejected';

/** Shared shape for both Merchant and FI reissue requests — same 9 fields either way. */
export interface BootstrapReissueDetails {
  requestId: string;
  applicationId: string;
  accountId: string;
  userId: string;
  expectedGeneration: number;
  status: BootstrapReissueStatus;
  submittedAt: string;
  updatedAt: string;
  decidedAt: string | null;
  concurrencyToken: string;
}

export interface BootstrapReissuePage {
  items: BootstrapReissueDetails[];
  nextCursor: string | null;
}
