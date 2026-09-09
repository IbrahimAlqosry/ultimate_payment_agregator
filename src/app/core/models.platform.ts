/**
 * Types for the real Payment Aggregator backend (see docs/PaymentAggregator-UI-Integration-Guide-v2.md
 * and the live OpenAPI spec). Kept separate from `core/models.ts`'s mock-shaped types — the concepts
 * don't line up 1:1 (e.g. application `status` here is a 5-state machine, not the mock's 3-state one).
 */

export type PlatformAudience = 'operator' | 'merchant' | 'institution';
export type PlatformOperatorRole = 'admin' | 'maker' | 'checker' | 'reader';

export type ApplicationStatus = 'awaitingMaker' | 'pendingChecker' | 'provisioning' | 'active' | 'rejected';
export type ApplicationOrigin = 'selfService' | 'platformAssisted';
export type OnboardingDecision = 'approved' | 'rejected';
export type RotationRequestStatus = 'awaitingMaker' | 'pendingChecker' | 'approved' | 'rejected';
export type PlatformInstitutionType = 'bank' | 'wallet';

export interface OtpChallengeResponse {
  challengeId: string;
  expiresAt: string;
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
