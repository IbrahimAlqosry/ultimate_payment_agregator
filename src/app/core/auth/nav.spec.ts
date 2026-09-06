import { canApprove, canManageOperators, isReadOnly } from './access';
import { inboxPath, navLinks, portalKey, searchPath, searchPlaceholderKey } from './nav';
import { AuthUser } from '@core/models';

const admin: AuthUser = {
  id: 'u-admin',
  email: 'admin@aggregator.ye',
  name: 'Anas Al-Hakimi',
  audience: 'operator',
  role: 'admin',
  avatarInitials: 'AH',
  jobTitleKey: 'title.admin',
};

const maker: AuthUser = { ...admin, id: 'u-maker', role: 'maker', jobTitleKey: 'title.maker' };
const checker: AuthUser = { ...admin, id: 'u-checker', role: 'checker', jobTitleKey: 'title.checker' };
const reader: AuthUser = { ...admin, id: 'u-reader', role: 'reader', jobTitleKey: 'title.reader' };
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
};

describe('role access', () => {
  it('lets only admin manage operators', () => {
    expect(canManageOperators(admin)).toBe(true);
    expect(canManageOperators(maker)).toBe(false);
    expect(canManageOperators(checker)).toBe(false);
    expect(canManageOperators(reader)).toBe(false);
    expect(canManageOperators(merchant)).toBe(false);
  });

  it('blocks maker and reader from approvals', () => {
    expect(canApprove(admin, 'merchant')).toBe(true);
    expect(canApprove(checker, 'point')).toBe(true);
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
  it('hides platform operators from non-admin operators', () => {
    expect(navLinks(admin).some((link) => link.path === '/operators')).toBe(true);
    expect(navLinks(admin).some((link) => link.path === '/payment-points')).toBe(true);
    expect(navLinks(maker).some((link) => link.path === '/operators')).toBe(false);
    expect(navLinks(checker).some((link) => link.path === '/operators')).toBe(false);
    expect(navLinks(reader).some((link) => link.path === '/operators')).toBe(false);
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
