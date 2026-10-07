'use client';

import * as React from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { DomainHeader } from '@/components/layout/domain-header';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission, hasAnyPermission } from '@project/permissions';
import { permissions } from '@/lib/permissions';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPeriodDetailPage = pathname?.includes('/attendance/management/periods/');
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) {
    return (
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
        <div className='h-10 w-full animate-pulse rounded bg-muted' />
      </div>
    );
  }

  const canViewAll = hasPermission(user?.permissions ?? [], permissions.attendance.viewAll);
  const canViewDepartment = hasPermission(user?.permissions ?? [], permissions.attendance.viewDepartment);
  const canAdmin = canViewAll || canViewDepartment;
  const canTimesheet = hasAnyPermission(user?.permissions ?? [], [
    'attendance:timesheet:view',
    'attendance:timesheet:manage',
    'attendance:timesheet:approve',
  ]);
  const canPeriodLock = hasAnyPermission(user?.permissions ?? [], [
    'attendance:period:lock',
    'attendance:period:unlock',
    'attendance:period:close',
  ]);

  const tabs = [
    { href: '/attendance/management', label: 'Quản lý bảng công' },
  ];

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className={cn(
        'flex min-h-0 flex-1 flex-col',
        isPeriodDetailPage ? 'p-1.5 md:px-3 md:py-1.5' : 'p-4 md:px-6'
      )}>
        <ErrorBoundary feature='attendance'>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
