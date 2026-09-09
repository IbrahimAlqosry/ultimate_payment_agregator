import { Audience, AuthUser } from '@core/models';
import { canManageOperators } from './access';

export interface NavLink {
  path: string;
  label: string;
  icon: string;
}

export function portalKey(audience: Audience | undefined): string {
  if (audience === 'merchant') {
    return 'shell.merchantPortal';
  }
  if (audience === 'institution') {
    return 'shell.fiPortal';
  }
  return 'shell.operatorPortal';
}

export function searchPlaceholderKey(audience: Audience | undefined): string {
  if (audience === 'merchant') {
    return 'shell.searchMerchant';
  }
  if (audience === 'institution') {
    return 'shell.searchFi';
  }
  return 'shell.searchOperator';
}

export function inboxPath(audience: Audience | undefined): string {
  if (audience === 'merchant') {
    return '/notification-delivery';
  }
  if (audience === 'institution') {
    return '/notifications';
  }
  return '/reports';
}

export function searchPath(audience: Audience | undefined): string {
  if (audience === 'merchant') {
    return '/my-payment-points';
  }
  if (audience === 'institution') {
    return '/all-payment-points';
  }
  return '/merchants';
}

export function navLinks(user: AuthUser | null): NavLink[] {
  if (!user) {
    return [];
  }

  if (user.audience === 'merchant') {
    return [
      { path: '/dashboard', label: 'nav.dashboard', icon: 'layout-dashboard' },
      { path: '/my-payment-points', label: 'nav.myPoints', icon: 'credit-card' },
      { path: '/my-integration-user', label: 'nav.myIntegration', icon: 'user-key' },
      { path: '/notification-delivery', label: 'nav.notificationDelivery', icon: 'circle-x' },
    ];
  }

  if (user.audience === 'institution') {
    return [
      { path: '/dashboard', label: 'nav.dashboard', icon: 'layout-dashboard' },
      { path: '/pp-approvals', label: 'nav.ppApprovals', icon: 'credit-card' },
      { path: '/all-payment-points', label: 'nav.allPoints', icon: 'circle-check' },
      { path: '/notifications', label: 'nav.notifications', icon: 'bell' },
      { path: '/integration-user', label: 'nav.integrationUser', icon: 'user-key' },
      { path: '/institution-profile', label: 'nav.institutionProfile', icon: 'building' },
    ];
  }

  const links: NavLink[] = [
    { path: '/dashboard', label: 'nav.dashboard', icon: 'layout-dashboard' },
    { path: '/merchants', label: 'nav.merchantMgmt', icon: 'users-2' },
    { path: '/payment-points', label: 'nav.points', icon: 'credit-card' },
    { path: '/institutions', label: 'nav.fiMgmt', icon: 'building' },
    { path: '/erp-systems', label: 'nav.erpList', icon: 'cpu' },
    { path: '/integration-requests', label: 'nav.integrationRequests', icon: 'git-pull-request' },
  ];

  if (canManageOperators(user)) {
    links.push({ path: '/operators', label: 'nav.operators', icon: 'shield-user' });
  }

  links.push({ path: '/reports', label: 'nav.reports', icon: 'file-text' });
  return links;
}

export const SETTINGS_LINK: NavLink = {
  path: '/account-settings',
  label: 'nav.settings',
  icon: 'settings',
};

export function allowedAudiencesForPath(path: string): Audience[] | null {
  const normalized = path.replace(/\/$/, '') || '/';
  const operatorOnly = [
    '/merchants',
    '/institutions',
    '/erp-systems',
    '/integration-requests',
    '/operators',
    '/reports',
    '/payment-points',
  ];
  const merchantOnly = ['/my-payment-points', '/my-integration-user', '/notification-delivery'];
  const institutionOnly = [
    '/pp-approvals',
    '/all-payment-points',
    '/notifications',
    '/integration-user',
    '/institution-profile',
  ];

  if (operatorOnly.some((base) => normalized === base || normalized.startsWith(`${base}/`))) {
    return ['operator'];
  }
  if (merchantOnly.some((base) => normalized === base || normalized.startsWith(`${base}/`))) {
    return ['merchant'];
  }
  if (institutionOnly.some((base) => normalized === base || normalized.startsWith(`${base}/`))) {
    return ['institution'];
  }
  return null;
}
