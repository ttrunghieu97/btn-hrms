'use client';

import * as React from 'react';

import { DataTable } from '@/components/ui/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { attendanceUiCopy } from '@/lib/app-copy';
import { type MyAttendanceDayRecord } from '../../utils/attendance-utils';
import { getColumns } from './columns';

interface MyAttendanceTableProps {
  data: MyAttendanceDayRecord[];
  isLoading?: boolean;
  onPunch: (date: string, session: 'morning' | 'noon' | 'afternoon', action: 'checkin' | 'checkout') => void;
}

export function MyAttendanceTable({ data, isLoading, onPunch }: MyAttendanceTableProps) {
  const columns = React.useMemo(() => getColumns(onPunch), [onPunch]);

  const { table } = useDataTable({
    data,
    columns,
    pageCount: 1,
    shallow: true,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: Math.max(data.length, 31)
      }
    }
  });

  const pageSize = table.getState().pagination.pageSize;

  const preparedData = React.useMemo(() => {
    return [...data].sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  React.useEffect(() => {
    table.setOptions((prev) => ({
      ...prev,
      data: preparedData,
      pageCount: Math.max(1, Math.ceil(preparedData.length / pageSize))
    }));
  }, [pageSize, preparedData, table]);

  if (isLoading) {
    return <MyAttendanceTableSkeleton />;
  }

  return (
    <div className='flex flex-1 flex-col gap-2'>
      <DataTable table={table} hidePagination emptyState={<div className='text-muted-foreground flex h-32 items-center justify-center text-sm italic'>{attendanceUiCopy.noTodayData}</div>} />
    </div>
  );
}

export function MyAttendanceTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-4'>
      <div className='flex items-center justify-between gap-4'>
        <div className='space-y-2'>
          <div className='h-4 w-40 rounded bg-muted' />
          <div className='h-3 w-64 rounded bg-muted' />
        </div>
        <div className='h-9 w-32 rounded bg-muted' />
      </div>
      <div className='h-11 w-full rounded-xl bg-muted' />
      <div className='h-96 w-full rounded-2xl bg-muted' />
      <div className='h-10 w-full rounded-xl bg-muted' />
    </div>
  );
}
