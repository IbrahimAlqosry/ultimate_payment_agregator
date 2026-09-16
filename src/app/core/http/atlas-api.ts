import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AccountProfile,
  ApprovalEntity,
  InstitutionContactUpdate,
  MerchantAccountDetails,
  OperatorAccountDetails,
  AuditEvent,
  DashboardPayload,
  ErpDraft,
  ErpSystem,
  Institution,
  InstitutionDraft,
  InstitutionType,
  IntegrationCredentials,
  IntegrationRequest,
  IntegrationUser,
  InboxItem,
  Merchant,
  MerchantDraft,
  NotificationWebhook,
  Operator,
  OperatorDraft,
  OperatorUpdate,
  PaymentNotification,
  PaymentPoint,
  PaymentPointDraft,
  PointScope,
  Settlement,
} from '@core/models';
import { apiUrl } from './api-url';

export interface ListQuery {
  q?: string;
  status?: string;
  city?: string;
  erp?: string;
}

@Injectable({ providedIn: 'root' })
export class AtlasApi {
  private readonly http = inject(HttpClient);

  dashboard() {
    return this.http.get<DashboardPayload>(apiUrl('/dashboard'));
  }

  operators(q = '', fail = false) {
    let params = new HttpParams();
    if (q) {
      params = params.set('q', q);
    }
    if (fail) {
      params = params.set('fail', '1');
    }
    return this.http.get<Operator[]>(apiUrl('/operators'), { params });
  }

  createOperator(payload: OperatorDraft) {
    return this.http.post<Operator>(apiUrl('/operators'), payload);
  }

  updateOperator(id: string, payload: OperatorUpdate) {
    return this.http.put<Operator>(apiUrl(`/operators/${id}`), payload);
  }

  merchants(q = '', extras: Pick<ListQuery, 'status' | 'city' | 'erp'> = {}) {
    return this.http.get<Merchant[]>(apiUrl('/merchants'), { params: this.params({ q, ...extras }) });
  }

  merchant(id: string) {
    return this.http.get<Merchant>(apiUrl(`/merchants/${id}`));
  }

  createMerchant(payload: MerchantDraft) {
    return this.http.post<Merchant>(apiUrl('/merchants'), payload);
  }

  institutions(q = '', status = '') {
    return this.http.get<Institution[]>(apiUrl('/institutions'), { params: this.params({ q, status }) });
  }

  institution(id: string) {
    return this.http.get<Institution>(apiUrl(`/institutions/${id}`));
  }

  createInstitution(payload: InstitutionDraft) {
    return this.http.post<Institution>(apiUrl('/institutions'), payload);
  }

  fiOptions() {
    return this.http.get<{ name: string; type: InstitutionType }[]>(apiUrl('/fi-options'));
  }

  erpOptions() {
    return this.http.get<string[]>(apiUrl('/erp-options'));
  }

  paymentPoints(q = '', scope: PointScope = 'all', status = '') {
    return this.http.get<PaymentPoint[]>(apiUrl('/payment-points'), {
      params: this.params({ q, status }).set('scope', scope),
    });
  }

  paymentPoint(id: string) {
    return this.http.get<PaymentPoint>(apiUrl(`/payment-points/${id}`));
  }

  createPaymentPoint(payload: PaymentPointDraft) {
    return this.http.post<PaymentPoint>(apiUrl('/payment-points'), payload);
  }

  erps(q = '', status = '') {
    return this.http.get<ErpSystem[]>(apiUrl('/erps'), { params: this.params({ q, status }) });
  }

  erp(id: string) {
    return this.http.get<ErpSystem>(apiUrl(`/erps/${id}`));
  }

  createErp(payload: ErpDraft) {
    return this.http.post<ErpSystem>(apiUrl('/erps'), payload);
  }

  integrationRequests(q = '') {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<IntegrationRequest[]>(apiUrl('/integration-requests'), { params });
  }

  integrationUsers() {
    return this.http.get<IntegrationUser[]>(apiUrl('/integration-users'));
  }

  notifications(q = '') {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<PaymentNotification[]>(apiUrl('/notifications'), { params });
  }

  audit(q = '', extras: { from?: string; to?: string; type?: string } = {}) {
    let params = new HttpParams();
    if (q) {
      params = params.set('q', q);
    }
    if (extras.from) {
      params = params.set('from', extras.from);
    }
    if (extras.to) {
      params = params.set('to', extras.to);
    }
    if (extras.type && extras.type !== 'all') {
      params = params.set('type', extras.type);
    }
    return this.http.get<AuditEvent[]>(apiUrl('/audit'), { params });
  }

  inbox() {
    return this.http.get<InboxItem[]>(apiUrl('/inbox'));
  }

  settlements(institution = '') {
    const params = institution ? new HttpParams().set('institution', institution) : undefined;
    return this.http.get<Settlement[]>(apiUrl('/settlements'), { params });
  }

  profile() {
    return this.http.get<AccountProfile>(apiUrl('/profile'));
  }

  updateMerchantProfile(payload: MerchantAccountDetails) {
    return this.http.put<AccountProfile>(apiUrl('/profile/merchant'), payload);
  }

  updateOperatorProfile(payload: { name: string; phone: string } & OperatorAccountDetails) {
    return this.http.put<AccountProfile>(apiUrl('/profile/operator'), payload);
  }

  updateInstitutionContact(payload: InstitutionContactUpdate) {
    return this.http.put<Institution>(apiUrl('/institution-profile/contact'), payload);
  }

  regenerateCredentials() {
    return this.http.post<IntegrationCredentials>(apiUrl('/credentials/regenerate'), {});
  }

  webhook() {
    return this.http.get<NotificationWebhook>(apiUrl('/webhook'));
  }

  saveWebhook(payload: NotificationWebhook) {
    return this.http.put<NotificationWebhook>(apiUrl('/webhook'), payload);
  }

  credentials() {
    return this.http.get<IntegrationCredentials>(apiUrl('/credentials'));
  }

  requestCredentialChange(reason: string) {
    return this.http.post(apiUrl('/credentials/change-request'), { reason });
  }

  myInstitution() {
    return this.http.get<Institution>(apiUrl('/institution-profile'));
  }

  decide(entity: ApprovalEntity, id: string, decision: 'approved' | 'rejected') {
    return this.http.post(apiUrl('/approvals'), { entity, id, decision });
  }

  simulate(status: 401 | 404 | 501 | 503) {
    return this.http.get(apiUrl(`/simulate/${status}`));
  }

  private params(query: ListQuery): HttpParams {
    let params = new HttpParams();
    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.status && query.status !== 'all') {
      params = params.set('status', query.status);
    }
    if (query.city && query.city !== 'all') {
      params = params.set('city', query.city);
    }
    if (query.erp && query.erp !== 'all') {
      params = params.set('erp', query.erp);
    }
    return params;
  }
}
