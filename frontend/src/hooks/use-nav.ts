import * as React from 'react';
import type { NavGroup, NavItem } from '@/types';
import { anyOf, hasPermission } from '@/lib/rbac';
import { useAuthStore } from '@/stores/auth-store';

export function canAccessNavItem(item: NavItem, user: ReturnType<typeof useAuthStore.getState>['user']) {
  const access = item.access;
  if (!access) return true;
  if (access.permissions?.length) return anyOf(user, access.permissions);
  return true;
}

export function isNavItemVisible(item: NavItem) {
  return item.visible !== false;
}

export function filterNavItems(items: NavItem[], user: ReturnType<typeof useAuthStore.getState>['user']): NavItem[] {
  return items
    .filter(isNavItemVisible)
    .map((item) => {
      const children = item.items?.length ? filterNavItems(item.items, user) : item.items;
      return { ...item, items: children };
    })
    .filter((item) => item.disabled || canAccessNavItem(item, user) || Boolean(item.items?.length));
}

export function useFilteredNavItems(items: NavItem[]) {
  const user = useAuthStore((state) => state.user);
  return filterNavItems(items, user);
}

export function useFilteredNavGroups(groups: NavGroup[], fallbackUser?: ReturnType<typeof useAuthStore.getState>['user']) {
  const zustandUser = useAuthStore((state) => state.user);
  const user = zustandUser ?? fallbackUser ?? null;

  return React.useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: filterNavItems(group.items, user),
        }))
        .filter((group) => group.items.length > 0),
    [groups, user]
  );
}
