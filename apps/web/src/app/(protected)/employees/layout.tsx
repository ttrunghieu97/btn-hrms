'use client';

import * as React from 'react';
import { DomainHeader } from '@/components/layout/domain-header';
import { routeLabels } from '@/lib/app-copy';

const tabs = [
  { href: '/employees', label: routeLabels.employees },
  { href: '/employees/contracts', label: routeLabels.contracts },
  { href: '/employees/documents', label: routeLabels.documents },
];

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:px-6'>{children}</div>
    </div>
  );
}
