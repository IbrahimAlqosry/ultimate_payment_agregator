import { Routes } from '@angular/router';
import { adminGuard, audienceGuard, authGuard, authMatch, guestGuard, guestMatch } from '@core/auth/auth.guard';

const guestAuth = {
  canMatch: [guestMatch],
  canActivate: [guestGuard],
};

const operatorOnly = { canActivate: [audienceGuard(['operator'])] };
const merchantOnly = { canActivate: [audienceGuard(['merchant'])] };
const institutionOnly = { canActivate: [audienceGuard(['institution'])] };

export const routes: Routes = [
  {
    path: 'login',
    title: 'login.title',
    ...guestAuth,
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'otp',
    title: 'otp.title',
    ...guestAuth,
    loadComponent: () => import('./features/login/otp').then((m) => m.Otp),
  },
  {
    path: 'forgot-password',
    title: 'forgot.title',
    ...guestAuth,
    loadComponent: () => import('./features/login/forgot').then((m) => m.Forgot),
  },
  {
    path: 'email-sent',
    title: 'sent.title',
    ...guestAuth,
    loadComponent: () => import('./features/login/sent').then((m) => m.Sent),
  },
  {
    path: 'reset-password',
    title: 'reset.title',
    ...guestAuth,
    loadComponent: () => import('./features/login/reset').then((m) => m.Reset),
  },
  {
    path: 'reset-success',
    title: 'resetSuccess.title',
    ...guestAuth,
    loadComponent: () => import('./features/login/reset-success').then((m) => m.ResetSuccess),
  },
  {
    path: 'account-locked',
    title: 'locked.title',
    ...guestAuth,
    loadComponent: () => import('./features/login/locked').then((m) => m.Locked),
  },
  {
    path: 'register',
    title: 'register.title',
    ...guestAuth,
    loadComponent: () => import('./features/login/register').then((m) => m.Register),
  },
  {
    path: 'register-pending',
    title: 'pending.title',
    ...guestAuth,
    loadComponent: () => import('./features/login/pending').then((m) => m.Pending),
  },
  {
    path: '',
    canMatch: [authMatch],
    canActivate: [authGuard],
    loadComponent: () => import('./features/layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'nav.dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'merchants/new',
        title: 'onboard.merchantTitle',
        ...operatorOnly,
        loadComponent: () => import('./features/products/onboard-merchant').then((m) => m.OnboardMerchant),
      },
      {
        path: 'merchants/:id',
        title: 'detail.merchantTitle',
        ...operatorOnly,
        loadComponent: () => import('./features/products/merchant-detail').then((m) => m.MerchantDetail),
      },
      {
        path: 'merchants',
        title: 'nav.merchantMgmt',
        ...operatorOnly,
        loadComponent: () => import('./features/products/products').then((m) => m.Products),
      },
      {
        path: 'institutions/new',
        title: 'onboard.fiTitle',
        ...operatorOnly,
        loadComponent: () => import('./features/institutions/onboard-institution').then((m) => m.OnboardInstitution),
      },
      {
        path: 'institutions/:id',
        title: 'detail.fiTitle',
        ...operatorOnly,
        loadComponent: () => import('./features/institutions/institution-detail').then((m) => m.InstitutionDetail),
      },
      {
        path: 'institutions',
        title: 'nav.fiMgmt',
        ...operatorOnly,
        loadComponent: () => import('./features/institutions/institutions').then((m) => m.Institutions),
      },
      {
        path: 'erp-systems/new',
        title: 'onboard.erpTitle',
        ...operatorOnly,
        loadComponent: () => import('./features/erp/add-erp').then((m) => m.AddErp),
      },
      {
        path: 'erp-systems/:id',
        title: 'detail.erpTitle',
        ...operatorOnly,
        loadComponent: () => import('./features/erp/erp-detail').then((m) => m.ErpDetail),
      },
      {
        path: 'erp-systems',
        title: 'nav.erpList',
        ...operatorOnly,
        loadComponent: () => import('./features/erp/erp-systems').then((m) => m.ErpSystems),
      },
      {
        path: 'integration-requests',
        title: 'nav.integrationRequests',
        ...operatorOnly,
        loadComponent: () => import('./features/integrations/integration-requests').then((m) => m.IntegrationRequests),
      },
      {
        path: 'operators/new',
        title: 'onboard.operatorTitle',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/add-operator').then((m) => m.AddOperator),
      },
      {
        path: 'operators',
        title: 'nav.operators',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/users').then((m) => m.Users),
      },
      {
        path: 'reports',
        title: 'nav.reports',
        ...operatorOnly,
        loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'payment-points/:id',
        title: 'detail.pointTitle',
        ...operatorOnly,
        loadComponent: () => import('./features/orders/point-detail').then((m) => m.PointDetail),
      },
      {
        path: 'payment-points',
        title: 'nav.points',
        ...operatorOnly,
        data: { scope: 'all', titleKey: 'points.title', introKey: 'points.intro' },
        loadComponent: () => import('./features/orders/orders').then((m) => m.Orders),
      },
      {
        path: 'my-payment-points/new',
        title: 'onboard.pointTitle',
        ...merchantOnly,
        loadComponent: () => import('./features/orders/add-payment-point').then((m) => m.AddPaymentPoint),
      },
      {
        path: 'my-payment-points/:id',
        title: 'detail.pointTitle',
        ...merchantOnly,
        loadComponent: () => import('./features/orders/point-detail').then((m) => m.PointDetail),
      },
      {
        path: 'my-payment-points',
        title: 'nav.myPoints',
        ...merchantOnly,
        data: { scope: 'mine', titleKey: 'points.mineTitle', introKey: 'points.mineIntro' },
        loadComponent: () => import('./features/orders/orders').then((m) => m.Orders),
      },
      {
        path: 'pp-approvals/:id',
        title: 'detail.pointTitle',
        ...institutionOnly,
        loadComponent: () => import('./features/orders/point-detail').then((m) => m.PointDetail),
      },
      {
        path: 'pp-approvals',
        title: 'nav.ppApprovals',
        ...institutionOnly,
        data: { scope: 'pending', titleKey: 'points.approvalsTitle', introKey: 'points.approvalsIntro' },
        loadComponent: () => import('./features/orders/orders').then((m) => m.Orders),
      },
      {
        path: 'all-payment-points',
        title: 'nav.allPoints',
        ...institutionOnly,
        data: { scope: 'institution', titleKey: 'points.institutionTitle', introKey: 'points.institutionIntro' },
        loadComponent: () => import('./features/orders/orders').then((m) => m.Orders),
      },
      {
        path: 'notification-delivery',
        title: 'notes.settingsTitle',
        ...merchantOnly,
        loadComponent: () =>
          import('./features/notifications/notification-delivery').then((m) => m.NotificationDelivery),
      },
      {
        path: 'notifications',
        title: 'nav.notifications',
        ...institutionOnly,
        data: { titleKey: 'notes.fiTitle', introKey: 'notes.fiIntro' },
        loadComponent: () => import('./features/notifications/notifications').then((m) => m.NotificationsPage),
      },
      {
        path: 'my-integration-user',
        title: 'nav.myIntegration',
        ...merchantOnly,
        loadComponent: () => import('./features/integrations/integration-user').then((m) => m.IntegrationUserPage),
      },
      {
        path: 'integration-user',
        title: 'nav.integrationUser',
        ...institutionOnly,
        loadComponent: () => import('./features/integrations/integration-user').then((m) => m.IntegrationUserPage),
      },
      {
        path: 'institution-profile',
        title: 'nav.institutionProfile',
        ...institutionOnly,
        loadComponent: () => import('./features/institutions/institution-profile').then((m) => m.InstitutionProfile),
      },
      {
        path: 'account-settings',
        title: 'nav.settings',
        loadComponent: () => import('./features/settings/account-settings').then((m) => m.AccountSettings),
      },
      { path: 'orders', redirectTo: 'payment-points' },
      { path: 'products', redirectTo: 'merchants' },
      { path: 'users', redirectTo: 'operators' },
    ],
  },
  {
    path: '401',
    loadComponent: () => import('./features/status/status').then((m) => m.Status),
    data: { code: 401 },
  },
  {
    path: '404',
    loadComponent: () => import('./features/status/status').then((m) => m.Status),
    data: { code: 404 },
  },
  {
    path: '501',
    loadComponent: () => import('./features/status/status').then((m) => m.Status),
    data: { code: 501 },
  },
  {
    path: '503',
    loadComponent: () => import('./features/status/status').then((m) => m.Status),
    data: { code: 503 },
  },
  {
    path: '**',
    loadComponent: () => import('./features/status/status').then((m) => m.Status),
    data: { code: 404 },
  },
];
