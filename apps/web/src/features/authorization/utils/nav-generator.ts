/**
 * Nav Generator — builds sidebar navigation from Route Registry.
 *
 * Routes with `nav` metadata become nav items.
 * Permission is resolved from the route's permission rule automatically.
 * No duplicate permission definitions between nav and route guard.
 */
import type { PermissionedUser } from '@project/permissions';
import { can, type PermissionRule } from '@/lib/permission-resolver';
import { routeRegistry } from '../route-registry/routes';
import type { NavIcon } from '../route-registry/routes';

export interface NavItem {
  title: string;
  url: string;
  icon: NavIcon;
  group: string;
  permission: PermissionRule;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Generate sidebar navigation for a given user.
 * Filters nav items based on user permissions (hierarchy-aware).
 * Groups items by their `group` field.
 */
export function generateNav(user: PermissionedUser | null | undefined): NavGroup[] {
  const navRoutes = routeRegistry.filter((r) => r.nav);
  if (!navRoutes.length) return [];

  // Build items, filtering by permission
  const items: NavItem[] = [];

  for (const route of navRoutes) {
    if (!route.nav) continue;
    const allowed = can(user, route.permission);
    if (allowed) {
      items.push({
        title: route.nav.title,
        url: route.path,
        icon: route.nav.icon,
        group: route.nav.group,
        permission: route.permission,
      });
    }
  }

  // Group by group label, preserve order
  const groupOrder = [
    'Tổng quan',
    'Nhân sự',
    'Tài chính',
    'Khác',
    'Quản trị',
    'Tài khoản',
  ];

  const groups = new Map<string, NavItem[]>();
  for (const item of items) {
    const existing = groups.get(item.group) ?? [];
    existing.push(item);
    groups.set(item.group, existing);
  }

  // Sort groups by defined order
  const result: NavGroup[] = [];
  const processed = new Set<string>();

  for (const groupName of groupOrder) {
    const groupItems = groups.get(groupName);
    if (groupItems?.length) {
      result.push({ label: groupName, items: groupItems });
      processed.add(groupName);
    }
  }

  // Any group not in order → append at end
  for (const [groupName, groupItems] of groups) {
    if (!processed.has(groupName)) {
      result.push({ label: groupName, items: groupItems });
    }
  }

  return result;
}

/**
 * Get all nav items (no filter — for debugging / validation).
 */
export function getAllNavItems(): NavItem[] {
  return routeRegistry
    .filter((r) => r.nav)
    .map((r) => ({
      title: r.nav!.title,
      url: r.path,
      icon: r.nav!.icon,
      group: r.nav!.group,
      permission: r.permission,
    }));
}
