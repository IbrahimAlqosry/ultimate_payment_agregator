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
 * (verified live: Admin, Maker, and Checker test accounts all carry it). The screen itself and
 * every mutating action within it (invite, propose change, decide) are gated individually by
 * their own real permission — `platform.operators.invite` / `.change` / `.decide` — via
 * `hasPermission`/`canSubmit`/`canApprove`, not by this or any role check.
 */
export function canManageOperators(user: AuthUser | null): boolean {
  return hasPermission(user, 'platform.operators.read');
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
  notification: PlatformPermission.NotificationEndpointsDecide,
};

/** Entity → the real `.submit` permission that gates the Maker-side action for it (creating an
 * application, submitting it to a Checker, proposing an ERP change, etc). */
const SUBMIT_PERMISSION: Partial<Record<ApprovalEntity, PlatformPermission>> = {
  merchant: PlatformPermission.MerchantOnboardingSubmit,
  institution: PlatformPermission.FinancialInstitutionOnboardingSubmit,
  erp: PlatformPermission.ErpSystemsSubmit,
  integration: PlatformPermission.IntegrationClientApprovalsSubmit,
  notification: PlatformPermission.NotificationEndpointsSubmit,
  /** Operators has a three-way split (invite / change / decide), not the usual two — `.invite`
   * is gated separately (a distinct action, not "submitting an application"). This maps to
   * `.change`, the Maker-side action for "propose a change to an existing operator." */
  operator: PlatformPermission.OperatorsChange,
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
