import { AUTHORIZATION } from '../registry/authorization.registry';
import { evaluatePermissionRule } from './permission.resolver';

export function resolveActionAccess(
  action: string,
  permissions: readonly string[] | null | undefined,
): boolean {
  const rule = AUTHORIZATION.actions[action];
  return evaluatePermissionRule(rule, permissions);
}
export const canPerformAction = resolveActionAccess;
