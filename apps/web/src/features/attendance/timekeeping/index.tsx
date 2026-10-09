'use client';

import * as React from 'react';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { attendanceUiCopy } from '@/lib/app-copy';
import { toDateString } from '../utils/attendance-utils';
import { OverviewTab } from './components/overview-tab';
import { ExceptionsTab } from './components/exceptions-tab';
import { AdjustmentsTab } from './components/adjustments-tab';
import { AttendancePeriodLifecycleHero } from './components/attendance-period-lifecycle-hero';

const CURRENT = format(new Date(), 'yyyy-MM');

export function TimekeepingView() {
  const [dateRange, setDateRange] = React.useState({ from: CURRENT + '-01', to: toDateString(new Date()) });
  const [tab, setTab] = React.useState('timesheet');

  const currentPeriod = dateRange.from.slice(0, 7);

  return (
    <div className='flex flex-1 flex-col gap-5'>
      {/* Visual Period Lifecycle Hero Stepper & Action Controls */}
      <AttendancePeriodLifecycleHero period={currentPeriod} />

      {/* Date Range Navigation Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            aria-label='Kỳ trước'
            onClick={() => {
              const from = parseISO(dateRange.from);
              const to = parseISO(dateRange.to);
              setDateRange({
                from: toDateString(subDays(from, 30)),
                to: toDateString(subDays(to, 30)),
              });
            }}
          >
            <Icons.chevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-sm font-medium'>
            {format(parseISO(dateRange.from), 'dd/MM/yyyy')} - {format(parseISO(dateRange.to), 'dd/MM/yyyy')}
          </span>
          <Button
            variant='outline'
            size='icon'
            aria-label='Kỳ sau'
            onClick={() => {
              const from = parseISO(dateRange.from);
              const to = parseISO(dateRange.to);
              setDateRange({
                from: toDateString(addDays(from, 30)),
                to: toDateString(addDays(to, 30)),
              });
            }}
          >
            <Icons.chevronRight className='h-4 w-4' />
          </Button>
        </div>
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <Icons.info className='h-3.5 w-3.5' />
          {attendanceUiCopy.table.overtimeHoursLabel} tự động tính từ giờ vượt {'>'}8h/ngày
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value='timesheet'>{attendanceUiCopy.timekeeping.tabs.timesheet}</TabsTrigger>
          <TabsTrigger value='exceptions'>{attendanceUiCopy.timekeeping.tabs.exceptions}</TabsTrigger>
          <TabsTrigger value='adjust'>{attendanceUiCopy.timekeeping.tabs.adjust}</TabsTrigger>
        </TabsList>

        <TabsContent value='timesheet' className='mt-4'>
          <OverviewTab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value='exceptions' className='mt-4'>
          <ExceptionsTab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value='adjust' className='mt-4'>
          <AdjustmentsTab dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
