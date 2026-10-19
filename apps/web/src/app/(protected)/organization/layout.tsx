'use client';

import * as React from 'react';
import { DomainHeader } from '@/components/layout/domain-header';
import { routeLabels } from '@/lib/app-copy';
import { DepartmentsSheetsController } from '@/features/departments';

const tabs = [
  { href: '/organization/departments', label: routeLabels.departments },
  { href: '/organization/positions', label: routeLabels.positions },
  { href: '/organization/locations', label: 'Địa điểm làm việc' },
];

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
      <DepartmentsSheetsController />
    </div>
  );
}
