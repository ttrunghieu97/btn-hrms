'use client';

import * as React from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { DomainHeader } from '@/components/layout/domain-header';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/rbac';
import { permissions } from '@/lib/permissions';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);

  const canViewAll = hasPermission(user, permissions.attendance.viewAll);
  const canViewDepartment = hasPermission(user, permissions.attendance.viewDepartment);
  const canAdmin = canViewAll || canViewDepartment;

  const tabs = [
    { href: '/attendance', label: 'Chấm công của tôi' },
    { href: '/attendance/history', label: 'Lịch sử chấm công' },
    { href: '/attendance/summary', label: 'Tổng hợp công', adminOnly: true },
    { href: '/attendance/management', label: 'Quản lý chấm công', adminOnly: true },
    { href: '/attendance/analytics', label: 'Báo cáo & Phân tích', adminOnly: true },
  ];

  const visibleTabs = tabs
    .filter((tab) => !tab.adminOnly || canAdmin)
    .map(({ href, label }) => ({ href, label }));

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={visibleTabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
        <ErrorBoundary feature='attendance'>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
