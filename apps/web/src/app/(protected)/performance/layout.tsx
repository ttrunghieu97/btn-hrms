'use client';

import * as React from 'react';
import { DomainHeader } from '@/components/layout/domain-header';
import { routeLabels } from '@/locales/vi/app-copy';

const tabs = [
  { href: '/performance/cycles', label: routeLabels.performanceCycles },
  { href: '/performance/reviews', label: routeLabels.performanceReviews },
];

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
    </div>
  );
}
