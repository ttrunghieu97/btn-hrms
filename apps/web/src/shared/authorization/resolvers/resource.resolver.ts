import { AUTHORIZATION } from '../registry/authorization.registry';
import { evaluatePermissionRule } from './permission.resolver';

export function resolveResourceAccess(
  resource: string,
  permissions: readonly string[] | null | undefined,
): boolean {
  const rule = AUTHORIZATION.resources[resource];
  return evaluatePermissionRule(rule, permissions);
}
export const canAccessResource = resolveResourceAccess;
