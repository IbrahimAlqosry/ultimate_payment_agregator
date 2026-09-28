import { HttpErrorResponse } from '@angular/common/http';
import {
  PlatformOperatorPermissionCatalog,
  PlatformOperatorPermissionDefinition,
  PlatformOperatorRole,
  ProblemDetails,
} from '@core/models.platform';

/**
 * Platform Operator permission assignment (backend "UI handoff" contract, 2026-09-28).
 *
 * `definitions[].allowedRoles` is authoritative: a picker shows only grants whose allowedRoles
 * contain the *target* role (never filtered by the acting Maker's own grants). Backends from
 * before that contract return only `permissions: string[]`; for those, applicability is derived
 * from the key's action suffix, which reproduces the contract's matrix exactly — read grants fit
 * every role, submit/invite/change are Maker-only, decide/remediate/replay are Checker + Admin.
 */
export interface NormalizedCatalog {
  definitions: PlatformOperatorPermissionDefinition[];
  /** Empty when the backend sends no defaults — defaults are optional, never required. */
  defaultsByRole: Partial<Record<PlatformOperatorRole, string[]>>;
}

const ALL_ROLES: PlatformOperatorRole[] = ['maker', 'checker', 'reader', 'admin'];

export function normalizeCatalog(raw: PlatformOperatorPermissionCatalog): NormalizedCatalog {
  const definitions = raw.definitions?.length ? raw.definitions : raw.permissions.map(derivedDefinition);
  return { definitions, defaultsByRole: raw.defaultsByRole ?? {} };
}

export function applicableDefinitions(
  catalog: NormalizedCatalog,
  role: PlatformOperatorRole,
): PlatformOperatorPermissionDefinition[] {
  return catalog.definitions.filter((def) => def.allowedRoles.includes(role));
}

/** Keys from `keys` the role can't hold. Unknown keys count as inapplicable too. */
export function inapplicableKeys(catalog: NormalizedCatalog, keys: readonly string[], role: PlatformOperatorRole): string[] {
  return keys.filter((key) => !catalog.definitions.find((def) => def.key === key)?.allowedRoles.includes(role));
}

/** Defaults for the role, trimmed to keys the role can actually hold. */
export function roleDefaults(catalog: NormalizedCatalog, role: PlatformOperatorRole): string[] {
  const allowed = new Set(applicableDefinitions(catalog, role).map((def) => def.key));
  return (catalog.defaultsByRole[role] ?? []).filter((key) => allowed.has(key));
}

export function definitionFor(catalog: NormalizedCatalog, key: string): PlatformOperatorPermissionDefinition | undefined {
  return catalog.definitions.find((def) => def.key === key);
}

/** The two permission-specific `400` codes, with the offending keys to show. */
export interface PermissionProblem {
  code: 'permissionsInapplicable' | 'permissionReplacementRequired';
  keys: string[];
}

export function readPermissionProblem(error: unknown): PermissionProblem | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return null;
  }
  const body = error.error as Partial<ProblemDetails> | null;
  const code = body?.code;
  if (code !== 'permissionsInapplicable' && code !== 'permissionReplacementRequired') {
    return null;
  }
  return { code, keys: Array.isArray(body?.inapplicablePermissions) ? body.inapplicablePermissions : [] };
}

function derivedDefinition(key: string): PlatformOperatorPermissionDefinition {
  const parts = key.split('.');
  const action = parts[parts.length - 1] ?? '';
  const area = (parts[1] ?? key).replace(/-/g, ' ');
  const allowedRoles: PlatformOperatorRole[] =
    action === 'read'
      ? ALL_ROLES
      : action === 'decide' || action === 'remediate' || action === 'replay'
        ? ['checker', 'admin']
        : ['maker'];
  return {
    key,
    label: `${area.charAt(0).toUpperCase()}${area.slice(1)} · ${action}`,
    description: '',
    allowedRoles,
  };
}
