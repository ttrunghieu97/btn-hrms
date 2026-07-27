/**
 * API-side legacy adapter.
 * Re-exports PermissionRegistry as `Permissions` for backward compat.
 * All existing `import { Permissions } from '...'` continue to work.
 */
import { PermissionRegistry } from '../registry/registry';

/** @deprecated Use `PermissionRegistry` from `@project/permissions` directly */
export const Permissions = Object.fromEntries(
  Object.entries(PermissionRegistry).flatMap(([group, perms]) =>
    Object.entries(perms).map(([key, code]) => [
      `${group}_${key}`.toUpperCase(),
      code,
    ])
  )
) as Record<string, string>;
