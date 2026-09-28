import { HttpErrorResponse } from '@angular/common/http';
import { PlatformOperatorRole } from '@core/models.platform';
import { applicableDefinitions, inapplicableKeys, normalizeCatalog, readPermissionProblem, roleDefaults } from './permission-catalog';

// The backend contract's complete applicability matrix (M/C/R/A).
const MATRIX: Record<string, string> = {
  'platform.operators.invite': 'M',
  'platform.operators.change': 'M',
  'platform.operators.decide': 'CA',
  'platform.operators.read': 'MCRA',
  'platform.merchant-onboarding.submit': 'M',
  'platform.merchant-onboarding.decide': 'CA',
  'platform.merchant-onboarding.read': 'MCRA',
  'platform.financial-institution-onboarding.submit': 'M',
  'platform.financial-institution-onboarding.decide': 'CA',
  'platform.financial-institution-onboarding.read': 'MCRA',
  'platform.merchant-bootstrap-reissue.submit': 'M',
  'platform.merchant-bootstrap-reissue.decide': 'CA',
  'platform.merchant-bootstrap-reissue.read': 'MCRA',
  'platform.financial-institution-bootstrap-reissue.submit': 'M',
  'platform.financial-institution-bootstrap-reissue.decide': 'CA',
  'platform.financial-institution-bootstrap-reissue.read': 'MCRA',
  'platform.integration-client-approvals.submit': 'M',
  'platform.integration-client-approvals.decide': 'CA',
  'platform.integration-client-approvals.read': 'MCRA',
  'platform.erp-systems.submit': 'M',
  'platform.erp-systems.decide': 'CA',
  'platform.erp-systems.read': 'MCRA',
  'platform.profiles.submit': 'M',
  'platform.profiles.decide': 'CA',
  'platform.profiles.read': 'MCRA',
  'platform.notification-endpoints.submit': 'M',
  'platform.notification-endpoints.decide': 'CA',
  'platform.notification-endpoints.read': 'MCRA',
  'platform.notification-deliveries.read': 'MCRA',
  'platform.notification-deliveries.remediate': 'CA',
  'platform.notification-deliveries.replay': 'CA',
  'platform.audit.read': 'MCRA',
};
const LETTER: Record<PlatformOperatorRole, string> = { maker: 'M', checker: 'C', reader: 'R', admin: 'A' };
const ROLES: PlatformOperatorRole[] = ['maker', 'checker', 'reader', 'admin'];

describe('permission catalog', () => {
  it('derives the contract matrix from keys when the backend sends no definitions', () => {
    const catalog = normalizeCatalog({ permissions: Object.keys(MATRIX) });
    for (const role of ROLES) {
      const expected = Object.keys(MATRIX).filter((key) => MATRIX[key].includes(LETTER[role]));
      expect(applicableDefinitions(catalog, role).map((def) => def.key).sort()).toEqual(expected.sort());
    }
  });

  it('prefers backend definitions and trims defaults to applicable keys', () => {
    const catalog = normalizeCatalog({
      permissions: ['a.x.read', 'a.x.submit'],
      definitions: [
        { key: 'a.x.read', label: 'Read X', description: '', allowedRoles: ['reader', 'maker'] },
        { key: 'a.x.submit', label: 'Submit X', description: '', allowedRoles: ['maker'] },
      ],
      defaultsByRole: { reader: ['a.x.read', 'a.x.submit'] },
    });
    expect(roleDefaults(catalog, 'reader')).toEqual(['a.x.read']);
    expect(inapplicableKeys(catalog, ['a.x.read', 'a.x.submit', 'unknown.key'], 'reader')).toEqual(['a.x.submit', 'unknown.key']);
  });

  it('reads the permission-specific 400 problem codes', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { code: 'permissionReplacementRequired', inapplicablePermissions: ['platform.operators.invite'] },
    });
    expect(readPermissionProblem(error)).toEqual({ code: 'permissionReplacementRequired', keys: ['platform.operators.invite'] });
    expect(readPermissionProblem(new HttpErrorResponse({ status: 400, error: { title: 'x' } }))).toBeNull();
  });
});
