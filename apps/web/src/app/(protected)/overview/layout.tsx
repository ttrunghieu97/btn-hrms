'use client';

import * as React from 'react';
import { DomainHeader } from '@/components/layout/domain-header';
import { dashboardCopy } from '@/locales/vi/dashboard';

const tabs = [
  { href: '/overview/operations', label: dashboardCopy.tabs.operations },
  { href: '/overview/executive', label: dashboardCopy.tabs.executive },
];

export default function OverviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
    </div>
  );
}
