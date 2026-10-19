import type { SearchProvider, SearchResult } from '../types';
import { navGroups } from '@/config/nav-config';

/**
 * Quick navigation provider — derives searchable pages from canonical navGroups.
 */
function buildNavItems(): SearchResult[] {
  const items: SearchResult[] = [
    {
      id: 'nav-workspace',
      type: 'notification',
      title: 'My Workspace',
      subtitle: 'Home',
      href: '/workspace',
      permission: 'dashboard:view',
    },
  ];

  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.url && item.url !== '#') {
        items.push({
          id: `nav-${item.url}`,
          type: 'document',
          title: item.title,
          subtitle: group.label,
          href: item.url,
          permission: item.access?.permissions?.[0],
        });
      }
      for (const child of item.items ?? []) {
        if (child.url && child.url !== '#') {
          items.push({
            id: `nav-${child.url}`,
            type: 'document',
            title: child.title,
            subtitle: item.title,
            href: child.url,
            permission: child.access?.permissions?.[0] ?? item.access?.permissions?.[0],
          });
        }
      }
    }
  }

  return items;
}

export const navigationSearchProvider: SearchProvider = {
  id: 'navigation',
  label: 'Navigation',
  search: async (query: string): Promise<SearchResult[]> => {
    const navItems = buildNavItems();
    const q = query.toLowerCase();
    if (!q) return navItems.slice(0, 5);
    return navItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle ?? '').toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q),
    );
  },
};
