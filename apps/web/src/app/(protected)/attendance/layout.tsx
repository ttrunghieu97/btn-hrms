'use client';

import * as React from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { DomainHeader } from '@/components/layout/domain-header';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission, hasAnyPermission } from '@project/permissions';
import { permissions } from '@/lib/permissions';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
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
    { href: '/attendance', label: 'Chấm công của tôi' },
    { href: '/attendance/history', label: 'Lịch sử chấm công' },
    { href: '/attendance/summary', label: 'Tổng hợp công', adminOnly: true },
    { href: '/attendance/management', label: 'Quản lý chấm công', adminOnly: true },
    { href: '/attendance/analytics', label: 'Báo cáo & Phân tích', adminOnly: true },
    { href: '/attendance/management/timesheet', label: 'Timesheet', visible: canTimesheet },
  ];

  const visibleTabs = tabs
    .filter((tab) => {
      if ('visible' in tab) return tab.visible;
      if (tab.adminOnly) return canAdmin;
      return true;
    })
    .map(({ href, label }) => ({ href, label } as const));

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={visibleTabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
        <ErrorBoundary feature='attendance'>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
