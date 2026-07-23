'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { DomainHeader } from '@/components/layout/domain-header';
import { routeLabels } from '@/lib/app-copy';

const tabs = [
  { href: '/employees', label: routeLabels.employees },
  { href: '/employees/contracts', label: routeLabels.contracts },
  { href: '/employees/documents', label: routeLabels.documents },
];

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMainTabRoute =
    pathname === '/employees' ||
    pathname === '/employees/contracts' ||
    pathname === '/employees/documents';

  if (!isMainTabRoute) {
    return <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>;
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
    </div>
  );
}
