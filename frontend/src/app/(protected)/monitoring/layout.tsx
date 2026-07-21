'use client';

import * as React from 'react';
import { DomainHeader } from '@/components/layout/domain-header';
import { routeLabels } from '@/lib/app-copy';

const tabs = [
  { href: '/monitoring/system-health', label: routeLabels.systemHealth },
  { href: '/monitoring/activities', label: routeLabels.activities },
  { href: '/monitoring/data-integrity', label: routeLabels.dataIntegrity },
];

export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
    </div>
  );
}
