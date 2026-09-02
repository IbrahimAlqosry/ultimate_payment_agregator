import { ApprovalEntity, AuthUser } from '@core/models';

export function canManageOperators(user: AuthUser | null): boolean {
  return user?.audience === 'operator' && user.role === 'admin';
}

export function isReadOnly(user: AuthUser | null): boolean {
  return user?.role === 'reader';
}

export function canApprove(user: AuthUser | null, entity: ApprovalEntity): boolean {
  if (!user || user.role === 'reader' || user.role === 'maker') {
    return false;
  }
  if (user.audience === 'operator' && (user.role === 'admin' || user.role === 'checker')) {
    return true;
  }
  return user.audience === 'institution' && entity === 'point';
}

export function canMutate(user: AuthUser | null): boolean {
  return !!user && user.role !== 'reader';
}
