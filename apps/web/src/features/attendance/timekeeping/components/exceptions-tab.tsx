'use client';

import * as React from 'react';
import { formatDateVN } from '@/lib/date';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { attendanceUiCopy } from '@/lib/app-copy';
import { useExceptionsQuery } from '../../api/timekeeping-queries';
import { ResolveDialog } from '../dialogs/resolve-dialog';
import {
  getExceptionStateLabel,
  getExceptionStateBadgeVariant,
} from '../utils';
import type { DateRange, ExceptionItem } from '../types';

export function ExceptionsTab({ dateRange }: { dateRange: DateRange }) {
  const { data, error, isLoading, refetch } = useExceptionsQuery({
    from: dateRange.from,
    to: dateRange.to,
    limit: 500,
  });

  const items = data?.records ?? [];
  const [selectedException, setSelectedException] = React.useState<ExceptionItem | null>(null);

  if (isLoading) return <div className='space-y-2'>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-10 w-full' />)}</div>;
  if (error) return <QueryErrorAlert error={error} subject={attendanceUiCopy.timekeeping.exceptionSubject} onRetry={() => refetch()} />;

  return (
    <>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.date}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.employee}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.type}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.description}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.status}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.createdAt}</TableHead>
              <TableHead className='text-right'>{attendanceUiCopy.timekeeping.exceptionTable.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className='text-center text-muted-foreground'>{attendanceUiCopy.timekeeping.noExceptions}</TableCell>
              </TableRow>
            )}
            {items.map((item: ExceptionItem, idx: number) => (
              <TableRow key={idx}>
                <TableCell>{item.date ?? item.workDate ?? '--'}</TableCell>
                <TableCell>{item.employeeName ?? (item.employee?.firstName ? `${item.employee.firstName} ${item.employee.lastName}` : '--')}</TableCell>
                <TableCell>{item.type ?? item.exceptionType ?? item.reason ?? '--'}</TableCell>
                <TableCell className='max-w-xs truncate text-muted-foreground'>{item.description ?? item.note ?? '--'}</TableCell>
                <TableCell><Badge variant={getExceptionStateBadgeVariant(item.status)}>{getExceptionStateLabel(item.status)}</Badge></TableCell>
                <TableCell>{item.createdAt ? formatDateVN(item.createdAt) : '--'}</TableCell>
                <TableCell className='text-right'>
                  {item.status === 'pending' && (
                    <Button variant='outline' size='sm' onClick={() => setSelectedException(item)}>
                      {attendanceUiCopy.timekeeping.exceptionTable.resolve}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ResolveDialog
        exception={selectedException}
        onClose={() => {
          setSelectedException(null);
          refetch().catch(() => undefined);
        }}
      />
    </>
  );
}
