import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { environment } from '@env/environment';
import { canApprove, canManageOperators, canMutate } from '@core/auth/access';
import { decodeJwtPayload } from '@core/auth/jwt';
import {
  ApprovalRequest,
  AuthUser,
  ErpDraft,
  InstitutionDraft,
  InstitutionType,
  IntegrationCredentials,
  LoginResponse,
  MerchantDraft,
  MerchantSignup,
  NotificationWebhook,
  OperatorDraft,
  OperatorRole,
  OtpStartResponse,
  PasswordChange,
  PaymentPointDraft,
  PointKind,
  InstitutionContactUpdate,
  MerchantAccountDetails,
} from '@core/models';
import { Observable, throwError, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { apiUrl, isApiRequest, requestPath } from './api-url';
import {
  AUDIT_LOG,
  buildDashboard,
  DEMO_ACCOUNTS,
  CREDENTIALS,
  ERPS,
  INSTITUTIONS,
  INTEGRATION_REQUESTS,
  INTEGRATION_USERS,
  MERCHANTS,
  MERCHANT_WEBHOOK,
  OPERATORS,
  PAYMENT_POINTS,
  profileFor,
  scopedNotifications,
  scopedPoints,
} from './mock-data';

const LATENCY_MS = 380;
const OTP_CODE = '123456';
const loginFailures = new Map<string, number>();
const otpChallenges = new Map<string, { email: string; userId: string; exp: number }>();
const webhookStore: NotificationWebhook = { ...MERCHANT_WEBHOOK };
const credentialStore: Record<string, IntegrationCredentials> = {
  'Al-Amal Pharmacies': { ...CREDENTIALS['Al-Amal Pharmacies'] },
  'Tadhamon Bank': { ...CREDENTIALS['Tadhamon Bank'] },
};
const profileStore = new Map<string, ReturnType<typeof profileFor>>();

function currentProfile(user: AuthUser) {
  const existing = profileStore.get(user.id);
  if (existing) {
    return existing;
  }
  const created = profileFor(user);
  profileStore.set(user.id, created);
  return created;
}

function encodeJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  return `${toBase64Url(header)}.${toBase64Url(payload)}.${toBase64Url({ mock: true, v: 1 })}`;
}

function toBase64Url(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return btoa(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function session(req: HttpRequest<unknown>): AuthUser | null {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const payload = decodeJwtPayload<{
    sub: string;
    email: string;
    name: string;
    audience: AuthUser['audience'];
    role: AuthUser['role'];
    initials: string;
    jobTitleKey: string;
    orgName?: string;
    orgId?: string;
    exp?: number;
  }>(header.slice(7));
  if (!payload || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    return null;
  }
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    audience: payload.audience,
    role: payload.role,
    avatarInitials: payload.initials,
    jobTitleKey: payload.jobTitleKey,
    orgName: payload.orgName,
    orgId: payload.orgId,
  };
}

function ok<T>(body: T, status = 200): Observable<HttpEvent<T>> {
  return timer(LATENCY_MS).pipe(map(() => new HttpResponse({ status, body })));
}

function fail(status: number, message: string): Observable<HttpEvent<unknown>> {
  return timer(LATENCY_MS).pipe(
    switchMap(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status,
            statusText: message,
            error: { message },
          }),
      ),
    ),
  );
}

function query(req: HttpRequest<unknown>, key: string): string {
  return (req.params.get(key) ?? '').trim().toLowerCase();
}

function matches(haystack: string[], needle: string): boolean {
  if (!needle) {
    return true;
  }
  return haystack.join(' ').toLowerCase().includes(needle);
}

function resourceId(path: string, collection: string): string | null {
  const base = apiUrl(`/${collection}`);
  if (path === base || !path.startsWith(`${base}/`)) {
    return null;
  }
  return decodeURIComponent(path.slice(base.length + 1));
}

function audit(user: AuthUser, action: string, entity: string, detail: string): void {
  AUDIT_LOG.unshift({
    id: `a-${Date.now()}`,
    at: new Date().toISOString(),
    actor: user.name,
    role: user.role,
    action,
    entity,
    detail,
  });
}

