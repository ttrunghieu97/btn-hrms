// Permission constants — grouped by domain
export * from './permissions/index';
export { PermissionRegistry } from './registry/registry';
export type { PermissionCode } from './registry/registry';

// Hierarchy map (upward resolution)
export { hierarchyMap } from './hierarchy';

// Resolver utilities
export { hasPermission, hasAnyPermission, hasAllPermissions, resolvePermissions, validateHierarchy, isHierarchyValid } from './utils';
export type { PermissionedUser, ValidationError } from './utils';
