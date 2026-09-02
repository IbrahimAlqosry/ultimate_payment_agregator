export type OperatorRole = 'admin' | 'maker' | 'checker' | 'reader';
export type Audience = 'operator' | 'merchant' | 'institution';
export type UserRole = OperatorRole | 'merchant' | 'institution';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type InstitutionType = 'bank' | 'wallet';
export type CurrencyCode = 'USD' | 'SAR' | 'YER';
export type PointKind = 'wallet' | 'merchant_point';
export type PointStatus = 'pending' | 'approved' | 'rejected';
export type IntegrationStatus = 'active' | 'pending' | 'inactive';
export type NotificationDeliveryStatus = 'completed' | 'pending' | 'failed';
export type RequestKind = 'merchant' | 'institution' | 'erp';
export type ApprovalEntity = 'merchant' | 'institution' | 'erp' | 'point' | 'integration';
export type PointScope = 'all' | 'mine' | 'institution' | 'pending';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  audience: Audience;
  role: UserRole;
  avatarInitials: string;
  jobTitleKey: string;
  orgName?: string;
  orgId?: string;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: OperatorRole;
  city: string;
  status: 'active' | 'invited';
  lastActive: string;
}

export interface Merchant {
  id: string;
  legalName: string;
  crNumber: string;
  city: string;
  erpSystem: string;
  status: ApprovalStatus;
  paymentPointCount: number;
  onboardedAt: string;
  industry: string;
  contactName: string;
  email: string;
  phone: string;
  submittedBy: string;
}

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  cbyLicense: string;
  contractRef: string;
  city: string;
  status: ApprovalStatus;
  contractExpiry: string;
  contactName: string;
  email: string;
  phone: string;
  contractStart?: string;
  signedDate?: string;
  feePerRequest?: number;
  autoRenewal?: boolean;
  terminationRequested?: boolean;
  terminationNoticeDate?: string;
  regulatoryAuthority?: string;
  swiftCode?: string;
  department?: string;
}

export interface PaymentPoint {
  id: string;
  pointCode: string;
  kind: PointKind;
  merchantName: string;
  institutionName: string;
  institutionType: InstitutionType;
  currency: CurrencyCode;
  status: PointStatus;
  submittedAt: string;
  merchantCr: string;
  submittedBy: string;
  erpSystem: string;
  linkedAccount: string;
  actionedAt?: string;
  actionedBy?: string;
}

export interface ErpSystem {
  id: string;
  name: string;
  vendor: string;
  status: ApprovalStatus;
  connectedMerchants: number;
  lastSync: string;
  contractDate?: string;
  contractExpiry: string;
  contactName: string;
  email: string;
}

export interface IntegrationRequest {
  id: string;
  requester: string;
  organization: string;
  kind: RequestKind;
  email: string;
  status: ApprovalStatus;
  submittedAt: string;
}

export type WebhookAuthType = 'bearer' | 'oauth2';

export interface NotificationWebhook {
  status: ApprovalStatus;
  endpointUrl: string;
  port: string;
  authType: WebhookAuthType;
  username: string;
  password: string;
  accessToken: string;
}

export interface IntegrationCredentials {
  status: IntegrationStatus;
  username: string;
  password: string;
  apiUrl: string;
  port: string;
}

export interface IntegrationUser {
  id: string;
  username: string;
  organization: string;
  audience: Audience;
  status: IntegrationStatus;
  lastUsed: string;
  scopes: string;
}

export interface PaymentNotification {
  id: string;
  occurredAt: string;
  pointCode: string;
  merchantName: string;
  institutionName: string;
  amount: number;
  currency: CurrencyCode;
  invoice: string;
  status: NotificationDeliveryStatus;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  detail: string;
}

export interface MerchantAccountDetails {
  businessName: string;
  crNumber: string;
  erpSystem: string;
  address: string;
  officePhone: string;
  businessEmail: string;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
}

export interface OperatorAccountDetails {
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface AccountProfile {
  name: string;
  email: string;
  jobTitleKey: string;
  audience: Audience;
  role: UserRole;
  orgName?: string;
  city: string;
  phone: string;
  merchant?: MerchantAccountDetails;
  operator?: OperatorAccountDetails;
}

export interface PasswordChange {
  current: string;
  next: string;
  confirm: string;
}

export interface InstitutionContactUpdate {
  contactName: string;
  jobTitle: string;
  department: string;
  phone: string;
  email: string;
}

export type ActivityStatus = 'completed' | 'delivered' | 'rejected' | 'pending';

export interface DashboardActivity {
  id: string;
  at: string;
  activityKey: string;
  merchant: string;
  status: ActivityStatus;
}

export interface DashboardPayload {
  audience: Audience;
  slaRate: number;
  slaOnTimeCount: number;
  slaOverdueCount: number;
  slaApprovedCount: number;
  slaTotalCount: number;
  pendingMerchantApprovals: number;
  pendingFiApprovals: number;
  pendingErpApprovals: number;
  activeMerchants: number;
  weeklyActivity: number[];
  pendingPoints: PaymentPoint[];
  pendingMerchants: Merchant[];
  activePaymentPoints: number;
  pendingPaymentPoints: number;
  integrationUserStatus: IntegrationStatus;
  notificationUserStatus: ApprovalStatus;
  recentNotifications: PaymentNotification[];
  pendingPpApprovals: number;
  approvedPaymentPoints: number;
  notificationsThisMonth: number;
  recentActivity: DashboardActivity[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface OtpStartResponse {
  challengeId: string;
  email: string;
}

export interface MerchantSignup {
  legalName: string;
  contactName: string;
  crNumber: string;
  email: string;
  industry: string;
  phone: string;
  city: string;
  erpSystem: string;
  password: string;
}

export interface MerchantDraft {
  legalName: string;
  contactName: string;
  crNumber: string;
  email: string;
  industry: string;
  phone: string;
  city: string;
  erpSystem: string;
}

export interface InstitutionDraft {
  name: string;
  type: InstitutionType;
  cbyLicense: string;
  contractRef: string;
  city?: string;
  signedDate?: string;
  contractExpiry: string;
  feePerRequest?: number | string;
  autoRenewal?: boolean;
  terminationRequested?: boolean;
  terminationNoticeDate?: string;
  contactName: string;
  email: string;
  phone: string;
}

export interface ErpDraft {
  name: string;
  vendor: string;
  contactName: string;
  email: string;
  contractDate?: string;
  contractExpiry: string;
}

export interface OperatorDraft {
  name: string;
  email: string;
  role: OperatorRole;
}

export interface PaymentPointDraft {
  institutionName: string;
  pointCode: string;
  kind: PointKind;
}

export interface ApprovalRequest {
  entity: ApprovalEntity;
  id: string;
  decision: 'approved' | 'rejected';
}

export type { ApiError } from './http/http-error';
