'use client';

import { usePathname } from 'next/navigation';
import { useMemo, useSyncExternalStore } from 'react';
import { routeLabels, routeSegmentLabels } from '@/lib/app-copy';
import { getBreadcrumbRoleName, subscribeBreadcrumbRoleName } from '@/lib/breadcrumb-store';

type BreadcrumbItem = {
  title: string;
  link: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatSegmentTitle(segment: string) {
  const normalized = decodeURIComponent(segment).toLowerCase();
  if (routeSegmentLabels[normalized]) {
    return routeSegmentLabels[normalized];
  }

  // Hide UUID segments — page header shows the name
  if (UUID_RE.test(normalized)) {
    return '';
  }

  return normalized
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function useBreadcrumbs() {
  const pathname = usePathname();
  const roleName = useSyncExternalStore(subscribeBreadcrumbRoleName, getBreadcrumbRoleName, () => '');

  const breadcrumbs = useMemo(() => {
    if (pathname === '/' || pathname === '/overview') {
      return [];
    }

    const homeCrumb: BreadcrumbItem = { title: routeLabels.dashboard, link: '/overview' };
    const segments = pathname.split('/').filter(Boolean);

    const crumbs = segments
      .map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        const title = formatSegmentTitle(segment);
        // Use store name for UUID segments
        if (!title && UUID_RE.test(decodeURIComponent(segment).toLowerCase())) {
          return { title: roleName || segment, link: path };
        }
        return { title, link: path };
      })
      .filter((item) => item.title.length > 0);

    return [homeCrumb, ...crumbs];
  }, [pathname, roleName]);

  return breadcrumbs;
}
