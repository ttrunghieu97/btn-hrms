/**
 * Centralized Module Rollout Registry
 *
 * Single source of truth for progressive module rollout across:
 * - Edge Middleware (`src/proxy.ts`) — route protection & disabled-module redirect guard
 * - Frontend Navigation (`src/config/nav-config.ts`, `src/lib/auth-landing.ts`, `src/app/page.tsx`, `KBar`)
 * - Optional route-registry nav filtering (`src/features/authorization/utils/nav-generator.ts`)
 *
 * IMPORTANT: Keep this module dependency-free (no React, Zustand, or UI imports)
 * so Next.js Edge Middleware (`proxy.ts`) compiles with minimal bundle footprint.
 */

export type AppModuleId =
  | 'overview'
  | 'employees'
  | 'organization'
  | 'attendance'
  | 'leave'
  | 'schedule'
  | 'recruitment'
  | 'asset-management'
  | 'benefits'
  | 'expenses'
  | 'performance'
  | 'learning'
  | 'onboarding'
  | 'offboarding'
  | 'payroll'
  | 'tasks'
  | 'monitoring'
  | 'administration'
  | 'account';

export interface ModuleRolloutDefinition {
  /** Canonical module identifier */
  readonly id: AppModuleId;
  /** Alternative identifiers accepted in env overrides (e.g. backend group id "workforce") */
  readonly aliases?: readonly string[];
  /** Top-level URL path prefixes owned by this module */
  readonly pathPrefixes: readonly string[];
  /** Whether routes in this module are accessible by default */
  readonly defaultEnabled: boolean;
  /**
   * Whether routes in this module must remain accessible to authenticated users
   * regardless of module rollout overrides (e.g. account profile / change-password).
   */
  readonly alwaysAccessibleRoutes?: boolean;
  /**
   * Whether this module is shown in primary navigation (Sidebar / KBar / Landing)
   * when enabled. False for `account` because profile/notifications/password live in SidebarFooter.
   */
  readonly showInMainNav: boolean;
}

