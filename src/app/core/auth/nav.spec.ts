import { canApprove, canManageOperators, isReadOnly } from './access';
import { inboxPath, navLinks, portalKey, searchPath, searchPlaceholderKey } from './nav';
import { AuthUser } from '@core/models';

// Permission sets below are copied verbatim from live GET /auth/me responses (verified against
// the real backend for Admin/Maker/Checker; Reader has no supplied test account, so its set
// follows the guide's documented intent: .read only, no .submit/.decide/.invite/.change).
const ADMIN_AND_CHECKER_PERMISSIONS = [
  'platform.erp-systems.decide',
  'platform.erp-systems.read',
  'platform.financial-institution-onboarding.decide',
  'platform.financial-institution-onboarding.read',
  'platform.integration-client-approvals.decide',
  'platform.integration-client-approvals.read',
  'platform.merchant-onboarding.decide',
  'platform.merchant-onboarding.read',
  'platform.operators.decide',
  'platform.operators.read',
  'platform.profiles.decide',
  'platform.profiles.read',
];
const MAKER_PERMISSIONS = [
  'platform.erp-systems.read',
  'platform.erp-systems.submit',
  'platform.financial-institution-onboarding.read',
  'platform.financial-institution-onboarding.submit',
  'platform.integration-client-approvals.read',
  'platform.integration-client-approvals.submit',
  'platform.merchant-onboarding.read',
  'platform.merchant-onboarding.submit',
  'platform.operators.change',
  'platform.operators.invite',
  'platform.operators.read',
  'platform.profiles.read',
  'platform.profiles.submit',
];
const READER_PERMISSIONS = [
  'platform.erp-systems.read',
  'platform.financial-institution-onboarding.read',
  'platform.integration-client-approvals.read',
  'platform.merchant-onboarding.read',
  'platform.operators.read',
  'platform.profiles.read',
];

const admin: AuthUser = {
  id: 'u-admin',
  email: 'admin@aggregator.ye',
  name: 'Anas Al-Hakimi',
  audience: 'operator',
  role: 'admin',
  avatarInitials: 'AH',
  jobTitleKey: 'title.admin',
  permissions: ADMIN_AND_CHECKER_PERMISSIONS,
};

const maker: AuthUser = { ...admin, id: 'u-maker', role: 'maker', jobTitleKey: 'title.maker', permissions: MAKER_PERMISSIONS };
const checker: AuthUser = {
  ...admin,
  id: 'u-checker',
  role: 'checker',
  jobTitleKey: 'title.checker',
  permissions: ADMIN_AND_CHECKER_PERMISSIONS,
};
const reader: AuthUser = { ...admin, id: 'u-reader', role: 'reader', jobTitleKey: 'title.reader', permissions: READER_PERMISSIONS };
const merchant: AuthUser = {
  id: 'u-merchant',
  email: 'finance@alamal.ye',
  name: 'Nour Al-Amal',
  audience: 'merchant',
  role: 'merchant',
  avatarInitials: 'NA',
  jobTitleKey: 'title.financeLead',
  orgName: 'Al-Amal Pharmacies',
  orgId: 'm-1',
  permissions: [],
};
const institution: AuthUser = {
  id: 'u-fi',
  email: 'ops@tadhamon.ye',
  name: 'Samir Al-Tadhamon',
  audience: 'institution',
  role: 'institution',
  avatarInitials: 'ST',
  jobTitleKey: 'title.opsOfficer',
  orgName: 'Tadhamon Bank',
  orgId: 'fi-1',
  permissions: [],
};

describe('role access', () => {
  it('gates the Platform Operators screen by the real platform.operators.read grant, not role alone', () => {
    // Verified live: Admin, Maker, and Checker test accounts all carry platform.operators.read —
    // it is not Admin-exclusive on the real backend, unlike the old mock-era assumption.
    expect(canManageOperators(admin)).toBe(true);
    expect(canManageOperators(maker)).toBe(true);
    expect(canManageOperators(checker)).toBe(true);
    expect(canManageOperators(reader)).toBe(true);
    expect(canManageOperators(merchant)).toBe(false);
  });

  it('gates decisions by the real .decide permission, not a role guess', () => {
    expect(canApprove(admin, 'merchant')).toBe(true);
    // A payment-point decision is the linked FI's own single-approver action, never a Platform
    // maker-checker one (guide §12.3 / BRD §3.4) — not even Admin/Checker can decide it. The old
    // role-only implementation incorrectly granted this; this asserts the corrected behavior.
    expect(canApprove(checker, 'point')).toBe(false);
    expect(canApprove(admin, 'point')).toBe(false);
    expect(canApprove(maker, 'merchant')).toBe(false);
    expect(canApprove(reader, 'erp')).toBe(false);
    expect(canApprove(institution, 'point')).toBe(true);
    expect(canApprove(institution, 'merchant')).toBe(false);
    expect(canApprove(merchant, 'point')).toBe(false);
  });

  it('marks reader as read-only', () => {
    expect(isReadOnly(reader)).toBe(true);
    expect(isReadOnly(admin)).toBe(false);
  });
});

describe('navLinks', () => {
  it('shows platform operators to anyone with the real platform.operators.read grant', () => {
    expect(navLinks(admin).some((link) => link.path === '/operators')).toBe(true);
    expect(navLinks(admin).some((link) => link.path === '/payment-points')).toBe(true);
    expect(navLinks(maker).some((link) => link.path === '/operators')).toBe(true);
    expect(navLinks(checker).some((link) => link.path === '/operators')).toBe(true);
    expect(navLinks(reader).some((link) => link.path === '/operators')).toBe(true);
  });

  it('returns merchant and FI portal menus', () => {
    expect(navLinks(merchant).map((link) => link.path)).toEqual([
      '/dashboard',
      '/my-payment-points',
      '/my-integration-user',
      '/notification-delivery',
    ]);
    expect(navLinks(institution).map((link) => link.path)).toContain('/pp-approvals');
    expect(navLinks(merchant).find((link) => link.path === '/notification-delivery')?.icon).toBe(
      'circle-x',
    );
    expect(navLinks(institution).find((link) => link.path === '/all-payment-points')?.icon).toBe(
      'circle-check',
    );
    expect(portalKey('merchant')).toBe('shell.merchantPortal');
    expect(portalKey('institution')).toBe('shell.fiPortal');
    expect(searchPlaceholderKey('operator')).toBe('shell.searchOperator');
    expect(inboxPath('merchant')).toBe('/notification-delivery');
    expect(searchPath('operator')).toBe('/merchants');
    expect(searchPath('merchant')).toBe('/my-payment-points');
    expect(searchPath('institution')).toBe('/all-payment-points');
  });
});
