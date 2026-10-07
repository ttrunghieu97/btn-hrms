import type { PermissionCode } from '@project/permissions';

export interface AuthorizationRule {
  anyOf?: readonly (PermissionCode | string)[];
  allOf?: readonly (PermissionCode | string)[];
}

export interface AuthorizationRegistry {
  routes: Record<string, AuthorizationRule>;
  resources: Record<string, AuthorizationRule>;
  actions: Record<string, AuthorizationRule>;
}
