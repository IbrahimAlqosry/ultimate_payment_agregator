import { OperatorRole, ScreenModule } from '@core/models';

export const SCREEN_MODULES: { id: ScreenModule; labelKey: string }[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard' },
  { id: 'merchants', labelKey: 'users.modMerchants' },
  { id: 'institutions', labelKey: 'users.modFi' },
  { id: 'erp', labelKey: 'users.modErp' },
  { id: 'integration', labelKey: 'users.modIntegration' },
  { id: 'operators', labelKey: 'nav.operators' },
  { id: 'reports', labelKey: 'users.modReports' },
  { id: 'settings', labelKey: 'nav.settings' },
];

export function defaultScreens(role: OperatorRole): ScreenModule[] {
  if (role === 'admin') {
    return SCREEN_MODULES.map((row) => row.id);
  }
  if (role === 'maker') {
    return ['dashboard', 'merchants', 'reports'];
  }
  if (role === 'checker') {
    return ['dashboard', 'merchants', 'erp', 'integration'];
  }
  return ['dashboard', 'reports'];
}

export function hasScreenAccess(role: OperatorRole, module: ScreenModule, screens?: ScreenModule[]): boolean {
  if (screens?.length) {
    return screens.includes(module);
  }
  return defaultScreens(role).includes(module);
}
