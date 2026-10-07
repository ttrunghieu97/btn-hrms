'use client';

import * as React from 'react';
import { DomainHeader } from '@/components/layout/domain-header';
import { ShiftsSheetsController } from '@/features/shifts';
import { scheduleUiCopy } from '@/lib/app-copy';

const tabs = [
  { href: '/schedule', label: scheduleUiCopy.tabs.overview },
  { href: '/schedule/roster', label: scheduleUiCopy.tabs.weeklyRoster },
  { href: '/schedule/management', label: scheduleUiCopy.tabs.management },
  { href: '/schedule/requests', label: scheduleUiCopy.tabs.requests },
  { href: '/schedule/my-schedule', label: scheduleUiCopy.tabs.mySchedule },
];

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
        {children}
        <ShiftsSheetsController />
      </div>
    </div>
  );
}