export const MODULE_ROLLOUT_REGISTRY: readonly ModuleRolloutDefinition[] = [
  {
    id: 'overview',
    pathPrefixes: ['/overview', '/activity'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'employees',
    aliases: ['workforce'],
    pathPrefixes: ['/employees'],
    defaultEnabled: true,
    showInMainNav: true,
  },
  {
    id: 'organization',
    pathPrefixes: ['/organization'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'attendance',
    pathPrefixes: ['/attendance'],
    defaultEnabled: true,
    showInMainNav: true,
  },
  {
    id: 'leave',
    pathPrefixes: ['/leave'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'schedule',
    pathPrefixes: ['/schedule'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'recruitment',
    pathPrefixes: ['/recruitment'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'asset-management',
    pathPrefixes: ['/asset-management'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'benefits',
    pathPrefixes: ['/benefits'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'expenses',
    pathPrefixes: ['/expenses'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'performance',
    pathPrefixes: ['/performance'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'learning',
    pathPrefixes: ['/learning'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'onboarding',
    pathPrefixes: ['/onboarding'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'offboarding',
    pathPrefixes: ['/offboarding'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'payroll',
    pathPrefixes: ['/payroll'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'tasks',
    pathPrefixes: ['/tasks', '/chat', '/workspace'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'monitoring',
    pathPrefixes: ['/monitoring'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'administration',
    pathPrefixes: ['/administration', '/admin'],
    defaultEnabled: false,
    showInMainNav: true,
  },
  {
    id: 'account',
    pathPrefixes: ['/account', '/change-password', '/notifications'],
    defaultEnabled: true,
    alwaysAccessibleRoutes: true,
    showInMainNav: false,
  },
] as const;

const MODULE_BY_ID = new Map<AppModuleId, ModuleRolloutDefinition>();
const MODULE_ID_BY_TOKEN = new Map<string, AppModuleId>();

for (const mod of MODULE_ROLLOUT_REGISTRY) {
  MODULE_BY_ID.set(mod.id, mod);
  MODULE_ID_BY_TOKEN.set(mod.id, mod.id);
  if (mod.aliases) {
    for (const alias of mod.aliases) {
      MODULE_ID_BY_TOKEN.set(alias, mod.id);
    }
  }
}

function readEnvRolloutRaw(envOverride?: string): string | undefined {
  if (envOverride !== undefined) {
    return envOverride.trim();
  }
  const raw =
    process.env.NEXT_PUBLIC_ENABLED_MODULES ??
    process.env.ENABLED_NAV_GROUPS ??
    '';
  return raw.trim() || undefined;
}

/**
 * Resolve the set of enabled module IDs from environment configuration or defaults.
 * Core modules with `alwaysAccessibleRoutes: true` (`account`) are always included.
 */
export function resolveEnabledModuleIds(
  envOverride?: string,
): ReadonlySet<AppModuleId> {
  const raw = readEnvRolloutRaw(envOverride);
  const enabled = new Set<AppModuleId>();

  if (!raw) {
    for (const mod of MODULE_ROLLOUT_REGISTRY) {
      if (mod.defaultEnabled || mod.alwaysAccessibleRoutes) {
        enabled.add(mod.id);
      }
    }
    return enabled;
  }

  for (const token of raw.split(',')) {
    const normalized = token.trim().toLowerCase();
    if (!normalized) continue;
    if (normalized === '*' || normalized === 'all') {
      for (const mod of MODULE_ROLLOUT_REGISTRY) {
        enabled.add(mod.id);
      }
      return enabled;
    }
    const mappedId = MODULE_ID_BY_TOKEN.get(normalized);
    if (mappedId) {
      enabled.add(mappedId);
    }
  }

  for (const mod of MODULE_ROLLOUT_REGISTRY) {
    if (mod.alwaysAccessibleRoutes) {
      enabled.add(mod.id);
    }
  }

  return enabled;
}

/**
 * Check whether a module's routes are enabled for access.
 */
export function isModuleEnabled(
  moduleId: AppModuleId,
  envOverride?: string,
): boolean {
  return resolveEnabledModuleIds(envOverride).has(moduleId);
}

/**
 * Check whether a module should be visible in primary navigation (Sidebar / KBar / Landing).
 */
export function isModuleNavVisible(
  moduleId: AppModuleId,
  envOverride?: string,
): boolean {
  const mod = MODULE_BY_ID.get(moduleId);
  if (!mod || !mod.showInMainNav) return false;
  return isModuleEnabled(moduleId, envOverride);
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/**
 * Find the module definition that owns a given pathname.
 */
export function findModuleByPath(
  pathname: string,
): ModuleRolloutDefinition | undefined {
  return MODULE_ROLLOUT_REGISTRY.find((mod) =>
    mod.pathPrefixes.some((prefix) => matchesPrefix(pathname, prefix)),
  );
}

/**
 * Check whether a given route path belongs to a module that is visible in primary navigation.
 */
export function isRouteInVisibleModule(
  pathname: string,
  envOverride?: string,
): boolean {
  const mod = findModuleByPath(pathname);
  if (!mod) return true;
  return isModuleNavVisible(mod.id, envOverride);
}

/**
 * All protected top-level path prefixes across registered modules.
 */
export const PROTECTED_MODULE_PATHS: readonly string[] =
  MODULE_ROLLOUT_REGISTRY.flatMap((mod) => mod.pathPrefixes);

/**
 * Get all currently disabled top-level module path prefixes.
 */
export function getDisabledModulePaths(envOverride?: string): readonly string[] {
  const enabledIds = resolveEnabledModuleIds(envOverride);
  return MODULE_ROLLOUT_REGISTRY.filter((mod) => !enabledIds.has(mod.id)).flatMap(
    (mod) => mod.pathPrefixes,
  );
}

/**
 * True if pathname falls under any protected module path prefix.
 */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_MODULE_PATHS.some((prefix) => matchesPrefix(pathname, prefix));
}

/**
 * True if pathname falls under a module that is currently disabled in rollout.
 */
export function isDisabledModulePath(
  pathname: string,
  envOverride?: string,
): boolean {
  const mod = findModuleByPath(pathname);
  if (!mod) return false;
  return !isModuleEnabled(mod.id, envOverride);
}