/**
 * In-memory fake backend. Gated by `environment.useMockApi`.
 * Drop this interceptor (or set `useMockApi: false`) when a real API is ready;
 * auth + `AtlasApi` already speak HTTP against `environment.apiUrl`.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockApi || !isApiRequest(req.url)) {
    return next(req);
  }

  const path = requestPath(req.url);

  if (req.method === 'POST' && path === apiUrl('/auth/login')) {
    const body = req.body as { email?: string; password?: string; audience?: string };
    const email = body.email?.trim().toLowerCase() ?? '';
    if ((loginFailures.get(email) ?? 0) >= 10) {
      return fail(423, 'ACCOUNT_LOCKED');
    }
    const account = DEMO_ACCOUNTS.find(
      (entry) =>
        entry.email.toLowerCase() === email &&
        entry.password === body.password &&
        entry.audience === body.audience,
    );
    if (!account) {
      loginFailures.set(email, (loginFailures.get(email) ?? 0) + 1);
      if ((loginFailures.get(email) ?? 0) >= 10) {
        return fail(423, 'ACCOUNT_LOCKED');
      }
      return fail(401, 'INVALID_CREDENTIALS');
    }
    loginFailures.delete(email);
    const challengeId = `otp-${account.user.id}-${Date.now()}`;
    otpChallenges.set(challengeId, {
      email: account.user.email,
      userId: account.user.id,
      exp: Date.now() + 5 * 60 * 1000,
    });
    const response: OtpStartResponse = { challengeId, email: account.user.email };
    return ok(response);
  }

  if (req.method === 'POST' && path === apiUrl('/auth/otp/resend')) {
    const body = req.body as { challengeId?: string };
    const current = body.challengeId ? otpChallenges.get(body.challengeId) : undefined;
    if (!current) {
      return fail(401, 'INVALID_CHALLENGE');
    }
    const challengeId = `otp-${current.userId}-${Date.now()}`;
    otpChallenges.delete(body.challengeId ?? '');
    otpChallenges.set(challengeId, { ...current, exp: Date.now() + 5 * 60 * 1000 });
    return ok<OtpStartResponse>({ challengeId, email: current.email });
  }

  if (req.method === 'POST' && path === apiUrl('/auth/otp')) {
    const body = req.body as { challengeId?: string; code?: string };
    const challenge = body.challengeId ? otpChallenges.get(body.challengeId) : undefined;
    if (!challenge || challenge.exp < Date.now()) {
      return fail(401, 'INVALID_CHALLENGE');
    }
    if (body.code !== OTP_CODE) {
      return fail(401, 'INVALID_OTP');
    }
    const account = DEMO_ACCOUNTS.find((entry) => entry.user.id === challenge.userId);
    if (!account) {
      return fail(401, 'INVALID_CHALLENGE');
    }
    otpChallenges.delete(body.challengeId ?? '');
    const now = Math.floor(Date.now() / 1000);
    const token = encodeJwt({
      sub: account.user.id,
      email: account.user.email,
      name: account.user.name,
      audience: account.user.audience,
      role: account.user.role,
      initials: account.user.avatarInitials,
      jobTitleKey: account.user.jobTitleKey,
      orgName: account.user.orgName,
      orgId: account.user.orgId,
      iat: now,
      exp: now + 60 * 60 * 12,
    });
    const response: LoginResponse = { token, user: account.user };
    return ok(response);
  }

  if (req.method === 'POST' && path === apiUrl('/auth/forgot')) {
    return ok({ sent: true });
  }

  if (req.method === 'POST' && path === apiUrl('/auth/register')) {
    const body = req.body as MerchantSignup;
    MERCHANTS.unshift({
      id: `m-${Date.now()}`,
      legalName: body.legalName,
      crNumber: body.crNumber,
      city: body.city,
      erpSystem: body.erpSystem,
      status: 'pending',
      paymentPointCount: 0,
      onboardedAt: new Date().toISOString(),
      industry: body.industry,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      submittedBy: body.contactName,
    });
    return ok({ pending: true }, 201);
  }

  const user = session(req);
  if (!user) {
    return fail(401, 'UNAUTHORIZED');
  }

  if (req.method === 'GET' && path === apiUrl('/simulate/401')) {
    return fail(401, 'UNAUTHORIZED');
  }
  if (req.method === 'GET' && path === apiUrl('/simulate/404')) {
    return fail(404, 'NOT_FOUND');
  }
  if (req.method === 'GET' && path === apiUrl('/simulate/501')) {
    return fail(501, 'NOT_IMPLEMENTED');
  }
  if (req.method === 'GET' && path === apiUrl('/simulate/503')) {
    return fail(503, 'SERVICE_UNAVAILABLE');
  }

  if (req.method === 'GET' && path === apiUrl('/dashboard')) {
    return ok(buildDashboard(user));
  }

  if (req.method === 'GET' && path === apiUrl('/profile')) {
    return ok(currentProfile(user));
  }

  if (req.method === 'PUT' && path === apiUrl('/profile/merchant')) {
    if (user.audience !== 'merchant' || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const body = req.body as MerchantAccountDetails;
    const next = currentProfile(user);
    next.merchant = { ...body };
    next.name = body.contactName || next.name;
    next.phone = body.contactPhone || next.phone;
    profileStore.set(user.id, next);
    return ok(next);
  }

  if (req.method === 'PUT' && path === apiUrl('/profile/operator')) {
    if (user.audience !== 'operator' || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const body = req.body as { name: string; phone: string; emailNotifications: boolean; smsNotifications: boolean };
    const next = currentProfile(user);
    next.name = body.name?.trim() || next.name;
    next.phone = body.phone?.trim() || next.phone;
    next.operator = {
      emailNotifications: !!body.emailNotifications,
      smsNotifications: !!body.smsNotifications,
    };
    profileStore.set(user.id, next);
    return ok(next);
  }

  if (req.method === 'PUT' && path === apiUrl('/profile/password')) {
    if (!canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const body = req.body as PasswordChange;
    if (!body.next || body.next.length < 8 || body.next !== body.confirm) {
      return fail(400, 'INVALID_PASSWORD');
    }
    return ok({ ok: true });
  }

  if (req.method === 'PUT' && path === apiUrl('/institution-profile/contact')) {
    if (user.audience !== 'institution' || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const row = INSTITUTIONS.find((item) => item.name === user.orgName);
    if (!row) {
      return fail(404, 'NOT_FOUND');
    }
    const body = req.body as InstitutionContactUpdate;
    row.contactName = body.contactName;
    row.phone = body.phone;
    row.email = body.email;
    row.department = body.department;
    return ok(row);
  }

  if (req.method === 'GET' && path === apiUrl('/institution-profile')) {
    if (user.audience !== 'institution') {
      return fail(403, 'FORBIDDEN');
    }
    const row = INSTITUTIONS.find((item) => item.name === user.orgName);
    return row ? ok(row) : fail(404, 'NOT_FOUND');
  }

  if (req.method === 'GET' && (path === apiUrl('/operators') || path === apiUrl('/users'))) {
    if (!canManageOperators(user)) {
      return fail(403, 'FORBIDDEN');
    }
    if (query(req, 'fail') === '1') {
      return fail(500, 'OPERATORS_UNAVAILABLE');
    }
    const q = query(req, 'q');
    const rows = OPERATORS.filter((row) => matches([row.name, row.email, row.city, row.role], q));
    return ok(rows);
  }

  if (req.method === 'POST' && path === apiUrl('/operators')) {
    if (!canManageOperators(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const body = req.body as OperatorDraft;
    const email = body.email?.trim().toLowerCase() ?? '';
    if (!email.endsWith('@aggregator.ye')) {
      return fail(400, 'INVALID_DOMAIN');
    }
    const role = (['admin', 'maker', 'checker', 'reader'] as OperatorRole[]).includes(body.role)
      ? body.role
      : 'reader';
    const row = {
      id: `tm-${Date.now()}`,
      name: body.name.trim(),
      email,
      role,
      city: 'Sana’a',
      status: 'invited' as const,
      lastActive: new Date().toISOString(),
    };
    OPERATORS.unshift(row);
    audit(user, 'Invited operator', row.name, row.email);
    return ok(row, 201);
  }

  const merchantId = resourceId(path, 'merchants');
  if (req.method === 'GET' && merchantId) {
    if (user.audience !== 'operator') {
      return fail(403, 'FORBIDDEN');
    }
    const row = MERCHANTS.find((item) => item.id === merchantId);
    return row ? ok(row) : fail(404, 'NOT_FOUND');
  }

  if (req.method === 'GET' && (path === apiUrl('/merchants') || path === apiUrl('/products'))) {
    if (user.audience !== 'operator') {
      return fail(403, 'FORBIDDEN');
    }
    const q = query(req, 'q');
    const status = query(req, 'status');
    const city = query(req, 'city');
    const erp = query(req, 'erp');
    const rows = MERCHANTS.filter((row) => {
      if (status && status !== 'all' && row.status !== status) {
        return false;
      }
      if (city && city !== 'all' && row.city.toLowerCase() !== city) {
        return false;
      }
      if (erp && erp !== 'all' && row.erpSystem.toLowerCase() !== erp) {
        return false;
      }
      return matches([row.legalName, row.crNumber, row.city, row.erpSystem, row.status], q);
    });
    return ok(rows);
  }

  if (req.method === 'POST' && path === apiUrl('/merchants')) {
    if (user.audience !== 'operator' || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const body = req.body as MerchantDraft;
    const row = {
      id: `m-${Date.now()}`,
      legalName: body.legalName,
      crNumber: body.crNumber,
      city: body.city,
      erpSystem: body.erpSystem,
      status: 'pending' as const,
      paymentPointCount: 0,
      onboardedAt: new Date().toISOString(),
      industry: body.industry,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      submittedBy: user.name,
    };
    MERCHANTS.unshift(row);
    audit(user, 'Submitted merchant', row.legalName, row.crNumber);
    return ok(row, 201);
  }

  const institutionId = resourceId(path, 'institutions');
  if (req.method === 'GET' && institutionId && path !== apiUrl('/institution-profile')) {
    if (user.audience !== 'operator') {
      return fail(403, 'FORBIDDEN');
    }
    const row = INSTITUTIONS.find((item) => item.id === institutionId);
    return row ? ok(row) : fail(404, 'NOT_FOUND');
  }

  if (req.method === 'GET' && path === apiUrl('/institutions')) {
    if (user.audience !== 'operator') {
      return fail(403, 'FORBIDDEN');
    }
    const q = query(req, 'q');
    const status = query(req, 'status');
    const rows = INSTITUTIONS.filter((row) => {
      if (status && status !== 'all' && row.status !== status) {
        return false;
      }
      return matches([row.name, row.type, row.cbyLicense, row.contractRef, row.city, row.status], q);
    });
    return ok(rows);
  }

  if (req.method === 'POST' && path === apiUrl('/institutions')) {
    if (user.audience !== 'operator' || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const body = req.body as InstitutionDraft;
    const type: InstitutionType = body.type === 'wallet' ? 'wallet' : 'bank';
    const signed = body.signedDate ? new Date(body.signedDate).toISOString() : undefined;
    const row = {
      id: `fi-${Date.now()}`,
      name: body.name,
      type,
      cbyLicense: body.cbyLicense,
      contractRef: body.contractRef,
      city: body.city || 'Sana’a',
      status: 'pending' as const,
      contractExpiry: body.contractExpiry ? new Date(body.contractExpiry).toISOString() : '',
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      contractStart: signed,
      signedDate: signed,
      feePerRequest: Number(body.feePerRequest) || 0,
      autoRenewal: !!body.autoRenewal,
      terminationRequested: !!body.terminationRequested,
      terminationNoticeDate: body.terminationNoticeDate
        ? new Date(body.terminationNoticeDate).toISOString()
        : undefined,
    };
    INSTITUTIONS.unshift(row);
    audit(user, 'Submitted FI contract', row.name, row.contractRef);
    return ok(row, 201);
  }

  const pointId = resourceId(path, 'payment-points');
  if (req.method === 'GET' && pointId) {
    const row = PAYMENT_POINTS.find((item) => item.id === pointId);
    if (!row) {
      return fail(404, 'NOT_FOUND');
    }
    if (user.audience === 'merchant' && row.merchantName !== user.orgName) {
      return fail(403, 'FORBIDDEN');
    }
    if (user.audience === 'institution' && row.institutionName !== user.orgName) {
      return fail(403, 'FORBIDDEN');
    }
    return ok(row);
  }

  if (req.method === 'GET' && (path === apiUrl('/payment-points') || path === apiUrl('/orders'))) {
    const scope = req.params.get('scope') ?? 'all';
    if (scope === 'all' && user.audience !== 'operator') {
      return fail(403, 'FORBIDDEN');
    }
    const status = query(req, 'status');
    let rows = scopedPoints(user, scope, query(req, 'q'));
    if (status && status !== 'all') {
      rows = rows.filter((row) => row.status === status);
    }
    return ok(rows);
  }

  if (req.method === 'POST' && path === apiUrl('/payment-points')) {
    if (user.audience !== 'merchant' || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const body = req.body as PaymentPointDraft;
    const institution = INSTITUTIONS.find((item) => item.name === body.institutionName);
    const merchant = MERCHANTS.find((item) => item.legalName === user.orgName);
    const kind: PointKind = body.kind === 'merchant_point' ? 'merchant_point' : 'wallet';
    const row = {
      id: `pp-${Date.now()}`,
      pointCode: body.pointCode.trim(),
      kind,
      merchantName: user.orgName ?? 'Unknown merchant',
      institutionName: institution?.name ?? body.institutionName,
      institutionType: institution?.type ?? 'bank',
      currency: 'YER' as const,
      status: 'pending' as const,
      submittedAt: new Date().toISOString(),
      merchantCr: merchant?.crNumber ?? '',
      submittedBy: user.name,
      erpSystem: merchant?.erpSystem ?? '',
      linkedAccount: `${institution?.name ?? body.institutionName} ****${body.pointCode.slice(-4)}`,
    };
    PAYMENT_POINTS.unshift(row);
    audit(user, 'Requested payment point', row.pointCode, row.institutionName);
    return ok(row, 201);
  }

  if (req.method === 'GET' && path === apiUrl('/fi-options')) {
    const rows = INSTITUTIONS.filter((row) => row.status === 'approved').map((row) => ({
      name: row.name,
      type: row.type,
    }));
    return ok(rows);
  }

  if (req.method === 'GET' && path === apiUrl('/erp-options')) {
    const rows = ERPS.filter((row) => row.status === 'approved').map((row) => row.name);
    return ok(rows);
  }

  const erpId = resourceId(path, 'erps');
  if (req.method === 'GET' && erpId) {
    if (user.audience !== 'operator') {
      return fail(403, 'FORBIDDEN');
    }
    const row = ERPS.find((item) => item.id === erpId);
    return row ? ok(row) : fail(404, 'NOT_FOUND');
  }

  if (req.method === 'GET' && path === apiUrl('/erps')) {
    if (user.audience !== 'operator') {
      return fail(403, 'FORBIDDEN');
    }
    const q = query(req, 'q');
    const status = query(req, 'status');
    const rows = ERPS.filter((row) => {
      if (status && status !== 'all' && row.status !== status) {
        return false;
      }
      return matches([row.name, row.vendor, row.status], q);
    });
    return ok(rows);
  }

  if (req.method === 'POST' && path === apiUrl('/erps')) {
    if (user.audience !== 'operator' || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const body = req.body as ErpDraft;
    const row = {
      id: `erp-${Date.now()}`,
      name: body.name,
      vendor: body.vendor,
      status: 'pending' as const,
      connectedMerchants: 0,
      lastSync: new Date().toISOString(),
      contractDate: body.contractDate ? new Date(body.contractDate).toISOString() : undefined,
      contractExpiry: body.contractExpiry ? new Date(body.contractExpiry).toISOString() : '',
      contactName: body.contactName,
      email: body.email,
    };
    ERPS.unshift(row);
    audit(user, 'Submitted ERP', row.name, row.vendor);
    return ok(row, 201);
  }

  if (req.method === 'GET' && path === apiUrl('/integration-requests')) {
    if (user.audience !== 'operator') {
      return fail(403, 'FORBIDDEN');
    }
    const q = query(req, 'q');
    const rows = INTEGRATION_REQUESTS.filter((row) =>
      matches([row.requester, row.organization, row.kind, row.email, row.status], q),
    );
    return ok(rows);
  }

  if (req.method === 'GET' && path === apiUrl('/integration-users')) {
    const rows = INTEGRATION_USERS.filter((row) => {
      if (user.audience === 'operator') {
        return true;
      }
      return row.organization === user.orgName;
    });
    return ok(rows);
  }

  if (req.method === 'GET' && path === apiUrl('/notifications')) {
    return ok(scopedNotifications(user, query(req, 'q')));
  }

  if (req.method === 'GET' && path === apiUrl('/webhook')) {
    if (user.audience !== 'merchant') {
      return fail(403, 'FORBIDDEN');
    }
    return ok(webhookStore);
  }

  if (req.method === 'PUT' && path === apiUrl('/webhook')) {
    if (user.audience !== 'merchant' || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const body = req.body as NotificationWebhook;
    Object.assign(webhookStore, {
      endpointUrl: body.endpointUrl,
      port: body.port,
      authType: body.authType === 'oauth2' ? 'oauth2' : 'bearer',
      username: body.username,
      password: body.password,
      accessToken: body.accessToken,
    });
    return ok(webhookStore);
  }

  if (req.method === 'GET' && path === apiUrl('/credentials')) {
    if (user.audience !== 'merchant' && user.audience !== 'institution') {
      return fail(403, 'FORBIDDEN');
    }
    const row = user.orgName ? credentialStore[user.orgName] : undefined;
    return row ? ok(row) : fail(404, 'NOT_FOUND');
  }

  if (req.method === 'POST' && path === apiUrl('/credentials/change-request')) {
    if ((user.audience !== 'merchant' && user.audience !== 'institution') || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    audit(user, 'Requested credential change', user.orgName ?? user.email, 'pending checker');
    return ok({ ok: true }, 201);
  }

  if (req.method === 'POST' && path === apiUrl('/credentials/regenerate')) {
    if (user.audience !== 'institution' || !canMutate(user)) {
      return fail(403, 'FORBIDDEN');
    }
    const row = user.orgName ? credentialStore[user.orgName] : undefined;
    if (!row) {
      return fail(404, 'NOT_FOUND');
    }
    row.password = `AggFi${Math.floor(10 + Math.random() * 89)}`;
    audit(user, 'Regenerated integration credentials', user.orgName ?? user.email, 'self-service');
    return ok(row);
  }

  if (req.method === 'GET' && path === apiUrl('/audit')) {
    if (user.audience !== 'operator') {
      return fail(403, 'FORBIDDEN');
    }
    const q = query(req, 'q');
    const rows = AUDIT_LOG.filter((row) =>
      matches([row.actor, row.role, row.action, row.entity, row.detail], q),
    );
    return ok(rows);
  }

  if (req.method === 'POST' && path === apiUrl('/approvals')) {
    const body = req.body as ApprovalRequest;
    if (!canApprove(user, body.entity)) {
      return fail(403, 'FORBIDDEN');
    }
    const applied = applyDecision(user, body);
    if (!applied) {
      return fail(404, 'NOT_FOUND');
    }
    AUDIT_LOG.unshift({
      id: `a-${Date.now()}`,
      at: new Date().toISOString(),
      actor: user.name,
      role: user.role,
      action: body.decision === 'approved' ? 'Approved record' : 'Rejected record',
      entity: body.id,
      detail: body.entity,
    });
    return ok({ ok: true });
  }

  return fail(404, 'NOT_FOUND');
};

function applyDecision(user: AuthUser, body: ApprovalRequest): boolean {
  const status = body.decision;
  if (body.entity === 'merchant') {
    const row = MERCHANTS.find((item) => item.id === body.id);
    if (!row) {
      return false;
    }
    row.status = status;
    return true;
  }
  if (body.entity === 'institution') {
    const row = INSTITUTIONS.find((item) => item.id === body.id);
    if (!row) {
      return false;
    }
    row.status = status;
    return true;
  }
  if (body.entity === 'erp') {
    const row = ERPS.find((item) => item.id === body.id);
    if (!row) {
      return false;
    }
    row.status = status;
    return true;
  }
  if (body.entity === 'integration') {
    const row = INTEGRATION_REQUESTS.find((item) => item.id === body.id);
    if (!row) {
      return false;
    }
    row.status = status;
    return true;
  }
  const row = PAYMENT_POINTS.find((item) => item.id === body.id);
  if (!row) {
    return false;
  }
  if (user.audience === 'institution' && row.institutionName !== user.orgName) {
    return false;
  }
  row.status = status;
  row.actionedAt = new Date().toISOString();
  row.actionedBy = user.name;
  return true;
}
