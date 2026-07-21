'use client';

import * as React from 'react';
import { DomainHeader } from '@/components/layout/domain-header';
import { routeLabels } from '@/locales/vi/app-copy';

const tabs = [
  { href: '/asset-management/catalog', label: routeLabels.assetCatalog },
  { href: '/asset-management/inventory', label: routeLabels.assetInventory },
  { href: '/asset-management/requests', label: routeLabels.assetRequests },
  { href: '/asset-management/issues', label: routeLabels.assetIssues },
];

export default function AssetManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
    </div>
  );
}
