import { Audience, AuthUser } from '@core/models';

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
    { path: '/institutions', label: 'nav.fiMgmt', icon: 'building' },
    { path: '/erp-systems', label: 'nav.erpList', icon: 'cpu' },
    { path: '/integration-requests', label: 'nav.integrationRequests', icon: 'git-pull-request' },
  ];

  if (user.role === 'admin') {
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

  if (operatorOnly.includes(normalized)) {
    return ['operator'];
  }
  if (merchantOnly.includes(normalized)) {
    return ['merchant'];
  }
  if (institutionOnly.includes(normalized)) {
    return ['institution'];
  }
  return null;
}
