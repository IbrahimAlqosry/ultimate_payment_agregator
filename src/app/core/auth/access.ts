import { ApprovalEntity, AuthUser } from '@core/models';

/** Real grant check against GET /auth/me's `permissions` — verified live per role (see
 * PaymentAggregator-UI-Integration-Guide-v3.md §2.9). Merchant/FI users always have []. */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  return !!user && user.permissions.includes(permission);
}

/**
 * Gates the Platform Operators screen's *visibility* (nav link + route guard). Per the real
 * API this is `platform.operators.read` — any Platform role can be granted it, it is not
 * Admin-exclusive (verified live: Admin, Maker, and Checker test accounts all carry it). The
 * invite/change/decide actions *within* that screen get their own precise permission checks.
 */
export function canManageOperators(user: AuthUser | null): boolean {
  return hasPermission(user, 'platform.operators.read');
}

export function isReadOnly(user: AuthUser | null): boolean {
  return user?.role === 'reader';
}

/** Entity → the real `.decide` permission that gates approving/rejecting it. Verified live for
 * Admin/Maker/Checker test accounts against PaymentAggregator-UI-Integration-Guide-v3.md §2.9. */
const DECIDE_PERMISSION: Partial<Record<ApprovalEntity, string>> = {
  merchant: 'platform.merchant-onboarding.decide',
  institution: 'platform.financial-institution-onboarding.decide',
  erp: 'platform.erp-systems.decide',
  integration: 'platform.integration-client-approvals.decide',
  operator: 'platform.operators.decide',
};

export function canApprove(user: AuthUser | null, entity: ApprovalEntity): boolean {
  if (!user) {
    return false;
  }
  const permission = DECIDE_PERMISSION[entity];
  if (permission) {
    return hasPermission(user, permission);
  }
  // 'point' — the linked Financial Institution's own single-approver decision on a Merchant's
  // payment point (guide §12.3). Not a Platform maker-checker action, so no `platform.*`
  // permission applies — gated by FI audience instead.
  return user.audience === 'institution' && entity === 'point';
}

/**
 * Coarse "can attempt mutations at all" gate (hides obviously-irrelevant buttons for Readers).
 * Deliberately not yet precise per-action (e.g. only a Maker can actually submit a new
 * application; Checker/Admin can only decide) — that level of detail is being added screen by
 * screen as each is rewired to the real API's specific `.submit`/`.invite`/`.change`
 * permissions, rather than guessed here. The server enforces the real rule regardless.
 */
export function canMutate(user: AuthUser | null): boolean {
  return !!user && user.role !== 'reader';
}
