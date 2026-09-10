import { ApprovalEntity, AuthUser } from '@core/models';
import { PlatformPermission } from '@core/models.platform';

/** Real grant check against GET /auth/me's `permissions` — verified live per role (see
 * PaymentAggregator-UI-Integration-Guide-v3.md §2.9). Merchant/FI users always have []. */
export function hasPermission(user: AuthUser | null, permission: PlatformPermission): boolean {
  return !!user && user.permissions.includes(permission);
}

/**
 * Gates the Platform Operators *nav link's visibility only*. Per the real API this is
 * `platform.operators.read` — any Platform role can be granted it, it is not Admin-exclusive
 * (verified live: Admin, Maker, and Checker test accounts all carry it).
 *
 * Do NOT use this to gate the actual screen/route or any mutating action within it — see
 * `canAdministerOperators` below for that.
 */
export function canManageOperators(user: AuthUser | null): boolean {
  return hasPermission(user, 'platform.operators.read');
}

/**
 * Gates the *legacy mock* Operators screen itself (route guard, and every invite/edit action
 * inside `features/users/*` and the mock backend's own `/operators` handlers). That screen
 * still models operator management as a single unilateral CRUD form — it has no maker-submit /
 * checker-decide flow at all, so no combination of the real `platform.operators.*` permissions
 * can correctly represent who should be allowed to use it (a Maker there could freely edit any
 * operator's role or invite one outright, which the real model never grants). Strict Admin-only
 * here, same as before the real-permissions pass, until the real (maker-checker) Platform
 * Operator administration API can back this screen — see docs/BACKEND_ISSUES.md; it's currently
 * blocked on a backend bug in the invite endpoint.
 */
export function canAdministerOperators(user: AuthUser | null): boolean {
  return user?.audience === 'operator' && user.role === 'admin';
}

export function isReadOnly(user: AuthUser | null): boolean {
  return user?.role === 'reader';
}

/** Entity → the real `.decide` permission that gates approving/rejecting it. Verified live for
 * Admin/Maker/Checker test accounts against PaymentAggregator-UI-Integration-Guide-v3.md §2.9. */
const DECIDE_PERMISSION: Partial<Record<ApprovalEntity, PlatformPermission>> = {
  merchant: PlatformPermission.MerchantOnboardingDecide,
  institution: PlatformPermission.FinancialInstitutionOnboardingDecide,
  erp: PlatformPermission.ErpSystemsDecide,
  integration: PlatformPermission.IntegrationClientApprovalsDecide,
  operator: PlatformPermission.OperatorsDecide,
};

/** Entity → the real `.submit` permission that gates the Maker-side action for it (creating an
 * application, submitting it to a Checker, proposing an ERP change, etc). */
const SUBMIT_PERMISSION: Partial<Record<ApprovalEntity, PlatformPermission>> = {
  merchant: PlatformPermission.MerchantOnboardingSubmit,
  institution: PlatformPermission.FinancialInstitutionOnboardingSubmit,
  erp: PlatformPermission.ErpSystemsSubmit,
  integration: PlatformPermission.IntegrationClientApprovalsSubmit,
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

/** Mirrors canApprove() for the Maker-side submit action — e.g. gates "Submit to Checker" on
 * Merchant/FI applications and "Propose Update" on ERP records by the real permission, not just
 * the record's status (a Reader with only `.read` must not see these buttons). */
export function canSubmit(user: AuthUser | null, entity: ApprovalEntity): boolean {
  const permission = SUBMIT_PERMISSION[entity];
  return !!permission && hasPermission(user, permission);
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
